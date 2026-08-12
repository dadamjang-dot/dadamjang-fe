import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import SigninScreen from "@/app/auth/signin";
import { signIn } from "@/features/auth/api";

const mockNavigation: { path?: string } = {};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    replace: (path: string) => {
      mockNavigation.path = path;
    },
  }),
}));

jest.mock("@/features/auth/api", () => ({
  signIn: jest.fn(),
}));

let queryClient: QueryClient | undefined;

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });

  queryClient = client;

  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = "SignInTestWrapper";
  return TestWrapper;
};

afterEach(() => {
  queryClient?.clear();
  jest.mocked(signIn).mockReset();
  delete mockNavigation.path;
});

describe("sign in", () => {
  it("shows validation without submitting empty credentials", async () => {
    jest.mocked(signIn).mockRejectedValueOnce(new Error("empty credentials submitted"));
    await render(<SigninScreen />, { wrapper: createWrapper() });

    await fireEvent.press(screen.getByTestId("e2e.auth.submit"));

    expect(screen.getByText("아이디와 비밀번호를 입력해 주세요.")).toBeVisible();
  });

  it("shows an observable failure after rejected credentials", async () => {
    jest.mocked(signIn).mockRejectedValueOnce(new Error("invalid credentials"));
    await render(<SigninScreen />, { wrapper: createWrapper() });

    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.userid.input"),
      "buyer",
    );
    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.password.input"),
      "wrong",
    );
    await fireEvent.press(screen.getByTestId("e2e.auth.submit"));

    await waitFor(() =>
      expect(screen.getByText("로그인에 실패했어요.")).toBeVisible(),
    );
  });

  it("navigates to home after accepted credentials", async () => {
    jest.mocked(signIn).mockResolvedValueOnce({
      accessToken: "access",
      refreshToken: "refresh",
      role: "USER",
    });
    await render(<SigninScreen />, { wrapper: createWrapper() });

    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.userid.input"),
      "buyer",
    );
    await fireEvent.changeText(
      screen.getByTestId("e2e.auth.password.input"),
      "password",
    );
    await fireEvent.press(screen.getByTestId("e2e.auth.submit"));

    await waitFor(() => expect(mockNavigation.path).toBe("/"));
  });
});
