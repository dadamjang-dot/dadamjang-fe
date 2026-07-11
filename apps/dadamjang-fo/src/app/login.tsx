import { router } from 'expo-router';
import { useState } from 'react';

import { LoginForm } from '@/features/auth/login-form';
import { useKakaoLogin, useSignIn } from '@/features/auth';

const LoginScreen = () => {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useSignIn();
  const kakao = useKakaoLogin();
  const submit = () => signIn.mutate({ userid, password }, { onSuccess: () => router.replace('/') });

  return (
    <LoginForm
      onUseridChange={setUserid}
      onPasswordChange={setPassword}
      onSubmit={submit}
      onSignup={() => router.push('/signup')}
      onKakao={() => kakao.mutate()}
      pending={signIn.isPending}
      kakaoPending={kakao.isPending}
      error={signIn.error?.message ?? kakao.error?.message}
    />
  );
};

export default LoginScreen;
