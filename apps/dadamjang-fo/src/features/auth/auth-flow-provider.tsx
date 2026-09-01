import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { IdentityVerificationPurpose, KakaoSignupContext } from "./types";
import { resolveAuthReturnTo } from "./rules";

export class IdentitySheetDismissedError extends Error {
  constructor() {
    super("본인 인증 선택을 취소했어요.");
    this.name = "IdentitySheetDismissedError";
  }
}

type IdentityRequest = { purpose: IdentityVerificationPurpose };
type PendingIdentity = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
};
type PendingReactivation = {
  reactivationToken: string;
  returnTo: string;
};

type AuthFlowContextValue = {
  identityRequest?: IdentityRequest;
  openIdentityProviderSheet: (
    purpose: IdentityVerificationPurpose,
  ) => Promise<string>;
  completeIdentityRequest: (token: string) => void;
  cancelIdentityRequest: () => void;
  kakaoSignup?: KakaoSignupContext;
  setKakaoSignup: (signup: KakaoSignupContext) => void;
  clearKakaoSignup: () => void;
  pendingReactivation?: PendingReactivation;
  setPendingReactivation: (
    reactivationToken: string,
    returnTo?: string,
  ) => void;
  clearPendingReactivation: () => void;
  resetAuthFlow: () => void;
};

const AuthFlowContext = createContext<AuthFlowContextValue | null>(null);

export const AuthFlowProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pendingIdentity = useRef<PendingIdentity | undefined>(undefined);
  const [identityRequest, setIdentityRequest] = useState<IdentityRequest>();
  const [kakaoSignup, setKakaoSignupState] = useState<KakaoSignupContext>();
  const [pendingReactivation, setPendingReactivationState] =
    useState<PendingReactivation>();

  const cancelIdentityRequest = useCallback(() => {
    pendingIdentity.current?.reject(new IdentitySheetDismissedError());
    pendingIdentity.current = undefined;
    setIdentityRequest(undefined);
  }, []);

  const openIdentityProviderSheet = useCallback(
    (purpose: IdentityVerificationPurpose) => {
      cancelIdentityRequest();
      setIdentityRequest({ purpose });
      const result = new Promise<string>((resolve, reject) => {
        pendingIdentity.current = { resolve, reject };
      });
      router.push("/auth-identity-provider-sheet");
      return result;
    },
    [cancelIdentityRequest, router],
  );

  const completeIdentityRequest = useCallback((token: string) => {
    pendingIdentity.current?.resolve(token);
    pendingIdentity.current = undefined;
    setIdentityRequest(undefined);
  }, []);

  const clearKakaoSignup = useCallback(
    () => setKakaoSignupState(undefined),
    [],
  );
  const setPendingReactivation = useCallback(
    (reactivationToken: string, returnTo?: string) =>
      setPendingReactivationState({
        reactivationToken,
        returnTo: resolveAuthReturnTo(returnTo),
      }),
    [],
  );
  const clearPendingReactivation = useCallback(
    () => setPendingReactivationState(undefined),
    [],
  );
  const resetAuthFlow = useCallback(() => {
    cancelIdentityRequest();
    setKakaoSignupState(undefined);
    setPendingReactivationState(undefined);
  }, [cancelIdentityRequest]);
  const value = useMemo<AuthFlowContextValue>(
    () => ({
      identityRequest,
      openIdentityProviderSheet,
      completeIdentityRequest,
      cancelIdentityRequest,
      kakaoSignup,
      setKakaoSignup: setKakaoSignupState,
      clearKakaoSignup,
      pendingReactivation,
      setPendingReactivation,
      clearPendingReactivation,
      resetAuthFlow,
    }),
    [
      cancelIdentityRequest,
      clearPendingReactivation,
      clearKakaoSignup,
      completeIdentityRequest,
      identityRequest,
      kakaoSignup,
      openIdentityProviderSheet,
      pendingReactivation,
      resetAuthFlow,
      setPendingReactivation,
    ],
  );

  return (
    <AuthFlowContext.Provider value={value}>
      {children}
    </AuthFlowContext.Provider>
  );
};

export const useAuthFlow = () => {
  const value = useContext(AuthFlowContext);
  if (!value) throw new Error("AuthFlowProvider가 필요해요.");
  return value;
};
