export interface Action {
  accessibilityLabel?: string;
  icon?: string;
  iconSize?: number;
  label?: string;
  onPress: () => void;
}

export interface ActionButtonProps {
  actions: Action[];
  iconOnly?: boolean;
}
