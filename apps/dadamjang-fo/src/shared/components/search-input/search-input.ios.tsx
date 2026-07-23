import { Host, TextField, useNativeState } from "@expo/ui/swift-ui";
import { View } from "react-native";

import type { SearchInputProps } from "./search-input.types";

const SearchInput = ({
  value,
  placeholder,
  onValueChange,
  style,
}: SearchInputProps) => {
  const text = useNativeState(value ?? "");

  return (
    <View style={style}>
      <Host matchContents>
        <TextField
          text={text}
          placeholder={placeholder}
          onTextChange={onValueChange}
        />
      </Host>
    </View>
  );
};

export default SearchInput;
