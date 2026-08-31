import NetInfo, {
  NetInfoStateType,
  type NetInfoState,
} from "@react-native-community/netinfo";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { AppState, Text } from "react-native";

import {
  getAccessToken,
  setSessionResetHandler,
} from "@dadamjang/graphql-client";

import WishScreen from "@/app/(tabs)/wish";
import StyleComposeScreen from "@/app/style-compose";
import { getCurrentUser } from "@/features/auth/api";
import { useCurrentUser } from "@/features/auth/hooks";
import { AppProviders } from "@/providers/app-providers";

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
let mockSessionResetHandler: (() => void | Promise<void>) | undefined;
let mockLastSessionResetHandler: (() => void | Promise<void>) | undefined;

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(),
  },
  NetInfoStateType: {
    none: "none",
    other: "other",
    unknown: "unknown",
  },
}));

jest.mock("@dadamjang/graphql-client", () => {
  const actual = jest.requireActual("@dadamjang/graphql-client");
  return {
    ...actual,
    getAccessToken: jest.fn(),
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
  getCurrentUser: jest.fn(),
}));

jest.mock("@/shared/components", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    ActionButton: () => null,
    Button: ({
      label,
      onPress,
      testID,
    }: {
      label: string;
      onPress: () => void;
      testID?: string;
    }) =>
      React.createElement(
        Pressable,
        { accessibilityRole: "button", onPress, testID },
        React.createElement(Text, null, label),
      ),
    TitleHeader: ({
      children,
      title,
    }: {
      children?: ReactNode;
      title: string;
    }) =>
      React.createElement(
        View,
        null,
        React.createElement(Text, null, title),
        children,
      ),
  };
});

const offlineState: NetInfoState = {
  details: null,
  isConnected: false,
  isInternetReachable: false,
  type: NetInfoStateType.none,
};

const onlineState: NetInfoState = {
  details: { isConnectionExpensive: false },
  isConnected: true,
  isInternetReachable: true,
  type: NetInfoStateType.other,
};

const unknownState: NetInfoState = {
  details: null,
  isConnected: null,
  isInternetReachable: null,
  type: NetInfoStateType.unknown,
};

const createDeferred = <T,>() => {
  let resolve: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return {
    promise,
    resolve: (value: T) => resolve?.(value),
  };
};

const AuthStatusProbe = () => {
  const { authStatus } = useCurrentUser();
  return <Text>{authStatus}</Text>;
};

describe("native auth network lifecycle", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    onlineManager.setOnline(true);
    focusManager.setFocused(true);
    jest.mocked(getCurrentUser).mockResolvedValue({
      userId: "user-1",
      userid: "buyer",
      email: "buyer@example.com",
      role: "USER",
      hasPassword: true,
    });
    jest.mocked(getAccessToken).mockResolvedValue(null);
    jest.mocked(NetInfo.fetch).mockResolvedValue(onlineState);
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
      await mockSessionResetHandler?.();
    });
    mockSessionResetHandler = undefined;
  });

  afterAll(async () => {
    jest.mocked(getAccessToken).mockResolvedValue(null);
    await act(async () => {
      await mockLastSessionResetHandler?.();
    });
    onlineManager.setOnline(true);
    focusManager.setFocused(true);
    mockLastSessionResetHandler = undefined;
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("hydrates the network and stored session before starting auth queries", async () => {
    const network = createDeferred<NetInfoState>();
    const session = createDeferred<string | null>();
    jest.mocked(NetInfo.fetch).mockReturnValue(network.promise);
    jest.mocked(getAccessToken).mockReturnValue(session.promise);

    render(
      <AppProviders>
        <AuthStatusProbe />
      </AppProviders>,
    );

    session.resolve("stored-access");
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByText("offline")).not.toBeOnTheScreen();
    expect(getCurrentUser).not.toHaveBeenCalled();

    network.resolve(offlineState);

    expect(await screen.findByText("offline")).toBeOnTheScreen();
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("uses the fetched initial state after a synchronous unknown event", async () => {
    jest.mocked(getAccessToken).mockResolvedValue("stored-access");
    jest.mocked(NetInfo.addEventListener).mockImplementation((listener) => {
      listener(unknownState);
      return jest.fn();
    });

    render(
      <AppProviders>
        <AuthStatusProbe />
      </AppProviders>,
    );

    expect(await screen.findByText("authenticated")).toBeOnTheScreen();
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it("updates query focus from AppState and removes native listeners", async () => {
    let appStateListener:
      ((state: "active" | "background" | "inactive") => void) | undefined;
    const removeAppStateListener = jest.fn();
    const removeNetworkListener = jest.fn();
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        appStateListener = listener;
        return { remove: removeAppStateListener };
      });
    jest
      .mocked(NetInfo.addEventListener)
      .mockReturnValue(removeNetworkListener);

    render(
      <AppProviders>
        <Text>ready</Text>
      </AppProviders>,
    );

    expect(await screen.findByText("ready")).toBeOnTheScreen();
    expect(appStateListener).toBeDefined();

    act(() => appStateListener?.("background"));
    expect(focusManager.isFocused()).toBe(false);

    act(() => appStateListener?.("active"));
    expect(focusManager.isFocused()).toBe(true);

    screen.unmount();
    expect(removeAppStateListener).toHaveBeenCalledTimes(1);
    expect(removeNetworkListener).toHaveBeenCalledTimes(1);
  });

  it("does not redirect a stored session to sign-in on a cold offline start", async () => {
    onlineManager.setOnline(false);
    jest.mocked(NetInfo.fetch).mockResolvedValue(offlineState);
    jest.mocked(getAccessToken).mockResolvedValue("stored-access");

    render(
      <AppProviders>
        <StyleComposeScreen />
      </AppProviders>,
    );

    await waitFor(() => {
      expect(setSessionResetHandler).toHaveBeenCalled();
    });
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("shows a session error instead of guest UI when hydration fails", async () => {
    jest
      .mocked(getAccessToken)
      .mockRejectedValue(new Error("secure storage unavailable"));
    jest
      .mocked(getCurrentUser)
      .mockRejectedValue(new Error("network unavailable"));

    render(
      <AppProviders>
        <WishScreen />
      </AppProviders>,
    );

    expect(
      await screen.findByText("로그인 상태를 확인하지 못했어요."),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId("e2e.wish.login")).not.toBeOnTheScreen();
    await waitFor(() => {
      expect(getCurrentUser).not.toHaveBeenCalled();
    });
  });
});
