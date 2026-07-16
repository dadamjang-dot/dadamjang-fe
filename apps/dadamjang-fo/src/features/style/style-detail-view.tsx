import { Image } from 'expo-image';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { colors } from '@dadamjang/design-tokens';

import { NativeMessage, PartnerBadge } from '@/shared/components';
import type { StylePost } from './types';

type StyleDetailViewProps = {
  post?: StylePost;
  loading: boolean;
  onToggleLike: (id: string) => void;
};

export const StyleDetailView = ({ post, loading, onToggleLike }: StyleDetailViewProps) => {
  if (loading) return <NativeMessage title="스타일 포스트를 불러오는 중" loading />;
  if (!post) return <NativeMessage title="스타일 포스트를 찾을 수 없어요" />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.postHeader}>
        <View style={styles.avatar} />
        <Text style={styles.author}>@{post.author}</Text>
        {post.isPartner && <PartnerBadge />}
      </View>
      <Image source={post.imageUrl} style={styles.postImage} contentFit="cover" transition={160} />
      <View style={styles.postActions}>
        <Pressable style={styles.likeButton} onPress={() => onToggleLike(post.id)}>
          <Text style={styles.likeText}>❤️ {post.likes}</Text>
        </Pressable>
      </View>
      <Text style={styles.caption}>{post.caption}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 120, gap: 16 },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.line,
  },
  author: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  postImage: {
    width: '100%',
    height: 360,
    borderRadius: 18,
    backgroundColor: colors.canvas,
  },
  postActions: {
    flexDirection: 'row',
  },
  likeButton: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  likeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  caption: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
});
