import { LegendList } from "@legendapp/list/react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";

import { colors, spacing } from "@dadamjang/design-tokens";

import { Button } from "@/shared/components/button";
import { TitleHeader } from "@/shared/components/title-header";
import type { FoNotification, FoNotificationType } from "../types";

type NotificationFilter = "ALL" | FoNotificationType;

type NotificationInboxProps = {
  hasNextPage: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isMarkingAllRead: boolean;
  isRefreshing: boolean;
  notifications: FoNotification[];
  onLoadMore: () => void;
  onMarkAllRead: () => void;
  onOpenNotification: (notification: FoNotification) => void;
  onRefresh: () => void;
  onRetry: () => void;
  unreadCount: number;
};

const filters: readonly { label: string; value: NotificationFilter }[] = [
  { label: "전체", value: "ALL" },
  { label: "주문", value: "ORDER_STATUS" },
  { label: "가격 인하", value: "WISH_PRICE_DROP" },
  { label: "재입고", value: "WISH_RESTOCK" },
  { label: "스타일", value: "STYLE_LIKE" },
];

const NotificationInbox = ({
  hasNextPage,
  isError,
  isFetchingNextPage,
  isLoading,
  isMarkingAllRead,
  isRefreshing,
  notifications,
  onLoadMore,
  onMarkAllRead,
  onOpenNotification,
  onRefresh,
  onRetry,
  unreadCount,
}: NotificationInboxProps) => {
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const visibleNotifications = useMemo(
    () =>
      filter === "ALL"
        ? notifications
        : notifications.filter(({ type }) => type === filter),
    [filter, notifications],
  );

  return (
    <View style={s.container}>
      <TitleHeader title="알림">
        <Text
          accessibilityLabel={`${unreadCount}개의 읽지 않은 알림`}
          style={s.count}
        >
          {unreadCount}
        </Text>
        <Button
          disabled={unreadCount === 0 || isMarkingAllRead}
          label="모두 읽음"
          onPress={onMarkAllRead}
          style={s.markAllButton}
          variant="bare"
        />
      </TitleHeader>
      <ScrollView
        contentContainerStyle={s.filterContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filters}
      >
        {filters.map(({ label, value }) => {
          const selected = filter === value;
          return (
            <Button
              accessibilityState={{ selected }}
              key={value}
              label={label}
              onPress={() => setFilter(value)}
              style={[s.filter, selected && s.selectedFilter]}
              variant="secondary"
            />
          );
        })}
      </ScrollView>
      {isLoading ? (
        <View style={s.state}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.stateDescription}>알림을 불러오는 중이에요.</Text>
        </View>
      ) : isError ? (
        <View style={s.state}>
          <Text accessibilityRole="alert" style={s.stateTitle}>
            알림을 불러오지 못했어요.
          </Text>
          <Text style={s.stateDescription}>잠시 후 다시 시도해 주세요.</Text>
          <Button label="다시 시도" onPress={onRetry} style={s.retryButton} />
        </View>
      ) : (
        <LegendList
          accessibilityLabel="알림 목록"
          contentContainerStyle={s.listContent}
          contentInsetAdjustmentBehavior="automatic"
          data={visibleNotifications}
          keyExtractor={({ notificationId }) => notificationId}
          ListEmptyComponent={
            <View style={s.state}>
              <Text style={s.stateTitle}>
                {notifications.length
                  ? "조건에 맞는 알림이 없어요."
                  : "아직 알림이 없어요."}
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={colors.primary} style={s.footer} />
            ) : null
          }
          onEndReached={
            hasNextPage && !isFetchingNextPage ? onLoadMore : undefined
          }
          onEndReachedThreshold={0.6}
          onRefresh={onRefresh}
          recycleItems
          refreshing={isRefreshing}
          renderItem={({ item }) => (
            <Button
              accessibilityLabel={`${item.title}, ${item.body}${item.readAt === null ? ", 새 알림" : ""}`}
              onPress={() => onOpenNotification(item)}
              style={[
                s.notification,
                item.readAt === null && s.unreadNotification,
              ]}
              testID={`e2e.notification.open.${item.notificationId}`}
              variant="bare"
            >
              <View style={s.notificationHeader}>
                <Text selectable style={s.notificationTitle}>
                  {item.title}
                </Text>
                {item.readAt === null ? (
                  <Text style={s.unreadLabel}>새 알림</Text>
                ) : null}
              </View>
              <Text selectable style={s.notificationBody}>
                {item.body}
              </Text>
            </Button>
          )}
          showsVerticalScrollIndicator={false}
          style={s.list}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  count: { color: colors.muted, fontVariant: ["tabular-nums"] },
  markAllButton: { minHeight: 40, paddingHorizontal: spacing.sm },
  filters: { flexGrow: 0 },
  filterContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filter: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: 18 },
  selectedFilter: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  list: { flex: 1 },
  listContent: { gap: spacing.sm, padding: spacing.md, paddingBottom: 96 },
  notification: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  unreadNotification: {
    borderColor: colors.primary,
    backgroundColor: colors.canvas,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  notificationTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
  },
  notificationBody: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  unreadLabel: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  footer: { paddingVertical: spacing.md },
  state: {
    flex: 1,
    minHeight: 280,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  stateTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  stateDescription: { color: colors.muted, fontSize: 14, textAlign: "center" },
  retryButton: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: 20,
  },
});

export default NotificationInbox;
