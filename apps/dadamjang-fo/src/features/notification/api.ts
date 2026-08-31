import { getDeviceId, graphqlRequest } from "@dadamjang/graphql-client";

import type {
  FoNotification,
  FoNotificationConnection,
  FoNotificationPreferences,
  RegisterFoPushDeviceInput,
  UpdateFoNotificationPreferencesInput,
} from "./types";

const notificationFields =
  "notificationId type title body route entityId readAt createdAt";

export const getFoNotifications = async (
  input: { after?: string; first?: number },
  signal?: AbortSignal,
): Promise<FoNotificationConnection> => {
  const data = await graphqlRequest<{
    foNotifications: FoNotificationConnection;
  }>(
    `query FoNotifications($first: Int, $after: String) {
      foNotifications(first: $first, after: $after) {
        nodes { ${notificationFields} }
        nextCursor hasNextPage unreadCount
      }
    }`,
    input,
    { signal },
  );
  return data.foNotifications;
};

export const getFoNotification = async (
  notificationId: string,
  signal?: AbortSignal,
): Promise<FoNotification> => {
  const data = await graphqlRequest<{ foNotification: FoNotification }>(
    `query FoNotification($notificationId: ID!) {
      foNotification(notificationId: $notificationId) { ${notificationFields} }
    }`,
    { notificationId },
    { signal },
  );
  return data.foNotification;
};

export const markFoNotificationRead = async (
  notificationId: string,
): Promise<FoNotification> => {
  const data = await graphqlRequest<{ markFoNotificationRead: FoNotification }>(
    `mutation MarkFoNotificationRead($notificationId: ID!) {
      markFoNotificationRead(notificationId: $notificationId) { ${notificationFields} }
    }`,
    { notificationId },
  );
  return data.markFoNotificationRead;
};

export const markAllFoNotificationsRead = async (): Promise<boolean> => {
  const data = await graphqlRequest<{ markAllFoNotificationsRead: boolean }>(
    "mutation MarkAllFoNotificationsRead { markAllFoNotificationsRead }",
  );
  return data.markAllFoNotificationsRead;
};

const notificationPreferenceFields =
  "pushEnabled orderPushEnabled wishPushEnabled stylePushEnabled updatedAt";

export const getFoNotificationPreferences = async (
  signal?: AbortSignal,
): Promise<FoNotificationPreferences> => {
  const data = await graphqlRequest<{
    foNotificationPreferences: FoNotificationPreferences;
  }>(
    `query FoNotificationPreferences {
      foNotificationPreferences { ${notificationPreferenceFields} }
    }`,
    undefined,
    { signal },
  );
  return data.foNotificationPreferences;
};

export const updateFoNotificationPreferences = async (
  input: UpdateFoNotificationPreferencesInput,
): Promise<FoNotificationPreferences> => {
  const data = await graphqlRequest<{
    updateFoNotificationPreferences: FoNotificationPreferences;
  }>(
    `mutation UpdateFoNotificationPreferences($input: UpdateFoNotificationPreferencesInput!) {
      updateFoNotificationPreferences(input: $input) { ${notificationPreferenceFields} }
    }`,
    { input },
  );
  return data.updateFoNotificationPreferences;
};

export const registerFoPushDevice = async (
  input: RegisterFoPushDeviceInput,
): Promise<boolean> => {
  const deviceId = await getDeviceId();
  const data = await graphqlRequest<{ registerFoPushDevice: boolean }>(
    `mutation RegisterFoPushDevice($input: RegisterFoPushDeviceInput!) {
      registerFoPushDevice(input: $input)
    }`,
    { input },
    { requestHeaders: { "x-device-id": deviceId } },
  );
  return data.registerFoPushDevice;
};
