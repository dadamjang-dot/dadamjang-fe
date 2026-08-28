import type { AndroidSymbol, SFSymbol } from "expo-symbols";

export type ActionMaterialSymbol = Extract<
  AndroidSymbol,
  "add" | "close" | "menu" | "notifications" | "settings" | "shopping_cart"
>;

export interface ActionIcon {
  md: ActionMaterialSymbol;
  sf: SFSymbol;
}

interface ActionBase {
  iconSize?: number;
  onPress: () => void;
}

export interface IconAction extends ActionBase {
  accessibilityLabel: string;
  icon: ActionIcon;
  label?: never;
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
