import { ClientError, GraphQLClient } from 'graphql-request';
import * as SecureStore from 'expo-secure-store';

const accessTokenKey = 'dadamjang.access-token';
const refreshTokenKey = 'dadamjang.refresh-token';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/graphql';
const refreshMutation = 'mutation Refresh { refresh { accessToken refreshToken } }';

export class GraphqlError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'GraphqlError';
    this.status = status;
  }
}

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type RefreshPayload = {
  refresh: AuthTokens;
};

export const getAccessToken = () => SecureStore.getItemAsync(accessTokenKey);

export const getRefreshToken = () => SecureStore.getItemAsync(refreshTokenKey);

export const setAccessToken = (token: string) => SecureStore.setItemAsync(accessTokenKey, token);

export const setRefreshToken = (token: string) => SecureStore.setItemAsync(refreshTokenKey, token);

export const setAuthTokens = async (tokens: AuthTokens) => {
  await setAccessToken(tokens.accessToken);
  await setRefreshToken(tokens.refreshToken);
};

export const clearAccessToken = async () => {
  await SecureStore.deleteItemAsync(accessTokenKey);
  await SecureStore.deleteItemAsync(refreshTokenKey);
};

const getErrorMessage = (error: ClientError) => error.response.errors?.[0]?.message ?? 'GraphQL 요청에 실패했어요.';

const createGraphqlClient = (headers?: HeadersInit) =>
  new GraphQLClient(apiUrl, {
    headers,
  });

const refreshAccessToken = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const client = createGraphqlClient({
      Authorization: `Bearer ${refreshToken}`,
    });
    const data = await client.request<RefreshPayload>(refreshMutation);

    await setAuthTokens(data.refresh);
    return data.refresh.accessToken;
  } catch {
    return null;
  }
};

export const graphqlRequest = async <T>(
  query: string,
  variables?: Record<string, unknown>,
  requestHeaders?: Record<string, string>,
  retryOnUnauthorized = true,
): Promise<T> => {
  const token = await getAccessToken();

  try {
    const client = createGraphqlClient({
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...requestHeaders,
    });

    return await client.request<T>(query, variables);
  } catch (error) {
    if (!(error instanceof ClientError)) {
      throw error;
    }

    if (retryOnUnauthorized && token) {
      const refreshedToken = await refreshAccessToken();

      if (refreshedToken) {
        return graphqlRequest<T>(
          query,
          variables,
          { ...requestHeaders, Authorization: `Bearer ${refreshedToken}` },
          false,
        );
      }
    }

    throw new GraphqlError(getErrorMessage(error), error.response.status);
  }
};
