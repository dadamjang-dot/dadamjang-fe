import type { StyleProp, ViewStyle } from 'react-native';

export type SearchInputProps = {
  placeholder?: string;
  onFocus?: () => void;
  style?: StyleProp<ViewStyle>;
};
