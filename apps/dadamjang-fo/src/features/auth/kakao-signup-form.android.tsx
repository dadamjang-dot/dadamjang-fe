import { Button, Column, Host, OutlinedTextField, Text, TextField } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, paddingAll } from '@expo/ui/jetpack-compose/modifiers';

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
  <Host style={{ flex: 1 }}>
    <Column verticalArrangement={{ spacedBy: 16 }} modifiers={[fillMaxWidth(), paddingAll(24)]}>
      <Text style={{ typography: 'headlineMedium', fontWeight: 'bold' }}>카카오 가입 마무리</Text>
      <OutlinedTextField onValueChange={onUseridChange} singleLine>
        <TextField.Label>사용할 아이디</TextField.Label>
      </OutlinedTextField>
      {error ? <Text>{error}</Text> : null}
      <Button onClick={onSubmit} enabled={!pending} colors={{ containerColor: '#4D45DF' }}>
        <Text>{pending ? '가입 중...' : '가입 완료'}</Text>
      </Button>
    </Column>
  </Host>
);
