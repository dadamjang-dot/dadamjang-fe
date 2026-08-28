import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { resetAuthSession } from "@dadamjang/graphql-client";

import {
  completeKakaoSignupFo,
  findFoEmail,
  getActiveSignupConsentDocuments,
  getCurrentUser,
  requestPasswordResetCode,
  requestSignupEmailCode,
  resetPassword,
  signInFo,
  signUpFo,
  verifyPasswordResetCode,
  verifySignupEmailCode,
} from "./api";

export const authQueryKeys = {
  viewer: ["viewer"] as const,
  signupConsents: ["auth", "signup-consents"] as const,
};

export const useCurrentUser = () =>
  useQuery({ queryKey: authQueryKeys.viewer, queryFn: getCurrentUser, retry: false });

const useViewerMutation = <TVariables,>(mutationFn: (variables: TVariables) => Promise<unknown>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authQueryKeys.viewer }),
  });
};

export const useSignIn = () =>
  useViewerMutation(({ email, password }: { email: string; password: string }) =>
    signInFo(email, password),
  );

export const useSignUpFo = () => useViewerMutation(signUpFo);

export const useCompleteKakaoSignupFo = () => useViewerMutation(completeKakaoSignupFo);

export const useSignupConsentDocuments = () =>
  useQuery({
    queryKey: authQueryKeys.signupConsents,
    queryFn: getActiveSignupConsentDocuments,
    staleTime: 5 * 60_000,
  });

export const useRequestSignupEmailCode = () => useMutation({ mutationFn: requestSignupEmailCode });

export const useVerifySignupEmailCode = () =>
  useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      verifySignupEmailCode(email, code),
  });

export const useFindFoEmail = () => useMutation({ mutationFn: findFoEmail });

export const useRequestPasswordResetCode = () =>
  useMutation({ mutationFn: requestPasswordResetCode });

export const useVerifyPasswordResetCode = () =>
  useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      verifyPasswordResetCode(email, code),
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      resetPassword(token, password),
  });

export const useSignOut = () => {
  return resetAuthSession;
};
