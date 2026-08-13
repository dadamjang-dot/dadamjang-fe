import {
  calculateCartTotal,
  calculateDiscountRate,
  canCheckout,
  canRequestRefund,
  canSellAsPartner,
  formatBusinessRegistrationNumber,
  formatKrw,
  isBusinessRegistrationNumber,
  isOrderCancelable,
  isProductSellable,
} from "@dadamjang/domain";

describe("domain rules", () => {
  it("formats and discounts KRW prices when sale price is lower", () => {
    expect(formatKrw(123456)).toBe("123,456원");
    expect(calculateDiscountRate(10_000, 7_001)).toBe(29);
    expect(calculateDiscountRate(0, 0)).toBe(0);
    expect(calculateDiscountRate(10_000, 10_000)).toBe(0);
  });

  it("totals selected cart lines and checks checkout eligibility", () => {
    const lines = [
      { quantity: 2, unitPrice: 1_000 },
      { quantity: 1, unitPrice: 5_000, selected: false },
    ];

    expect(calculateCartTotal(lines)).toBe(2_000);
    expect(canCheckout(lines)).toBe(true);
    expect(canCheckout([{ quantity: 0, unitPrice: 1_000 }])).toBe(false);
  });

  it("characterizes order, product, and partner status transitions", () => {
    expect(isOrderCancelable("PAID")).toBe(true);
    expect(isOrderCancelable("FULFILLING")).toBe(false);
    expect(canRequestRefund("COMPLETED")).toBe(false);
    expect(isProductSellable("PUBLISHED")).toBe(true);
    expect(isProductSellable("DRAFT")).toBe(false);
    expect(canSellAsPartner("APPROVED")).toBe(true);
    expect(canSellAsPartner("SUSPENDED")).toBe(false);
  });

  it("normalizes, formats, and validates business registration numbers", () => {
    expect(formatBusinessRegistrationNumber("123 45 67890 extra")).toBe(
      "123-45-67890",
    );
    expect(isBusinessRegistrationNumber("123-45-67890")).toBe(true);
    expect(isBusinessRegistrationNumber("123-45")).toBe(false);
  });
});
