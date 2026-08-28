import { expect, it } from "vitest";
import type { ProductApprovalStatus } from "@dadamjang/domain";
import type { AdminProduct } from "@/shared/api";

const graphQlStatuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED"] as const;
type RejectsUnknown<T> = "UNKNOWN" extends T ? false : true;
const rejectsUnknown: RejectsUnknown<AdminProduct["approvalStatus"]> = true;

graphQlStatuses.forEach((status) => {
  const canonical: ProductApprovalStatus = status;
  const admin: AdminProduct["approvalStatus"] = status;
  void canonical;
  void admin;
});

it("accepts every GraphQL product approval status", () => {
  expect(graphQlStatuses).toEqual(["DRAFT", "PENDING", "APPROVED", "REJECTED"]);
  expect(rejectsUnknown).toBe(true);
});
