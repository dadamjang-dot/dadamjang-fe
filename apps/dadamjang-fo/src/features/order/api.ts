import { graphqlRequest } from '@dadamjang/graphql-client';

export type Order = {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  paymentFailureReason?: string | null;
  items: {
    orderItemId: string;
    productId: string;
    skuId: string;
    productTitle: string;
    skuOptionName: string;
    unitPrice: number;
    quantity: number;
  }[];
  createdAt: string;
};

const orderFields = `
  orderId
  orderNumber
  status
  paymentStatus
  totalAmount
  paymentFailureReason
  createdAt
  items {
    orderItemId
    productId
    skuId
    productTitle
    skuOptionName
    unitPrice
    quantity
  }
`;

export const getOrders = async () => {
  const data = await graphqlRequest<{ orders: Order[] }>(
    `query Orders {
      orders { ${orderFields} }
    }`,
  );

  return data.orders;
};

export const getOrder = async (orderId: string) => {
  const data = await graphqlRequest<{ order: Order }>(
    `query Order($orderId: String!) {
      order(orderId: $orderId) { ${orderFields} }
    }`,
    { orderId },
  );

  return data.order;
};
