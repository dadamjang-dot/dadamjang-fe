import { Button, Card, Column, Host, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';

import { colors } from '@dadamjang/design-tokens';

import type { Viewer } from './types';

type ProfileViewProps = {
  viewer: Viewer;
  onOrders: () => void;
  onLogout: () => void;
};

export const ProfileView = ({ viewer, onOrders, onLogout }: ProfileViewProps) => (
  <Host matchContents>
    <Column verticalArrangement={{ spacedBy: 14 }} modifiers={[paddingAll(16), fillMaxWidth()]}>
      <Card colors={{ containerColor: colors.primarySoft }}>
        <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[paddingAll(16)]}>
          <Text style={{ typography: 'headlineSmall', fontWeight: 'bold' }}>{viewer.userid}</Text>
          <Text color={colors.muted}>{viewer.email}</Text>
          <Text color={colors.primary}>{viewer.role}</Text>
        </Column>
      </Card>
      <Button onClick={onOrders}>
        <Text>주문 내역</Text>
      </Button>
      <Button onClick={onLogout}>
        <Text>로그아웃</Text>
      </Button>
    </Column>
  </Host>
);
