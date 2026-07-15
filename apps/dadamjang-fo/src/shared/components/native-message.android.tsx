import { Button, CircularProgressIndicator, Column, Host, Text } from '@expo/ui/jetpack-compose';
import { paddingAll } from '@expo/ui/jetpack-compose/modifiers';

import { colors } from '@dadamjang/design-tokens';

type NativeMessageProps = {
  title: string;
  subtitle?: string;
  loading?: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export const NativeMessage = ({
  title,
  subtitle,
  loading = false,
  actionLabel,
  onAction,
}: NativeMessageProps) => (
  <Host matchContents>
    <Column
      horizontalAlignment="center"
      verticalArrangement={{ spacedBy: 10 }}
      modifiers={[paddingAll(24)]}>
      {loading ? <CircularProgressIndicator color={colors.ink} /> : null}
      <Text style={{ typography: 'titleMedium', fontWeight: 'bold' }} color={colors.ink}>{title}</Text>
      {subtitle ? <Text color={colors.muted}>{subtitle}</Text> : null}
      {actionLabel ? (
        <Button onClick={onAction} colors={{ containerColor: colors.primary }}>
          <Text>{actionLabel}</Text>
        </Button>
      ) : null}
    </Column>
  </Host>
);
