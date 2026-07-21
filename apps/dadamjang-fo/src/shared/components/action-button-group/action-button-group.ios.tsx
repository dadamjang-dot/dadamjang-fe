import { Button, Host, HStack, Image } from '@expo/ui/swift-ui';
import { background, border, buttonStyle, cornerRadius, frame, imageScale, padding } from '@expo/ui/swift-ui/modifiers';
import { colors } from '@dadamjang/design-tokens';
import type { ActionButtonGroupProps, ActionGroupItem } from './action-button-group.types';

const GroupButton = ({ icon, title, iconOnly, onPress }: ActionGroupItem) => (
  iconOnly ? (
    <Image
      systemName={icon as any}
      onPress={onPress}
      size={20}
      modifiers={[background('#FFFFFF'), border({ color: '#CCCCCC', width: 1 }), frame({ width: 40, height: 40 })]}
    />
  ) : (
    <Button
      onPress={onPress}
      label={title}
      systemImage={icon as any}
      modifiers={[
        buttonStyle('glass'),
        background('#FFFFFF'),
        border({ color: '#CCCCCC', width: 1 }),
        imageScale('medium'),
        padding({ leading: 12, trailing: 12 }),
        frame({ height: 40 }),
      ]}
    />
  )
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
