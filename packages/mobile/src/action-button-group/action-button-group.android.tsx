import {
  Host,
  Row,
  FilledTonalIconButton,
  Shape,
} from "@expo/ui/jetpack-compose";
import { size } from "@expo/ui/jetpack-compose/modifiers";

import { colors } from "@dadamjang/design-tokens";
import { ActionButtonContent } from "../action-button/action-button.android";
import type { ActionButtonGroupProps } from "./action-button-group.types";

const ActionButtonGroup = ({
  variant = "capsule",
  actions,
}: ActionButtonGroupProps) => {
  const shape = variant === "circularPair" ? Shape.Circle({}) : Shape.Pill({});

  return (
    <Host matchContents>
      <Row>
        {actions.map((action) => (
          <FilledTonalIconButton
            key={action.accessibilityLabel ?? action.label}
            onClick={action.onPress}
            shape={shape}
            colors={{
              containerColor: colors.surface,
              contentColor: colors.ink,
            }}
            modifiers={[size(40, 40)]}
          >
            <ActionButtonContent action={action} />
          </FilledTonalIconButton>
        ))}
      </Row>
    </Host>
  );
};

export default ActionButtonGroup;
