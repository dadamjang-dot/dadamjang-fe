export type FoNotificationType =
  "ORDER_STATUS" | "WISH_PRICE_DROP" | "WISH_RESTOCK" | "STYLE_LIKE";

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
