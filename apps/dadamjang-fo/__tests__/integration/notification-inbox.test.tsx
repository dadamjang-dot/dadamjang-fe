import { LegendList } from "@legendapp/list/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import NotificationsRoute from "@/app/notifications";
import { useAuthActionGate } from "@/features/auth";
import {
  getFoNotifications,
  markAllFoNotificationsRead,
  markFoNotificationRead,
} from "@/features/notification/api";
import type {
  FoNotification,
  FoNotificationConnection,
} from "@/features/notification/types";
import {
  layoutLegendList,
  scrollLegendListToEnd,
} from "../helpers/layout-legend-list";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRedirectToSignIn = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock("@/features/auth", () => ({
  useAuthActionGate: jest.fn(),
}));

jest.mock("@/features/notification/api", () => ({
  getFoNotification: jest.fn(),
  getFoNotifications: jest.fn(),
  markAllFoNotificationsRead: jest.fn(),
  markFoNotificationRead: jest.fn(),
}));

const createdAt = "2026-08-31T12:00:00.000Z";
const notifications: FoNotification[] = [
  {
    notificationId: "notification-order",
    type: "ORDER_STATUS",
    title: "상품을 준비하고 있어요",
    body: "준비가 끝나면 다시 알려드릴게요.",
    route: "/order/order-1",
    entityId: "order-1",
    readAt: null,
    createdAt: "2026-08-31T12:04:00.000Z",
  },
  {
    notificationId: "notification-price",
    type: "WISH_PRICE_DROP",
    title: "위시 상품 가격이 내려갔어요",
    body: "찜한 상품을 지금 확인해 보세요.",
    route: "/product/product-1",
    entityId: "product-1",
    readAt: createdAt,
    createdAt: "2026-08-31T12:03:00.000Z",
  },
  {
    notificationId: "notification-stock",
    type: "WISH_RESTOCK",
    title: "위시 상품이 다시 입고됐어요",
    body: "품절되기 전에 확인해 보세요.",
    route: "/product/product-2",
    entityId: "product-2",
    readAt: null,
    createdAt: "2026-08-31T12:02:00.000Z",
  },
  {
    notificationId: "notification-style",
    type: "STYLE_LIKE",
    title: "스타일에 좋아요가 달렸어요",
    body: "내 스타일 게시물을 확인해 보세요.",
    route: "/style/style-1",
    entityId: "style-1",
    readAt: null,
    createdAt: "2026-08-31T12:01:00.000Z",
  },
];

