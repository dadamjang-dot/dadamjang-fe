import type { Meta, StoryObj } from "@storybook/react-native";

import { Button } from "./button";

const meta = {
  title: "Shared/Button",
  component: Button,
  args: {
    label: "상품 보기",
    onPress: () => undefined,
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
