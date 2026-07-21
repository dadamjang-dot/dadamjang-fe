import { Button, Host, HStack } from '@expo/ui/swift-ui';
import { background, border, buttonStyle, cornerRadius, frame, imageScale } from '@expo/ui/swift-ui/modifiers';
import { colors } from '@dadamjang/design-tokens';
import type { ActionButtonGroupProps, ActionGroupItem } from './action-button-group.types';

const GroupButton = ({ icon, title, iconOnly, onPress }: ActionGroupItem) => (
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
);

const ActionButtonGroup = ({ actions }: ActionButtonGroupProps) => (
  <Host matchContents>
    <HStack spacing={0} modifiers={[background('#FFFFFF'), border({ color: '#CCCCCC', width: 1 }), cornerRadius(20)]}>
      <GroupButton {...actions[0]} />
      <GroupButton {...actions[1]} />
    </HStack>
  </Host>
);

export default ActionButtonGroup;
