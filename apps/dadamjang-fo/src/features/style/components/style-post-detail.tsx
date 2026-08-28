import { Image } from "expo-image";
import { Dimensions, FlatList, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { Button, TitleHeader } from "@/shared/components";
import type { StylePost } from "../types";

type StylePostDetailProps = {
  post: StylePost;
  isLikePending: boolean;
  onBack: () => void;
  onProductPress: (productId: string) => void;
  onToggleLike: (nextLiked: boolean) => void;
};

const deviceWidth = Dimensions.get("window").width;

const StylePostDetail = ({
  post,
  isLikePending,
  onBack,
  onProductPress,
  onToggleLike,
}: StylePostDetailProps) => (
  <View style={s.container}>
    <TitleHeader title="STYLE">
      <Button
        accessibilityLabel="뒤로 가기"
        onPress={onBack}
        style={s.backButton}
        variant="bare"
      >
        <Text style={s.backIcon}>‹</Text>
      </Button>
    </TitleHeader>
    <FlatList
      ListHeaderComponent={
        <View>
          <FlatList
            data={post.imageUrls}
            horizontal
            keyExtractor={(imageUrl, index) => `${imageUrl}-${index}`}
            pagingEnabled
            renderItem={({ item }) => (
              <View style={s.page}>
                <Image
                  contentFit="cover"
                  source={item}
                  style={s.image}
                  transition={120}
                />
              </View>
            )}
            showsHorizontalScrollIndicator={false}
            style={s.pager}
          />
          <View style={s.pageIndicator}>
            {post.imageUrls.map((imageUrl, index) => (
              <View key={`${imageUrl}-dot-${index}`} style={s.dot} />
            ))}
          </View>
          <View style={s.content}>
            <View style={s.authorRow}>
              <View style={s.authorBlock}>
                <Text style={s.author}>@{post.author.userid}</Text>
                <Text style={s.category}>{post.category}</Text>
              </View>
              <Button
                accessibilityLabel={post.isLiked ? "좋아요 취소" : "좋아요"}
                accessibilityState={{
                  selected: post.isLiked,
                  disabled: isLikePending,
                }}
                disabled={isLikePending}
                onPress={() => onToggleLike(!post.isLiked)}
                style={s.likeButton}
                variant="secondary"
              >
                <Text style={s.likeIcon}>{post.isLiked ? "♥" : "♡"}</Text>
                <Text style={s.likeLabel}>{post.likeCount}</Text>
              </Button>
            </View>
            <Text style={s.body}>{post.content}</Text>
            {post.brandTags.length ? (
              <View style={s.tagRow}>
                {post.brandTags.map((tag) => (
                  <Text key={tag.brandId} style={s.brandTag}>
                    @{tag.name}
                  </Text>
                ))}
              </View>
            ) : null}
            {post.hashtags.length ? (
              <View style={s.tagRow}>
                {post.hashtags.map((tag) => (
                  <Text key={tag} style={s.hashtag}>
                    #{tag}
                  </Text>
                ))}
              </View>
            ) : null}
            <Text style={s.sectionTitle}>
              함께 올린 상품 {post.products.length}
            </Text>
          </View>
        </View>
      }
      data={post.products}
      keyExtractor={(product) => product.productId}
      renderItem={({ item }) => (
        <Button
          onPress={() => onProductPress(item.productId)}
          style={s.productButton}
          variant="bare"
        >
          {item.imageUrls[0] ? (
            <Image
              contentFit="cover"
              recyclingKey={item.productId}
              source={item.imageUrls[0]}
              style={s.productImage}
            />
          ) : (
            <View style={s.productPlaceholder} />
          )}
          <View style={s.productCopy}>
            <Text numberOfLines={1} style={s.productTitle}>
              {item.title}
            </Text>
            {item.brandName ? (
              <Text style={s.productBrand}>{item.brandName}</Text>
            ) : null}
          </View>
          <Text style={s.chevron}>›</Text>
        </Button>
      )}
      contentContainerStyle={s.listContent}
      showsVerticalScrollIndicator={false}
    />
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  backButton: { padding: 8 },
  backIcon: { color: colors.ink, fontSize: 30, lineHeight: 30 },
  pager: { height: deviceWidth * 1.22 },
  page: {
    width: deviceWidth,
    height: deviceWidth * 1.22,
    backgroundColor: colors.primarySoft,
  },
  image: { width: "100%", height: "100%" },
  pageIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.line },
  content: { gap: spacing.md, padding: 16 },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  authorBlock: { gap: 4 },
  author: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  category: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  likeIcon: { color: colors.ink, fontSize: 18, lineHeight: 20 },
  likeLabel: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  body: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  brandTag: { color: colors.accent, fontSize: 13, fontWeight: "600" },
  hashtag: { color: colors.muted, fontSize: 13 },
  sectionTitle: {
    paddingTop: spacing.sm,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  listContent: { paddingBottom: 24 },
  productButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 76,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  productPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  productCopy: { flex: 1, gap: 4 },
  productTitle: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  productBrand: { color: colors.muted, fontSize: 12 },
  chevron: { color: colors.muted, fontSize: 24, lineHeight: 26 },
});

export default StylePostDetail;
