import { requestGraphQl, type AdminOrderDetail } from "@/shared/api";

const TRANSITION_ORDER_MUTATION = `
  mutation TransitionOrder($input: TransitionOrderInput!) {
    transitionOrder(input: $input) {
      orderId orderNumber buyerUserId buyerUserid buyerEmail status paymentStatus paymentFailureReason
      totalAmount itemCount allowedNextStatuses createdAt
      items { orderItemId productId skuId productTitle skuOptionName unitPrice quantity }
      auditLogs { auditLogId actorUserid action entityType entityId metadataJson createdAt }
    }
  }
`;

export type OrderTransitionInput = { orderId: string; nextStatus: string };

export const transitionOrder = async (input: OrderTransitionInput) =>
  (
    await requestGraphQl<
      { transitionOrder: AdminOrderDetail },
      { input: OrderTransitionInput }
    >(TRANSITION_ORDER_MUTATION, { input })
  ).transitionOrder;
