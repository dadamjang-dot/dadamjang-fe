import { cleanup } from "@testing-library/react-native";

class TestNetworkError extends Error {
  constructor() {
    super("Unexpected GraphQL network request in test");
    this.name = "TestNetworkError";
  }
}

jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  createURL: jest.fn((path: string) => `dadamjang://${path}`),
  getInitialURL: jest.fn(async () => null),
  openURL: jest.fn(async () => undefined),
  parse: jest.fn((url: string) => ({ path: url.replace(/^.*?:\/\//, "") })),
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "00000000-0000-4000-8000-000000000000"),
}));

jest.mock("@sentry/react-native", () => ({
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

afterEach(async () => {
  await cleanup();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
