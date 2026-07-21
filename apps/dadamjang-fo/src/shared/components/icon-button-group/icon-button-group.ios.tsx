import { Button, Host, HStack } from '@expo/ui/swift-ui';
import { buttonStyle } from '@expo/ui/swift-ui/modifiers';
import { frame } from '@expo/ui/swift-ui/modifiers';
import type { IconButtonGroupProps, IconGroupItem } from './icon-button-group.types';

const GroupButton = ({ icon, onPress }: IconGroupItem) => (
  <Button systemImage={icon as any} onPress={onPress} modifiers={[buttonStyle('glass'), frame({ width: 40, height: 40 })]} />
);

const IconButtonGroup = ({ icons }: IconButtonGroupProps) => (
  <Host matchContents>
    <HStack spacing={0}>
      <GroupButton {...icons[0]} />
      <GroupButton {...icons[1]} />
    </HStack>
  </Host>
);

export default IconButtonGroup;
