import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-native";

import StylePostCard from "./style-post-card";

const meta = {
  title: "Style/StylePostCard",
  component: StylePostCard,
  args: {
    author: "integration-user",
    content: "오늘의 스타일을 공유합니다.",
    hashtags: ["daily_look", "street"],
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600",
    likeCount: 12,
    onPress: () => undefined,
    onToggleLike: () => undefined,
    stylePostId: "style-post-1",
  },
} satisfies Meta<typeof StylePostCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    author: "integration-user",
    content: "오늘의 스타일을 공유합니다.",
    hashtags: ["daily_look", "street"],
    imageUrl:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600",
    isLiked: false,
    likeCount: 12,
    onPress: () => undefined,
    onToggleLike: () => undefined,
    stylePostId: "style-post-1",
  },
};

export const Liked: Story = { args: { isLiked: true } };

const RankingHarness = () => {
  const [isLiked, setIsLiked] = useState(false);
  return (
    <StylePostCard
      author="ranking-user"
      content="랭킹 카드 상태"
      hashtags={["ranking"]}
      imageUrl="https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600"
      isLiked={isLiked}
      likeCount={42}
      onPress={() => undefined}
      onToggleLike={(_, nextLiked) => setIsLiked(nextLiked)}
      rank={1}
      stylePostId="ranking-post-1"
    />
  );
};

export const Ranking: Story = {
  args: {
    author: "ranking-user",
    content: "랭킹 카드 상태",
    hashtags: ["ranking"],
    imageUrl:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600",
    isLiked: false,
    likeCount: 42,
    onPress: () => undefined,
    onToggleLike: () => undefined,
    rank: 1,
    stylePostId: "ranking-post-1",
  },
  render: () => <RankingHarness />,
};
