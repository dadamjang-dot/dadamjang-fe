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
  resetAuthFlow: () => void;
};

const AuthFlowContext = createContext<AuthFlowContextValue | null>(null);

export const AuthFlowProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pendingIdentity = useRef<PendingIdentity | undefined>(undefined);
  const [identityRequest, setIdentityRequest] = useState<IdentityRequest>();
  const [kakaoSignup, setKakaoSignupState] = useState<KakaoSignupContext>();

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
  const resetAuthFlow = useCallback(() => {
    cancelIdentityRequest();
    setKakaoSignupState(undefined);
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
      resetAuthFlow,
    }),
    [
      cancelIdentityRequest,
      clearKakaoSignup,
      completeIdentityRequest,
      identityRequest,
      kakaoSignup,
      openIdentityProviderSheet,
      resetAuthFlow,
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
