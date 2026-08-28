import type { AndroidSymbol, SFSymbol } from "expo-symbols";

export interface ActionIcon {
  md: AndroidSymbol;
  sf: SFSymbol;
}

export interface Action {
  accessibilityLabel?: string;
  icon?: ActionIcon;
  iconSize?: number;
  label?: string;
  onPress: () => void;
}

export interface ActionButtonProps {
  actions: Action[];
  iconOnly?: boolean;
}
