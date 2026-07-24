import { useRef, type ReactNode } from "react";
import { View, type TextInput } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { ActionButton, SearchInput } from "@/shared/components";

export interface ProductHeaderProps {
  children?: ReactNode;
  isSearching?: boolean;
  onSearchFocus?: () => void;
  onSearchCancel?: () => void;
  searchValue?: string;
  onSearchValueChange?: (text: string) => void;
}

const ProductHeader = ({
  children,
  isSearching = false,
  onSearchFocus,
  onSearchCancel,
  searchValue,
  onSearchValueChange,
}: ProductHeaderProps) => {
  const inputRef = useRef<TextInput>(null);

  const handleCancel = () => {
    inputRef.current?.blur();
    onSearchCancel?.();
  };

  return (
    <View style={s.container}>
      <SearchInput
        ref={inputRef}
        value={searchValue}
        placeholder="Search"
        onValueChange={onSearchValueChange}
        onFocus={onSearchFocus}
      />
      <View style={s.btnWrapper}>
        {isSearching ? (
          <ActionButton actions={[{ label: "취소", onPress: handleCancel }]} />
        ) : (
          children
        )}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnWrapper: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});

export default ProductHeader;
