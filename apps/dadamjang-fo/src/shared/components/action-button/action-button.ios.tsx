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
  background,
  clipShape,
  contentShape,
  glassEffect,
  buttonStyle,
  shapes,
  strokeBorder,
} from "@expo/ui/swift-ui/modifiers";
import { colors } from "@dadamjang/design-tokens";

import type {
  Action,
  ActionButtonProps as BaseActionButtonProps,
} from "./action-button.types";

export interface ActionButtonProps
  extends BaseActionButtonProps,
    Omit<ButtonProps, "systemImage"> {}

const getSurfaceModifiers = (shape: "circle" | "capsule") => [
  background("transparent"),
  strokeBorder({
    color: colors.line,
    shape,
    style: { lineWidth: 1 },
  }),
  glassEffect({
    glass: {
      variant: "clear",
      interactive: true,
    },
    shape,
  }),
];

const getButtonModifiers = (action: Action, iconOnly?: boolean) => {
  const isIconOnly = !!(iconOnly && action.icon && !action.label);
  const shape = isIconOnly ? "circle" : "capsule";

  return [
    buttonStyle("plain"),
    controlSize("regular"),
    frame({ height: 40, width: isIconOnly ? 40 : undefined }),
    ...getSurfaceModifiers(shape),
  ];
};

const groupedActionModifiers = [
  buttonStyle("plain"),
  controlSize("regular"),
  frame({ width: 40, height: 40 }),
  padding({ horizontal: 2 }),
  contentShape(shapes.rectangle()),
];

const groupedButtonModifiers = [
  frame({ height: 40 }),
  clipShape("capsule"),
  ...getSurfaceModifiers("capsule"),
];

const ActionButton = ({ actions, iconOnly }: ActionButtonProps) => {
  if (!actions || actions.length === 0) return null;

  const imgModifiers = [frame({ width: 24, height: 24 }), foregroundStyle(colors.primary)];
  const textModifiers = [
    padding({ vertical: 2.83, horizontal: 16 }),
    foregroundStyle(colors.primary),
  ];

  if (actions.length === 1) {
    const action = actions[0];

    return (
      <Host matchContents>
        <Button onPress={action.onPress} modifiers={getButtonModifiers(action, iconOnly)}>
          {action.icon ? (
            <Image
              systemName={action.icon as ImageProps["systemName"]}
              modifiers={imgModifiers}
            />
          ) : action.label ? (
            <Text modifiers={textModifiers}>{action.label}</Text>
          ) : undefined}
        </Button>
      </Host>
    );
  }

  return (
    <Host matchContents>
      <HStack spacing={0} modifiers={groupedButtonModifiers}>
        {actions.map((action, idx) => (
          <Button
            key={action.label ?? action.icon ?? idx}
            onPress={action.onPress}
            modifiers={groupedActionModifiers}
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
