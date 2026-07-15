import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { colors } from '@dadamjang/design-tokens';

const categories = ['NEW', 'WISH', 'PRICE TRUST', 'DAILY', 'LIMITED'];

const trustItems = [
  { label: '가격 근거', value: 'Price Trust' },
  { label: '취향 저장', value: 'Wishlist' },
  { label: '상품 비교', value: 'Compare' },
];

export const HomeShowcase = () => (
  <View style={styles.container}>
    <Text style={styles.brand}>DADAMJANG</Text>
    <View style={styles.hero}>
      <Text style={styles.kicker}>TODAY PICK</Text>
      <Text style={styles.heroTitle}>취향저격 위시템을{'\n'}한 번에 담아봐요.</Text>
      <Text style={styles.heroCopy}>가격 근거부터 장바구니까지, 좋아하는 걸 다담장.</Text>
      <Pressable
        accessibilityLabel="위시템 찾기"
        accessibilityRole="button"
        style={styles.primaryButton}
        onPress={() => router.push('/shop')}>
        <Text style={styles.primaryButtonText}>위시템 찾기</Text>
      </Pressable>
    </View>
    <View style={styles.categoryRow}>
      {categories.map((category) => (
        <Pressable
          accessibilityLabel={`${category} 카테고리 보기`}
          accessibilityRole="button"
          key={category}
          style={styles.categoryChip}
          onPress={() => router.push('/shop')}>
          <Text style={styles.categoryText}>{category}</Text>
        </Pressable>
      ))}
    </View>
    <View style={styles.trustGrid}>
      {trustItems.map((item) => (
        <View key={item.value} style={styles.trustCard}>
          <Text style={styles.trustValue}>{item.value}</Text>
          <Text style={styles.trustLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Popular Wish Items</Text>
      <Text style={styles.sectionHint}>인기순</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 64,
  },
  brand: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.4,
  },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 22,
    padding: 20,
  },
  kicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -0.8,
    lineHeight: 34,
    marginTop: 12,
  },
  heroCopy: {
    color: '#CFCFCF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 10,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 999,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  trustGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  trustCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  trustValue: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  trustLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
});
