import type { FoNotification } from "./types";

type NotificationRouteInput = Pick<
  FoNotification,
  "entityId" | "route" | "type"
>;

export type FoNotificationRoute =
  `/order/${string}` | `/product/${string}` | `/style/${string}`;

const routeForNotification = ({
  entityId,
  type,
}: Pick<FoNotification, "entityId" | "type">): FoNotificationRoute => {
  if (type === "ORDER_STATUS") return `/order/${entityId}`;
  if (type === "STYLE_LIKE") return `/style/${entityId}`;
  return `/product/${entityId}`;
};

export const getAllowedNotificationRoute = (
  notification: NotificationRouteInput,
): FoNotificationRoute | undefined => {
  const route = routeForNotification(notification);
  return notification.route === route ? route : undefined;
};

export const isAllowedNotificationRoute = (
  notification: NotificationRouteInput,
) => getAllowedNotificationRoute(notification) !== undefined;
