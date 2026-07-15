import { Button, Host, SecureField, Text, TextField, VStack } from '@expo/ui/swift-ui';
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

type LoginFormProps = {
  onUseridChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onSignup: () => void;
  onKakao: () => void;
  pending: boolean;
  kakaoPending: boolean;
  error?: string;
};

export const LoginForm = ({
  onUseridChange,
  onPasswordChange,
  onSubmit,
  onSignup,
  onKakao,
  pending,
  kakaoPending,
  error,
}: LoginFormProps) => (
  <Host style={{ flex: 1 }} useViewportSizeMeasurement>
    <VStack alignment="leading" spacing={16} modifiers={[padding({ all: 24 })]}>
      <Text modifiers={[font({ size: 32, weight: 'black' }), foregroundStyle(colors.ink)]}>DADAMJANG</Text>
      <Text modifiers={[font({ size: 14, weight: 'medium' }), foregroundStyle(colors.muted)]}>
        위시템 저장소에 로그인
      </Text>
      <TextField
        placeholder="아이디"
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
      <SecureField
        placeholder="비밀번호"
        onValueChange={onPasswordChange}
        modifiers={[
          textInputAutocapitalization('never'),
          autocorrectionDisabled(),
          textContentType('password'),
          padding({ horizontal: 14, vertical: 12 }),
          background(colors.surface),
          border({ color: colors.line, width: 1 }),
          cornerRadius(12),
        ]}
      />
      {error ? <Text>{error}</Text> : null}
      <Button
        label={pending ? '로그인 중...' : '로그인'}
        onPress={onSubmit}
        modifiers={[buttonStyle('borderedProminent'), tint(colors.ink)]}
      />
      <Button label={kakaoPending ? '카카오 이동 중...' : '카카오로 계속하기'} onPress={onKakao} />
      <Button label="회원가입" onPress={onSignup} />
    </VStack>
  </Host>
);
