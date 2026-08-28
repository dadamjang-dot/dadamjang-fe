import { ClientError, GraphQLClient } from "graphql-request";
import * as SecureStore from "expo-secure-store";

const accessTokenKey = "dadamjang.access-token";
const refreshTokenKey = "dadamjang.refresh-token";
const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/graphql";
const refreshMutation =
  "mutation Refresh { refresh { accessToken refreshToken } }";
const expiredSessionMessage = "인증 세션이 만료되었어요. 다시 로그인해 주세요.";

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

type TokenStorage = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

type SessionSnapshot = StoredAuthTokens & {
  generation: number;
};

type RefreshFlight = {
  generation: number;
  promise: Promise<string | null>;
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
  setAccessToken: (token: string) => Promise<void>;
  setAuthTokens: (tokens: AuthTokens) => Promise<void>;
  setRefreshToken: (token: string) => Promise<void>;
  setSessionResetHandler: (handler: SessionResetHandler) => () => void;
};

type AuthenticatedGraphqlClientOptions = {
  storage?: TokenStorage;
  url?: string;
};

const getErrorMessage = (error: ClientError) =>
  error.response.errors?.[0]?.message ?? "GraphQL 요청에 실패했어요.";

const isUnauthorizedError = (error: ClientError) =>
  error.response.status === 401 ||
  error.response.errors?.some(
    ({ extensions }) => extensions?.code === "UNAUTHENTICATED",
  ) === true;

const createAuthError = () => new GraphqlError(expiredSessionMessage, 401);

