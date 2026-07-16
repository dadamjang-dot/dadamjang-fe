import { useLocalSearchParams } from 'expo-router';

import { StyleDetailView, useStylePost } from '@/features/style';

const StylePostScreen = () => {
  const { 'style-id': styleId } = useLocalSearchParams<{ 'style-id': string }>();
  const { post, loading, toggleLike } = useStylePost(styleId);

  return (
    <StyleDetailView
      post={post}
      loading={loading}
      onToggleLike={toggleLike}
    />
  );
};

export default StylePostScreen;
