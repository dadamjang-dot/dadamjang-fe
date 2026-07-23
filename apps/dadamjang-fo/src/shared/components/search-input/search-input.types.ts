import type { ViewStyle } from "react-native";

export type SearchInputProps = {
  value?: string;
  placeholder?: string;
  onValueChange?: (text: string) => void;
  style?: ViewStyle;
};
