import { buildSchema, graphql } from "graphql";

import { removeCartItem } from "@/features/cart/api";

const schema = buildSchema(`
  type Query {
    health: Boolean!
  }

  type Mutation {
    removeCartItem(skuId: String!): Cart!
  }

  type Cart {
    cartId: String!
  }
`);

const jsonResponse = (body: object) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
  });

it("sends a schema-valid remove-cart-item mutation through the GraphQL client", async () => {
  let variables: Record<string, unknown> | undefined;
  global.fetch = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as {
      query: string;
      variables?: Record<string, unknown>;
    };
    variables = request.variables;

    return jsonResponse(
      await graphql({
        schema,
        source: request.query,
        rootValue: {
          removeCartItem: ({ skuId }: { skuId: string }) => ({ cartId: `cart-${skuId}` }),
        },
        variableValues: request.variables,
      }),
    );
  });

  await expect(removeCartItem("sku-1")).resolves.toEqual({
    removeCartItem: { cartId: "cart-sku-1" },
  });
  expect(variables).toEqual({ skuId: "sku-1" });
});
