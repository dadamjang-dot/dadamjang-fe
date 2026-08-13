import { Modal, Pressable, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components";
import type { WishProductSort } from "../types";

const sortOptions: { id: WishProductSort; label: string }[] = [
  { id: "RECOMMENDED", label: "추천순" },
  { id: "LATEST", label: "최신순" },
  { id: "LOW_PRICE", label: "낮은 가격순" },
  { id: "HIGH_PRICE", label: "높은 가격순" },
];

type WishSortSheetProps = {
  visible: boolean;
  selectedSort: WishProductSort;
  onClose: () => void;
  onSelect: (sort: WishProductSort) => void;
};

const WishSortSheet = ({
  visible,
  selectedSort,
  onClose,
  onSelect,
}: WishSortSheetProps) => (
  <Modal
    animationType="slide"
    onRequestClose={onClose}
    transparent
    visible={visible}
  >
    <View style={s.backdrop}>
      <Pressable onPress={onClose} style={s.dismiss} />
      <View style={s.sheet}>
        <View style={s.handle} />
        {sortOptions.map((option) => {
          const isSelected = option.id === selectedSort;
          return (
            <Button
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              key={option.id}
              onPress={() => onSelect(option.id)}
              style={s.option}
              testID={`e2e.wish.sort.${option.id.toLowerCase()}`}
              variant="bare"
            >
              <Text style={s.optionLabel}>{option.label}</Text>
              <View style={[s.check, isSelected && s.selectedCheck]}>
                {isSelected ? <Text style={s.checkLabel}>✓</Text> : null}
              </View>
            </Button>
          );
        })}
      </View>
    </View>
  </Modal>
);

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  dismiss: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.ink,
    opacity: 0.32,
  },
  sheet: {
    gap: 4,
    padding: 16,
    paddingBottom: 32,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.surface,
  },
  handle: { alignSelf: "center", width: 36, height: 4, marginBottom: 8, borderRadius: 2, backgroundColor: colors.line },
  option: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.primarySoft,
  },
  optionLabel: { color: colors.ink, fontSize: 15 },
  check: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: colors.line },
  selectedCheck: { borderColor: colors.ink, backgroundColor: colors.ink },
  checkLabel: { color: colors.surface, fontSize: 14, fontWeight: "700" },
});

export default WishSortSheet;
