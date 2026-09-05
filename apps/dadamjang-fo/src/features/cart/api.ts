import { graphqlRequest } from "@dadamjang/graphql-client";

import type {
  Cart,
  CheckoutAttemptResult,
  CheckoutCartInput,
  CheckoutCartResult,
} from "./types";

export const getCart = async (signal?: AbortSignal) => {
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
    undefined,
    { signal },
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
  graphqlRequest<{ removeCartItem: Pick<Cart, "cartId"> }>(
    `mutation RemoveCartItem($skuId: String!) {
      removeCartItem(skuId: $skuId) { cartId }
    }`,
    { skuId },
  );

export const checkoutCart = async (input: CheckoutCartInput) => {
  const data = await graphqlRequest<{ checkoutCart: CheckoutCartResult }>(
    `mutation CheckoutCart($input: CheckoutCartInput!) {
      checkoutCart(input: $input) {
        orderId
        orderNumber
        status
        paymentStatus
        totalAmount
      }
    }`,
    { input },
  );

  return data.checkoutCart;
};

export const getCheckoutAttempt = async (
  idempotencyKey: string,
  signal?: AbortSignal,
) => {
  const data = await graphqlRequest<{
    checkoutAttempt: CheckoutAttemptResult;
  }>(
    `query CheckoutAttempt($idempotencyKey: String!) {
      checkoutAttempt(idempotencyKey: $idempotencyKey) {
        status
        orderId
      }
    }`,
    { idempotencyKey },
    { signal },
  );

  return data.checkoutAttempt;
};
