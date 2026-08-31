type NotificationRouteInput = {
  entityId: string;
  route: string;
  type: string;
};

export type FoNotificationRoute =
  `/order/${string}` | `/product/${string}` | `/style/${string}`;

const routeForNotification = ({
  entityId,
  type,
}: Pick<NotificationRouteInput, "entityId" | "type">):
  FoNotificationRoute | undefined => {
  if (type === "ORDER_STATUS") return `/order/${entityId}`;
  if (type === "WISH_PRICE_DROP" || type === "WISH_RESTOCK")
    return `/product/${entityId}`;
  if (type === "STYLE_LIKE") return `/style/${entityId}`;
  return undefined;
};

export const getAllowedNotificationRoute = (
  notification: NotificationRouteInput,
): FoNotificationRoute | undefined => {
  const route = routeForNotification(notification);
  return route !== undefined && notification.route === route
    ? route
    : undefined;
};

export const isAllowedNotificationRoute = (
  notification: NotificationRouteInput,
) => getAllowedNotificationRoute(notification) !== undefined;
