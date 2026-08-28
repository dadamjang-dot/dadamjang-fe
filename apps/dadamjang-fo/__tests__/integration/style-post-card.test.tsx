import { fireEvent, render, screen } from "@testing-library/react-native";
import { Image } from "expo-image";

import StylePostCard from "@/features/style/components/style-post-card";

jest.mock("expo-image", () => ({
  Image: "ExpoImage",
}));

describe("style post card interactions", () => {
  it("opens the post separately from toggling its like", () => {
    const onPress = jest.fn();
    const onToggleLike = jest.fn();

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

    fireEvent.press(screen.getByLabelText("스타일 게시물 이미지"));
    fireEvent.press(screen.getByLabelText("스타일 게시물 태그"));
    fireEvent.press(screen.getByLabelText("좋아요"));

    expect(onPress).toHaveBeenCalledTimes(2);
    expect(onPress).toHaveBeenCalledWith("style-1");
    expect(onToggleLike).toHaveBeenCalledWith("style-1", true);
  });

  it("keys its post image to the stable style identity", () => {
    render(
      <StylePostCard
        author="buyer"
        content="오늘의 스타일"
        hashtags={["daily_look"]}
        imageUrl="https://example.com/style.jpg"
        isLiked={false}
        likeCount={2}
        onPress={jest.fn()}
        onToggleLike={jest.fn()}
        stylePostId="style-1"
      />,
    );
    const postImage = screen
      .UNSAFE_getAllByType(Image)
      .find((image) => image.props.source === "https://example.com/style.jpg");

    expect(postImage).toHaveProp("recyclingKey", "style-1");
  });
});
