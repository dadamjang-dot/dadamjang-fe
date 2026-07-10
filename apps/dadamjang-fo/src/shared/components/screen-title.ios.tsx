import { Host, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';

import { colors } from '@dadamjang/design-tokens';

export const ScreenTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <Host matchContents>
    <VStack alignment="leading" spacing={4} modifiers={[padding({ horizontal: 16, vertical: 12 })]}>
      <Text modifiers={[font({ size: 28, weight: 'bold' })]}>{title}</Text>
      {subtitle ? <Text modifiers={[font({ size: 14 }), foregroundStyle(colors.muted)]}>{subtitle}</Text> : null}
    </VStack>
  </Host>
);
