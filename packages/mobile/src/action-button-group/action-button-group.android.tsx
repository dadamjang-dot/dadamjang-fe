import { Host, Row, FilledTonalIconButton, Icon, Shape } from "@expo/ui/jetpack-compose";
import { size } from "@expo/ui/jetpack-compose/modifiers";

import { colors } from "@dadamjang/design-tokens";
import type { ActionButtonGroupProps } from "./action-button-group.types";

const ActionButtonGroup = ({
  variant,
  actions,
}: ActionButtonGroupProps) => {
  if (variant === "circularPair") {
    return (
      <Host matchContents>
        <Row>
          {actions.map((action, idx) => (
            <FilledTonalIconButton
              key={action.label ?? action.icon ?? idx}
              onClick={action.onPress}
              shape={Shape.Circle({})}
              colors={{
                containerColor: colors.surface,
                contentColor: colors.ink,
              }}
              modifiers={[size(40, 40)]}
            >
              {action.icon ? (
                <Icon source={{ uri: action.icon }} size={20} />
              ) : null}
            </FilledTonalIconButton>
          ))}
        </Row>
      </Host>
    );
  }

  // capsule: actions in one button
  return (
    <Host matchContents>
      <Row>
        {actions.map((action, idx) => (
          <FilledTonalIconButton
            key={action.label ?? action.icon ?? idx}
            onClick={action.onPress}
            shape={Shape.Pill({})}
            colors={{
              containerColor: colors.surface,
              contentColor: colors.ink,
            }}
            modifiers={[size(40, 40)]}
          >
            {action.icon ? (
              <Icon source={{ uri: action.icon }} size={20} />
            ) : null}
          </FilledTonalIconButton>
        ))}
      </Row>
    </Host>
  );
};

export default ActionButtonGroup;
