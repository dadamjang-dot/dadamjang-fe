import { Button, Host, SecureField, Text, TextField, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, font, padding, tint } from '@expo/ui/swift-ui/modifiers';

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
      <Text modifiers={[font({ size: 30, weight: 'bold' })]}>다담장 로그인</Text>
      <TextField placeholder="아이디" onValueChange={onUseridChange} />
      <SecureField placeholder="비밀번호" onValueChange={onPasswordChange} />
      {error ? <Text>{error}</Text> : null}
      <Button
        label={pending ? '로그인 중...' : '로그인'}
        onPress={onSubmit}
        modifiers={[buttonStyle('borderedProminent'), tint('#4D45DF')]}
      />
      <Button label={kakaoPending ? '카카오 이동 중...' : '카카오로 계속하기'} onPress={onKakao} />
      <Button label="회원가입" onPress={onSignup} />
    </VStack>
  </Host>
);
