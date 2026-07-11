import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { trackCommerceEvent } from '@/features/analytics';
import { colors } from '@dadamjang/design-tokens';

import { useProductPriceEvidence } from './hooks';

import type { ProductPriceSummary } from './types';

type PriceSummaryCardProps = {
  summary: ProductPriceSummary;
  onPress: () => void;
  onRemove?: (productId: string) => void;
};

export const PriceSummaryCard = ({ summary, onPress, onRemove }: PriceSummaryCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const evidence = useProductPriceEvidence(summary.productId, summary.priceRevision, expanded);
  const discountAmount = Math.max(summary.basePrice - summary.finalPrice, 0);
  const toggleEvidence = () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    if (nextExpanded) {
      trackCommerceEvent({
        eventType: 'PRICE_EVIDENCE_EXPANDED',
        subjectType: 'PRODUCT',
        subjectId: summary.productId,
      });
    }
  };

  return (
    <View style={styles.card}>
      <Pressable onPress={onPress}>
        {summary.thumbnail ? <Image source={summary.thumbnail} style={styles.image} contentFit="cover" transition={160} /> : null}
        <Text style={styles.title} numberOfLines={2}>
          {summary.name}
        </Text>
        <Text style={styles.price}>{summary.finalPrice.toLocaleString()}원</Text>
        {discountAmount > 0 ? <Text style={styles.basePrice}>{summary.basePrice.toLocaleString()}원</Text> : null}
        <Text style={styles.summary}>{summary.lowestPriceEvidenceSummary}</Text>
      </Pressable>
      <Pressable style={styles.evidenceButton} onPress={toggleEvidence}>
        <Text style={styles.evidenceButtonText}>{expanded ? '가격 근거 접기' : '가격 근거 보기'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.evidenceBox}>
          {evidence.isPending ? <Text style={styles.summary}>가격 근거를 불러오는 중</Text> : null}
          {evidence.data ? (
            <>
              <Text style={styles.evidenceTitle}>가격 이력</Text>
              {evidence.data.priceHistory.map((item) => (
                <Text key={item.label} style={styles.evidenceText}>
                  {item.label}: {item.price.toLocaleString()}원
                </Text>
              ))}
              <Text style={styles.evidenceTitle}>쿠폰 조건</Text>
              {evidence.data.couponConditions.map((coupon) => (
                <Text key={coupon.title} style={styles.evidenceText}>
                  {coupon.title}: {coupon.discountAmount.toLocaleString()}원 · {coupon.condition}
                </Text>
              ))}
              <Text style={styles.evidenceTitle}>배송</Text>
              <Text style={styles.evidenceText}>
                {evidence.data.shippingPolicy.title}: {evidence.data.shippingPolicy.shippingFee.toLocaleString()}원 ·{' '}
                {evidence.data.shippingPolicy.condition}
              </Text>
              <Text style={styles.evidenceText}>출처: {evidence.data.offerSource}</Text>
            </>
          ) : null}
        </View>
      ) : null}
      {onRemove ? (
        <Pressable style={styles.removeButton} onPress={() => onRemove(summary.productId)}>
          <Text style={styles.removeButtonText}>비교함에서 삭제</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 12,
    padding: 12,
  },
  image: { width: '100%', height: 210, borderRadius: 14, backgroundColor: colors.canvas },
  title: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 8 },
  price: { color: colors.primary, fontSize: 18, fontWeight: '800', marginTop: 6 },
  basePrice: { color: colors.muted, fontSize: 13, marginTop: 2, textDecorationLine: 'line-through' },
  summary: { color: colors.muted, fontSize: 13, marginTop: 6 },
  evidenceButton: { backgroundColor: colors.primarySoft, borderRadius: 999, marginTop: 10, padding: 10 },
  evidenceButtonText: { color: colors.primary, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  evidenceBox: { backgroundColor: colors.canvas, borderRadius: 14, gap: 4, marginTop: 10, padding: 12 },
  evidenceTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 6 },
  evidenceText: { color: colors.muted, fontSize: 12 },
  removeButton: { backgroundColor: colors.danger, borderRadius: 999, marginTop: 10, padding: 10 },
  removeButtonText: { color: colors.surface, fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