const page = (
  nodes: FoNotification[],
  options: Partial<FoNotificationConnection> = {},
): FoNotificationConnection => ({
  nodes,
  nextCursor: null,
  hasNextPage: false,
  unreadCount: nodes.filter(({ readAt }) => readAt === null).length,
  ...options,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { gcTime: Infinity, retry: false },
      queries: { gcTime: Infinity, retry: false },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = "NotificationInboxTestWrapper";
  return Wrapper;
};

const renderRoute = () =>
  render(<NotificationsRoute />, { wrapper: createWrapper() });

describe("notification inbox route", () => {
  beforeEach(() => {
    jest.mocked(useAuthActionGate).mockReturnValue({
      authStatus: "authenticated",
      isAuthenticated: true,
      redirectToSignIn: mockRedirectToSignIn,
      retryAuth: jest.fn(),
    } as never);
    jest.mocked(getFoNotifications).mockResolvedValue(page(notifications));
    jest.mocked(markFoNotificationRead).mockImplementation(async (id) => ({
      ...notifications.find(({ notificationId }) => notificationId === id)!,
      readAt: createdAt,
    }));
    jest.mocked(markAllFoNotificationsRead).mockResolvedValue(true);
  });

  it("redirects a signed-out deep link through the existing auth gate", async () => {
    jest.mocked(useAuthActionGate).mockReturnValue({
      authStatus: "unauthenticated",
      isAuthenticated: false,
      redirectToSignIn: mockRedirectToSignIn,
      retryAuth: jest.fn(),
    } as never);

    renderRoute();

    await waitFor(() =>
      expect(mockRedirectToSignIn).toHaveBeenCalledWith(true),
    );
    expect(screen.getByText("로그인 화면으로 이동하고 있어요.")).toBeVisible();
    expect(getFoNotifications).not.toHaveBeenCalled();
  });

  it("shows loading, empty, and retryable error states", async () => {
    jest
      .mocked(getFoNotifications)
      .mockImplementationOnce(() => new Promise(() => undefined));
    const loading = renderRoute();
    expect(screen.getByText("알림을 불러오는 중이에요.")).toBeVisible();
    loading.unmount();

    jest.mocked(getFoNotifications).mockRejectedValueOnce(new Error("offline"));
    const error = renderRoute();
    await fireEvent.press(
      await screen.findByRole("button", { name: "다시 시도" }),
    );
    await waitFor(() => expect(getFoNotifications).toHaveBeenCalledTimes(3));
    error.unmount();

    jest.mocked(getFoNotifications).mockResolvedValueOnce(page([]));
    renderRoute();
    expect(await screen.findByText("아직 알림이 없어요.")).toBeVisible();
  });

  it("filters every supported notification category", async () => {
    renderRoute();
    await screen.findByLabelText("알림 목록");
    layoutLegendList("알림 목록");

    const cases = [
      ["주문", "상품을 준비하고 있어요"],
      ["가격 인하", "위시 상품 가격이 내려갔어요"],
      ["재입고", "위시 상품이 다시 입고됐어요"],
      ["스타일", "스타일에 좋아요가 달렸어요"],
    ] as const;

    for (const [filter, expectedTitle] of cases) {
      fireEvent.press(screen.getByRole("button", { name: filter }));
      expect(screen.getByText(expectedTitle)).toBeVisible();
      expect(screen.getAllByTestId(/^e2e\.notification\.open\./)).toHaveLength(
        1,
      );
    }

    fireEvent.press(screen.getByRole("button", { name: "전체" }));
    expect(screen.getAllByTestId(/^e2e\.notification\.open\./)).toHaveLength(4);
  });

  it("loads an explicitly requested page when a filter has no visible rows yet", async () => {
    jest.mocked(getFoNotifications).mockImplementation(async ({ after }) =>
      after === "cursor-style"
        ? page([notifications[3]!])
        : page([notifications[0]!], {
            hasNextPage: true,
            nextCursor: "cursor-style",
          }),
    );
    renderRoute();
    await screen.findByLabelText("알림 목록");

    fireEvent.press(screen.getByRole("button", { name: "스타일" }));
    layoutLegendList("알림 목록");

    expect(screen.queryByText("조건에 맞는 알림이 없어요.")).toBeNull();
    expect(screen.getByRole("button", { name: "더 불러오기" })).toBeVisible();
    scrollLegendListToEnd("알림 목록");
    expect(getFoNotifications).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole("button", { name: "더 불러오기" }));

    await waitFor(() => expect(getFoNotifications).toHaveBeenCalledTimes(2));
    layoutLegendList("알림 목록");
    expect(
      await screen.findByText("스타일에 좋아요가 달렸어요"),
    ).toBeOnTheScreen();
    expect(getFoNotifications).toHaveBeenLastCalledWith(
      { after: "cursor-style", first: 20 },
      expect.anything(),
    );
  });

  it("appends the next keyset page", async () => {
    jest.mocked(getFoNotifications).mockImplementation(async ({ after }) =>
      after === "cursor-2"
        ? page([notifications[3]!], { unreadCount: 2 })
        : page(notifications.slice(0, 3), {
            hasNextPage: true,
            nextCursor: "cursor-2",
            unreadCount: 3,
          }),
    );
    renderRoute();
    await screen.findByLabelText("알림 목록");
    layoutLegendList("알림 목록");

    scrollLegendListToEnd("알림 목록");
    expect(await screen.findByText("스타일에 좋아요가 달렸어요")).toBeVisible();
    expect(getFoNotifications).toHaveBeenCalledWith(
      { after: "cursor-2", first: 20 },
      expect.anything(),
    );
  });

  it("replaces cached rows with the newest first page on refresh", async () => {
    const newestNotification: FoNotification = {
      ...notifications[3]!,
      notificationId: "notification-newest",
      title: "방금 도착한 새 알림",
      createdAt: "2026-08-31T12:05:00.000Z",
    };
    jest
      .mocked(getFoNotifications)
      .mockResolvedValueOnce(page([notifications[0]!, notifications[1]!]))
      .mockResolvedValueOnce(page([newestNotification, notifications[0]!]));
    renderRoute();
    await screen.findByLabelText("알림 목록");
    layoutLegendList("알림 목록");

    fireEvent(screen.getByLabelText("알림 목록"), "refresh");

    await waitFor(() => expect(getFoNotifications).toHaveBeenCalledTimes(2));
    layoutLegendList("알림 목록");
    await screen.findByText("방금 도착한 새 알림");
    expect(screen.queryByText("위시 상품 가격이 내려갔어요")).toBeNull();
    expect(
      screen
        .UNSAFE_getByType(LegendList)
        .props.data.map(({ notificationId }: FoNotification) => notificationId),
    ).toEqual(["notification-newest", "notification-order"]);
  });

  it("marks one notification read before pushing its verified destination", async () => {
    const user = userEvent.setup();
    renderRoute();
    await screen.findByLabelText("알림 목록");
    layoutLegendList("알림 목록");

    expect(screen.getAllByText("새 알림")).toHaveLength(3);
    expect(
      screen.getByRole("button", {
        name: "상품을 준비하고 있어요, 준비가 끝나면 다시 알려드릴게요., 새 알림",
      }),
    ).toBeVisible();
    await user.press(
      screen.getByTestId("e2e.notification.open.notification-order"),
    );

    await waitFor(() => expect(markFoNotificationRead).toHaveBeenCalled());
    expect(jest.mocked(markFoNotificationRead).mock.calls[0]?.[0]).toBe(
      "notification-order",
    );
    expect(mockPush).toHaveBeenCalledWith("/order/order-1");
  });

  it("falls back to the inbox when the server returns a forbidden route", async () => {
    const user = userEvent.setup();
    jest.mocked(markFoNotificationRead).mockResolvedValueOnce({
      ...notifications[0]!,
      route: "https://example.test/phishing",
      readAt: createdAt,
    });
    renderRoute();
    await screen.findByLabelText("알림 목록");
    layoutLegendList("알림 목록");

    await user.press(
      screen.getByTestId("e2e.notification.open.notification-order"),
    );

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/notifications"),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("marks every notification read", async () => {
    const user = userEvent.setup();
    const readNotifications = notifications.map((notification) => ({
      ...notification,
      readAt: notification.readAt ?? createdAt,
    }));
    jest
      .mocked(getFoNotifications)
      .mockResolvedValueOnce(page(notifications))
      .mockResolvedValueOnce(page(readNotifications));
    renderRoute();
    await screen.findByLabelText("알림 목록");
    layoutLegendList("알림 목록");

    expect(screen.getByLabelText("3개의 읽지 않은 알림")).toBeVisible();
    expect(screen.getAllByText("새 알림")).toHaveLength(3);
    await user.press(screen.getByRole("button", { name: "모두 읽음" }));

    await waitFor(() =>
      expect(markAllFoNotificationsRead).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(getFoNotifications).toHaveBeenCalledTimes(2));
    layoutLegendList("알림 목록");
    expect(screen.getByLabelText("0개의 읽지 않은 알림")).toBeVisible();
    expect(screen.queryByText("새 알림")).toBeNull();
    expect(screen.getByRole("button", { name: "모두 읽음" })).toBeDisabled();
  });
});
