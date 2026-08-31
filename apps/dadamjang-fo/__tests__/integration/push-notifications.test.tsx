import NetInfo, { NetInfoStateType } from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Text } from "react-native";

import {
  GraphqlError,
  getAccessToken,
  setSessionResetHandler,
} from "@dadamjang/graphql-client";

import { getCurrentUser } from "@/features/auth/api";
import {
  getFoNotification,
  markFoNotificationRead,
} from "@/features/notification/api";
import {
  getExpoPushRegistration,
  getFoPushPlatform,
} from "@/features/notification/push";
import type { FoNotification } from "@/features/notification/types";
import { AppProviders } from "@/providers/app-providers";

const mockRouter = { push: jest.fn(), replace: jest.fn() };
let responseListener:
  ((response: Notifications.NotificationResponse) => void) | undefined;
let removeResponseListener = jest.fn();
let mockSessionResetHandler: (() => void | Promise<void>) | undefined;
let mockLastSessionResetHandler: (() => void | Promise<void>) | undefined;

jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(async () => ({
      isConnected: true,
      isInternetReachable: true,
    })),
  },
  NetInfoStateType: { none: "none", unknown: "unknown" },
}));

jest.mock("@dadamjang/graphql-client", () => {
  const actual = jest.requireActual("@dadamjang/graphql-client");
  return {
    ...actual,
    getAccessToken: jest.fn(),
    getDeviceId: jest.fn(async () => "device-1"),
    setSessionResetHandler: jest.fn((handler: () => void | Promise<void>) => {
      mockSessionResetHandler = handler;
      mockLastSessionResetHandler = handler;
      return () => {
        if (mockSessionResetHandler === handler)
          mockSessionResetHandler = undefined;
      };
    }),
  };
});

jest.mock("@/features/auth/api", () => ({
  ...jest.requireActual("@/features/auth/api"),
  getCurrentUser: jest.fn(),
}));

jest.mock("@/features/notification/api", () => ({
  ...jest.requireActual("@/features/notification/api"),
  getFoNotification: jest.fn(),
  markFoNotificationRead: jest.fn(),
  registerFoPushDevice: jest.fn(),
}));

type RegisterInput = {
  expoPushToken: string;
  platform: "ANDROID" | "IOS";
};

const registerFoPushDevice = (
  jest.requireMock("@/features/notification/api") as {
    registerFoPushDevice: jest.MockedFunction<
      (input: RegisterInput, signal?: AbortSignal) => Promise<boolean>
    >;
  }
).registerFoPushDevice;

const viewer = {
  userId: "10000000-0000-4000-8000-000000000001",
  userid: "buyer",
  email: "buyer@example.test",
  role: "USER" as const,
};

const notification = (
  overrides: Partial<FoNotification> = {},
): FoNotification => ({
  notificationId: "20000000-0000-4000-8000-000000000001",
  type: "ORDER_STATUS",
  title: "상품을 준비하고 있어요",
  body: "준비가 끝나면 다시 알려드릴게요.",
  route: "/order/30000000-0000-4000-8000-000000000001",
  entityId: "30000000-0000-4000-8000-000000000001",
  readAt: null,
  createdAt: "2026-08-31T00:00:00.000Z",
  ...overrides,
});

const response = (
  identifier: string,
  data: Record<string, unknown> = {
    notificationId: "20000000-0000-4000-8000-000000000001",
    type: "ORDER_STATUS",
    entityId: "30000000-0000-4000-8000-000000000001",
  },
): Notifications.NotificationResponse => ({
  actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
  notification: {
    date: 0,
    request: {
      identifier,
      content: {
        title: "상품을 준비하고 있어요",
        subtitle: null,
        body: "준비가 끝나면 다시 알려드릴게요.",
        data,
        categoryIdentifier: null,
        sound: null,
      },
      trigger: { type: "push" },
    },
  },
});

