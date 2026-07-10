import { Button, Host, SecureField, Text, TextField, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, font, padding, tint } from '@expo/ui/swift-ui/modifiers';

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
      <Text modifiers={[font({ size: 30, weight: 'bold' })]}>다담장 회원가입</Text>
      <TextField placeholder="아이디" onValueChange={onUseridChange} />
      <TextField placeholder="이메일" onValueChange={onEmailChange} />
      <Button label={requestPending ? '코드 요청 중...' : '이메일 코드 받기'} onPress={onRequestCode} />
      <SecureField placeholder="비밀번호" onValueChange={onPasswordChange} />
      <TextField placeholder="이메일 인증 코드" onValueChange={onCodeChange} />
      <Button label={verifyPending ? '검증 중...' : '코드 검증'} onPress={onVerifyCode} />
      {verified ? <Text>이메일 인증 완료</Text> : null}
      {error ? <Text>{error}</Text> : null}
      <Button
        label={pending ? '가입 중...' : '가입하기'}
        onPress={onSubmit}
        modifiers={[buttonStyle('borderedProminent'), tint('#4D45DF')]}
      />
    </VStack>
  </Host>
);
