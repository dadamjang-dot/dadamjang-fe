import { StyleView, useStylePosts } from "@/features/style";
import { ScreenTitle } from "@/shared/components";

const StyleScreen = () => {
  const { posts, loading, addPost, toggleLike } = useStylePosts();

  return (
    <>
      <ScreenTitle title="Style" subtitle="스타일 게시물을 확인하고 공유해요." />
      <StyleView
        posts={posts}
        loading={loading}
        onAddPost={addPost}
        onToggleLike={toggleLike}
      />
    </>
  );
};

export default StyleScreen;
