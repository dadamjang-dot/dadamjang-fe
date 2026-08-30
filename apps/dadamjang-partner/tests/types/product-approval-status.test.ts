import { expect, it } from "vitest";
import type { ProductApprovalStatus } from "@dadamjang/domain";
import type { ApprovalStatus, PartnerProduct } from "@/shared/api";

const graphQlStatuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED"] as const;
type RejectsUnknown<T> = "UNKNOWN" extends T ? false : true;
const rejectsUnknown: RejectsUnknown<PartnerProduct["approvalStatus"]> = true;

graphQlStatuses.forEach((status) => {
  const canonical: ProductApprovalStatus = status;
  const alias: ApprovalStatus = status;
  const partner: PartnerProduct["approvalStatus"] = status;
  void canonical;
  void alias;
  void partner;
});

it("accepts every GraphQL product approval status", () => {
  expect(graphQlStatuses).toEqual(["DRAFT", "PENDING", "APPROVED", "REJECTED"]);
  expect(rejectsUnknown).toBe(true);
});
