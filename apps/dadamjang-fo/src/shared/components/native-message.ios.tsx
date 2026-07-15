import { Button, Host, ProgressView, Text, VStack } from '@expo/ui/swift-ui';
import { background, border, cornerRadius, font, foregroundStyle, padding, tint } from '@expo/ui/swift-ui/modifiers';

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
    <VStack
      alignment="center"
      spacing={10}
      modifiers={[
        background(colors.surface),
        border({ color: colors.line, width: 1 }),
        cornerRadius(18),
        padding({ horizontal: 24, vertical: 28 }),
      ]}>
      {loading ? <ProgressView /> : null}
      <Text modifiers={[font({ size: 18, weight: 'black' }), foregroundStyle(colors.ink)]}>{title}</Text>
      {subtitle ? (
        <Text modifiers={[font({ size: 14, weight: 'medium' }), foregroundStyle(colors.muted)]}>{subtitle}</Text>
      ) : null}
      {actionLabel ? <Button label={actionLabel} onPress={onAction} modifiers={[tint(colors.ink)]} /> : null}
    </VStack>
  </Host>
);