const permission = (
  status: Notifications.PermissionStatus,
  options: { granted?: boolean; iosStatus?: number } = {},
): Notifications.NotificationPermissionsStatus => ({
  status,
  granted: options.granted ?? status === "granted",
  canAskAgain: status !== "denied",
  expires: "never",
  ...(options.iosStatus === undefined
    ? {}
    : {
        ios: {
          status: options.iosStatus,
          allowsDisplayInNotificationCenter: null,
          allowsDisplayOnLockScreen: null,
          allowsDisplayInCarPlay: null,
          allowsAlert: null,
          allowsBadge: null,
          allowsSound: null,
          allowsCriticalAlerts: null,
          alertStyle: 0,
          allowsPreviews: null,
          providesAppNotificationSettings: null,
          allowsAnnouncements: null,
        },
      }),
});

const renderApp = () =>
  render(
    <AppProviders>
      <Text testID="push-ready">ready</Text>
    </AppProviders>,
  );

const setSession = async (accessToken: string | null) => {
  jest.mocked(getAccessToken).mockResolvedValue(accessToken);
  await act(async () => {
    await mockSessionResetHandler?.();
  });
};

const foreground = () => {
  act(() => focusManager.setFocused(false));
  act(() => focusManager.setFocused(true));
};

const projectId = "095bcf9d-2bf8-4274-bb83-838d70c4f608";
const originalExpoOs = process.env.EXPO_OS;

