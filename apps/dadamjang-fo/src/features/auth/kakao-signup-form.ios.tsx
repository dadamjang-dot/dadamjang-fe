import { Button, Host, Text, TextField, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, font, padding, tint } from '@expo/ui/swift-ui/modifiers';

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
      <Text modifiers={[font({ size: 30, weight: 'bold' })]}>카카오 가입 마무리</Text>
      <TextField placeholder="사용할 아이디" onValueChange={onUseridChange} />
      {error ? <Text>{error}</Text> : null}
      <Button
        label={pending ? '가입 중...' : '가입 완료'}
        onPress={onSubmit}
        modifiers={[buttonStyle('borderedProminent'), tint('#4D45DF')]}
      />
    </VStack>
  </Host>
);
