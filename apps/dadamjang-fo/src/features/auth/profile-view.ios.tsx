import { Button, Host, Text, VStack } from '@expo/ui/swift-ui';
import { background, border, cornerRadius, font, foregroundStyle, padding, tint } from '@expo/ui/swift-ui/modifiers';

import { colors } from '@dadamjang/design-tokens';

import type { Viewer } from './types';

type ProfileViewProps = {
  viewer: Viewer;
  onOrders: () => void;
  onCompare: () => void;
  onLogout: () => void;
};

export const ProfileView = ({ viewer, onOrders, onCompare, onLogout }: ProfileViewProps) => (
  <Host matchContents>
    <VStack alignment="leading" spacing={14} modifiers={[padding({ horizontal: 16, vertical: 12 })]}>
      <VStack
        spacing={8}
        modifiers={[
          background(colors.surface),
          border({ color: colors.line, width: 1 }),
          cornerRadius(18),
          padding({ all: 16 }),
        ]}>
        <Text modifiers={[font({ size: 24, weight: 'black' }), foregroundStyle(colors.ink)]}>{viewer.userid}</Text>
        <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.muted)]}>{viewer.email}</Text>
        <Text modifiers={[font({ size: 12, weight: 'black' }), foregroundStyle(colors.ink)]}>{viewer.role}</Text>
      </VStack>
      <Button label="주문 내역" onPress={onOrders} modifiers={[tint(colors.ink)]} />
      <Button label="비교함" onPress={onCompare} modifiers={[tint(colors.ink)]} />
      <Button label="로그아웃" role="destructive" onPress={onLogout} />
    </VStack>
  </Host>
);
