import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { useEffect, type PropsWithChildren } from "react";
import { Alert, Text, type AlertButton } from "react-native";

import AuthScreenRoute from "@/app/auth";
import ReactivateScreen from "@/app/auth/reactivate";
import SigninScreen from "@/app/auth/signin";
import {
  AuthFlowProvider,
  useAuthFlow,
} from "@/features/auth/auth-flow-provider";
import { reactivateFoAccount, signInFo } from "@/features/auth/api";
import { runKakaoLoginSession } from "@/features/auth/auth-session";

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockReturnTo: string | undefined;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ returnTo: mockReturnTo }),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock("@/features/auth/api", () => ({
  reactivateFoAccount: jest.fn(),
  signInFo: jest.fn(),
}));

jest.mock("@/features/auth/auth-session", () => ({
  AuthSessionCancelledError: class AuthSessionCancelledError extends Error {},
  runKakaoLoginSession: jest.fn(),
}));

const createAuthFlowWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
  const AuthFlowWrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <AuthFlowProvider>{children}</AuthFlowProvider>
    </QueryClientProvider>
  );
  AuthFlowWrapper.displayName = "AccountLifecycleTestWrapper";
  return AuthFlowWrapper;
};

const passwordResetWarning =
  "이메일로 가입한 계정만 비밀번호를 재설정할 수 있어요. 카카오로 가입했다면 카카오 로그인을 이용해 주세요.";

const PendingReactivationProbe = () => {
  const { pendingReactivation } = useAuthFlow();
  return (
    <Text testID="pending-reactivation">
      {pendingReactivation?.returnTo ?? "empty"}
    </Text>
  );
};

const ReactivationHarness = ({
  reactivationToken = "reactivation-token",
  returnTo = "/orders",
}: {
  reactivationToken?: string;
  returnTo?: string;
}) => {
  const { setPendingReactivation } = useAuthFlow();
  useEffect(() => {
    setPendingReactivation(reactivationToken, returnTo);
  }, [reactivationToken, returnTo, setPendingReactivation]);
  return (
    <>
      <ReactivateScreen />
      <PendingReactivationProbe />
    </>
  );
};

afterEach(() => {
  mockReturnTo = undefined;
});

