import { router } from 'expo-router';
import { useState } from 'react';

import { SignupForm } from '@/features/auth/signup-form';
import { useRequestSignupEmailCode, useSignUp, useVerifySignupEmailCode } from '@/features/auth';

const SignupScreen = () => {
  const [userid, setUserid] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [emailVerificationToken, setEmailVerificationToken] = useState('');
  const requestCode = useRequestSignupEmailCode();
  const verifyCode = useVerifySignupEmailCode();
  const signUp = useSignUp();

  const requestEmailCode = () => requestCode.mutate(email);

  const verifyEmailCode = () =>
    verifyCode.mutate(
      { email, code },
      {
        onSuccess: (result) =>
          setEmailVerificationToken(result.verifySignupEmailCode.emailVerificationToken),
      },
    );

  const submit = () =>
    signUp.mutate(
      { userid, email, password, emailVerificationToken },
      { onSuccess: () => router.replace('/') },
    );

  return (
    <SignupForm
      onUseridChange={setUserid}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onCodeChange={setCode}
      onRequestCode={requestEmailCode}
      onVerifyCode={verifyEmailCode}
      onSubmit={submit}
      pending={signUp.isPending}
      requestPending={requestCode.isPending}
      verifyPending={verifyCode.isPending}
      verified={Boolean(emailVerificationToken)}
      error={signUp.error?.message ?? requestCode.error?.message ?? verifyCode.error?.message}
    />
  );
};

export default SignupScreen;
