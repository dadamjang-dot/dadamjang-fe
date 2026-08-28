import { ClientError, GraphQLClient } from "graphql-request";
import * as SecureStore from "expo-secure-store";

const defaultStorageNamespace = "dadamjang";
const sessionRecordVersion = 1;
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/graphql";
const refreshMutation =
  "mutation Refresh { refresh { accessToken refreshToken } }";
const expiredSessionMessage = "인증 세션이 만료되었어요. 다시 로그인해 주세요.";
const sessionCleanupMessage =
  "인증 정보를 안전하게 정리하지 못했어요. 다시 시도해 주세요.";

export class GraphqlError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "GraphqlError";
    this.status = status;
  }
}

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type StoredAuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

type RefreshPayload = {
  refresh: AuthTokens;
};

type SessionResetHandler = () => void | Promise<void>;

export type TokenStorage = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

type SessionSnapshot = StoredAuthTokens & {
  credentialRevision: number;
  generation: number;
};

type CredentialLease = Readonly<{
  accessToken: string;
  credentialRevision: number;
}>;

type RefreshFlight = {
  credentialRevision: number;
  generation: number;
  promise: Promise<CredentialLease | null>;
};

export type AuthenticatedGraphqlClient = {
  clearAccessToken: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  graphqlRequest: <T>(
    query: string,
    variables?: Record<string, unknown>,
    requestHeaders?: Record<string, string>,
    retryOnUnauthorized?: boolean,
  ) => Promise<T>;
  resetAuthSession: () => Promise<void>;
  setAuthTokens: (tokens: AuthTokens) => Promise<void>;
  setSessionResetHandler: (handler: SessionResetHandler) => () => void;
};

export type AuthenticatedGraphqlClientOptions = {
  storage: TokenStorage;
  storageNamespace: string;
  url?: string;
};

const getErrorMessage = (error: ClientError) =>
  error.response.errors?.[0]?.message ?? "GraphQL 요청에 실패했어요.";

const isUnauthorizedError = (error: ClientError) =>
  error.response.status === 401 ||
  error.response.errors?.some(
    ({ extensions }) => extensions?.code === "UNAUTHENTICATED",
  ) === true;

const isAuthTokens = (value: unknown): value is AuthTokens => {
  if (!value || typeof value !== "object") return false;
  const tokens = value as Partial<AuthTokens>;
  return (
    typeof tokens.accessToken === "string" &&
    tokens.accessToken.length > 0 &&
    typeof tokens.refreshToken === "string" &&
    tokens.refreshToken.length > 0
  );
};

const createAuthError = () => new GraphqlError(expiredSessionMessage, 401);
const createSessionCleanupError = () => new GraphqlError(sessionCleanupMessage);

