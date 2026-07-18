import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { clearAccessToken } from '@dadamjang/graphql-client';

import {
  completeKakaoSignup,
  getCurrentUser,
  openKakaoLogin,
  requestSignupEmailCode,
  signIn,
  signUp,
  verifySignupEmailCode,
} from './api';

export const useCurrentUser = () => useQuery({ queryKey: ['viewer'], queryFn: getCurrentUser, retry: false });

export const useSignIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userid, password }: { userid: string; password: string }) =>
      signIn(userid, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['viewer'] }),
  });
};

export const useSignUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signUp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['viewer'] }),
  });
};

export const useCompleteKakaoSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeKakaoSignup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['viewer'] }),
  });
};

export const useKakaoLogin = () => useMutation({ mutationFn: openKakaoLogin });

export const useRequestSignupEmailCode = () =>
  useMutation({ mutationFn: (email: string) => requestSignupEmailCode(email) });

export const useVerifySignupEmailCode = () =>
  useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      verifySignupEmailCode(email, code),
  });

export const useSignOut = () => {
  const queryClient = useQueryClient();

  return async () => {
    await clearAccessToken();
    queryClient.removeQueries({ queryKey: ['viewer'] });
  };
};
