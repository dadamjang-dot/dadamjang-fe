import { Button, Host, Image } from '@expo/ui/swift-ui';
import { background, border, buttonStyle, frame, imageScale, padding } from '@expo/ui/swift-ui/modifiers';
import type { ActionButtonProps } from './action-button.types';

const ActionButton = ({ icon, title, iconOnly, onPress }: ActionButtonProps) => (
  iconOnly ? (
    <Host matchContents>
      <Image
        systemName={icon as any}
        onPress={onPress}
        size={20}
        modifiers={[background('#FFFFFF'), border({ color: '#CCCCCC', width: 1 }), frame({ width: 40, height: 40 })]}
      />
    </Host>
  ) : (
    <Host matchContents>
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
    </Host>
  )
);

export default ActionButton;
