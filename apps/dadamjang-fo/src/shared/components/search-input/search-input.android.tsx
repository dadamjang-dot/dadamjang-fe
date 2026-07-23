import { Host, TextField, useNativeState } from "@expo/ui/jetpack-compose";
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
        <TextField value={text} onValueChange={onValueChange}>
          <TextField.Placeholder>
            <View />
          </TextField.Placeholder>
        </TextField>
      </Host>
    </View>
  );
};

export default SearchInput;
