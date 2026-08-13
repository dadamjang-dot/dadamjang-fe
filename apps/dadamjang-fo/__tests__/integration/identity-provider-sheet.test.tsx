import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import IdentityProviderSheetRoute from "@/app/auth-identity-provider-sheet";
import * as AuthSession from "@/features/auth/auth-session";

const mockBack = jest.fn();
const mockComplete = jest.fn();
const mockCancel = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));

jest.mock("@/features/auth/rules", () => ({
  authErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

jest.mock("@/features/auth/auth-flow-provider", () => ({
  useAuthFlow: () => ({
    identityRequest: { purpose: "SIGNUP" },
    completeIdentityRequest: mockComplete,
    cancelIdentityRequest: mockCancel,
  }),
}));

describe("identity provider native sheet route", () => {
  it("offers every provider and completes the selected one", async () => {
    const runIdentityVerificationSession = jest
      .spyOn(AuthSession, "runIdentityVerificationSession")
      .mockResolvedValue("identity-proof");
    await render(<IdentityProviderSheetRoute />);

    expect(screen.getByText("토스 인증")).toBeVisible();
    expect(screen.getByText("카카오 인증")).toBeVisible();
    expect(screen.getByText("네이버 인증")).toBeVisible();
    const tossButton = screen.getByTestId("e2e.auth.identity.toss");
    expect(tossButton.props.accessibilityState).toMatchObject({ disabled: false });
    await act(async () => {
      fireEvent.press(tossButton);
    });

    await waitFor(() =>
      expect(runIdentityVerificationSession).toHaveBeenCalledWith("SIGNUP", "TOSS"),
    );
    expect(mockComplete).toHaveBeenCalledWith("identity-proof");
    expect(mockBack).toHaveBeenCalled();
  });
});
