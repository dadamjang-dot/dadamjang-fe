import type { Config } from "jest";

const config: Config = {
  preset: "jest-expo",
  roots: ["<rootDir>/src", "<rootDir>/__tests__"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  moduleNameMapper: {
    "^@callstack/liquid-glass$": "<rootDir>/__tests__/mocks/liquid-glass.ts",
    "^expo-crypto$": "<rootDir>/__tests__/mocks/expo-crypto.ts",
    "^expo-secure-store$": "<rootDir>/__tests__/mocks/expo-secure-store.ts",
    "^react-native-unistyles$": "<rootDir>/__tests__/mocks/react-native-unistyles.ts",
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@dadamjang/design-tokens$": "<rootDir>/../../packages/design-tokens/src/index.ts",
    "^@dadamjang/domain$": "<rootDir>/../../packages/domain/src/index.ts",
    "^@dadamjang/graphql-client$": "<rootDir>/../../packages/graphql-client/src/index.ts",
    "^@dadamjang/mobile$": "<rootDir>/__tests__/mocks/mobile.ts",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(.pnpm|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@legendapp/.*|@sentry/react-native|react-native-unistyles|react-native-reanimated|react-native-worklets|standard-navigation))",
  ],
};

export default config;
