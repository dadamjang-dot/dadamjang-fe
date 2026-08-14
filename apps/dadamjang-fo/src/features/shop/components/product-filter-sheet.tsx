import { type ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components";

type ProductFilterSheetProps = {
  filterBar: ReactNode;
  totalCount: number;
  onReset: () => void;
  onViewProducts: () => void;
  children: ReactNode;
};

const ProductFilterSheet = ({
  filterBar,
  totalCount,
  onReset,
  onViewProducts,
  children,
}: ProductFilterSheetProps) => (
  <View collapsable={false} style={s.container}>
    <ScrollView
      style={s.contentScroll}
      contentContainerStyle={s.content}
      stickyHeaderIndices={[0]}
    >
      <View collapsable={false} style={s.header}>
        {filterBar}
      </View>
      <View style={s.contentBody}>{children}</View>
    </ScrollView>
    <View style={s.footer}>
      <Button
        label="초기화"
        onPress={onReset}
        style={s.resetButton}
        testID="e2e.filter.reset"
        variant="secondary"
      />
      <Button
        label={`${totalCount.toLocaleString("ko-KR")}개 상품 보기`}
        onPress={onViewProducts}
        style={s.viewButton}
        testID="e2e.filter.apply"
      />
    </View>
  </View>
);

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    zIndex: 1,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  content: {
    paddingBottom: 28,
  },
  contentBody: {
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  contentScroll: {
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
  resetButton: {
    width: 80,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  viewButton: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});

export default ProductFilterSheet;
