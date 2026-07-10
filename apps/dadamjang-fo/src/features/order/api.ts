import { graphqlRequest } from '@dadamjang/graphql-client';

export type Order = {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
};

export const getOrders = async () => {
  const data = await graphqlRequest<{ orders: Order[] }>(
    `query Orders {
      orders {
        orderId
        orderNumber
        status
        paymentStatus
        totalAmount
        createdAt
      }
    }`,
  );

  return data.orders;
};
