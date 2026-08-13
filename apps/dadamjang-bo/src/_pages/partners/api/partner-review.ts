import { requestGraphQl, type AdminPartnerDetail } from "@/shared/api";

const REVIEW_PARTNER_MUTATION = `
  mutation ReviewPartner($input: ReviewPartnerInput!) {
    reviewPartner(input: $input) {
      partnerId ownerUserId ownerUserid ownerEmail businessEmail businessRegistrationNumber
      tradeName status rejectionReason reviewedAt createdAt
      auditLogs { auditLogId actorUserid action entityType entityId metadataJson createdAt }
    }
  }
`;

export type PartnerReviewInput = {
  partnerId: string;
  approved: boolean;
  rejectionReason?: string;
};

export const reviewPartner = async (input: PartnerReviewInput) =>
  (
    await requestGraphQl<
      { reviewPartner: AdminPartnerDetail },
      { input: PartnerReviewInput }
    >(REVIEW_PARTNER_MUTATION, {
      input,
    })
  ).reviewPartner;