const createAuthenticatedGraphqlClientInternal = (
  options: AuthenticatedGraphqlClientOptions,
): AuthenticatedGraphqlClient => {
  const storage = options.storage;
  const storageNamespace = options.storageNamespace.trim();
  if (!storageNamespace) throw new Error("storageNamespace is required");
  const sessionKey = `${storageNamespace}.auth-session`;
  const invalidationKey = `${storageNamespace}.auth-session-invalidated`;
  const accessTokenKey = `${storageNamespace}.access-token`;
  const refreshTokenKey = `${storageNamespace}.refresh-token`;
  const invalidatedSession = JSON.stringify({ version: sessionRecordVersion });
  const url = options.url ?? apiUrl;
  let credentialRevision = 0;
  let generation = 0;
  let sessionTokens: StoredAuthTokens | undefined;
  let sessionResetHandler: SessionResetHandler | undefined;
  let refreshFlight: RefreshFlight | undefined;
  let tokenMutationQueue = Promise.resolve();

  const createRequestClient = (headers?: HeadersInit) =>
    new GraphQLClient(url, { headers });

  const enqueueTokenMutation = <T>(mutation: () => Promise<T>) => {
    const result = tokenMutationQueue.then(mutation, mutation);
    tokenMutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const runSessionResetHandler = async () => sessionResetHandler?.();

  const commitCredentialPair = (tokens: AuthTokens) => {
    sessionTokens = { ...tokens };
    credentialRevision += 1;
  };

  const captureCredentialLease = (): CredentialLease | null => {
    if (!sessionTokens?.accessToken || !sessionTokens.refreshToken) return null;
    return {
      accessToken: sessionTokens.accessToken,
      credentialRevision,
    };
  };

  const beginSessionReset = (
    expectedGeneration?: number,
    expectedCredentialRevision?: number,
  ) => {
    if (expectedGeneration !== undefined && generation !== expectedGeneration)
      return undefined;
    if (
      expectedCredentialRevision !== undefined &&
      credentialRevision !== expectedCredentialRevision
    ) {
      return undefined;
    }
    generation += 1;
    sessionTokens = { accessToken: null, refreshToken: null };
    refreshFlight = undefined;
    return generation;
  };

  const hasRejected = (results: readonly PromiseSettledResult<unknown>[]) =>
    results.some(({ status }) => status === "rejected");

  const clearSupersededSessionState = async () => {
    const results = await Promise.allSettled([
      storage.deleteItemAsync(invalidationKey),
      storage.deleteItemAsync(accessTokenKey),
      storage.deleteItemAsync(refreshTokenKey),
    ]);
    if (hasRejected(results)) throw createSessionCleanupError();
  };

  const writeStoredSession = async (tokens: AuthTokens) => {
    await storage.setItemAsync(
      sessionKey,
      JSON.stringify({ version: sessionRecordVersion, ...tokens }),
    );
    await clearSupersededSessionState();
  };

  const invalidatePersistedSession = async () => {
    const markerResults = await Promise.allSettled([
      storage.setItemAsync(invalidationKey, "1"),
      storage.setItemAsync(sessionKey, invalidatedSession),
    ]);
    const fallbackResult =
      markerResults[1]?.status === "rejected"
        ? await Promise.allSettled([storage.deleteItemAsync(sessionKey)])
        : [];
    const legacyResults = await Promise.allSettled([
      storage.deleteItemAsync(accessTokenKey),
      storage.deleteItemAsync(refreshTokenKey),
    ]);
    if (hasRejected([...markerResults, ...fallbackResult, ...legacyResults]))
      throw createSessionCleanupError();
  };

  const resetSession = async (
    expectedGeneration?: number,
    expectedCredentialRevision?: number,
  ) => {
    const resetGeneration = beginSessionReset(
      expectedGeneration,
      expectedCredentialRevision,
    );
    if (resetGeneration === undefined) return false;
    const results = await Promise.allSettled([
      enqueueTokenMutation(async () => {
        if (generation !== resetGeneration) return;
        await invalidatePersistedSession();
      }),
      runSessionResetHandler(),
    ]);
    if (hasRejected(results)) throw createSessionCleanupError();
    return true;
  };

  const parseStoredSession = (
    value: string | null,
  ): StoredAuthTokens | null | undefined => {
    if (value === null) return undefined;
    try {
      const record = JSON.parse(value) as Partial<
        AuthTokens & { version: number }
      >;
      if (record.version === sessionRecordVersion && isAuthTokens(record)) {
        return {
          accessToken: record.accessToken,
          refreshToken: record.refreshToken,
        };
      }
    } catch {
      return null;
    }
    return null;
  };

  const loadSessionTokens = async (expectedGeneration: number) => {
    await tokenMutationQueue;
    if (generation !== expectedGeneration) throw createAuthError();
    if (sessionTokens) return sessionTokens;

    const [invalidationResult, storedSessionResult] = await Promise.allSettled([
      storage.getItemAsync(invalidationKey),
      storage.getItemAsync(sessionKey),
    ]);
    if (
      invalidationResult.status === "rejected" ||
      storedSessionResult.status === "rejected"
    ) {
      await resetSession(expectedGeneration);
      throw createAuthError();
    }
    if (generation !== expectedGeneration) throw createAuthError();
    if (invalidationResult.value !== null) {
      sessionTokens = { accessToken: null, refreshToken: null };
      return sessionTokens;
    }
    const storedTokens = parseStoredSession(storedSessionResult.value);
    if (storedTokens !== undefined) {
      sessionTokens = storedTokens ?? {
        accessToken: null,
        refreshToken: null,
      };
      return sessionTokens;
    }

    const [accessTokenResult, refreshTokenResult] = await Promise.allSettled([
      storage.getItemAsync(accessTokenKey),
      storage.getItemAsync(refreshTokenKey),
    ]);
    if (
      accessTokenResult.status === "rejected" ||
      refreshTokenResult.status === "rejected"
    ) {
      await resetSession(expectedGeneration);
      throw createAuthError();
    }
    if (generation !== expectedGeneration) throw createAuthError();

    if (accessTokenResult.value && refreshTokenResult.value) {
      const legacyTokens = {
        accessToken: accessTokenResult.value,
        refreshToken: refreshTokenResult.value,
      };
      try {
        const migrated = await enqueueTokenMutation(async () => {
          if (generation !== expectedGeneration) return false;
          await writeStoredSession(legacyTokens);
          if (generation !== expectedGeneration) return false;
          sessionTokens = legacyTokens;
          return true;
        });
        if (!migrated) throw createAuthError();
        return legacyTokens;
      } catch (error) {
        await resetSession(expectedGeneration);
        if (
          error instanceof GraphqlError &&
          error.message === sessionCleanupMessage
        ) {
          throw createSessionCleanupError();
        }
        throw error;
      }
    }
    if (accessTokenResult.value || refreshTokenResult.value) {
      await resetSession(expectedGeneration);
      throw createAuthError();
    }

    sessionTokens = { accessToken: null, refreshToken: null };
    return sessionTokens;
  };

  const captureSession = async (): Promise<SessionSnapshot> => {
    const requestGeneration = generation;
    const tokens = await loadSessionTokens(requestGeneration);
    if (generation !== requestGeneration) throw createAuthError();
    return {
      ...tokens,
      credentialRevision,
      generation: requestGeneration,
    };
  };

  const setAuthTokens = async (tokens: AuthTokens) => {
    if (!isAuthTokens(tokens)) {
      await resetSession();
      throw createAuthError();
    }
    const replacementGeneration = beginSessionReset();
    if (replacementGeneration === undefined) throw createAuthError();

    const [commitResult, cleanupResult] = await Promise.allSettled([
      enqueueTokenMutation(async () => {
        if (generation !== replacementGeneration) return false;
        await writeStoredSession(tokens);
        if (generation !== replacementGeneration) return false;
        commitCredentialPair(tokens);
        return true;
      }),
      runSessionResetHandler(),
    ]);
    if (
      commitResult.status === "fulfilled" &&
      commitResult.value &&
      cleanupResult.status === "fulfilled"
    ) {
      return;
    }

    const invalidationGeneration = beginSessionReset(replacementGeneration);
    const invalidationResult =
      invalidationGeneration === undefined
        ? undefined
        : await Promise.allSettled([
            enqueueTokenMutation(async () => {
              if (generation !== invalidationGeneration) return;
              await invalidatePersistedSession();
            }),
          ]);
    if (
      cleanupResult.status === "rejected" ||
      (commitResult.status === "rejected" &&
        commitResult.reason instanceof GraphqlError &&
        commitResult.reason.message === sessionCleanupMessage) ||
      (invalidationResult && hasRejected(invalidationResult))
    ) {
      throw createSessionCleanupError();
    }
    throw createAuthError();
  };

  const commitRefreshedTokens = async (
    snapshot: SessionSnapshot,
    tokens: AuthTokens,
  ) =>
    enqueueTokenMutation(async () => {
      if (generation !== snapshot.generation) return null;
      if (credentialRevision !== snapshot.credentialRevision)
        return captureCredentialLease();

      try {
        await writeStoredSession(tokens);
      } catch {
        const resetGeneration = beginSessionReset(snapshot.generation);
        if (resetGeneration !== undefined) {
          const results = await Promise.allSettled([
            invalidatePersistedSession(),
            runSessionResetHandler(),
          ]);
          if (hasRejected(results)) throw createSessionCleanupError();
        }
        return null;
      }
      if (generation !== snapshot.generation) return null;

      commitCredentialPair(tokens);
      return captureCredentialLease();
    });

  const refreshAccessToken = async (snapshot: SessionSnapshot) => {
    if (generation !== snapshot.generation) return null;
    if (!snapshot.refreshToken) {
      await resetSession(snapshot.generation);
      throw createAuthError();
    }

    let data: RefreshPayload;
    try {
      const client = createRequestClient({
        Authorization: `Bearer ${snapshot.refreshToken}`,
      });
      data = await client.request<RefreshPayload>(refreshMutation);
    } catch (error) {
      if (error instanceof ClientError && isUnauthorizedError(error)) {
        await resetSession(snapshot.generation);
        throw createAuthError();
      }
      if (error instanceof ClientError) {
        throw new GraphqlError(getErrorMessage(error), error.response.status);
      }
      throw error;
    }
    if (!isAuthTokens(data.refresh)) {
      await resetSession(snapshot.generation);
      throw createAuthError();
    }

    return commitRefreshedTokens(snapshot, data.refresh);
  };

  const refreshAccessTokenOnce = (snapshot: SessionSnapshot) => {
    if (generation !== snapshot.generation)
      return Promise.reject(createAuthError());
    if (credentialRevision !== snapshot.credentialRevision)
      return Promise.resolve(captureCredentialLease());
    if (
      refreshFlight?.generation === snapshot.generation &&
      refreshFlight.credentialRevision === snapshot.credentialRevision
    ) {
      return refreshFlight.promise;
    }

    const flight: RefreshFlight = {
      credentialRevision: snapshot.credentialRevision,
      generation: snapshot.generation,
      promise: Promise.resolve(null),
    };
    flight.promise = refreshAccessToken(snapshot).finally(() => {
      if (refreshFlight === flight) refreshFlight = undefined;
    });
    refreshFlight = flight;
    return flight.promise;
  };

  const requestWithToken = async <T>(
    snapshot: SessionSnapshot,
    query: string,
    variables?: Record<string, unknown>,
    requestHeaders?: Record<string, string>,
    accessToken = snapshot.accessToken,
  ) => {
    const client = createRequestClient({
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...requestHeaders,
    });
    const data = await client.request<T>(query, variables);
    if (generation !== snapshot.generation) throw createAuthError();
    return data;
  };

  const graphqlRequest = async <T>(
    query: string,
    variables?: Record<string, unknown>,
    requestHeaders?: Record<string, string>,
    retryOnUnauthorized = true,
  ): Promise<T> => {
    const snapshot = await captureSession();

    try {
      return await requestWithToken<T>(
        snapshot,
        query,
        variables,
        requestHeaders,
      );
    } catch (error) {
      if (generation !== snapshot.generation) throw createAuthError();
      if (!(error instanceof ClientError)) throw error;
      if (
        !retryOnUnauthorized ||
        !snapshot.accessToken ||
        !isUnauthorizedError(error)
      ) {
        throw new GraphqlError(getErrorMessage(error), error.response.status);
      }
    }

    const credentialLease = await refreshAccessTokenOnce(snapshot);
    if (!credentialLease || generation !== snapshot.generation)
      throw createAuthError();

    try {
      return await requestWithToken<T>(
        snapshot,
        query,
        variables,
        {
          ...requestHeaders,
          Authorization: `Bearer ${credentialLease.accessToken}`,
        },
        credentialLease.accessToken,
      );
    } catch (error) {
      if (generation !== snapshot.generation) throw createAuthError();
      if (error instanceof ClientError && isUnauthorizedError(error)) {
        await resetSession(
          snapshot.generation,
          credentialLease.credentialRevision,
        );
        throw createAuthError();
      }
      if (error instanceof ClientError) {
        throw new GraphqlError(getErrorMessage(error), error.response.status);
      }
      throw error;
    }
  };

  const resetAuthSession = async () => {
    await resetSession();
  };

  const setSessionResetHandler = (handler: SessionResetHandler) => {
    sessionResetHandler = handler;
    return () => {
      if (sessionResetHandler === handler) sessionResetHandler = undefined;
    };
  };

  return {
    clearAccessToken: resetAuthSession,
    getAccessToken: async () => (await captureSession()).accessToken,
    getRefreshToken: async () => (await captureSession()).refreshToken,
    graphqlRequest,
    resetAuthSession,
    setAuthTokens,
    setSessionResetHandler,
  };
};

export const createAuthenticatedGraphqlClient = (
  options: AuthenticatedGraphqlClientOptions,
) => {
  if (options.storageNamespace.trim() === defaultStorageNamespace) {
    throw new Error("The default storage namespace is reserved");
  }
  return createAuthenticatedGraphqlClientInternal(options);
};

export const defaultAuthenticatedGraphqlClient =
  createAuthenticatedGraphqlClientInternal({
    storage: SecureStore,
    storageNamespace: defaultStorageNamespace,
  });

export const getAccessToken = () =>
  defaultAuthenticatedGraphqlClient.getAccessToken();

export const getRefreshToken = () =>
  defaultAuthenticatedGraphqlClient.getRefreshToken();

export const setAuthTokens = (tokens: AuthTokens) =>
  defaultAuthenticatedGraphqlClient.setAuthTokens(tokens);

export const resetAuthSession = () =>
  defaultAuthenticatedGraphqlClient.resetAuthSession();

export const clearAccessToken = resetAuthSession;

export const setSessionResetHandler = (handler: SessionResetHandler) =>
  defaultAuthenticatedGraphqlClient.setSessionResetHandler(handler);

export const setSessionExpiredHandler = setSessionResetHandler;

export const graphqlRequest = <T>(
  query: string,
  variables?: Record<string, unknown>,
  requestHeaders?: Record<string, string>,
  retryOnUnauthorized = true,
) =>
  defaultAuthenticatedGraphqlClient.graphqlRequest<T>(
    query,
    variables,
    requestHeaders,
    retryOnUnauthorized,
  );
