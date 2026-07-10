import * as SecureStore from 'expo-secure-store';

const accessTokenKey = 'dadamjang.access-token';
const refreshTokenKey = 'dadamjang.refresh-token';
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/graphql';

export class GraphqlError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'GraphqlError';
    this.status = status;
  }
}

type GraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

export const getAccessToken = () => SecureStore.getItemAsync(accessTokenKey);

export const getRefreshToken = () => SecureStore.getItemAsync(refreshTokenKey);

export const setAccessToken = (token: string) => SecureStore.setItemAsync(accessTokenKey, token);

export const setRefreshToken = (token: string) => SecureStore.setItemAsync(refreshTokenKey, token);

export const setAuthTokens = async (tokens: { accessToken: string; refreshToken: string }) => {
  await setAccessToken(tokens.accessToken);
  await setRefreshToken(tokens.refreshToken);
};

export const clearAccessToken = async () => {
  await SecureStore.deleteItemAsync(accessTokenKey);
  await SecureStore.deleteItemAsync(refreshTokenKey);
};

const refreshAccessToken = async () => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${refreshToken}`,
    },
    body: JSON.stringify({
      query: 'mutation Refresh { refresh { accessToken refreshToken role } }',
    }),
  });

  const payload = (await response.json().catch(() => undefined)) as
    | GraphqlResponse<{ refresh: { accessToken: string; refreshToken: string } }>
    | undefined;

  if (!response.ok || payload?.errors?.length || !payload?.data) return null;

  await setAuthTokens(payload.data.refresh);
  return payload.data.refresh.accessToken;
};

export const graphqlRequest = async <T>(
  query: string,
  variables?: Record<string, unknown>,
  requestHeaders?: Record<string, string>,
  retryOnUnauthorized = true,
): Promise<T> => {
  const token = await getAccessToken();
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...requestHeaders,
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json().catch(() => undefined)) as GraphqlResponse<T> | undefined;

  if (!response.ok) {
    throw new GraphqlError(payload?.errors?.[0]?.message ?? `요청에 실패했어요. (${response.status})`, response.status);
  }

  if (payload?.errors?.length) {
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

    throw new GraphqlError(payload.errors[0].message, response.status);
  }

  if (!payload?.data) {
    throw new GraphqlError('서버 응답을 확인할 수 없어요.', response.status);
  }

  return payload.data;
};
