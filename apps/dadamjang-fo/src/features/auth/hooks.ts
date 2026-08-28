import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { GraphqlError, resetAuthSession } from "@dadamjang/graphql-client";

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
import { useAuthSessionState } from "./auth-session-state";

export const authQueryKeys = {
  viewer: ["viewer"] as const,
  signupConsents: ["auth", "signup-consents"] as const,
};

export type AuthStatus =
  "authenticated" | "error" | "loading" | "offline" | "unauthenticated";

type AuthStatusInput = {
  hasSession: boolean;
  hasUser: boolean;
  isError: boolean;
  isPaused: boolean;
  queryError: unknown;
  sessionError: unknown | null;
};

const getAuthStatus = ({
  hasSession,
  hasUser,
  isError,
  isPaused,
  queryError,
  sessionError,
}: AuthStatusInput): AuthStatus => {
  if (sessionError !== null) return "error";
  if (hasUser) return "authenticated";
  if (!hasSession) return "unauthenticated";
  if (isPaused) return "offline";
  if (queryError instanceof GraphqlError && queryError.status === 401)
    return "unauthenticated";
  if (isError) return "error";
  return "loading";
};

export const useCurrentUser = () => {
  const session = useAuthSessionState();
  const query = useQuery({
    enabled: session.error === null && session.hasSession,
    queryKey: authQueryKeys.viewer,
    queryFn: getCurrentUser,
    retry: false,
  });
  const authStatus = getAuthStatus({
    hasSession: session.hasSession,
    hasUser: Boolean(query.data),
    isError: query.isError,
    isPaused: query.isPaused,
    queryError: query.error,
    sessionError: session.error,
  });
  const retryAuth = async () => {
    if (session.error !== null) {
      await session.retry();
      return;
    }
    await query.refetch();
  };

  return { ...query, authStatus, retryAuth };
};

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
