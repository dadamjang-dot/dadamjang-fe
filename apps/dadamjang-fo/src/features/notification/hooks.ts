import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getFoNotification,
  getFoNotifications,
  markAllFoNotificationsRead,
  markFoNotificationRead,
} from "./api";
import type { FoNotificationConnection } from "./types";

export const foNotificationQueryKeys = {
  all: () => ["fo-notifications"] as const,
  list: () => ["fo-notifications", "list"] as const,
  detail: (notificationId: string) =>
    ["fo-notifications", "detail", notificationId] as const,
};

const getNextNotificationCursor = (
  lastPage: FoNotificationConnection,
  allPages: FoNotificationConnection[],
) => {
  if (!lastPage.hasNextPage || lastPage.nextCursor === null) return undefined;
  const nextCursor = lastPage.nextCursor;
  return allPages.some(
    (page, index) =>
      index < allPages.length - 1 && page.nextCursor === nextCursor,
  )
    ? undefined
    : nextCursor;
};

export const useFoNotifications = () =>
  useInfiniteQuery({
    queryKey: foNotificationQueryKeys.list(),
    queryFn: ({ pageParam, signal }) =>
      getFoNotifications({ after: pageParam, first: 20 }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: getNextNotificationCursor,
  });

export const useFoNotification = (notificationId: string | undefined) =>
  useQuery({
    queryKey: foNotificationQueryKeys.detail(notificationId ?? ""),
    queryFn: ({ signal }) => getFoNotification(notificationId!, signal),
    enabled: Boolean(notificationId),
  });

export const useMarkFoNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markFoNotificationRead,
    onSuccess: (notification) => {
      queryClient.setQueryData(
        foNotificationQueryKeys.detail(notification.notificationId),
        notification,
      );
      return queryClient.invalidateQueries({
        queryKey: foNotificationQueryKeys.list(),
      });
    },
  });
};

export const useMarkAllFoNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllFoNotificationsRead,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: foNotificationQueryKeys.all(),
      }),
  });
};
