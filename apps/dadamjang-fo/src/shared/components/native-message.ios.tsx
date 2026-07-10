import { Button, Host, ProgressView, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';

import { colors } from '@/theme/tokens';

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
    <VStack alignment="center" spacing={10} modifiers={[padding({ horizontal: 24, vertical: 32 })]}>
      {loading ? <ProgressView /> : null}
      <Text modifiers={[font({ size: 18, weight: 'semibold' })]}>{title}</Text>
      {subtitle ? (
        <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.muted)]}>{subtitle}</Text>
      ) : null}
      {actionLabel ? <Button label={actionLabel} onPress={onAction} /> : null}
    </VStack>
  </Host>
);
