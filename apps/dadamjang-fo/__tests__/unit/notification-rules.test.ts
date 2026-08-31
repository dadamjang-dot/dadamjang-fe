import {
  getAllowedNotificationRoute,
  isAllowedNotificationRoute,
} from "@/features/notification/rules";

const orderId = "11111111-1111-4111-8111-111111111111";
const productId = "22222222-2222-4222-8222-222222222222";
const styleId = "33333333-3333-4333-8333-333333333333";

describe("notification route rules", () => {
  it.each([
    ["ORDER_STATUS", orderId, `/order/${orderId}`],
    ["WISH_PRICE_DROP", productId, `/product/${productId}`],
    ["WISH_RESTOCK", productId, `/product/${productId}`],
    ["STYLE_LIKE", styleId, `/style/${styleId}`],
  ] as const)("accepts the exact %s destination", (type, entityId, route) => {
    const notification = { entityId, route, type };

    expect(isAllowedNotificationRoute(notification)).toBe(true);
    expect(getAllowedNotificationRoute(notification)).toBe(route);
  });

  it.each([
    ["ORDER_STATUS", orderId, `https://example.test/order/${orderId}`],
    ["ORDER_STATUS", orderId, `/product/${orderId}`],
    ["WISH_PRICE_DROP", productId, `/product/${productId}/reviews`],
    ["WISH_RESTOCK", productId, `/product/another-product`],
    ["STYLE_LIKE", styleId, `/style/${styleId}?source=push`],
  ] as const)(
    "rejects a mismatched %s destination",
    (type, entityId, route) => {
      const notification = { entityId, route, type };

      expect(isAllowedNotificationRoute(notification)).toBe(false);
      expect(getAllowedNotificationRoute(notification)).toBeUndefined();
    },
  );
});
