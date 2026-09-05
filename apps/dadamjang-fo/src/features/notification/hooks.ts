import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type MutateOptions,
} from "@tanstack/react-query";
import { getSessionGeneration } from "@dadamjang/graphql-client";

import {
  getFoNotification,
  getFoNotificationPreferences,
  getFoNotifications,
  markAllFoNotificationsRead,
  markFoNotificationRead,
  updateFoNotificationPreferences,
} from "./api";
import type {
  FoNotificationConnection,
  FoNotificationPreferences,
  UpdateFoNotificationPreferencesInput,
} from "./types";

export const foNotificationQueryKeys = {
  all: () => ["fo-notifications"] as const,
  list: () => ["fo-notifications", "list"] as const,
  detail: (notificationId: string) =>
    ["fo-notifications", "detail", notificationId] as const,
  preferences: () => ["fo-notifications", "preferences"] as const,
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
export const useFoNotificationPreferences = (enabled = true) =>
  useQuery({
    enabled,
    queryKey: foNotificationQueryKeys.preferences(),
    queryFn: ({ signal }) => getFoNotificationPreferences(signal),
  });

export const useUpdateFoNotificationPreferences = () => {
  const queryClient = useQueryClient();
  const queryKey = foNotificationQueryKeys.preferences();
  const mutation = useMutation({
    mutationFn: ({
      input,
      generation,
    }: {
      input: UpdateFoNotificationPreferencesInput;
      generation: number;
    }) => {
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
      return updateFoNotificationPreferences(input);
    },
    onMutate: async ({ input, generation }) => {
      await queryClient.cancelQueries({ queryKey });
      if (getSessionGeneration() !== generation) return;
      const previous =
        queryClient.getQueryData<FoNotificationPreferences>(queryKey);
      if (previous)
        queryClient.setQueryData(queryKey, { ...previous, ...input });
      return { previous };
    },
    onError: (_error, { generation }, context) => {
      if (getSessionGeneration() === generation && context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: (_data, _error, { generation }) => {
      if (getSessionGeneration() === generation)
        return queryClient.invalidateQueries({ queryKey });
    },
  });
  type Options = MutateOptions<
    FoNotificationPreferences,
    Error,
    UpdateFoNotificationPreferencesInput,
    typeof mutation.context
  >;
  const wrapOptions = (
    options?: Options,
  ): Parameters<typeof mutation.mutate>[1] => ({
    onSuccess: (data, { input, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onSuccess?.(data, input, result, context);
    },
    onError: (error, { input, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onError?.(error, input, result, context);
    },
    onSettled: (data, error, { input, generation }, result, context) => {
      if (getSessionGeneration() === generation)
        options?.onSettled?.(data, error, input, result, context);
    },
  });
  return {
    ...mutation,
    variables: mutation.variables?.input,
    mutate: (input: UpdateFoNotificationPreferencesInput, options?: Options) =>
      mutation.mutate(
        { input, generation: getSessionGeneration() },
        wrapOptions(options),
      ),
    mutateAsync: async (
      input: UpdateFoNotificationPreferencesInput,
      options?: Options,
    ) => {
      const generation = getSessionGeneration();
      const data = await mutation.mutateAsync(
        { input, generation },
        wrapOptions(options),
      );
      if (getSessionGeneration() !== generation)
        throw new Error("Session changed");
      return data;
    },
  };
};
