import { Button, Host } from '@expo/ui/swift-ui';
import { background, border, buttonStyle, frame, imageScale } from '@expo/ui/swift-ui/modifiers';
import type { ActionButtonProps } from './action-button.types';

const ActionButton = ({ icon, title, iconOnly, onPress }: ActionButtonProps) => (
  <Host matchContents>
    <Button
      onPress={onPress}
      label={iconOnly ? undefined : title}
      systemImage={icon as any}
      modifiers={[
        buttonStyle('glass'),
        background('#FFFFFF'),
        border({ color: '#CCCCCC', width: 1 }),
        imageScale('medium'),
        frame({ width: iconOnly ? 40 : undefined, height: 40 }),
      ]}
    />
  </Host>
);

export default ActionButton;
