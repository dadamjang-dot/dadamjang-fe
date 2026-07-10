import * as Linking from 'expo-linking';

import { getDeviceId, graphqlRequest, setAuthTokens } from '@dadamjang/graphql-client';

import type { TokenPayload, Viewer } from './types';

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/graphql').replace(/\/graphql$/, '');

export const getViewer = async () => {
  const data = await graphqlRequest<{ me: Viewer }>('query Me { me { userId userid email role } }');
  return data.me;
};

export const signIn = async (userid: string, password: string) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{ signin: TokenPayload }>(
    'mutation Signin($input: SigninAuthInput!) { signin(input: $input) { accessToken refreshToken role } }',
    { input: { userid, password, portal: 'FO' } },
    { 'x-device-id': deviceId },
  );
  await setAuthTokens(data.signin);
  return data.signin;
};

export const requestSignupEmailCode = async (email: string) =>
  graphqlRequest<{ requestSignupEmailCode: { ok: boolean } }>(
    'mutation RequestSignupEmailCode($input: EmailInput!) { requestSignupEmailCode(input: $input) { ok } }',
    { input: { email } },
  );

export const verifySignupEmailCode = async (email: string, code: string) =>
  graphqlRequest<{ verifySignupEmailCode: { emailVerificationToken: string } }>(
    'mutation VerifySignupEmailCode($input: VerifyEmailCodeInput!) { verifySignupEmailCode(input: $input) { emailVerificationToken } }',
    { input: { email, code } },
  );

export const signUp = async (input: { userid: string; email: string; password: string; emailVerificationToken: string }) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{ signup: TokenPayload }>(
    'mutation Signup($input: SignupAuthInput!) { signup(input: $input) { accessToken refreshToken role } }',
    { input },
    { 'x-device-id': deviceId },
  );
  await setAuthTokens(data.signup);
  return data.signup;
};

export const completeKakaoSignup = async (input: { userid: string; kakaoSignupToken: string }) => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{ completeKakaoSignup: TokenPayload }>(
    `mutation CompleteKakaoSignup($input: KakaoSignupAuthInput!) {
      completeKakaoSignup(input: $input) { accessToken refreshToken role }
    }`,
    { input },
    { 'x-device-id': deviceId },
  );

  await setAuthTokens(data.completeKakaoSignup);
  return data.completeKakaoSignup;
};

export const openKakaoLogin = async () => {
  await Linking.openURL(`${apiBaseUrl}/api/auth/kakao`);
};
