import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import {
  unstable_getMaterialSymbolSourceAsync,
  type AndroidSymbol,
} from "expo-symbols";
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
import {
  size,
  height,
  paddingAll,
  width,
} from "@expo/ui/jetpack-compose/modifiers";
import { colors } from "@dadamjang/design-tokens";

import type { Action, ActionButtonProps } from "./action-button.types";

const getMaterialSymbolSourceAsync =
  unstable_getMaterialSymbolSourceAsync as unknown as (
    symbol: AndroidSymbol,
    size: number,
    color: string,
  ) => Promise<ImageSourcePropType | null>;

interface ActionButtonContentProps {
  action: Action;
}

export const ActionButtonContent = ({ action }: ActionButtonContentProps) => {
  const iconSize = action.iconSize ?? 20;
  const materialIcon = action.icon?.md;
  const [source, setSource] = useState<ImageSourcePropType | null>(null);

  useEffect(() => {
    let active = true;
    setSource(null);

    if (materialIcon) {
      void getMaterialSymbolSourceAsync(
        materialIcon,
        iconSize,
        "white",
      ).then(
        (nextSource) => {
          if (active) setSource(nextSource);
        },
        () => {
          if (active) setSource(null);
        },
      );
    }

    return () => {
      active = false;
    };
  }, [iconSize, materialIcon]);

  if (action.icon) {
    return source ? (
      <Icon
        contentDescription={action.accessibilityLabel}
        size={iconSize}
        source={source}
      />
    ) : null;
  }

  return action.label ? <Text>{action.label}</Text> : null;
};

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
          {icon ? <ActionButtonContent action={actions[0]} /> : null}
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
          {actions.map((action, idx) => {
            const itemModifiers =
              action.label && !action.icon ? [height(32)] : [size(32, 32)];
            return (
              <IconButton
                key={action.accessibilityLabel ?? action.label ?? idx}
                onClick={action.onPress}
                modifiers={itemModifiers}
              >
                <Row modifiers={[paddingAll(0)]}>
                  {action.icon ? (
                    <ActionButtonContent action={action} />
                  ) : null}
                  {action.label ? <Text>{action.label}</Text> : null}
                </Row>
              </IconButton>
            );
          })}
        </Row>
      </FilledTonalButton>
    </Host>
  );
};

export default ActionButton;
