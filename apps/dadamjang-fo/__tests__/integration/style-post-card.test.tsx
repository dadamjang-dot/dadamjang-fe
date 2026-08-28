import { render, screen, userEvent } from "@testing-library/react-native";

import StylePostCard from "@/features/style/components/style-post-card";

jest.mock("expo-image", () => ({
  Image: "ExpoImage",
}));

describe("style post card interactions", () => {
  it("opens the post separately from toggling its like", async () => {
    const onPress = jest.fn();
    const onToggleLike = jest.fn();
    const user = userEvent.setup();

    render(
      <StylePostCard
        author="buyer"
        content="오늘의 스타일"
        hashtags={["daily_look"]}
        imageUrl="https://example.com/style.jpg"
        isLiked={false}
        likeCount={2}
        onPress={onPress}
        onToggleLike={onToggleLike}
        stylePostId="style-1"
      />,
    );

    expect(screen.queryByText("@buyer")).not.toBeOnTheScreen();
    expect(screen.queryByText("오늘의 스타일")).not.toBeOnTheScreen();
    expect(screen.getByText("#daily_look")).toBeOnTheScreen();
    expect(screen.queryByText("상품 1")).not.toBeOnTheScreen();

    await user.press(
      screen.getByRole("button", { name: "스타일 게시물 이미지" }),
    );
    await user.press(
      screen.getByRole("button", { name: "스타일 게시물 태그" }),
    );
    await user.press(screen.getByRole("button", { name: "좋아요" }));

    expect(onPress).toHaveBeenCalledTimes(2);
    expect(onPress).toHaveBeenCalledWith("style-1");
    expect(onToggleLike).toHaveBeenCalledWith("style-1", true);
  });

  it("renders the new identity when a recycled card receives another post", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    render(
      <StylePostCard
        author="buyer"
        content="오늘의 스타일"
        hashtags={["daily_look"]}
        imageUrl="https://example.com/style.jpg"
        isLiked={false}
        likeCount={2}
        onPress={onPress}
        onToggleLike={jest.fn()}
        stylePostId="style-1"
      />,
    );

    screen.rerender(
      <StylePostCard
        author="buyer-2"
        content="새 스타일"
        hashtags={["new_look"]}
        imageUrl="https://example.com/style-2.jpg"
        isLiked={false}
        likeCount={4}
        onPress={onPress}
        onToggleLike={jest.fn()}
        stylePostId="style-2"
      />,
    );

    expect(screen.queryByText("#daily_look")).not.toBeOnTheScreen();
    expect(screen.getByText("#new_look")).toBeVisible();
    await user.press(
      screen.getByRole("button", { name: "스타일 게시물 이미지" }),
    );
    expect(onPress).toHaveBeenLastCalledWith("style-2");
  });
});
