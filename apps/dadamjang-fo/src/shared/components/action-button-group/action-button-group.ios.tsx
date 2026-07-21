import { Button, Host, HStack } from '@expo/ui/swift-ui';
import { background, buttonStyle, cornerRadius, frame } from '@expo/ui/swift-ui/modifiers';
import { colors } from '@dadamjang/design-tokens';
import type { ActionButtonGroupProps, ActionGroupItem } from './action-button-group.types';

const GroupButton = ({ icon, title, iconOnly, onPress }: ActionGroupItem) => (
  <Button
    onPress={onPress}
    label={iconOnly ? undefined : title}
    systemImage={iconOnly ? icon : undefined}
    modifiers={[buttonStyle('glass'), frame({ width: iconOnly ? 40 : undefined, height: 40 })]}
  />
);

const ActionButtonGroup = ({ actions }: ActionButtonGroupProps) => (
  <Host matchContents>
    <HStack spacing={0} modifiers={[background(colors.primarySoft), cornerRadius(20)]}>
      <GroupButton {...actions[0]} />
      <GroupButton {...actions[1]} />
    </HStack>
  </Host>
);

export default ActionButtonGroup;
