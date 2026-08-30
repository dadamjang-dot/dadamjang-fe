import type { ProductApprovalStatus } from "@dadamjang/domain";

export type Connection<T> = {
  nodes: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
  totalCount: number;
};

export type AdminAuditLog = {
  auditLogId: string;
  actorUserId: string | null;
  actorUserid: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadataJson: string;
  createdAt: string;
};

export type AdminPartner = {
  partnerId: string;
  ownerUserId: string;
  ownerUserid: string;
  ownerEmail: string;
  businessEmail: string;
  businessRegistrationNumber: string;
  tradeName: string;
  status: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type AdminPartnerDetail = AdminPartner & { auditLogs: AdminAuditLog[] };

export type AdminProduct = {
  productId: string;
  partnerId: string;
  partnerName: string;
  categoryId: string;
  categoryName: string;
  title: string;
  status: string;
  approvalStatus: ProductApprovalStatus;
  rejectionReason: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
};

export type AdminProductDetail = AdminProduct & {
  description: string;
  imageUrls: string[];
  skus: Array<{
    skuId: string;
    code: string;
    optionName: string;
    price: number;
    stock: number;
    isActive: boolean;
  }>;
  auditLogs: AdminAuditLog[];
};

export type AdminOrder = {
  orderId: string;
  orderNumber: string;
  buyerUserId: string;
  buyerUserid: string;
  buyerEmail: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  itemCount: number;
  allowedNextStatuses: string[];
  createdAt: string;
};

export type AdminOrderDetail = AdminOrder & {
  paymentFailureReason: string | null;
  items: Array<{
    orderItemId: string;
    productId: string;
    skuId: string;
    productTitle: string;
    skuOptionName: string;
    unitPrice: number;
    quantity: number;
  }>;
  auditLogs: AdminAuditLog[];
};

export type AdminCategory = {
  categoryId: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminInvite = {
  inviteId: string;
  email: string;
  status: string;
  invitedByUserId: string;
  invitedByUserid: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type AdminDashboard = {
  pendingPartnerCount: number;
  pendingProductCount: number;
  processingOrderCount: number;
  activeInviteCount: number;
  recentAuditLogs: AdminAuditLog[];
};