describe("Expo Push lifecycle", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    process.env.EXPO_OS = "ios";
    Constants.expoConfig!.extra!.eas.projectId = projectId;
    focusManager.setFocused(true);
    onlineManager.setOnline(true);
    responseListener = undefined;
    removeResponseListener = jest.fn();
    mockSessionResetHandler = undefined;
    mockLastSessionResetHandler = undefined;

    jest.mocked(getAccessToken).mockResolvedValue("stored-access");
    jest.mocked(getCurrentUser).mockResolvedValue(viewer);
    jest.mocked(getFoNotification).mockResolvedValue(notification());
    jest
      .mocked(markFoNotificationRead)
      .mockImplementation(async () =>
        notification({ readAt: "2026-08-31T00:01:00.000Z" }),
      );
    registerFoPushDevice.mockResolvedValue(true);

    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue(permission(Notifications.PermissionStatus.GRANTED));
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockResolvedValue(permission(Notifications.PermissionStatus.GRANTED));
    jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({
      type: "expo",
      data: "ExponentPushToken[token-1]",
    });
    jest
      .mocked(Notifications.getLastNotificationResponse)
      .mockReturnValue(null);
    jest
      .mocked(Notifications.addNotificationResponseReceivedListener)
      .mockImplementation((listener) => {
        responseListener = listener;
        return { remove: removeResponseListener };
      });
    jest.mocked(NetInfo.fetch).mockResolvedValue({
      details: null,
      isConnected: true,
      isInternetReachable: null,
      type: NetInfoStateType.unknown,
    });
    jest.mocked(NetInfo.addEventListener).mockImplementation(() => jest.fn());
    jest.mocked(setSessionResetHandler).mockImplementation((handler) => {
      mockSessionResetHandler = handler;
      mockLastSessionResetHandler = handler;
      return () => {
        if (mockSessionResetHandler === handler)
          mockSessionResetHandler = undefined;
      };
    });
  });

  afterEach(async () => {
    jest.mocked(getAccessToken).mockResolvedValue(null);
    await act(async () => {
      await mockLastSessionResetHandler?.();
    });
    cleanup();
    focusManager.setFocused(true);
    onlineManager.setOnline(true);
    process.env.EXPO_OS = originalExpoOs;
    Constants.expoConfig!.extra!.eas.projectId = projectId;
    mockSessionResetHandler = undefined;
    mockLastSessionResetHandler = undefined;
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("mounts the foreground handler and removes response and focus listeners", async () => {
    const rendered = renderApp();

    expect(await screen.findByTestId("push-ready")).toHaveTextContent("ready");
    await waitFor(() =>
      expect(Notifications.setNotificationHandler).toHaveBeenCalled(),
    );
    const handler = jest
      .mocked(Notifications.setNotificationHandler)
      .mock.calls.find(([value]) => value !== null)?.[0];
    await expect(
      handler?.handleNotification(response("foreground").notification),
    ).resolves.toEqual({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    });
    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(1));

    await setSession(null);
    rendered.unmount();
    const tokenCalls = jest.mocked(Notifications.getExpoPushTokenAsync).mock
      .calls.length;
    foreground();

    expect(removeResponseListener).toHaveBeenCalledTimes(1);
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(
      tokenCalls,
    );
    mockLastSessionResetHandler = undefined;
  });

  it("keeps the foreground handler while another provider remains mounted", async () => {
    jest.mocked(getAccessToken).mockResolvedValue(null);
    const providers = (includeFirst: boolean) => (
      <>
        {includeFirst ? (
          <AppProviders key="first">
            <Text>first</Text>
          </AppProviders>
        ) : null}
        <AppProviders key="second">
          <Text>second</Text>
        </AppProviders>
      </>
    );
    const rendered = render(providers(true));
    await waitFor(() =>
      expect(
        Notifications.addNotificationResponseReceivedListener,
      ).toHaveBeenCalledTimes(2),
    );
    expect(
      jest
        .mocked(Notifications.setNotificationHandler)
        .mock.calls.filter(([handler]) => handler !== null),
    ).toHaveLength(1);

    rendered.rerender(providers(false));

    expect(
      jest
        .mocked(Notifications.setNotificationHandler)
        .mock.calls.filter(([handler]) => handler === null),
    ).toHaveLength(0);

    rendered.unmount();

    expect(
      jest
        .mocked(Notifications.setNotificationHandler)
        .mock.calls.filter(([handler]) => handler === null),
    ).toHaveLength(1);
    mockLastSessionResetHandler = undefined;
  });

  it.each([2, 3, 4])(
    "accepts iOS authorization status %s without prompting",
    async (iosStatus) => {
      jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(
        permission(Notifications.PermissionStatus.GRANTED, {
          granted: false,
          iosStatus,
        }),
      );

      renderApp();

      await waitFor(() =>
        expect(registerFoPushDevice).toHaveBeenCalledWith(
          {
            expoPushToken: "ExponentPushToken[token-1]",
            platform: "IOS",
          },
          expect.any(AbortSignal),
        ),
      );
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
        projectId,
      });
    },
  );

  it("requests an undetermined permission once and accepts provisional access", async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(
      permission(Notifications.PermissionStatus.UNDETERMINED, {
        iosStatus: 0,
      }),
    );
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(
      permission(Notifications.PermissionStatus.DENIED, {
        granted: false,
        iosStatus: 3,
      }),
    );

    renderApp();

    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(1));
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it.each([
    [Notifications.PermissionStatus.DENIED, 1],
    [Notifications.PermissionStatus.UNDETERMINED, 1],
  ] as const)(
    "does not register when %s permission remains denied",
    async (status, iosStatus) => {
      jest
        .mocked(Notifications.getPermissionsAsync)
        .mockResolvedValue(permission(status, { granted: false, iosStatus }));
      jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(
        permission(Notifications.PermissionStatus.DENIED, {
          granted: false,
          iosStatus,
        }),
      );

      renderApp();

      expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
      await waitFor(() =>
        expect(Notifications.getPermissionsAsync).toHaveBeenCalled(),
      );
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(
        status === Notifications.PermissionStatus.UNDETERMINED ? 1 : 0,
      );
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
      expect(registerFoPushDevice).not.toHaveBeenCalled();
    },
  );

  it("does not request Push access when viewer validation fails", async () => {
    jest
      .mocked(getCurrentUser)
      .mockRejectedValue(new GraphqlError("Unauthorized", 401));

    renderApp();

    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(registerFoPushDevice).not.toHaveBeenCalled();
  });

  it("registers with React Native's minimal AbortSignal contract", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      AbortSignal.prototype,
      "throwIfAborted",
    );
    Object.defineProperty(AbortSignal.prototype, "throwIfAborted", {
      configurable: true,
      value: undefined,
    });

    try {
      renderApp();

      await waitFor(() =>
        expect(registerFoPushDevice).toHaveBeenCalledTimes(1),
      );
    } finally {
      if (descriptor) {
        Object.defineProperty(
          AbortSignal.prototype,
          "throwIfAborted",
          descriptor,
        );
      } else {
        Reflect.deleteProperty(AbortSignal.prototype, "throwIfAborted");
      }
    }
  });

  it("waits for connectivity before validating and registering the viewer", async () => {
    onlineManager.setOnline(false);
    jest.mocked(NetInfo.fetch).mockResolvedValue({
      details: null,
      isConnected: false,
      isInternetReachable: false,
      type: NetInfoStateType.none,
    });

    renderApp();

    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();

    act(() => onlineManager.setOnline(true));

    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(1));
  });

  it("abandons viewer validation from a stale auth session", async () => {
    let resolveViewer: ((value: typeof viewer) => void) | undefined;
    const pendingViewer = new Promise<typeof viewer>((resolve) => {
      resolveViewer = resolve;
    });
    jest
      .mocked(getCurrentUser)
      .mockReturnValueOnce(pendingViewer)
      .mockResolvedValue(viewer);

    renderApp();
    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalledTimes(1));

    await setSession(null);
    resolveViewer?.(viewer);
    await act(async () => pendingViewer);

    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(registerFoPushDevice).not.toHaveBeenCalled();

    await setSession("new-access");

    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(1));
  });

  it("creates the Android channel before fetching the registration token", async () => {
    expect(getFoPushPlatform("android")).toBe("ANDROID");
    const registration = await getExpoPushRegistration(projectId, "ANDROID");

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "default",
      { importance: 6, name: "default" },
    );
    expect(
      jest.mocked(Notifications.setNotificationChannelAsync).mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(Notifications.getExpoPushTokenAsync).mock
        .invocationCallOrder[0]!,
    );
    expect(registration).toEqual({
      expoPushToken: "ExponentPushToken[token-1]",
      platform: "ANDROID",
    });
  });

  it("retries missing EAS configuration on the next authenticated foreground", async () => {
    Constants.expoConfig!.extra!.eas.projectId = undefined;

    renderApp();

    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() =>
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled(),
    );
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    Constants.expoConfig!.extra!.eas.projectId = projectId;

    foreground();

    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(1));
  });

  it("keeps login usable and retries a registration error on foreground", async () => {
    registerFoPushDevice
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(true);

    renderApp();

    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(1));
    foreground();

    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("push-ready")).toBeOnTheScreen();
  });

  it("serializes Push registration across auth session replacements", async () => {
    let resolveSessionA: ((result: boolean) => void) | undefined;
    const sessionARegistration = new Promise<boolean>((resolve) => {
      resolveSessionA = resolve;
    });
    let activeRegistrations = 0;
    let maxActiveRegistrations = 0;

    jest
      .mocked(Notifications.getExpoPushTokenAsync)
      .mockResolvedValueOnce({
        type: "expo",
        data: "ExponentPushToken[session-a]",
      })
      .mockResolvedValueOnce({
        type: "expo",
        data: "ExponentPushToken[session-b]",
      });
    registerFoPushDevice
      .mockImplementationOnce(async () => {
        activeRegistrations += 1;
        maxActiveRegistrations = Math.max(
          maxActiveRegistrations,
          activeRegistrations,
        );
        const result = await sessionARegistration;
        activeRegistrations -= 1;
        return result;
      })
      .mockImplementationOnce(async () => {
        activeRegistrations += 1;
        maxActiveRegistrations = Math.max(
          maxActiveRegistrations,
          activeRegistrations,
        );
        activeRegistrations -= 1;
        return true;
      });

    renderApp();
    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(1));

    await setSession("replacement-access");
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(registerFoPushDevice).toHaveBeenCalledTimes(1);
    expect(maxActiveRegistrations).toBe(1);

    resolveSessionA?.(true);
    await act(async () => sessionARegistration);

    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(2));
    expect(maxActiveRegistrations).toBe(1);
    expect(registerFoPushDevice).toHaveBeenNthCalledWith(
      1,
      {
        expoPushToken: "ExponentPushToken[session-a]",
        platform: "IOS",
      },
      expect.any(AbortSignal),
    );
    expect(registerFoPushDevice).toHaveBeenLastCalledWith(
      {
        expoPushToken: "ExponentPushToken[session-b]",
        platform: "IOS",
      },
      expect.any(AbortSignal),
    );
  });

  it("coalesces foreground and reconnect triggers into one queued retry", async () => {
    let rejectFirstRegistration: ((error: Error) => void) | undefined;
    const firstRegistration = new Promise<boolean>((_resolve, reject) => {
      rejectFirstRegistration = reject;
    });
    let activeRegistrations = 0;
    let maxActiveRegistrations = 0;
    registerFoPushDevice
      .mockImplementationOnce(async () => {
        activeRegistrations += 1;
        maxActiveRegistrations = Math.max(
          maxActiveRegistrations,
          activeRegistrations,
        );
        try {
          return await firstRegistration;
        } finally {
          activeRegistrations -= 1;
        }
      })
      .mockImplementationOnce(async () => {
        activeRegistrations += 1;
        maxActiveRegistrations = Math.max(
          maxActiveRegistrations,
          activeRegistrations,
        );
        activeRegistrations -= 1;
        return true;
      });

    renderApp();
    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(1));

    foreground();
    act(() => onlineManager.setOnline(false));
    act(() => onlineManager.setOnline(true));
    await act(async () => Promise.resolve());

    expect(registerFoPushDevice).toHaveBeenCalledTimes(1);

    rejectFirstRegistration?.(new Error("temporary failure"));
    await act(async () => firstRegistration.catch(() => undefined));

    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(2));
    expect(maxActiveRegistrations).toBe(1);
  });

  it("times out a hung session and registers only the latest session", async () => {
    let resolveHungToken:
      ((token: Notifications.ExpoPushToken) => void) | undefined;
    const hungToken = new Promise<Notifications.ExpoPushToken>((resolve) => {
      resolveHungToken = resolve;
    });
    jest
      .mocked(Notifications.getExpoPushTokenAsync)
      .mockReturnValueOnce(hungToken)
      .mockResolvedValueOnce({
        type: "expo",
        data: "ExponentPushToken[session-b]",
      });

    renderApp();
    await waitFor(() =>
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(1),
    );

    await setSession("replacement-access");

    expect(registerFoPushDevice).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(10_000);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(1));
    expect(registerFoPushDevice).toHaveBeenLastCalledWith(
      {
        expoPushToken: "ExponentPushToken[session-b]",
        platform: "IOS",
      },
      expect.any(AbortSignal),
    );
    expect(getCurrentUser).toHaveBeenNthCalledWith(1, expect.any(AbortSignal));
    expect(getCurrentUser).toHaveBeenNthCalledWith(2, expect.any(AbortSignal));

    resolveHungToken?.({
      type: "expo",
      data: "ExponentPushToken[session-a]",
    });
    await act(async () => hungToken);

    expect(registerFoPushDevice).toHaveBeenCalledTimes(1);
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(2);
  });

  it("suppresses a rejected token until the token or auth session changes", async () => {
    registerFoPushDevice.mockResolvedValue(false);
    jest
      .mocked(Notifications.getExpoPushTokenAsync)
      .mockResolvedValueOnce({
        type: "expo",
        data: "ExponentPushToken[rejected]",
      })
      .mockResolvedValueOnce({
        type: "expo",
        data: "ExponentPushToken[rejected]",
      })
      .mockResolvedValue({
        type: "expo",
        data: "ExponentPushToken[changed]",
      });

    renderApp();

    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(1));
    foreground();
    await waitFor(() =>
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledTimes(2),
    );
    expect(registerFoPushDevice).toHaveBeenCalledTimes(1);
    foreground();
    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(2));

    await setSession(null);
    jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({
      type: "expo",
      data: "ExponentPushToken[changed]",
    });
    await setSession("new-access");

    await waitFor(() => expect(registerFoPushDevice).toHaveBeenCalledTimes(3));
  });

  it("handles a cold response once through the authoritative notification", async () => {
    const coldResponse = response("response-1");
    jest
      .mocked(Notifications.getLastNotificationResponse)
      .mockReturnValue(coldResponse);

    renderApp();

    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith(
        "/order/30000000-0000-4000-8000-000000000001",
      ),
    );
    act(() => responseListener?.(coldResponse));
    await act(async () => Promise.resolve());

    expect(getFoNotification).toHaveBeenCalledTimes(1);
    expect(getFoNotification).toHaveBeenCalledWith(
      "20000000-0000-4000-8000-000000000001",
      expect.any(AbortSignal),
    );
    expect(markFoNotificationRead).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledTimes(1);
  });

  it.each([
    {},
    { notificationId: 1, type: "ORDER_STATUS", entityId: "order-1" },
    { notificationId: "notification-1", type: "PROMOTION", entityId: "x" },
    { notificationId: "notification-1", type: "ORDER_STATUS", entityId: "" },
  ])("rejects malformed Push data %#", async (data) => {
    renderApp();
    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(responseListener).toBeDefined());

    act(() => responseListener?.(response("malformed", data)));
    await act(async () => Promise.resolve());

    expect(getFoNotification).not.toHaveBeenCalled();
    expect(markFoNotificationRead).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("holds an unauthenticated tap in memory and resolves it after login", async () => {
    jest.mocked(getAccessToken).mockResolvedValue(null);
    renderApp();
    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(responseListener).toBeDefined());

    act(() => responseListener?.(response("pending-response")));
    await act(async () => Promise.resolve());
    expect(getFoNotification).not.toHaveBeenCalled();

    await setSession("signed-in-access");

    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith(
        "/order/30000000-0000-4000-8000-000000000001",
      ),
    );
    expect(getFoNotification).toHaveBeenCalledWith(
      "20000000-0000-4000-8000-000000000001",
      expect.any(AbortSignal),
    );
  });

  it("keeps a canceled tap pending across logout and the next login", async () => {
    let observedAbort = false;
    jest
      .mocked(getFoNotification)
      .mockImplementationOnce(
        (_notificationId, signal) =>
          new Promise<FoNotification>(() => {
            signal?.addEventListener(
              "abort",
              () => {
                observedAbort = true;
              },
              { once: true },
            );
          }),
      )
      .mockResolvedValueOnce(notification());
    renderApp();
    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(responseListener).toBeDefined());

    act(() => responseListener?.(response("canceled-response")));
    await waitFor(() => expect(getFoNotification).toHaveBeenCalledTimes(1));

    await setSession(null);

    expect(observedAbort).toBe(true);
    expect(mockRouter.replace).not.toHaveBeenCalled();

    await setSession("replacement-access");

    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith(
        "/order/30000000-0000-4000-8000-000000000001",
      ),
    );
    expect(getFoNotification).toHaveBeenCalledTimes(2);
  });

  it("rejects reverted cached detail after a session reset", async () => {
    const cachedEntityId = "30000000-0000-4000-8000-000000000009";
    const replacementEntityId = "30000000-0000-4000-8000-000000000010";
    const cachedRoute = `/order/${cachedEntityId}`;
    const replacementRoute = `/order/${replacementEntityId}`;
    let observedAbort = false;
    jest
      .mocked(getFoNotification)
      .mockResolvedValueOnce(
        notification({ entityId: cachedEntityId, route: cachedRoute }),
      )
      .mockImplementationOnce(
        (_notificationId, signal) =>
          new Promise<FoNotification>(() => {
            signal?.addEventListener(
              "abort",
              () => {
                observedAbort = true;
              },
              { once: true },
            );
          }),
      )
      .mockResolvedValueOnce(
        notification({
          entityId: replacementEntityId,
          route: replacementRoute,
        }),
      );
    jest.mocked(markFoNotificationRead).mockResolvedValue(
      notification({
        readAt: "2026-08-31T00:01:00.000Z",
        entityId: cachedEntityId,
        route: cachedRoute,
      }),
    );
    renderApp();
    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(responseListener).toBeDefined());

    act(() => responseListener?.(response("cache-seed-response")));
    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith(cachedRoute),
    );
    mockRouter.push.mockClear();
    mockRouter.replace.mockClear();
    jest.mocked(markFoNotificationRead).mockClear();

    act(() => responseListener?.(response("cached-cancel-response")));
    await waitFor(() => expect(getFoNotification).toHaveBeenCalledTimes(2));

    await setSession(null);

    expect(observedAbort).toBe(true);
    expect(markFoNotificationRead).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();

    await setSession("replacement-access");

    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith(replacementRoute),
    );
    expect(getFoNotification).toHaveBeenCalledTimes(3);
  });

  it("retries a 401 tap under a replacement authenticated session", async () => {
    jest
      .mocked(getFoNotification)
      .mockRejectedValueOnce(new GraphqlError("Unauthorized", 401))
      .mockResolvedValueOnce(notification());
    renderApp();
    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(responseListener).toBeDefined());

    act(() => responseListener?.(response("expired-session-response")));
    await waitFor(() => expect(getFoNotification).toHaveBeenCalledTimes(1));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();

    await setSession("replacement-access");

    await waitFor(() =>
      expect(mockRouter.push).toHaveBeenCalledWith(
        "/order/30000000-0000-4000-8000-000000000001",
      ),
    );
    expect(getFoNotification).toHaveBeenCalledTimes(2);
  });

  it("falls back for a server notification with a forbidden route", async () => {
    jest
      .mocked(getFoNotification)
      .mockResolvedValue(notification({ route: "https://attacker.example" }));
    renderApp();
    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(responseListener).toBeDefined());

    act(() => responseListener?.(response("forbidden-response")));

    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith("/notifications"),
    );
    expect(markFoNotificationRead).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("falls back when the authoritative notification was deleted", async () => {
    jest
      .mocked(getFoNotification)
      .mockRejectedValue(new Error("notification not found"));
    renderApp();
    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(responseListener).toBeDefined());

    act(() => responseListener?.(response("deleted-response")));

    await waitFor(
      () => expect(mockRouter.replace).toHaveBeenCalledWith("/notifications"),
      { timeout: 10_000 },
    );
    expect(markFoNotificationRead).not.toHaveBeenCalled();
  }, 12_000);

  it("falls back when marking the authoritative notification read fails", async () => {
    jest
      .mocked(markFoNotificationRead)
      .mockRejectedValue(new Error("write failed"));
    renderApp();
    expect(await screen.findByTestId("push-ready")).toBeOnTheScreen();
    await waitFor(() => expect(responseListener).toBeDefined());

    act(() => responseListener?.(response("read-error-response")));

    await waitFor(() =>
      expect(mockRouter.replace).toHaveBeenCalledWith("/notifications"),
    );
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