describe("account lifecycle auth flow", () => {
  it("opens explicit email sign-in from the auth landing", () => {
    render(<AuthScreenRoute />, { wrapper: createAuthFlowWrapper() });

    fireEvent.press(screen.getByTestId("e2e.auth.open-signin"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/auth/signin",
      params: undefined,
    });
  });

  it("keeps a sanitized reactivation target only in provider memory", () => {
    const { result } = renderHook(useAuthFlow, {
      wrapper: createAuthFlowWrapper(),
    });

    act(() => {
      result.current.setPendingReactivation(
        "reactivation-token",
        "https://attacker.example",
      );
    });

    expect(result.current.pendingReactivation).toEqual({
      reactivationToken: "reactivation-token",
      returnTo: "/",
    });
  });

  it("keeps the public settings route as a reactivation return target", () => {
    const { result } = renderHook(useAuthFlow, {
      wrapper: createAuthFlowWrapper(),
    });

    act(() => {
      result.current.setPendingReactivation("reactivation-token", "/settings");
    });

    expect(result.current.pendingReactivation?.returnTo).toBe("/settings");
  });

  it("clears pending reactivation when the provider flow resets", () => {
    const { result } = renderHook(useAuthFlow, {
      wrapper: createAuthFlowWrapper(),
    });

    act(() => {
      result.current.setPendingReactivation(
        "reactivation-token",
        "/product/product-1",
      );
      result.current.resetAuthFlow();
    });

    expect(result.current.pendingReactivation).toBeUndefined();
  });

  it("clears pending reactivation after an explicit cancellation", () => {
    const { result } = renderHook(useAuthFlow, {
      wrapper: createAuthFlowWrapper(),
    });

    act(() => {
      result.current.setPendingReactivation("reactivation-token", "/orders");
      result.current.clearPendingReactivation();
    });

    expect(result.current.pendingReactivation).toBeUndefined();
  });

  it.each([
    ["auth landing", AuthScreenRoute],
    ["email sign-in", SigninScreen],
  ])("warns before password reset from %s", async (_, Screen) => {
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    render(<Screen />, { wrapper: createAuthFlowWrapper() });

    fireEvent.press(screen.getByText("비밀번호 찾기"));

    expect(alert).toHaveBeenCalledWith("비밀번호 찾기", passwordResetWarning, [
      expect.objectContaining({ text: "취소", style: "cancel" }),
      expect.objectContaining({ text: "이메일 계정 계속" }),
    ]);
    const buttons = alert.mock.calls[0]?.[2] as AlertButton[];
    act(() => buttons.find(({ text }) => text === "취소")?.onPress?.());
    expect(mockPush).not.toHaveBeenCalled();

    act(() =>
      buttons.find(({ text }) => text === "이메일 계정 계속")?.onPress?.(),
    );
    expect(mockPush).toHaveBeenCalledWith("/auth/find-password");
  });

  it("holds email reactivation in memory without issuing a signed-in route", async () => {
    mockReturnTo = "https://attacker.example/orders";
    jest.mocked(signInFo).mockResolvedValue({
      status: "REACTIVATION_REQUIRED",
      tokenPayload: null,
      reactivationToken: "email-reactivation-token",
    });
    render(
      <>
        <SigninScreen />
        <PendingReactivationProbe />
      </>,
      { wrapper: createAuthFlowWrapper() },
    );

    fireEvent.changeText(
      screen.getByTestId("e2e.auth.email.input"),
      "buyer@example.com",
    );
    fireEvent.changeText(
      screen.getByTestId("e2e.auth.password.input"),
      "password",
    );
    fireEvent.press(screen.getByTestId("e2e.auth.submit"));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/auth/reactivate"),
    );
    expect(screen.getByTestId("pending-reactivation")).toHaveTextContent("/");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("holds Kakao reactivation in memory without entering signup", async () => {
    mockReturnTo = "/orders";
    jest.mocked(runKakaoLoginSession).mockResolvedValue({
      status: "REACTIVATION_REQUIRED",
      tokenPayload: null,
      kakaoSignupToken: null,
      email: null,
      emailVerificationRequired: false,
      reactivationToken: "kakao-reactivation-token",
    });
    render(
      <>
        <AuthScreenRoute />
        <PendingReactivationProbe />
      </>,
      { wrapper: createAuthFlowWrapper() },
    );

    fireEvent.press(screen.getByTestId("e2e.auth.kakao"));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/auth/reactivate"),
    );
    expect(screen.getByTestId("pending-reactivation")).toHaveTextContent(
      "/orders",
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("reactivates only after confirmation and returns to the saved target", async () => {
    jest.mocked(reactivateFoAccount).mockResolvedValue({
      accessToken: "reactivated-access",
      refreshToken: "reactivated-refresh",
      role: "USER",
    });
    render(<ReactivationHarness />, { wrapper: createAuthFlowWrapper() });

    await screen.findByText("계정을 다시 사용할까요?");
    expect(reactivateFoAccount).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("계정 복구"));

    await waitFor(() =>
      expect(reactivateFoAccount).toHaveBeenCalledWith("reactivation-token"),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/orders"));
    expect(screen.getByTestId("pending-reactivation")).toHaveTextContent(
      "empty",
    );
  });

  it("cancels reactivation without calling the account API", async () => {
    render(<ReactivationHarness />, { wrapper: createAuthFlowWrapper() });

    await screen.findByText("계정을 다시 사용할까요?");
    fireEvent.press(screen.getByText("취소"));

    expect(reactivateFoAccount).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith("/auth");
    expect(screen.getByTestId("pending-reactivation")).toHaveTextContent(
      "empty",
    );
  });

  it("clears a rejected reactivation token and requires a new sign-in", async () => {
    jest
      .mocked(reactivateFoAccount)
      .mockRejectedValue(new Error("expired internal token detail"));
    render(<ReactivationHarness />, { wrapper: createAuthFlowWrapper() });

    await screen.findByText("계정을 다시 사용할까요?");
    fireEvent.press(screen.getByText("계정 복구"));

    expect(
      await screen.findByText(
        "계정을 복구하지 못했어요. 다시 로그인해 주세요.",
      ),
    ).toBeVisible();
    expect(screen.getByTestId("pending-reactivation")).toHaveTextContent(
      "empty",
    );
    expect(screen.queryByText("expired internal token detail")).toBeNull();
  });
});
