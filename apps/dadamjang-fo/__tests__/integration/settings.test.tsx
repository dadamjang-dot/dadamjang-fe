import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import type { ReactNode } from "react";
import { Alert } from "react-native";

import { logoutAuthSession, resetAuthSession } from "@dadamjang/graphql-client";

import SettingsScreen from "@/app/settings";
import { AuthSessionStateProvider } from "@/features/auth/auth-session-state";
import { deactivateFoAccount, getCurrentUser } from "@/features/auth/api";
import {
  getFoNotificationPreferences,
  updateFoNotificationPreferences,
} from "@/features/notification/api";

const mockRouter = { push: jest.fn(), replace: jest.fn() };

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("@dadamjang/graphql-client", () => {
  const actual = jest.requireActual("@dadamjang/graphql-client");
  return {
    ...actual,
    logoutAuthSession: jest.fn(),
    resetAuthSession: jest.fn(),
  };
});

jest.mock("@/features/auth/api", () => {
  const actual = jest.requireActual("@/features/auth/api");
  return {
    ...actual,
    deactivateFoAccount: jest.fn(),
    getCurrentUser: jest.fn(),
  };
});

jest.mock("@/features/notification/api", () => {
  const actual = jest.requireActual("@/features/notification/api");
  return {
    ...actual,
    getFoNotificationPreferences: jest.fn(),
    updateFoNotificationPreferences: jest.fn(),
  };
});

const preferences = {
  pushEnabled: true,
  orderPushEnabled: true,
  wishPushEnabled: true,
  stylePushEnabled: true,
  updatedAt: "2026-08-31T00:00:00.000Z",
};

const clients: QueryClient[] = [];

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });

const renderSettings = (hasSession: boolean) => {
  const client = createClient();
  clients.push(client);
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthSessionStateProvider
        value={{ error: null, hasSession, retry: jest.fn() }}
      >
        {children}
      </AuthSessionStateProvider>
    </QueryClientProvider>
  );
  return { client, ...render(<SettingsScreen />, { wrapper: Wrapper }) };
};

const resolveUser = (overrides?: {
  hasPassword?: boolean;
  role?: "USER" | "PARTNER";
}) =>
  jest.mocked(getCurrentUser).mockResolvedValue({
    userId: "user-1",
    userid: "buyer",
    email: "member@example.test",
    role: overrides?.role ?? "USER",
    hasPassword: overrides?.hasPassword ?? true,
  });

