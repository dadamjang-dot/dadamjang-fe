import type { StorybookConfig } from "@storybook/react-native";

const main: StorybookConfig = {
  stories: ["../src/shared/components/**/*.stories.@(ts|tsx)"],
  addons: [],
};

export default main;
