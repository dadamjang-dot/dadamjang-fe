import * as SecureStore from "expo-secure-store";

export type CapturedRequest = {
  body: string;
  authorization: string | null;
};
export const testStorageNamespace = "test-auth";
export const sessionKey = `${testStorageNamespace}.auth-session`;
export const invalidationKey = `${testStorageNamespace}.auth-session-invalidated`;
export const legacyAccessTokenKey = `${testStorageNamespace}.access-token`;
export const legacyRefreshTokenKey = `${testStorageNamespace}.refresh-token`;

export const storedSession = (accessToken: string, refreshToken: string) =>
  JSON.stringify({ version: 1, accessToken, refreshToken });

export const jsonResponse = (body: object, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

export const unauthorizedResponse = () => jsonResponse({ errors: [{}] }, 401);

export const unauthenticatedResponse = () =>
  jsonResponse({
    errors: [
      {
        extensions: { code: "UNAUTHENTICATED" },
        message: "Unauthenticated",
      },
    ],
  });

export const badUserInputResponse = () =>
  jsonResponse({
    errors: [
      {
        extensions: { code: "BAD_USER_INPUT" },
        message: "Invalid input",
      },
    ],
  });

export const installTransport = (responses: readonly Response[]) => {
  const requests: CapturedRequest[] = [];
  let responseIndex = 0;

  global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
    const response = responses[responseIndex];
    if (!response) throw new Error("Missing GraphQL test response");

    requests.push({
      authorization: new Headers(init?.headers).get("Authorization"),
      body: String(init?.body),
    });
    responseIndex += 1;
    return response;
  };

  return requests;
};

export const createTestStorage = (entries: Record<string, string>) => {
  const values = new Map(Object.entries(entries));
  return {
    storage: {
      deleteItemAsync: async (key: string) => {
        values.delete(key);
      },
      getItemAsync: async (key: string) => values.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => {
        values.set(key, value);
      },
    },
    values,
  };
};

export const installSecureStoreMocks = (storage: Map<string, string>) => {
  jest
    .mocked(SecureStore.getItemAsync)
    .mockImplementation(async (key) => storage.get(key) ?? null);
  jest
    .mocked(SecureStore.setItemAsync)
    .mockImplementation(async (key, value) => {
      storage.set(key, value);
    });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
    storage.delete(key);
  });
};