describe("settings", () => {
  beforeEach(() => {
    jest.mocked(getFoNotificationPreferences).mockResolvedValue(preferences);
    jest
      .mocked(updateFoNotificationPreferences)
      .mockImplementation(async (input) => ({ ...preferences, ...input }));
    jest.mocked(logoutAuthSession).mockResolvedValue(true);
    jest.mocked(resetAuthSession).mockResolvedValue();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      status: "granted",
      granted: true,
      canAskAgain: true,
      expires: "never",
    } as never);
  });

  afterEach(async () => {
    cleanup();
    await Promise.all(clients.map((client) => client.cancelQueries()));
    clients.splice(0).forEach((client) => client.clear());
  });

  it("keeps app version public and gates protected rows through sign-in", () => {
    renderSettings(false);

    expect(
      screen.getByText(`앱 버전 ${Constants.expoConfig?.version}`),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByRole("button", { name: "푸시 알림 설정" }));
    fireEvent.press(screen.getByRole("button", { name: "계정 설정" }));

    expect(mockRouter.push).toHaveBeenNthCalledWith(1, {
      pathname: "/auth/signin",
      params: { returnTo: "/settings" },
    });
    expect(mockRouter.push).toHaveBeenNthCalledWith(2, {
      pathname: "/auth/signin",
      params: { returnTo: "/settings" },
    });
    expect(screen.queryByText("member@example.test")).toBeNull();
  });

  it("shows authenticated permission, preference, and role-gated account rows", async () => {
    resolveUser({ hasPassword: false, role: "PARTNER" });
    renderSettings(true);

    expect(await screen.findByText("member@example.test")).toBeOnTheScreen();
    expect(screen.getByText("알림 허용됨")).toBeOnTheScreen();
    expect(screen.getByRole("switch", { name: "전체 Push" })).toHaveProp(
      "value",
      true,
    );
    expect(screen.getByRole("switch", { name: "주문 알림" })).toHaveProp(
      "value",
      true,
    );
    expect(screen.getByRole("switch", { name: "위시 알림" })).toHaveProp(
      "value",
      true,
    );
    expect(screen.getByRole("switch", { name: "스타일 알림" })).toHaveProp(
      "value",
      true,
    );
    expect(screen.queryByText("비밀번호 변경")).toBeNull();
    expect(screen.queryByText("회원 탈퇴")).toBeNull();
  });

  it("opens native settings when notification permission cannot be requested again", async () => {
    resolveUser();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      status: "denied",
      granted: false,
      canAskAgain: false,
      expires: "never",
    } as never);
    renderSettings(true);

    fireEvent.press(
      await screen.findByRole("button", { name: "시스템 설정 열기" }),
    );

    expect(Linking.openSettings).toHaveBeenCalled();
  });

  it("optimistically updates preferences and rolls back a failed update", async () => {
    resolveUser();
    let rejectUpdate: ((error: Error) => void) | undefined;
    jest.mocked(updateFoNotificationPreferences).mockReturnValue(
      new Promise((_, reject) => {
        rejectUpdate = reject;
      }),
    );
    renderSettings(true);
    const toggle = await screen.findByRole("switch", { name: "전체 Push" });

    fireEvent(toggle, "valueChange", false);

    await waitFor(() => expect(toggle).toHaveProp("value", false));
    expect(
      jest.mocked(updateFoNotificationPreferences).mock.calls[0]?.[0],
    ).toEqual({ pushEnabled: false });
    await act(async () =>
      rejectUpdate?.(new Error("설정을 저장하지 못했어요.")),
    );
    expect(
      await screen.findByText("설정을 저장하지 못했어요."),
    ).toBeOnTheScreen();
    await waitFor(() => expect(toggle).toHaveProp("value", true));
  });

  it("waits for the server-first logout helper before leaving settings", async () => {
    resolveUser();
    let finishLogout: (() => void) | undefined;
    jest.mocked(logoutAuthSession).mockReturnValue(
      new Promise<boolean>((resolve) => {
        finishLogout = () => resolve(true);
      }),
    );
    renderSettings(true);
    fireEvent.press(await screen.findByText("로그아웃"));

    expect(logoutAuthSession).toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await act(async () => finishLogout?.());

    expect(mockRouter.replace).toHaveBeenCalledWith("/");
  });

  it("confirms deactivation exactly and clears the local session with the scheduled date", async () => {
    resolveUser();
    jest.mocked(deactivateFoAccount).mockResolvedValue({
      ok: true,
      scheduledAnonymizationAt: "2026-09-30T15:00:00.000Z",
    });
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    renderSettings(true);
    fireEvent.press(await screen.findByText("회원 탈퇴"));

    expect(alert).toHaveBeenCalledWith(
      "계정을 탈퇴할까요?",
      "30일 안에는 다시 로그인해 계정을 복구할 수 있어요. 이후에는 계정 정보가 익명화되어 복구할 수 없어요.",
      [
        expect.objectContaining({ text: "취소", style: "cancel" }),
        expect.objectContaining({ text: "탈퇴하기", style: "destructive" }),
      ],
    );
    const destructive = alert.mock.calls[0]?.[2]?.find(
      ({ text }) => text === "탈퇴하기",
    );
    await act(async () => destructive?.onPress?.());

    expect(deactivateFoAccount).toHaveBeenCalled();
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(resetAuthSession).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
    expect(alert).toHaveBeenLastCalledWith(
      "탈퇴가 예약되었어요.",
      "2026년 10월 1일에 계정 정보가 익명화돼요. 그전까지 다시 로그인해 복구할 수 있어요.",
    );
  });

  it("surfaces the active-order deactivation error without clearing the session", async () => {
    resolveUser();
    jest
      .mocked(deactivateFoAccount)
      .mockRejectedValue(
        new Error("진행 중인 주문이 있어 탈퇴할 수 없습니다."),
      );
    const alert = jest.spyOn(Alert, "alert").mockImplementation();
    renderSettings(true);
    fireEvent.press(await screen.findByText("회원 탈퇴"));
    const destructive = alert.mock.calls[0]?.[2]?.find(
      ({ text }) => text === "탈퇴하기",
    );

    await act(async () => destructive?.onPress?.());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "진행 중인 주문이 있어 탈퇴할 수 없습니다.",
    );
    expect(resetAuthSession).not.toHaveBeenCalled();
  });
});
