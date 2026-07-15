import { Button, Host, Text, TextField, VStack } from '@expo/ui/swift-ui';
import {
  autocorrectionDisabled,
  background,
  border,
  buttonStyle,
  cornerRadius,
  font,
  foregroundStyle,
  keyboardType,
  padding,
  textContentType,
  textInputAutocapitalization,
  tint,
} from '@expo/ui/swift-ui/modifiers';

import { colors } from '@dadamjang/design-tokens';

type KakaoSignupFormProps = {
  onUseridChange: (value: string) => void;
  onSubmit: () => void;
  pending: boolean;
  error?: string;
};

export const KakaoSignupForm = ({
  onUseridChange,
  onSubmit,
  pending,
  error,
}: KakaoSignupFormProps) => (
  <Host style={{ flex: 1 }} useViewportSizeMeasurement>
    <VStack alignment="leading" spacing={16} modifiers={[padding({ all: 24 })]}>
      <Text modifiers={[font({ size: 32, weight: 'black' }), foregroundStyle(colors.ink)]}>
        Join DADAMJANG
      </Text>
      <Text modifiers={[font({ size: 14, weight: 'medium' }), foregroundStyle(colors.muted)]}>
        카카오 계정에 사용할 아이디를 정해요
      </Text>
      <TextField
        placeholder="사용할 아이디"
        onValueChange={onUseridChange}
        modifiers={[
          textInputAutocapitalization('never'),
          autocorrectionDisabled(),
          textContentType('username'),
          keyboardType('ascii-capable'),
          padding({ horizontal: 14, vertical: 12 }),
          background(colors.surface),
          border({ color: colors.line, width: 1 }),
          cornerRadius(12),
        ]}
      />
      {error ? <Text>{error}</Text> : null}
      <Button
        label={pending ? '가입 중...' : '가입 완료'}
        onPress={onSubmit}
        modifiers={[buttonStyle('borderedProminent'), tint(colors.ink)]}
      />
    </VStack>
  </Host>
);