export const createAuthenticatedGraphqlClient = (
  options: AuthenticatedGraphqlClientOptions = {},
): AuthenticatedGraphqlClient => {
  const storage = options.storage ?? SecureStore;
  const url = options.url ?? apiUrl;
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

  const runSessionResetHandler = async () => {
    try {
      await sessionResetHandler?.();
    } catch {}
  };

  const beginSessionReset = (expectedGeneration?: number) => {
    if (expectedGeneration !== undefined && generation !== expectedGeneration)
      return undefined;
    generation += 1;
    sessionTokens = { accessToken: null, refreshToken: null };
    refreshFlight = undefined;
    return {
      cleanup: runSessionResetHandler(),
      generation,
    };
  };

  const clearStoredTokens = async () => {
    await Promise.allSettled([
      storage.deleteItemAsync(accessTokenKey),
      storage.deleteItemAsync(refreshTokenKey),
    ]);
  };

  const resetSession = async (expectedGeneration?: number) => {
    const reset = beginSessionReset(expectedGeneration);
    if (!reset) return false;
    await Promise.all([enqueueTokenMutation(clearStoredTokens), reset.cleanup]);
    return true;
  };

  const loadSessionTokens = async (expectedGeneration: number) => {
    await tokenMutationQueue;
    if (generation !== expectedGeneration) throw createAuthError();
    if (sessionTokens) return sessionTokens;

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

    sessionTokens = {
      accessToken: accessTokenResult.value,
      refreshToken: refreshTokenResult.value,
    };
    return sessionTokens;
  };

  const captureSession = async (): Promise<SessionSnapshot> => {
    const requestGeneration = generation;
    const tokens = await loadSessionTokens(requestGeneration);
    if (generation !== requestGeneration) throw createAuthError();
    return { ...tokens, generation: requestGeneration };
  };

  const setStoredToken = async (
    key: typeof accessTokenKey | typeof refreshTokenKey,
    token: string,
  ) => {
    const expectedGeneration = generation;
    const committed = await enqueueTokenMutation(async () => {
      if (generation !== expectedGeneration) return false;
      const [write] = await Promise.allSettled([
        storage.setItemAsync(key, token),
      ]);
      if (write.status === "rejected") {
        const reset = beginSessionReset(expectedGeneration);
        if (reset) await Promise.all([clearStoredTokens(), reset.cleanup]);
        return false;
      }
      if (generation !== expectedGeneration) return false;
      if (sessionTokens) {
        sessionTokens = {
          ...sessionTokens,
          ...(key === accessTokenKey
            ? { accessToken: token }
            : { refreshToken: token }),
        };
      }
      return true;
    });
    if (!committed) throw createAuthError();
  };

  const setAuthTokens = async (tokens: AuthTokens) => {
    const replacement = beginSessionReset();
    if (!replacement) throw createAuthError();

    const committed = await enqueueTokenMutation(async () => {
      await clearStoredTokens();
      if (generation !== replacement.generation) return false;

      const writes = await Promise.allSettled([
        storage.setItemAsync(accessTokenKey, tokens.accessToken),
        storage.setItemAsync(refreshTokenKey, tokens.refreshToken),
      ]);
      if (writes.some(({ status }) => status === "rejected")) {
        await clearStoredTokens();
        return false;
      }
      if (generation !== replacement.generation) return false;

      sessionTokens = { ...tokens };
      return true;
    });
    await replacement.cleanup;
    if (!committed) throw createAuthError();
  };

  const commitRefreshedTokens = async (
    snapshot: SessionSnapshot,
    tokens: AuthTokens,
  ) =>
    enqueueTokenMutation(async () => {
      if (generation !== snapshot.generation) return null;
      if (
        sessionTokens?.accessToken &&
        sessionTokens.accessToken !== snapshot.accessToken
      ) {
        return sessionTokens.accessToken;
      }

      const writes = await Promise.allSettled([
        storage.setItemAsync(accessTokenKey, tokens.accessToken),
        storage.setItemAsync(refreshTokenKey, tokens.refreshToken),
      ]);
      if (writes.some(({ status }) => status === "rejected")) {
        const reset = beginSessionReset(snapshot.generation);
        if (reset) await Promise.all([clearStoredTokens(), reset.cleanup]);
        return null;
      }
      if (generation !== snapshot.generation) return null;

      sessionTokens = { ...tokens };
      return tokens.accessToken;
    });

  const refreshAccessToken = async (snapshot: SessionSnapshot) => {
    if (generation !== snapshot.generation) return null;
    if (!snapshot.refreshToken) {
      await resetSession(snapshot.generation);
      throw createAuthError();
    }

    let tokens: AuthTokens;
    try {
      const client = createRequestClient({
        Authorization: `Bearer ${snapshot.refreshToken}`,
      });
      const data = await client.request<RefreshPayload>(refreshMutation);
      tokens = data.refresh;
      if (!tokens?.accessToken || !tokens.refreshToken) throw createAuthError();
    } catch {
      await resetSession(snapshot.generation);
      throw createAuthError();
    }

    return commitRefreshedTokens(snapshot, tokens);
  };

  const refreshAccessTokenOnce = (snapshot: SessionSnapshot) => {
    if (generation !== snapshot.generation)
      return Promise.reject(createAuthError());
    if (
      sessionTokens?.accessToken &&
      sessionTokens.accessToken !== snapshot.accessToken
    ) {
      return Promise.resolve(sessionTokens.accessToken);
    }
    if (refreshFlight?.generation === snapshot.generation)
      return refreshFlight.promise;

    const flight: RefreshFlight = {
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

    const refreshedToken = await refreshAccessTokenOnce(snapshot);
    if (!refreshedToken || generation !== snapshot.generation)
      throw createAuthError();

    try {
      return await requestWithToken<T>(
        snapshot,
        query,
        variables,
        { ...requestHeaders, Authorization: `Bearer ${refreshedToken}` },
        refreshedToken,
      );
    } catch (error) {
      if (generation !== snapshot.generation) throw createAuthError();
      if (error instanceof ClientError && isUnauthorizedError(error)) {
        await resetSession(snapshot.generation);
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
    setAccessToken: (token) => setStoredToken(accessTokenKey, token),
    setAuthTokens,
    setRefreshToken: (token) => setStoredToken(refreshTokenKey, token),
    setSessionResetHandler,
  };
};

export const defaultAuthenticatedGraphqlClient =
  createAuthenticatedGraphqlClient();

export const getAccessToken = () =>
  defaultAuthenticatedGraphqlClient.getAccessToken();

export const getRefreshToken = () =>
  defaultAuthenticatedGraphqlClient.getRefreshToken();

export const setAccessToken = (token: string) =>
  defaultAuthenticatedGraphqlClient.setAccessToken(token);

export const setRefreshToken = (token: string) =>
  defaultAuthenticatedGraphqlClient.setRefreshToken(token);

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
