import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import FindEmailScreen from "@/app/auth/find-email";
import FindPasswordScreen from "@/app/auth/find-password";
import PasswordChangeScreen from "@/features/settings/components/password-change-screen";
import { PasswordResetForm } from "@/features/auth/components";

import { logoutAuthSession, resetAuthSession } from "@dadamjang/graphql-client";

const mockReplace = jest.fn();
const mockOpenIdentityProviderSheet = jest.fn();
const mockFindEmail = jest.fn();
const mockRequestCode = jest.fn();
const mockVerifyCode = jest.fn();
const mockResetPassword = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
}));

jest.mock("@dadamjang/graphql-client", () => ({
  logoutAuthSession: jest.fn(),
  resetAuthSession: jest.fn(),
}));

jest.mock("@/features/auth", () => {
  const rules = jest.requireActual("@/features/auth/rules");
  return {
    ...rules,
    IdentitySheetDismissedError: class IdentitySheetDismissedError extends Error {},
    useAuthFlow: () => ({
      openIdentityProviderSheet: mockOpenIdentityProviderSheet,
    }),
    useFindFoEmail: () => ({ mutateAsync: mockFindEmail, isPending: false }),
    useRequestPasswordResetCode: () => ({ mutateAsync: mockRequestCode }),
    useVerifyPasswordResetCode: () => ({ mutateAsync: mockVerifyCode }),
    useResetPassword: () => ({
      mutateAsync: mockResetPassword,
      isPending: false,
    }),
    useAuthActionGate: () => ({
      authStatus: "authenticated",
      data: {
        email: "member@example.test",
        hasPassword: true,
        role: "USER",
        userId: "user-1",
        userid: "member",
      },
      isAuthenticated: true,
      redirectToSignIn: jest.fn(),
      retryAuth: jest.fn(),
    }),
  };
});

describe("account recovery screens", () => {
  beforeEach(() => {
    mockOpenIdentityProviderSheet.mockResolvedValue("identity-proof");
    mockFindEmail.mockResolvedValue({
      found: true,
      maskedEmail: "ab***@example.com",
    });
    mockRequestCode.mockResolvedValue({ ok: true });
    mockVerifyCode.mockResolvedValue({ emailVerificationToken: "reset-proof" });
    mockResetPassword.mockResolvedValue({ ok: true });
    jest.mocked(resetAuthSession).mockResolvedValue();
  });

  it("shows only the masked email after native identity verification", async () => {
    await render(<FindEmailScreen />);
    await act(async () => {
      fireEvent.press(screen.getByTestId("e2e.auth.find-email.identity"));
    });

    await screen.findByText("ab***@example.com");
    expect(mockFindEmail).toHaveBeenCalledWith("identity-proof");
    expect(screen.queryByText("integration@example.com")).toBeNull();
  });

  it("resets password through email code and returns to sign-in", async () => {
    await render(<FindPasswordScreen />);
    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.password-reset.email"),
      "member@example.com",
    );
    await act(async () => {
      fireEvent.press(screen.getByText("인증번호 받기"));
    });
    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.password-reset.code"),
      "123456",
    );
    await act(async () => {
      fireEvent.press(screen.getByText("확인"));
    });
    await screen.findByTestId("e2e.auth.password-reset.password");
    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.password-reset.password"),
      "ChangedPassword123!",
    );
    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.password-reset.password-confirmation"),
      "ChangedPassword123!",
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId("e2e.auth.password-reset.submit"));
    });

    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith({
        token: "reset-proof",
        password: "ChangedPassword123!",
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/auth/signin",
      params: undefined,
    });
  });

  it("supports a locked account email for protected settings reuse", () => {
    render(
      <PasswordResetForm
        emailEditable={false}
        initialEmail="member@example.com"
        onComplete={jest.fn()}
      />,
    );

    expect(screen.getByTestId("e2e.auth.password-reset.email")).toHaveProp(
      "editable",
      false,
    );
    expect(screen.getByTestId("e2e.auth.password-reset.email")).toHaveProp(
      "value",
      "member@example.com",
    );
  });

  it("resets an authenticated password, clears revoked sessions, and returns to sign-in", async () => {
    render(<PasswordChangeScreen />);

    expect(screen.getByTestId("e2e.auth.password-reset.email")).toHaveProp(
      "editable",
      false,
    );
    expect(screen.getByTestId("e2e.auth.password-reset.email")).toHaveProp(
      "value",
      "member@example.test",
    );
    await act(async () => {
      fireEvent.press(screen.getByText("인증번호 받기"));
    });
    fireEvent.changeText(
      screen.getByTestId("e2e.auth.password-reset.code"),
      "123456",
    );
    await act(async () => {
      fireEvent.press(screen.getByText("확인"));
    });
    fireEvent.changeText(
      await screen.findByTestId("e2e.auth.password-reset.password"),
      "ChangedPassword123!",
    );
    fireEvent.changeText(
      screen.getByTestId("e2e.auth.password-reset.password-confirmation"),
      "ChangedPassword123!",
    );
    await act(async () => {
      fireEvent.press(screen.getByTestId("e2e.auth.password-reset.submit"));
    });

    expect(logoutAuthSession).not.toHaveBeenCalled();
    expect(resetAuthSession).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/auth/signin");
  });
});
