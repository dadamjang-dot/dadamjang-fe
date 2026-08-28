import { Host, Row, FilledTonalIconButton, Shape } from "@expo/ui/jetpack-compose";
import { size } from "@expo/ui/jetpack-compose/modifiers";

import { colors } from "@dadamjang/design-tokens";
import { ActionButtonContent } from "../action-button/action-button.android";
import type { ActionButtonGroupProps } from "./action-button-group.types";

const ActionButtonGroup = ({
  variant = "capsule",
  actions,
}: ActionButtonGroupProps) => {
  if (variant === "circularPair") {
    return (
      <Host matchContents>
        <Row>
          {actions.map((action, idx) => (
            <FilledTonalIconButton
              key={action.accessibilityLabel ?? action.label ?? idx}
              onClick={action.onPress}
              shape={Shape.Circle({})}
              colors={{
                containerColor: colors.surface,
                contentColor: colors.ink,
              }}
              modifiers={[size(40, 40)]}
            >
              {action.icon ? (
                <ActionButtonContent action={action} />
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
            key={action.accessibilityLabel ?? action.label ?? idx}
            onClick={action.onPress}
            shape={Shape.Pill({})}
            colors={{
              containerColor: colors.surface,
              contentColor: colors.ink,
            }}
            modifiers={[size(40, 40)]}
          >
            {action.icon ? (
              <ActionButtonContent action={action} />
            ) : null}
          </FilledTonalIconButton>
        ))}
      </Row>
    </Host>
  );
};

export default ActionButtonGroup;
