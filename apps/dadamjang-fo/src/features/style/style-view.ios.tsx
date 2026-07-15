import { useState } from "react";
import { ScrollView, Text, View, TextInput, Pressable } from "react-native";
import { Image } from "expo-image";
import { StyleSheet } from "react-native-unistyles";
import { colors } from "@dadamjang/design-tokens";
import { NativeMessage } from "@/shared/components";
import type { StylePost } from "./types";

type StyleViewProps = {
  posts: StylePost[];
  loading: boolean;
  onAddPost: (caption: string) => void;
  onToggleLike: (id: string) => void;
};

export const StyleView = ({ posts, loading, onAddPost, onToggleLike }: StyleViewProps) => {
  const [caption, setCaption] = useState("");

  const handleUpload = () => {
    if (!caption.trim()) return;
    onAddPost(caption.trim());
    setCaption("");
  };

  if (loading) return <NativeMessage title="스타일 포스트를 불러오는 중" loading />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.uploadCard}>
        <Text style={styles.uploadTitle}>새 스타일 등록</Text>
        <TextInput
          placeholder="오늘의 오오티디(OOTD)를 자랑해보세요!"
          placeholderTextColor={colors.muted}
          value={caption}
          onChangeText={setCaption}
          style={styles.input}
          multiline
        />
        <Pressable style={styles.uploadButton} onPress={handleUpload}>
          <Text style={styles.uploadButtonText}>스타일 올리기</Text>
        </Pressable>
      </View>

      {posts.map((post) => (
        <View key={post.id} style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.avatar} />
            <Text style={styles.author}>@{post.author}</Text>
          </View>
          <Image source={post.imageUrl} style={styles.postImage} contentFit="cover" transition={160} />
          <View style={styles.postActions}>
            <Pressable style={styles.likeButton} onPress={() => onToggleLike(post.id)}>
              <Text style={styles.likeText}>❤️ {post.likes}</Text>
            </Pressable>
          </View>
          <Text style={styles.caption}>{post.caption}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 120, gap: 16 },
  uploadCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.ink,
  },
  input: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
    minHeight: 60,
    textAlignVertical: "top",
  },
  uploadButton: {
    backgroundColor: colors.ink,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  uploadButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900",
  },
  postCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.line,
  },
  author: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  postImage: {
    width: "100%",
    height: 300,
    backgroundColor: colors.canvas,
  },
  postActions: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  likeButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  likeText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  caption: {
    padding: 12,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
});