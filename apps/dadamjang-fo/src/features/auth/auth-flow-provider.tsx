import { useRouter } from "expo-router";
import {
  createContext,
  useContext,
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

  const cancelIdentityRequest = () => {
    pendingIdentity.current?.reject(new IdentitySheetDismissedError());
    pendingIdentity.current = undefined;
    setIdentityRequest(undefined);
  };

  const openIdentityProviderSheet = (purpose: IdentityVerificationPurpose) => {
    cancelIdentityRequest();
    setIdentityRequest({ purpose });
    const result = new Promise<string>((resolve, reject) => {
      pendingIdentity.current = { resolve, reject };
    });
    router.push("/auth-identity-provider-sheet");
    return result;
  };

  const completeIdentityRequest = (token: string) => {
    pendingIdentity.current?.resolve(token);
    pendingIdentity.current = undefined;
    setIdentityRequest(undefined);
  };

  const clearKakaoSignup = () => setKakaoSignupState(undefined);
  const setPendingReactivation = (
    reactivationToken: string,
    returnTo?: string,
  ) =>
    setPendingReactivationState({
      reactivationToken,
      returnTo: resolveAuthReturnTo(returnTo),
    });
  const clearPendingReactivation = () => setPendingReactivationState(undefined);
  const resetAuthFlow = () => {
    cancelIdentityRequest();
    setKakaoSignupState(undefined);
    setPendingReactivationState(undefined);
  };
  const value: AuthFlowContextValue = {
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
  };

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
