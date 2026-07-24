import { View, Text } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import { colors } from "@dadamjang/design-tokens";

import type { SearchContentProps } from "./search-content.types";

const SearchContent = ({ keyword }: SearchContentProps) => {
  return (
    <View style={s.container}>
      {keyword ? (
        <Text style={s.title}>{`"${keyword}" 검색 결과`}</Text>
      ) : (
        <>
          <Text style={s.title}>최근 검색어</Text>
          <Text style={s.emptyText}>최근 검색 내역이 없습니다.</Text>
        </>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.canvas,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
  },
});

export default SearchContent;
