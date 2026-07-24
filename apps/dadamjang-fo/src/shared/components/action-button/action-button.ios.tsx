import { Host, HStack, Button, Image, Text, type ButtonProps, type ImageProps } from "@expo/ui/swift-ui";
import {
  buttonBorderShape,
  controlSize,
  buttonStyle,
  tint,
  frame,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { colors } from "@dadamjang/design-tokens";

import type { ActionButtonProps as BaseActionButtonProps } from "./action-button.types";

export interface ActionButtonProps
  extends BaseActionButtonProps,
    Omit<ButtonProps, "systemImage"> {}

const ActionButton = ({ actions, iconOnly }: ActionButtonProps) => {
  if (!actions || actions.length === 0) return null;

  const singleAction = actions.length === 1 ? actions[0] : null;
  const isIconOnlySingle = !!(iconOnly && singleAction?.icon && !singleAction?.label);
  const btnWidth = isIconOnlySingle ? 40 : undefined;

  const btnModifiers = [
    buttonStyle("glass"),
    controlSize("regular"),
    tint(colors.ink),
    frame({ height: 40, width: btnWidth }),
  ];

  const imgModifiers = [frame({ width: 24, height: 24 })];
  const textModifiers = [padding({ vertical: 2.83 })];

  if (actions.length === 1) {
    const { icon, label, onPress } = actions[0];

    return (
      <Host matchContents>
        <Button
          onPress={onPress}
          modifiers={[
            ...btnModifiers,
            buttonBorderShape(isIconOnlySingle ? "circle" : "capsule"),
          ]}
        >
          {icon ? (
            <Image systemName={icon as ImageProps["systemName"]} modifiers={imgModifiers} />
          ) : label ? (
            <Text modifiers={textModifiers}>{label}</Text>
          ) : undefined}
        </Button>
      </Host>
    );
  }

  return (
    <Host matchContents>
      <Button modifiers={[...btnModifiers, buttonBorderShape("capsule")]}>
        <HStack spacing={12}>
          {actions.map((action, idx) => (
            <HStack key={action.label ?? idx} spacing={4}>
              {action.icon ? (
                <Image
                  systemName={action.icon as ImageProps["systemName"]}
                  modifiers={imgModifiers}
                />
              ) : null}
              {action.label ? <Text modifiers={textModifiers}>{action.label}</Text> : null}
            </HStack>
          ))}
        </HStack>
      </Button>
    </Host>
  );
};

export default ActionButton;
