import {
  ORDER_STATUS_LABEL,
  PRODUCT_APPROVAL_STATUS_LABEL,
  PRODUCT_STATUS_LABEL,
} from "@dadamjang/domain";

const LABELS: Record<string, string> = {
  ...ORDER_STATUS_LABEL,
  ...PRODUCT_STATUS_LABEL,
  ...PRODUCT_APPROVAL_STATUS_LABEL,
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "승인 반려",
  ACCEPTED: "수락",
  EXPIRED: "만료",
  REVOKED: "취소",
};

const ACTION_LABELS: Record<string, string> = {
  PARTNER_APPROVED: "파트너 승인",
  PARTNER_REJECTED: "파트너 반려",
  PRODUCT_APPROVED: "상품 승인",
  PRODUCT_REJECTED: "상품 반려",
  ORDER_STATUS_CHANGED: "주문 상태 변경",
  CATEGORY_CREATED: "카테고리 생성",
  CATEGORY_UPDATED: "카테고리 수정",
  ADMIN_INVITED: "관리자 초대",
  ADMIN_INVITE_REVOKED: "관리자 초대 취소",
  ADMIN_INVITE_ACCEPTED: "관리자 초대 수락",
};

const ENTITY_LABELS: Record<string, string> = {
  PARTNER: "파트너",
  PRODUCT: "상품",
  ORDER: "주문",
  CATEGORY: "카테고리",
  ADMIN_INVITE: "관리자 초대",
};

export const adminStatusLabel = (status: string) => LABELS[status] ?? status;
export const adminActionLabel = (action: string) =>
  ACTION_LABELS[action] ?? action;
export const adminEntityLabel = (entity: string) =>
  ENTITY_LABELS[entity] ?? entity;
