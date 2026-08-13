import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components";
import type { StylePostSort } from "../types";

type StyleSortBarProps = {
  sort: StylePostSort;
  onSelect: (sort: StylePostSort) => void;
};

const sorts: { key: StylePostSort; label: string }[] = [
  { key: "RECOMMENDED", label: "추천순" },
  { key: "POPULAR", label: "인기순" },
  { key: "LATEST", label: "최신순" },
];

const StyleSortBar = ({ sort, onSelect }: StyleSortBarProps) => (
  <View style={s.container} accessibilityLabel="스타일 게시물 정렬">
    {sorts.map(({ key, label }) => {
      const isSelected = key === sort;
      return (
        <Button
          key={key}
          accessibilityState={{ selected: isSelected }}
          onPress={() => onSelect(key)}
          style={s.button}
          variant="bare"
        >
          <Text style={[s.label, isSelected && s.selectedLabel]}>{label}</Text>
        </Button>
      );
    })}
  </View>
);

const s = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  button: { paddingHorizontal: 6, paddingVertical: 8 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  selectedLabel: { color: colors.ink },
});

export default StyleSortBar;
