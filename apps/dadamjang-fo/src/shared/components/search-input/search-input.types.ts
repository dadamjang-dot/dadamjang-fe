export interface SearchInputProps {
  value?: string;
  placeholder?: string;
  onValueChange?: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  autoFocus?: boolean;
}
