import { useState } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components/button";
import { Sentry } from "@/shared/observability/sentry";

import { useProductPriceEvidence, useProductPriceSummary } from "../hooks";

const formatPrice = (price: number) => `${price.toLocaleString("ko-KR")}원`;
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  });
const recordedExpansionProductIds = new Set<string>();

type ProductPriceEvidenceSectionProps = {
  productId: string;
};

const ProductPriceEvidenceSection = ({
  productId,
}: ProductPriceEvidenceSectionProps) => {
  const [expandedProductId, setExpandedProductId] = useState<string>();
  const expanded = expandedProductId === productId;
  const summary = useProductPriceSummary(productId);
  const priceRevision = summary.data?.priceRevision ?? "";
  const evidence = useProductPriceEvidence(
    productId,
    priceRevision,
    expanded && Boolean(priceRevision),
  );

  const handleToggle = () => {
    if (!expanded && !recordedExpansionProductIds.has(productId)) {
      recordedExpansionProductIds.add(productId);
      Sentry.addBreadcrumb({
        category: "product.price_evidence",
        level: "info",
        message: "PRICE_EVIDENCE_EXPANDED",
        data: { productId },
      });
    }
    setExpandedProductId(expanded ? undefined : productId);
  };

  const handleRetry = async () => {
    const previousRevision = priceRevision;
    const refreshedSummary = await summary.refetch();
    if (refreshedSummary.data?.priceRevision === previousRevision) {
      await evidence.refetch();
    }
  };

  return (
    <View style={s.container}>
      <Button
        accessibilityLabel={`최저가 산정 근거 ${expanded ? "접기" : "펼치기"}`}
        accessibilityState={{ expanded }}
        onPress={handleToggle}
        style={s.trigger}
        variant="bare"
      >
        <Text style={s.triggerLabel}>최저가 산정 근거</Text>
        <Text style={s.triggerIcon}>{expanded ? "−" : "+"}</Text>
      </Button>
      {expanded ? (
        <View accessibilityLabel="최저가 산정 근거" style={s.content}>
          {summary.isLoading || evidence.isLoading ? (
            <Text accessibilityRole="progressbar" style={s.mutedText}>
              가격 근거를 불러오는 중이에요.
            </Text>
          ) : summary.isError || evidence.isError ? (
            <View style={s.stateGroup}>
              <Text accessibilityRole="alert" style={s.errorText}>
                가격 근거를 불러오지 못했어요.
              </Text>
              <Button
                accessibilityLabel="가격 근거 다시 시도"
                label="다시 시도"
                onPress={handleRetry}
                variant="secondary"
              />
            </View>
          ) : summary.data && evidence.data ? (
            <View style={s.details}>
              <View style={s.highlight}>
                <Text style={s.price}>
                  현재 최저가 {formatPrice(summary.data.finalPrice)}
                </Text>
                <Text style={s.summary}>
                  {summary.data.lowestPriceEvidenceSummary}
                </Text>
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>옵션 가격 구성</Text>
                {evidence.data.priceHistory.length === 0 ? (
                  <Text style={s.mutedText}>옵션 가격 정보가 없어요.</Text>
                ) : (
                  evidence.data.priceHistory.map((item) => (
                    <View
                      key={`${item.label}-${item.recordedAt}`}
                      style={s.item}
                    >
                      <Text style={s.itemTitle}>
                        {item.label} {formatPrice(item.price)}
                      </Text>
                      <Text style={s.mutedText}>
                        기록 {formatDateTime(item.recordedAt)}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>쿠폰 조건</Text>
                {evidence.data.couponConditions.length === 0 ? (
                  <Text style={s.mutedText}>적용 가능한 쿠폰이 없어요.</Text>
                ) : (
                  evidence.data.couponConditions.map((coupon) => (
                    <View key={coupon.title} style={s.item}>
                      <Text style={s.itemTitle}>
                        {coupon.title} · {formatPrice(coupon.discountAmount)}{" "}
                        할인
                      </Text>
                      <Text style={s.mutedText}>{coupon.condition}</Text>
                    </View>
                  ))
                )}
              </View>

              <View style={s.section}>
                <Text style={s.sectionTitle}>배송 조건</Text>
                {evidence.data.shippingPolicy ? (
                  <View style={s.item}>
                    <Text style={s.itemTitle}>
                      {evidence.data.shippingPolicy.title} ·{" "}
                      {evidence.data.shippingPolicy.shippingFee === 0
                        ? "무료"
                        : formatPrice(evidence.data.shippingPolicy.shippingFee)}
                    </Text>
                    <Text style={s.mutedText}>
                      {evidence.data.shippingPolicy.condition}
                    </Text>
                  </View>
                ) : (
                  <Text style={s.mutedText}>배송 정보가 없어요.</Text>
                )}
              </View>

              <View style={s.meta}>
                <Text style={s.mutedText}>
                  출처 {evidence.data.offerSource}
                </Text>
                <Text style={s.mutedText}>
                  계산 {formatDateTime(evidence.data.calculatedAt)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={s.mutedText}>표시할 가격 근거가 없어요.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    overflow: "hidden",
  },
  trigger: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  triggerLabel: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  triggerIcon: { color: colors.primary, fontSize: 20, fontWeight: "700" },
  content: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  stateGroup: { gap: 12 },
  details: { gap: 20 },
  highlight: { gap: 4 },
  price: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  summary: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  section: { gap: 8 },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  item: { gap: 2 },
  itemTitle: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  mutedText: { color: colors.muted, fontSize: 13 },
  errorText: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  meta: { gap: 4 },
});

export { ProductPriceEvidenceSection };
