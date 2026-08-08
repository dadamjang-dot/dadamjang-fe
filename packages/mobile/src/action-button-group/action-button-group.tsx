import ActionButtonCircularPairGroup from "./action-button-circular-pair-group";
import ActionButtonCapsuleGroup from "./action-button-capsule-group";
import type { ActionButtonGroupProps } from "./action-button-group.types";

const ActionButtonGroup = (props: ActionButtonGroupProps) => {
  if (props.variant === "circularPair") {
    return <ActionButtonCircularPairGroup actions={props.actions} animations={props.animations} />;
  }
  return <ActionButtonCapsuleGroup actions={props.actions} animations={props.animations} />;
};

export default ActionButtonGroup;
