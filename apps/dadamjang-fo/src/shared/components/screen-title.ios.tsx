import { Host, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';

import { colors } from '@dadamjang/design-tokens';

export const ScreenTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <Host matchContents>
    <VStack alignment="leading" spacing={6} modifiers={[padding({ horizontal: 20, vertical: 24 })]}>
      <Text modifiers={[font({ size: 28, weight: 'black' }), foregroundStyle(colors.ink)]}>{title}</Text>
      {subtitle ? (
        <Text modifiers={[font({ size: 14, weight: 'medium' }), foregroundStyle(colors.muted)]}>
          {subtitle}
        </Text>
      ) : null}
    </VStack>
  </Host>
);
