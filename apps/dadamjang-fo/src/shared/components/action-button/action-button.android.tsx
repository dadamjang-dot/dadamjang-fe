import {
  Host,
  Row,
  FilledTonalButton,
  FilledTonalIconButton,
  IconButton,
  Icon,
  Text,
  Shape,
} from "@expo/ui/jetpack-compose";
import { size, height, paddingAll } from "@expo/ui/jetpack-compose/modifiers";
import { colors } from "@dadamjang/design-tokens";

import type { ActionButtonProps } from "./action-button.types";

const ActionButton = ({ actions, iconOnly }: ActionButtonProps) => {
  if (!actions || actions.length === 0) return null;

  if (actions.length === 1) {
    const { icon, label, onPress } = actions[0];
    const isCircle = iconOnly && !!icon && !label;

    if (label && !icon) {
      return (
        <Host matchContents>
          <FilledTonalButton
            onClick={onPress}
            shape={Shape.Pill({})}
            colors={{
              containerColor: colors.surface,
              contentColor: colors.ink,
            }}
            modifiers={[height(40)]}
          >
            <Text>{label}</Text>
          </FilledTonalButton>
        </Host>
      );
    }

    return (
      <Host matchContents>
        <FilledTonalIconButton
          onClick={onPress}
          shape={isCircle ? Shape.Circle({}) : Shape.Pill({})}
          colors={{
            containerColor: colors.surface,
            contentColor: colors.ink,
          }}
          modifiers={[size(40, 40)]}
        >
          {icon ? <Icon source={{ uri: icon }} size={20} /> : null}
        </FilledTonalIconButton>
      </Host>
    );
  }

  return (
    <Host matchContents>
      <FilledTonalButton
        shape={Shape.Pill({})}
        colors={{
          containerColor: colors.surface,
          contentColor: colors.ink,
        }}
        modifiers={[height(40)]}
      >
        <Row modifiers={[paddingAll(0)]}>
          {actions.map((action, idx) => (
            <IconButton
              key={action.label ?? idx}
              onClick={action.onPress}
              modifiers={[size(32, 32)]}
            >
              {action.label ? (
                <Text>{action.label}</Text>
              ) : action.icon ? (
                <Icon source={{ uri: action.icon }} size={20} />
              ) : null}
            </IconButton>
          ))}
        </Row>
      </FilledTonalButton>
    </Host>
  );
};

export default ActionButton;
