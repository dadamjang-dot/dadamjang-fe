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

type SignupFormProps = {
  onUseridChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onRequestCode: () => void;
  onVerifyCode: () => void;
  onSubmit: () => void;
  pending: boolean;
  requestPending: boolean;
  verifyPending: boolean;
  verified: boolean;
  error?: string;
};

export const SignupForm = ({
  onUseridChange,
  onEmailChange,
  onPasswordChange,
  onCodeChange,
  onRequestCode,
  onVerifyCode,
  onSubmit,
  pending,
  requestPending,
  verifyPending,
  verified,
  error,
}: SignupFormProps) => (
  <Host style={{ flex: 1 }} useViewportSizeMeasurement>
    <VStack alignment="leading" spacing={16} modifiers={[padding({ all: 24 })]}>
      <Text modifiers={[font({ size: 32, weight: 'black' }), foregroundStyle(colors.ink)]}>Join DADAMJANG</Text>
      <Text modifiers={[font({ size: 14, weight: 'medium' }), foregroundStyle(colors.muted)]}>
        좋아하는 걸 담을 계정을 만들어요
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
      <TextField
        placeholder="이메일"
        onValueChange={onEmailChange}
        modifiers={[
          textInputAutocapitalization('never'),
          autocorrectionDisabled(),
          textContentType('emailAddress'),
          keyboardType('email-address'),
          padding({ horizontal: 14, vertical: 12 }),
          background(colors.surface),
          border({ color: colors.line, width: 1 }),
          cornerRadius(12),
        ]}
      />
      <Button label={requestPending ? '코드 요청 중...' : '이메일 코드 받기'} onPress={onRequestCode} />
      <SecureField
        placeholder="비밀번호"
        onValueChange={onPasswordChange}
        modifiers={[
          textInputAutocapitalization('never'),
          autocorrectionDisabled(),
          textContentType('newPassword'),
          padding({ horizontal: 14, vertical: 12 }),
          background(colors.surface),
          border({ color: colors.line, width: 1 }),
          cornerRadius(12),
        ]}
      />
      <TextField
        placeholder="이메일 인증 코드"
        onValueChange={onCodeChange}
        modifiers={[
          textInputAutocapitalization('never'),
          autocorrectionDisabled(),
          textContentType('oneTimeCode'),
          keyboardType('ascii-capable'),
          padding({ horizontal: 14, vertical: 12 }),
          background(colors.surface),
          border({ color: colors.line, width: 1 }),
          cornerRadius(12),
        ]}
      />
      <Button label={verifyPending ? '검증 중...' : '코드 검증'} onPress={onVerifyCode} />
      {verified ? <Text>이메일 인증 완료</Text> : null}
      {error ? <Text>{error}</Text> : null}
      <Button
        label={pending ? '가입 중...' : '가입하기'}
        onPress={onSubmit}
        modifiers={[buttonStyle('borderedProminent'), tint(colors.ink)]}
      />
    </VStack>
  </Host>
);
