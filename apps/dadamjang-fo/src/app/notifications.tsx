import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { useAuthActionGate } from "@/features/auth";
import {
  getAllowedNotificationRoute,
  NotificationInbox,
  useFoNotifications,
  useMarkAllFoNotificationsRead,
  useMarkFoNotificationRead,
} from "@/features/notification";
import type { FoNotification } from "@/features/notification";
import { Button } from "@/shared/components/button";
import { uniqueBy } from "@/shared/lib";

const AuthenticatedNotificationsRoute = () => {
  const router = useRouter();
  const query = useFoNotifications();
  const markRead = useMarkFoNotificationRead();
  const markAllRead = useMarkAllFoNotificationsRead();
  const notifications = useMemo(
    () =>
      uniqueBy(
        query.data?.pages.flatMap(({ nodes }) => nodes) ?? [],
        ({ notificationId }) => notificationId,
      ),
    [query.data?.pages],
  );
  const unreadCount = query.data?.pages[0]?.unreadCount ?? 0;

  const openNotification = async (notification: FoNotification) => {
    try {
      const current = await markRead.mutateAsync(notification.notificationId);
      const route = getAllowedNotificationRoute(current);
      if (route) router.push(route);
      else router.replace("/notifications");
    } catch {
      router.replace("/notifications");
    }
  };

  return (
    <NotificationInbox
      hasNextPage={Boolean(query.hasNextPage)}
      isError={query.isError}
      isFetchingNextPage={query.isFetchingNextPage}
      isLoading={query.isLoading}
      isMarkingAllRead={markAllRead.isPending}
      isRefreshing={Boolean(query.isRefetching && !query.isFetchingNextPage)}
      notifications={notifications}
      onLoadMore={() => void query.fetchNextPage()}
      onMarkAllRead={() => markAllRead.mutate()}
      onOpenNotification={(notification) => void openNotification(notification)}
      onRefresh={() => void query.refetch()}
      onRetry={() => void query.refetch()}
      unreadCount={unreadCount}
    />
  );
};

const NotificationsRoute = () => {
  const { authStatus, isAuthenticated, redirectToSignIn, retryAuth } =
    useAuthActionGate("/notifications");

  useEffect(() => {
    if (authStatus === "unauthenticated") redirectToSignIn(true);
  }, [authStatus, redirectToSignIn]);

  if (authStatus === "loading" || authStatus === "offline")
    return (
      <Text style={s.state}>
        {authStatus === "offline"
          ? "연결을 기다리고 있어요."
          : "로그인 상태를 확인하고 있어요."}
      </Text>
    );
  if (authStatus === "error")
    return (
      <View style={s.stateGroup}>
        <Text accessibilityRole="alert" style={s.state}>
          로그인 상태를 확인하지 못했어요.
        </Text>
        <Button label="다시 시도" onPress={() => void retryAuth()} />
      </View>
    );
  if (!isAuthenticated)
    return <Text style={s.state}>로그인 화면으로 이동하고 있어요.</Text>;
  return <AuthenticatedNotificationsRoute />;
};

const s = StyleSheet.create({
  stateGroup: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  state: {
    flex: 1,
    padding: spacing.xl,
    color: colors.muted,
    textAlign: "center",
  },
});

export default NotificationsRoute;
