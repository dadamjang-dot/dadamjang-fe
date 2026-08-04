import {
  Button,
  HStack,
  Host,
  Image,
  Text,
  type ButtonProps,
  type ImageProps,
} from "@expo/ui/swift-ui";
import {
  controlSize,
  frame,
  padding,
  foregroundStyle,
  glassEffect,
  buttonStyle,
} from "@expo/ui/swift-ui/modifiers";
import { colors } from "@dadamjang/design-tokens";

import type {
  Action,
  ActionButtonProps as BaseActionButtonProps,
} from "./action-button.types";

export interface ActionButtonProps
  extends BaseActionButtonProps,
    Omit<ButtonProps, "systemImage"> {}

const getButtonModifiers = (action: Action, iconOnly?: boolean) => {
  const isIconOnly = !!(iconOnly && action.icon && !action.label);

  return [
    controlSize("regular"),
    frame({ height: 40, width: isIconOnly ? 40 : undefined }),
    glassEffect({
      glass: {
        variant: "regular",
        interactive: true,
        tint: colors.surface,
      },
      shape: isIconOnly ? "circle" : "capsule",
    }),
  ];
};

const getGroupedActionModifiers = (action: Action, iconOnly?: boolean) => {
  const isIconOnly = !!(iconOnly && action.icon && !action.label);

  return [
    buttonStyle("plain"),
    controlSize("regular"),
    frame({ height: 40, width: isIconOnly ? 40 : undefined }),
  ];
};

const groupedButtonModifiers = [
  frame({ height: 40 }),
  padding({ horizontal: 4 }),
  glassEffect({
    glass: {
      variant: "regular",
      interactive: true,
      tint: colors.surface,
    },
    shape: "capsule",
  }),
];

const ActionButton = ({ actions, iconOnly }: ActionButtonProps) => {
  if (!actions || actions.length === 0) return null;

  const imgModifiers = [frame({ width: 24, height: 24 }), foregroundStyle(colors.primary)];
  const textModifiers = [padding({ vertical: 2.83 }), foregroundStyle(colors.primary)];

  if (actions.length === 1) {
    const action = actions[0];

    return (
      <Host matchContents>
        <Button onPress={action.onPress} modifiers={getButtonModifiers(action, iconOnly)}>
          {action.icon ? (
            <Image systemName={action.icon as ImageProps["systemName"]} modifiers={imgModifiers} />
          ) : action.label ? (
            <Text modifiers={textModifiers}>{action.label}</Text>
          ) : undefined}
        </Button>
      </Host>
    );
  }

  return (
    <Host matchContents>
      <HStack spacing={4} modifiers={groupedButtonModifiers}>
        {actions.map((action, idx) => (
          <Button
            key={action.label ?? action.icon ?? idx}
            onPress={action.onPress}
            modifiers={getGroupedActionModifiers(action, iconOnly)}
          >
            {action.icon ? (
              <Image
                systemName={action.icon as ImageProps["systemName"]}
                modifiers={imgModifiers}
              />
            ) : action.label ? (
              <Text modifiers={textModifiers}>{action.label}</Text>
            ) : undefined}
          </Button>
        ))}
      </HStack>
    </Host>
  );
};

export default ActionButton;
