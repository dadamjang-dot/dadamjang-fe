import { forwardRef } from "react";
import { TextInput } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import type { SearchInputProps } from "./search-input.types";

const SearchInput = forwardRef<TextInput, SearchInputProps>(
  ({ value, placeholder, onValueChange, onFocus, onBlur, autoFocus }, ref) => {
    return (
      <TextInput
        ref={ref}
        value={value}
        placeholder={placeholder}
        onChangeText={onValueChange}
        onFocus={onFocus}
        onBlur={onBlur}
        autoFocus={autoFocus}
        style={s.input}
      />
    );
  }
);

SearchInput.displayName = "SearchInput";

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
