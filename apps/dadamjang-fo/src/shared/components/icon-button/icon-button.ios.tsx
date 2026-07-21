import { Button, Host } from '@expo/ui/swift-ui';
import { buttonStyle } from '@expo/ui/swift-ui/modifiers';
import { frame } from '@expo/ui/swift-ui/modifiers';
import type { IconButtonProps } from './icon-button.types';

const IconButton = ({ icon, onPress }: IconButtonProps) => (
  <Host matchContents>
    <Button systemImage={icon as any} onPress={onPress} modifiers={[buttonStyle('glass'), frame({ width: 40, height: 40 })]} />
  </Host>
);

export default IconButton;
