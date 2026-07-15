import { Button, Column, Host, OutlinedTextField, Text, TextField } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';

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
  <Host style={{ flex: 1 }}>
    <Column verticalArrangement={{ spacedBy: 16 }} modifiers={[fillMaxWidth(), paddingAll(24)]}>
      <Text style={{ typography: 'headlineMedium', fontWeight: 'bold' }}>다담장 회원가입</Text>
      <OutlinedTextField onValueChange={onUseridChange} singleLine>
        <TextField.Label>아이디</TextField.Label>
      </OutlinedTextField>
      <OutlinedTextField onValueChange={onEmailChange} singleLine keyboardOptions={{ keyboardType: 'email' }}>
        <TextField.Label>이메일</TextField.Label>
      </OutlinedTextField>
      <Button onClick={onRequestCode} enabled={!requestPending} colors={{ containerColor: colors.primary }}>
        <Text>{requestPending ? '코드 요청 중...' : '이메일 코드 받기'}</Text>
      </Button>
      <OutlinedTextField onValueChange={onPasswordChange} singleLine keyboardOptions={{ keyboardType: 'password' }}>
        <TextField.Label>비밀번호</TextField.Label>
      </OutlinedTextField>
      <OutlinedTextField onValueChange={onCodeChange} singleLine keyboardOptions={{ keyboardType: 'number' }}>
        <TextField.Label>이메일 인증 코드</TextField.Label>
      </OutlinedTextField>
      <Button onClick={onVerifyCode} enabled={!verifyPending} colors={{ containerColor: colors.primary }}>
        <Text>{verifyPending ? '검증 중...' : '코드 검증'}</Text>
      </Button>
      {verified ? <Text>이메일 인증 완료</Text> : null}
      {error ? <Text>{error}</Text> : null}
      <Button onClick={onSubmit} enabled={!pending} colors={{ containerColor: colors.primary }}>
        <Text>{pending ? '가입 중...' : '가입하기'}</Text>
      </Button>
    </Column>
  </Host>
);
