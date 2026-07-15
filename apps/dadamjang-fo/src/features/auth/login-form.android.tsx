import { Button, Column, Host, OutlinedTextField, Text, TextButton, TextField } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';

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
  <Host style={{ flex: 1 }}>
    <Column verticalArrangement={{ spacedBy: 16 }} modifiers={[fillMaxWidth(), paddingAll(24)]}>
      <Text style={{ typography: 'headlineMedium', fontWeight: 'bold' }}>다담장 로그인</Text>
      <OutlinedTextField onValueChange={onUseridChange} singleLine>
        <TextField.Label>아이디</TextField.Label>
      </OutlinedTextField>
      <OutlinedTextField onValueChange={onPasswordChange} singleLine keyboardOptions={{ keyboardType: 'password' }}>
        <TextField.Label>비밀번호</TextField.Label>
      </OutlinedTextField>
      {error ? <Text>{error}</Text> : null}
      <Button onClick={onSubmit} enabled={!pending} colors={{ containerColor: colors.primary }}>
        <Text>{pending ? '로그인 중...' : '로그인'}</Text>
      </Button>
      <Button onClick={onKakao} enabled={!kakaoPending} colors={{ containerColor: '#FEE500' }}>
        <Text>{kakaoPending ? '카카오 이동 중...' : '카카오로 계속하기'}</Text>
      </Button>
      <TextButton onClick={onSignup}>
        <Text>회원가입</Text>
      </TextButton>
    </Column>
  </Host>
);
