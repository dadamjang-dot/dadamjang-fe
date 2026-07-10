import { Button, Host, Text, VStack } from '@expo/ui/swift-ui';
import { background, cornerRadius, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';

import { colors } from '@/theme/tokens';

import type { Viewer } from './types';

type ProfileViewProps = {
  viewer: Viewer;
  onOrders: () => void;
  onLogout: () => void;
};

export const ProfileView = ({ viewer, onOrders, onLogout }: ProfileViewProps) => (
  <Host matchContents>
    <VStack alignment="leading" spacing={14} modifiers={[padding({ horizontal: 16, vertical: 12 })]}>
      <VStack spacing={8} modifiers={[background(colors.primarySoft), cornerRadius(18), padding({ all: 16 })]}>
        <Text modifiers={[font({ size: 24, weight: 'bold' })]}>{viewer.userid}</Text>
        <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.muted)]}>{viewer.email}</Text>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(colors.primary)]}>{viewer.role}</Text>
      </VStack>
      <Button label="주문 내역" onPress={onOrders} />
      <Button label="로그아웃" role="destructive" onPress={onLogout} />
    </VStack>
  </Host>
);
