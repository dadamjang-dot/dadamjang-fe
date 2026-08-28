import {
  Host,
  Row,
  FilledTonalButton,
  FilledTonalIconButton,
  Icon,
  Text,
  Shape,
} from "@expo/ui/jetpack-compose";
import {
  size,
  height,
  paddingAll,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import { colors } from "@dadamjang/design-tokens";

import type { Action, ActionButtonProps } from "./action-button.types";
import { materialSymbolSources } from "./material-symbol-sources.android";

interface ActionButtonContentProps {
  action: Action;
}

export const ActionButtonContent = ({ action }: ActionButtonContentProps) => {
  const iconSize = action.iconSize ?? 20;

  if (action.icon) {
    return (
      <Icon
        contentDescription={action.accessibilityLabel}
        size={iconSize}
        source={materialSymbolSources[action.icon.md]}
      />
    );
  }

  return action.label ? <Text>{action.label}</Text> : null;
};

const ActionButton = ({ actions, iconOnly }: ActionButtonProps) => {
  const [action] = actions;
  if (!action) return null;

  if (actions.length === 1) {
    const { icon, label, onPress } = action;
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
            modifiers={[width(72), height(40)]}
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
          {icon ? <ActionButtonContent action={action} /> : null}
        </FilledTonalIconButton>
      </Host>
    );
  }

  return (
    <Host matchContents>
      <Row modifiers={[paddingAll(0)]}>
        {actions.map((action) => {
          const itemModifiers = action.icon
            ? [size(40, 40)]
            : [width(72), height(40)];
          return (
            <FilledTonalIconButton
              key={action.accessibilityLabel ?? action.label}
              onClick={action.onPress}
              shape={Shape.Pill({})}
              colors={{
                containerColor: colors.surface,
                contentColor: colors.ink,
              }}
              modifiers={itemModifiers}
            >
              <Row modifiers={[paddingAll(0)]}>
                {action.icon ? <ActionButtonContent action={action} /> : null}
                {action.label ? <Text>{action.label}</Text> : null}
              </Row>
            </FilledTonalIconButton>
          );
        })}
      </Row>
    </Host>
  );
};

export default ActionButton;
