import ActionButtonCircularPairGroup from "./action-button-circular-pair-group.ios";
import ActionButtonCapsuleGroup from "./action-button-capsule-group.ios";
import type { ActionButtonGroupProps } from "./action-button-group.types";

const ActionButtonGroup = ({ variant = "capsule", ...props}: ActionButtonGroupProps) => {
  if (variant === "circularPair") {
    return <ActionButtonCircularPairGroup actions={props.actions} animations={props.animations} />;
  }
  return <ActionButtonCapsuleGroup actions={props.actions} animations={props.animations} />;
};

export default ActionButtonGroup;
