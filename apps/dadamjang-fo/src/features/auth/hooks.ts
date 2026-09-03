import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { GraphqlError, logoutAuthSession } from "@dadamjang/graphql-client";

import {
  completeKakaoSignupFo,
  deactivateFoAccount,
  findFoEmail,
  getActiveSignupConsentDocuments,
  getCurrentUser,
  reactivateFoAccount,
  requestPasswordResetCode,
  requestSignupEmailCode,
  resetPassword,
  signInFo,
  signUpFo,
  verifyPasswordResetCode,
  verifySignupEmailCode,
} from "./api";
import { useAuthSessionState } from "./auth-session-state";
import { resolveAuthReturnTo } from "./rules";

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
    queryFn: ({ signal }) => getCurrentUser(signal),
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

export const useAuthActionGate = (returnTo: string) => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const sanitizedReturnTo = resolveAuthReturnTo(returnTo);
  const redirectToSignIn = (replace = false, returnToOverride?: string) => {
    const href = {
      pathname: "/auth" as const,
      params: {
        returnTo: resolveAuthReturnTo(returnToOverride ?? sanitizedReturnTo),
      },
    };
    if (replace) router.replace(href);
    else router.push(href);
  };
  const runProtectedAction = (
    action: () => void,
    returnToOverride?: string,
  ) => {
    if (currentUser.authStatus === "unauthenticated") {
      redirectToSignIn(false, returnToOverride);
      return false;
    }
    if (currentUser.authStatus !== "authenticated") return false;
    action();
    return true;
  };

  return {
    ...currentUser,
    isAuthenticated: currentUser.authStatus === "authenticated",
    redirectToSignIn,
    runProtectedAction,
  };
};

const useViewerMutation = <TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: authQueryKeys.viewer }),
  });
};

export const useSignIn = () =>
  useViewerMutation(
    ({ email, password }: { email: string; password: string }) =>
      signInFo(email, password),
  );

export const useReactivateFoAccount = () =>
  useViewerMutation((reactivationToken: string) =>
    reactivateFoAccount(reactivationToken),
  );

export const useDeactivateFoAccount = () =>
  useMutation<Awaited<ReturnType<typeof deactivateFoAccount>>, Error, void>({
    mutationFn: deactivateFoAccount,
  });

export const useSignUpFo = () => useViewerMutation(signUpFo);

export const useCompleteKakaoSignupFo = () =>
  useViewerMutation(completeKakaoSignupFo);

export const useSignupConsentDocuments = () =>
  useQuery({
    queryKey: authQueryKeys.signupConsents,
    queryFn: ({ signal }) => getActiveSignupConsentDocuments(signal),
    staleTime: 5 * 60_000,
  });

export const useRequestSignupEmailCode = () =>
  useMutation({ mutationFn: requestSignupEmailCode });

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

export const useSignOut = () => logoutAuthSession;
