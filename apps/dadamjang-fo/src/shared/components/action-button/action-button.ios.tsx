import { Host, HStack, Button, Image } from "@expo/ui/swift-ui";
import {
  buttonBorderShape,
  controlSize,
  buttonStyle,
  tint,
  frame,
  imageScale,
} from "@expo/ui/swift-ui/modifiers";
import { colors } from "@dadamjang/design-tokens";

import type { ActionButtonProps } from "./action-button.types";

const ActionButton = ({ actions, iconOnly }: ActionButtonProps) => {
  if (actions?.length === 0) return null;

  const btnModifiers = [
    buttonStyle("glass"),
    controlSize("small"),
    tint(colors.ink),
    frame({ height: 40 }),
    imageScale("small"),
  ];

  if (actions.length === 1) {
    const { icon, label, onPress } = actions[0];
    const isCircle = iconOnly && !!icon && !label;

    return (
      <Host matchContents>
          <Button
            label={label}
            onPress={onPress}
            modifiers={[
              ...btnModifiers,
              buttonBorderShape(isCircle ? "circle" : "capsule"),
            ]}
          >
          <Image systemName={icon} />
        </Button>
      </Host>
    );
  }

  return (
    <Host matchContents>
      <Button modifiers={[...btnModifiers, buttonBorderShape("capsule")]}>
        <HStack spacing={12}>
          {actions.map((action) => (
            <Image key={action.label} systemName={action.icon} />
          ))}
        </HStack>
      </Button>
    </Host>
  );
};

export default ActionButton;
