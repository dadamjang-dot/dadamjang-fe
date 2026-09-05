export const cartQueryKeys = {
  detail: () => ["cart"] as const,
  checkoutAttempt: (userId: string | undefined, generation: number) =>
    ["checkout-attempt", "storage", userId ?? null, generation] as const,
  checkoutAttemptResult: (
    userId: string | undefined,
    generation: number,
    idempotencyKey: string | undefined,
  ) =>
    [
      "checkout-attempt",
      "result",
      userId ?? null,
      generation,
      idempotencyKey ?? null,
    ] as const,
};
