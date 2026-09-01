export type FoNotificationType =
  "ORDER_STATUS" | "WISH_PRICE_DROP" | "WISH_RESTOCK" | "STYLE_LIKE";

export type FoPushPlatform = "ANDROID" | "IOS";

export type FoPushNotificationData = {
  notificationId: string;
  type: FoNotificationType;
  entityId: string;
};

export type RegisterFoPushDeviceInput = {
  expoPushToken: string;
  platform: FoPushPlatform;
};

export type FoNotification = {
  notificationId: string;
  type: FoNotificationType;
  title: string;
  body: string;
  route: string;
  entityId: string;
  readAt: string | null;
  createdAt: string;
};

export type FoNotificationConnection = {
  nodes: FoNotification[];
  nextCursor: string | null;
  hasNextPage: boolean;
  unreadCount: number;
};

export type FoNotificationPreferences = {
  pushEnabled: boolean;
  orderPushEnabled: boolean;
  wishPushEnabled: boolean;
  stylePushEnabled: boolean;
  updatedAt: string;
};

export type UpdateFoNotificationPreferencesInput = Partial<
  Pick<
    FoNotificationPreferences,
    "pushEnabled" | "orderPushEnabled" | "wishPushEnabled" | "stylePushEnabled"
  >
>;
