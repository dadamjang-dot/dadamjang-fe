import { ButtonProps } from "@expo/ui/swift-ui";

interface Action {
  icon?: ButtonProps["systemImage"];
  label?: string;
  onPress: () => void
}

export interface ActionButtonProps extends Omit<ButtonProps, "systemImage"> {
  actions: Action[];
  iconOnly?: boolean;
}
