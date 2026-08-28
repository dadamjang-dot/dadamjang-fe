import { LegendList } from "@legendapp/list/react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { useAuthActionGate } from "@/features/auth";
import { useComparison, useComparisonActions } from "@/features/comparison";
import { useComparisonPriceSummaries } from "@/features/price-evidence";
import { Button } from "@/shared/components";

const CompareScreen = () => {
  const router = useRouter();
  const {
    authStatus,
    isAuthenticated,
    redirectToSignIn,
    retryAuth,
  } = useAuthActionGate("/compare");
  const comparison = useComparison(isAuthenticated);
  const summaries = useComparisonPriceSummaries(isAuthenticated);
  const actions = useComparisonActions();
  const productIds = new Set(
    comparison.data?.map((item) => item.productId) ?? [],
  );
  const matchedSummaries =
    summaries.data?.filter((summary) => productIds.has(summary.productId)) ?? [];

  useEffect(() => {
    if (authStatus === "unauthenticated") redirectToSignIn(true);
  }, [authStatus, redirectToSignIn]);

  if (authStatus === "loading" || authStatus === "offline")
    return (
      <Text style={s.state}>
        {authStatus === "offline"
          ? "연결을 기다리고 있어요."
          : "로그인 상태를 확인하고 있어요."}
      </Text>
    );
  if (authStatus === "error") {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>로그인 상태를 확인하지 못했어요.</Text>
        <Button label="다시 시도" onPress={() => void retryAuth()} />
      </View>
    );
  }
  if (!isAuthenticated)
    return <Text style={s.state}>로그인 화면으로 이동하고 있어요.</Text>;

  if (comparison.isLoading || summaries.isLoading)
    return <Text style={s.state}>비교 상품을 불러오는 중이에요.</Text>;
  if (comparison.isError || summaries.isError) {
    return (
      <View style={s.stateGroup}>
        <Text style={s.state}>비교 상품을 불러오지 못했어요.</Text>
        <Button
          label="다시 시도"
          onPress={() => {
            void comparison.refetch();
            void summaries.refetch();
          }}
        />
      </View>
    );
  }

  return (
    <LegendList
      accessibilityLabel="비교 상품 목록"
      contentContainerStyle={s.content}
      data={matchedSummaries}
      keyExtractor={(summary) => summary.productId}
      ListEmptyComponent={<Text style={s.state}>비교할 상품이 없어요.</Text>}
      recycleItems
      renderItem={({ item: summary }) => (
        <View style={s.item}>
          <Pressable
            accessibilityLabel={`${summary.name} 열기`}
            accessibilityRole="button"
            onPress={() => router.push(`/product/${summary.productId}`)}
          >
            <Text style={s.title}>{summary.name}</Text>
            <Text style={s.price}>{summary.finalPrice.toLocaleString("ko-KR")}원</Text>
            <Text style={s.meta}>{summary.lowestPriceEvidenceSummary}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`${summary.name} 비교에서 삭제`}
            accessibilityRole="button"
            onPress={() => actions.remove.mutate(summary.productId)}
          >
            <Text style={s.remove}>삭제</Text>
          </Pressable>
        </View>
      )}
      showsVerticalScrollIndicator={false}
      style={s.container}
    />
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { gap: spacing.md, padding: spacing.lg },
  item: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
  },
  title: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  price: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 13 },
  remove: { color: colors.danger, fontWeight: "700" },
  stateGroup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  state: { padding: spacing.xl, color: colors.muted, textAlign: "center" },
});

export default CompareScreen;
