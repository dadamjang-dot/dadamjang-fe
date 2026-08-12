import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";

import StyleSortBar from "./style-sort-bar";

const meta = {
  title: "Style/InlineSortBar",
  component: StyleSortBar,
} satisfies Meta<typeof StyleSortBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const Harness = () => {
  const [sort, setSort] = useState<"RECOMMENDED" | "POPULAR" | "LATEST">("RECOMMENDED");
  return <StyleSortBar onSelect={setSort} sort={sort} />;
};

export const Interactive: Story = {
  args: { onSelect: () => undefined, sort: "RECOMMENDED" },
  render: () => <Harness />,
};
