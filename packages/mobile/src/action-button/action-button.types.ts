export interface Action {
  icon?: string;
  label?: string;
  onPress: () => void;
}

export interface ActionButtonProps {
  actions: Action[];
  iconOnly?: boolean;
}
