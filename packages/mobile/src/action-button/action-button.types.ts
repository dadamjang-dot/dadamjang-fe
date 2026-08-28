import type { AndroidSymbol, SFSymbol } from "expo-symbols";

export interface ActionIcon {
  md: AndroidSymbol;
  sf: SFSymbol;
}

interface ActionBase {
  iconSize?: number;
  onPress: () => void;
}

export interface IconAction extends ActionBase {
  accessibilityLabel: string;
  icon: ActionIcon;
  label?: string;
}

export interface TextAction extends ActionBase {
  accessibilityLabel?: string;
  icon?: never;
  label: string;
}

export type Action = IconAction | TextAction;

export interface ActionButtonProps {
  actions: Action[];
  iconOnly?: boolean;
}
