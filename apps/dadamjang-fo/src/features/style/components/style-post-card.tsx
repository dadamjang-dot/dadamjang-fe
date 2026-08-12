import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components";

type StylePostCardProps = {
  stylePostId: string;
  imageUrl: string | null;
  author: string;
  content: string;
  hashtags: string[];
  productCount: number;
  likeCount: number;
  isLiked: boolean;
  rank?: number;
  onPress: (stylePostId: string) => void;
  onToggleLike: (stylePostId: string, nextLiked: boolean) => void;
};

const StylePostCard = ({
  stylePostId,
  imageUrl,
  author,
  content,
  hashtags,
  productCount,
  likeCount,
  isLiked,
  rank,
  onPress,
  onToggleLike,
}: StylePostCardProps) => (
  <Pressable
    accessibilityLabel={`${author} 스타일 게시물`}
    accessibilityRole="button"
    onPress={() => onPress(stylePostId)}
    style={({ pressed }) => [s.card, pressed && s.pressed]}
  >
    <View style={s.imageWrap}>
      {imageUrl ? <Image contentFit="cover" source={imageUrl} style={s.image} transition={120} /> : <View style={s.imagePlaceholder} />}
      {rank ? <Text style={s.rank}>{rank}</Text> : null}
    </View>
    <View style={s.body}>
      <View style={s.authorRow}>
        <Text numberOfLines={1} style={s.author}>@{author}</Text>
        <Button
          accessibilityLabel={isLiked ? "좋아요 취소" : "좋아요"}
          accessibilityState={{ selected: isLiked }}
          onPress={() => onToggleLike(stylePostId, !isLiked)}
          style={s.likeButton}
          variant="bare"
        >
          <Image source={isLiked ? "sf:heart.fill" : "sf:heart"} style={s.likeIcon} />
          <Text style={s.likeCount}>{likeCount}</Text>
        </Button>
      </View>
      <Text numberOfLines={2} style={s.content}>{content}</Text>
      <View style={s.metaRow}>
        <Text numberOfLines={1} style={s.tags}>{hashtags.slice(0, 2).map((tag) => `#${tag}`).join(" ")}</Text>
        <Text style={s.productCount}>상품 {productCount}</Text>
      </View>
    </View>
  </Pressable>
);

const s = StyleSheet.create({
  card: { minWidth: 0, backgroundColor: colors.surface },
  pressed: { opacity: 0.72 },
  imageWrap: { position: "relative", aspectRatio: 0.78, backgroundColor: colors.primarySoft, borderRadius: 12, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, backgroundColor: colors.primarySoft },
  rank: { position: "absolute", top: 8, left: 8, minWidth: 26, paddingHorizontal: 6, paddingVertical: 4, color: colors.surface, backgroundColor: colors.ink, fontSize: 13, fontWeight: "700", textAlign: "center" },
  body: { gap: spacing.xs, paddingTop: spacing.sm },
  authorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  author: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: "700" },
  likeButton: { flexDirection: "row", alignItems: "center", gap: 3, paddingVertical: 2 },
  likeIcon: { width: 15, height: 15, tintColor: colors.ink },
  likeCount: { color: colors.ink, fontSize: 12, fontVariant: ["tabular-nums"] },
  content: { minHeight: 38, color: colors.ink, fontSize: 14, lineHeight: 19 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.xs },
  tags: { flex: 1, color: colors.muted, fontSize: 12 },
  productCount: { color: colors.muted, fontSize: 12 },
});

export default StylePostCard;
