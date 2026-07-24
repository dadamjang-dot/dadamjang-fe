import { TextInput } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import type { SearchInputProps } from "./search-input.types";

const SearchInput = ({
  value,
  placeholder,
  onValueChange,
}: SearchInputProps) => {
  return (
    <TextInput
      value={value}
      placeholder={placeholder}
      onChangeText={onValueChange}
      style={s.input}
    />
  );
};

const s = StyleSheet.create({
  input: {
    flex: 1,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
  },
});

export default SearchInput;
