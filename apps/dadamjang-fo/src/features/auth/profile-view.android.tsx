import { Button, Card, Column, Host, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';

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
    <Column verticalArrangement={{ spacedBy: 14 }} modifiers={[paddingAll(16), fillMaxWidth()]}>
      <Card colors={{ containerColor: colors.surface }}>
        <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[paddingAll(16)]}>
          <Text style={{ typography: 'headlineSmall', fontWeight: 'bold' }} color={colors.ink}>{viewer.userid}</Text>
          <Text color={colors.muted}>{viewer.email}</Text>
          <Text color={colors.ink}>{viewer.role}</Text>
        </Column>
      </Card>
      <Button onClick={onOrders} colors={{ containerColor: colors.primary }}>
        <Text>주문 내역</Text>
      </Button>
      <Button onClick={onCompare} colors={{ containerColor: colors.primary }}>
        <Text>비교함</Text>
      </Button>
      <Button onClick={onLogout} colors={{ containerColor: colors.danger }}>
        <Text>로그아웃</Text>
      </Button>
    </Column>
  </Host>
);
