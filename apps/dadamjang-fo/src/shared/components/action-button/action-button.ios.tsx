import { Button, Host } from '@expo/ui/swift-ui';
import { buttonStyle, frame } from '@expo/ui/swift-ui/modifiers';
import type { ActionButtonProps } from './action-button.types';

const ActionButton = ({ icon, title, iconOnly, onPress }: ActionButtonProps) => (
  <Host matchContents>
    <Button
      onPress={onPress}
      label={iconOnly ? undefined : title}
      systemImage={iconOnly ? icon : undefined}
      modifiers={[buttonStyle('glass'), frame({ width: iconOnly ? 40 : undefined, height: 40 })]}
    />
  </Host>
);

export default ActionButton;
