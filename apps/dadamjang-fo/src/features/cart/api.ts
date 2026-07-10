import { graphqlRequest } from '@/shared/api/graphql-client';

export type Cart = {
  cartId: string;
  totalAmount: number;
  items: {
    cartItemId: string;
    quantity: number;
    sku: { skuId: string; optionName: string; price: number };
    product: { productId: string; title: string; imageUrls: string[] };
  }[];
};

export const getCart = async () => {
  const data = await graphqlRequest<{ cart: Cart }>(
    `query Cart {
      cart {
        cartId
        totalAmount
        items {
          cartItemId
          quantity
          sku { skuId optionName price }
          product { productId title imageUrls }
        }
      }
    }`,
  );

  return data.cart;
};

export const upsertCartItem = async (skuId: string, quantity: number) =>
  graphqlRequest(
    `mutation UpsertCartItem($input: UpsertCartItemInput!) {
      upsertCartItem(input: $input) { cartId }
    }`,
    { input: { skuId, quantity } },
  );

export const removeCartItem = async (skuId: string) =>
  graphqlRequest(
    'mutation RemoveCartItem($skuId: String!) { removeCartItem(skuId: $skuId) }',
    { skuId },
  );

export const checkoutCart = async () => {
  const data = await graphqlRequest<{
    checkoutCart: {
      orderId: string;
      orderNumber: string;
      status: string;
      paymentStatus: string;
      totalAmount: number;
    };
  }>(
    `mutation CheckoutCart {
      checkoutCart {
        orderId
        orderNumber
        status
        paymentStatus
        totalAmount
      }
    }`,
  );

  return data.checkoutCart;
};
