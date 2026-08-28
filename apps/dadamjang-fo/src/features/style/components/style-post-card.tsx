import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components/button";

type StylePostCardProps = {
  stylePostId: string;
  imageUrl: string | null;
  author: string;
  content: string;
  hashtags: string[];
  likeCount: number;
  isLiked: boolean;
  rank?: number;
  onPress: (stylePostId: string) => void;
  onToggleLike: (stylePostId: string, nextLiked: boolean) => void;
};

const StylePostCard = ({
  stylePostId,
  imageUrl,
  hashtags,
  likeCount,
  isLiked,
  rank,
  onPress,
  onToggleLike,
}: StylePostCardProps) => (
  <View style={s.card}>
    <Pressable
      accessibilityLabel="스타일 게시물 이미지"
      accessibilityRole="button"
      onPress={() => onPress(stylePostId)}
      style={({ pressed }) => [s.imageLink, pressed && s.pressed]}
    >
      <View style={s.imageWrap}>
        {imageUrl ? <Image contentFit="cover" recyclingKey={stylePostId} source={imageUrl} style={s.image} transition={120} /> : <View style={s.imagePlaceholder} />}
        {rank ? <Text style={s.rank}>{rank}</Text> : null}
      </View>
    </Pressable>
    <View style={s.body}>
      <View style={s.metaRow}>
        <Pressable
          accessibilityLabel="스타일 게시물 태그"
          accessibilityRole="button"
          onPress={() => onPress(stylePostId)}
          style={({ pressed }) => [s.tagsLink, pressed && s.pressed]}
        >
          <Text numberOfLines={1} style={s.tags}>{hashtags.slice(0, 2).map((tag) => `#${tag}`).join(" ")}</Text>
        </Pressable>
        <Button
          accessibilityLabel={isLiked ? "좋아요 취소" : "좋아요"}
          accessibilityState={{ selected: isLiked }}
          onPress={() => onToggleLike(stylePostId, !isLiked)}
          style={s.likeButton}
          variant="bare"
        >
          <Text style={s.likeIcon}>{isLiked ? "♥" : "♡"}</Text>
          <Text style={s.likeCount}>{likeCount}</Text>
        </Button>
      </View>
    </View>
  </View>
);

const s = StyleSheet.create({
  card: { minWidth: 0, backgroundColor: colors.surface },
  imageLink: { minWidth: 0 },
  pressed: { opacity: 0.72 },
  imageWrap: { position: "relative", aspectRatio: 0.78, backgroundColor: colors.primarySoft, borderRadius: 12, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, backgroundColor: colors.primarySoft },
  rank: { position: "absolute", top: 8, left: 8, minWidth: 26, paddingHorizontal: 6, paddingVertical: 4, color: colors.surface, backgroundColor: colors.ink, fontSize: 13, fontWeight: "700", textAlign: "center" },
  body: { paddingTop: spacing.sm },
  likeButton: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 2 },
  likeIcon: { color: colors.ink, fontSize: 16, lineHeight: 18 },
  likeCount: { color: colors.ink, fontSize: 12, fontVariant: ["tabular-nums"] },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  tagsLink: { flex: 1, minWidth: 0 },
  tags: { color: colors.muted, fontSize: 12 },
});

export default StylePostCard;
