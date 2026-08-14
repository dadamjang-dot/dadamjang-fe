import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import SignupScreen from "@/app/auth/signup";
import type { SignupConsentDocument } from "@/features/auth/types";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockRequestCode = jest.fn();
const mockVerifyCode = jest.fn();
const mockSignup = jest.fn();
const mockKakaoSignup = jest.fn();
const mockOpenIdentityProviderSheet = jest.fn();

const documents: SignupConsentDocument[] = [
  {
    documentId: "age",
    type: "AGE_OVER_14",
    title: "만 14세 이상",
    body: "본문",
    version: "1",
    required: true,
    activeFrom: "2026-01-01T00:00:00.000Z",
  },
  {
    documentId: "service",
    type: "SERVICE_TERMS",
    title: "서비스 이용약관",
    body: "본문",
    version: "1",
    required: true,
    activeFrom: "2026-01-01T00:00:00.000Z",
  },
  {
    documentId: "privacy",
    type: "PRIVACY_COLLECTION",
    title: "개인정보 수집·이용",
    body: "본문",
    version: "1",
    required: true,
    activeFrom: "2026-01-01T00:00:00.000Z",
  },
  {
    documentId: "marketing",
    type: "MARKETING",
    title: "마케팅 정보 수신",
    body: "본문",
    version: "1",
    required: false,
    activeFrom: "2026-01-01T00:00:00.000Z",
  },
];

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock("@/features/auth", () => {
  const rules = jest.requireActual("@/features/auth/rules");
  return {
    ...rules,
    IdentitySheetDismissedError: class IdentitySheetDismissedError extends Error {},
    useAuthFlow: () => ({
      kakaoSignup: undefined,
      clearKakaoSignup: jest.fn(),
      openIdentityProviderSheet: mockOpenIdentityProviderSheet,
    }),
    useSignupConsentDocuments: () => ({
      data: documents,
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    }),
    useRequestSignupEmailCode: () => ({ mutateAsync: mockRequestCode }),
    useVerifySignupEmailCode: () => ({ mutateAsync: mockVerifyCode }),
    useSignUpFo: () => ({ mutateAsync: mockSignup, isPending: false }),
    useCompleteKakaoSignupFo: () => ({ mutateAsync: mockKakaoSignup, isPending: false }),
  };
});

describe("email signup", () => {
  beforeEach(() => {
    mockRequestCode.mockResolvedValue({ ok: true });
    mockVerifyCode.mockResolvedValue({ emailVerificationToken: "email-proof" });
    mockOpenIdentityProviderSheet.mockResolvedValue("identity-proof");
    mockSignup.mockResolvedValue({ accessToken: "access", refreshToken: "refresh", role: "USER" });
  });

  it("requires verified credentials and consent before native identity selection", async () => {
    await render(<SignupScreen />);
    expect(screen.getByTestId("e2e.auth.signup.identity").props.accessibilityState).toMatchObject({
      disabled: true,
    });

    await fireEvent.changeText(screen.getByTestId("e2e.auth.signup.email"), "new@example.com");
    await act(async () => {
      fireEvent.press(screen.getByText("인증번호 받기"));
    });
    await waitFor(() => expect(mockRequestCode).toHaveBeenCalledWith("new@example.com"));
    await fireEvent.changeText(screen.getByTestId("e2e.auth.signup.code"), "123456");
    await act(async () => {
      fireEvent.press(screen.getByText("확인"));
    });
    await waitFor(() => expect(mockVerifyCode).toHaveBeenCalled());

    await fireEvent.changeText(screen.getByTestId("e2e.auth.signup.password"), "Password123!");
    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.signup.password-confirmation"),
      "Password123!",
    );
    await fireEvent.press(screen.getByTestId("e2e.auth.consent.all"));
    await fireEvent.press(screen.getByTestId("e2e.auth.consent.marketing"));
    await act(async () => {
      fireEvent.press(screen.getByTestId("e2e.auth.signup.identity"));
    });
    await waitFor(() => expect(mockOpenIdentityProviderSheet).toHaveBeenCalledWith("SIGNUP"));
    await screen.findByText("본인 인증이 마쳤어요.");

    await act(async () => {
      fireEvent.press(screen.getByTestId("e2e.auth.signup.submit"));
    });
    await waitFor(() =>
      expect(mockSignup).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "Password123!",
        emailVerificationToken: "email-proof",
        identityVerificationToken: "identity-proof",
        consents: documents.map(({ documentId, type }) => ({
          documentId,
          agreed: type !== "MARKETING",
        })),
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});
