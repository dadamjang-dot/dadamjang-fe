import { Column, Host, Text } from '@expo/ui/jetpack-compose';
import { paddingAll } from '@expo/ui/jetpack-compose/modifiers';

import { colors } from '@/theme/tokens';

export const ScreenTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <Host matchContents>
    <Column verticalArrangement={{ spacedBy: 4 }} modifiers={[paddingAll(16)]}>
      <Text style={{ typography: 'headlineMedium', fontWeight: 'bold' }}>{title}</Text>
      {subtitle ? <Text color={colors.muted} style={{ typography: 'bodyMedium' }}>{subtitle}</Text> : null}
    </Column>
  </Host>
);
