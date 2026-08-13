import { describe, expect, it } from "vitest";
import {
  adminActionLabel,
  adminEntityLabel,
  adminStatusLabel,
} from "@/entities/operation-status";

describe("admin operation labels", () => {
  it("maps backend status values without changing unknown values", () => {
    expect(adminStatusLabel("PAYMENT_PENDING")).toBe("결제 대기");
    expect(adminStatusLabel("FULFILLING")).toBe("처리 중");
    expect(adminStatusLabel("REJECTED")).toBe("승인 반려");
    expect(adminStatusLabel("CUSTOM_STATUS")).toBe("CUSTOM_STATUS");
  });

  it("maps audit actions and entity names", () => {
    expect(adminActionLabel("ORDER_STATUS_CHANGED")).toBe("주문 상태 변경");
    expect(adminEntityLabel("ADMIN_INVITE")).toBe("관리자 초대");
  });
});
