import type { Config } from "jest";

import baseConfig from "./jest.config";

const baseModuleNameMapper = Object.fromEntries(
  Object.entries(baseConfig.moduleNameMapper ?? {}).filter(
    ([moduleName]) => moduleName !== "^@dadamjang/mobile$",
  ),
);

const config: Config = {
  ...baseConfig,
  preset: "jest-expo/android",
  roots: ["<rootDir>/android-tests"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  moduleNameMapper: {
    "^@/shared/components$":
      "<rootDir>/android-tests/mocks/shared-components.tsx",
    "^@expo/ui/jetpack-compose$":
      "<rootDir>/android-tests/mocks/expo-ui-jetpack-compose.tsx",
    "^@expo/ui/jetpack-compose/modifiers$":
      "<rootDir>/android-tests/mocks/expo-ui-jetpack-compose-modifiers.ts",
    "^@expo/material-symbols/.*\\.xml$":
      "<rootDir>/android-tests/mocks/material-symbol.ts",
    "^expo-router/unstable-native-tabs$":
      "<rootDir>/android-tests/mocks/expo-router-native-tabs.tsx",
    ...baseModuleNameMapper,
  },
};

export default config;
