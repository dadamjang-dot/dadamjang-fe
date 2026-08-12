import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";

import StyleCategoryBar, { type StyleCategoryKey } from "./style-category-bar";

const meta = {
  title: "Style/StyleCategoryBar",
  component: StyleCategoryBar,
} satisfies Meta<typeof StyleCategoryBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const Harness = ({ initial }: { initial: StyleCategoryKey }) => {
  const [selectedCategory, setSelectedCategory] = useState(initial);
  return <StyleCategoryBar onSelect={setSelectedCategory} selectedCategory={selectedCategory} />;
};

export const Default: Story = {
  args: { onSelect: () => undefined, selectedCategory: "ALL" },
  render: () => <Harness initial="ALL" />,
};
export const Ranking: Story = {
  args: { onSelect: () => undefined, selectedCategory: "RANKING" },
  render: () => <Harness initial="RANKING" />,
};
