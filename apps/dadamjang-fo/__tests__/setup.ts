class TestNetworkError extends Error {
  constructor() {
    super("Unexpected GraphQL network request in test");
    this.name = "TestNetworkError";
  }
}

process.env.EXPO_PUBLIC_API_URL = "http://127.0.0.1:5500/graphql";

jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  createURL: jest.fn((path: string) => `dadamjang://${path}`),
  getInitialURL: jest.fn(async () => null),
  openSettings: jest.fn(async () => undefined),
  openURL: jest.fn(async () => undefined),
  parse: jest.fn((url: string) => ({ path: url.replace(/^.*?:\/\//, "") })),
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "00000000-0000-4000-8000-000000000000"),
}));

jest.mock("expo-constants", () => require("./mocks/expo-constants"));

jest.mock("expo-notifications", () => require("./mocks/expo-notifications"));

jest.mock("@sentry/react-native", () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  init: jest.fn(),
  wrap: jest.fn((component: unknown) => component),
}));

jest.mock("react-native-unistyles", () => ({
  StyleSheet: {
    create: jest.fn((styles: unknown) => styles),
  },
}));

global.fetch = jest.fn(async () => {
  throw new TestNetworkError();
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
