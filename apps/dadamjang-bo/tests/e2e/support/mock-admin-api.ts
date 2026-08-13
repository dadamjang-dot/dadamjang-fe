import type { Page } from "@playwright/test";

type MockCategory = {
  categoryId: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type MockInvite = {
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

const createdAt = "2026-08-13T03:00:00.000Z";

const auditLog = {
  auditLogId: "audit-1",
  actorUserId: "admin-1",
  actorUserid: "integration-admin",
  action: "PARTNER_APPROVED",
  entityType: "PARTNER",
  entityId: "partner-1",
  metadataJson: JSON.stringify({
    previousStatus: "PENDING",
    nextStatus: "APPROVED",
  }),
  createdAt,
};

const partnerBase = {
  partnerId: "partner-1",
  ownerUserId: "owner-1",
  ownerUserid: "pending-owner",
  ownerEmail: "pending-owner@example.test",
  businessEmail: "partner@example.test",
  businessRegistrationNumber: "2000000000",
  tradeName: "Pending Partner",
  rejectionReason: null,
  reviewedAt: null,
  createdAt,
};

const productBase = {
  productId: "product-1",
  partnerId: "partner-1",
  partnerName: "Pending Partner",
  categoryId: "category-1",
  categoryName: "상의",
  title: "Pending Product",
  description: "승인 검토용 상품 설명",
  imageUrls: [],
  status: "DRAFT",
  rejectionReason: null,
  thumbnailUrl: null,
  createdAt,
  skus: [
    {
      skuId: "sku-1",
      code: "PENDING-M",
      optionName: "Black / M",
      price: 22000,
      stock: 4,
      isActive: true,
    },
  ],
};

const orderBase = {
  orderId: "order-1",
  orderNumber: "DJ-ADMIN-001",
  buyerUserId: "buyer-1",
  buyerUserid: "integration-user",
  buyerEmail: "integration@example.test",
  paymentStatus: "APPROVED",
  paymentFailureReason: null,
  totalAmount: 30000,
  itemCount: 2,
  createdAt,
  items: [
    {
      orderItemId: "item-1",
      productId: "product-1",
      skuId: "sku-1",
      productTitle: "Integration Sale Tee",
      skuOptionName: "Black / M",
      unitPrice: 15000,
      quantity: 2,
    },
  ],
};

const categoryBase = {
  categoryId: "category-1",
  name: "상의",
  slug: "tops",
  parentId: null,
  sortOrder: 1,
  isActive: true,
  createdAt,
  updatedAt: createdAt,
};

const inviteBase = {
  inviteId: "invite-1",
  email: "pending-admin@example.test",
  status: "PENDING",
  invitedByUserId: "admin-1",
  invitedByUserid: "integration-admin",
  expiresAt: "2026-08-16T03:00:00.000Z",
  acceptedAt: null,
  revokedAt: null,
  createdAt,
};

const connection = <T>(nodes: T[]) => ({
  nodes,
  nextCursor: null,
  hasNextPage: false,
  totalCount: nodes.length,
});

export const authenticateAdmin = (page: Page) =>
  page.context().addCookies([
    {
      name: "access_token",
      value: "e2e-access",
      url: "http://127.0.0.1:3001",
    },
  ]);

export const mockAdminApi = async (page: Page) => {
  let partnerStatus = "PENDING";
  let productStatus = "PENDING";
  let orderStatus = "PAID";
  let categories: MockCategory[] = [{ ...categoryBase }];
  let invites: MockInvite[] = [{ ...inviteBase }];

  await page.route("**/api/graphql", async (route) => {
    const payload = route.request().postDataJSON() as {
      query: string;
      variables?: {
        input?: Record<string, unknown>;
        filter?: Record<string, unknown>;
        orderId?: string;
      };
    };
    const { query, variables = {} } = payload;
    let data: Record<string, unknown> | undefined;

    if (query.includes("query AdminMe"))
      data = {
        me: {
          userId: "admin-1",
          userid: "integration-admin",
          email: "admin@example.test",
          role: "ADMIN",
        },
      };
    else if (query.includes("mutation AdminSignin"))
      data = { signin: { role: "ADMIN" } };
    else if (query.includes("mutation AdminLogout")) data = { logout: true };
    else if (query.includes("mutation AcceptAdminInvite"))
      data = {
        acceptAdminInvite: {
          ...inviteBase,
          email: "accepted-admin@example.test",
          status: "ACCEPTED",
          acceptedAt: createdAt,
        },
      };
    else if (query.includes("query AdminDashboard"))
      data = {
        adminDashboard: {
          pendingPartnerCount: partnerStatus === "PENDING" ? 1 : 0,
          pendingProductCount: productStatus === "PENDING" ? 1 : 0,
          processingOrderCount: 1,
          activeInviteCount: invites.filter(
            (invite) => invite.status === "PENDING",
          ).length,
          recentAuditLogs: [auditLog],
        },
      };
    else if (query.includes("mutation ReviewPartner")) {
      partnerStatus = variables.input?.approved ? "APPROVED" : "REJECTED";
      data = {
        reviewPartner: {
          ...partnerBase,
          status: partnerStatus,
          auditLogs: [auditLog],
        },
      };
    } else if (query.includes("query AdminPartner("))
      data = {
        adminPartner: { ...partnerBase, status: partnerStatus, auditLogs: [] },
      };
    else if (query.includes("query AdminPartners")) {
      const requestedStatus = variables.filter?.status;
      const nodes =
        !requestedStatus || requestedStatus === partnerStatus
          ? [{ ...partnerBase, status: partnerStatus }]
          : [];
      data = { adminPartners: connection(nodes) };
    } else if (query.includes("mutation ReviewProduct")) {
      productStatus = variables.input?.approved ? "APPROVED" : "REJECTED";
      data = {
        reviewProduct: {
          ...productBase,
          approvalStatus: productStatus,
          auditLogs: [auditLog],
        },
      };
    } else if (query.includes("query AdminProductFilterOptions"))
      data = {
        adminCategories: categories,
        adminPartners: connection([{ ...partnerBase, status: partnerStatus }]),
      };
    else if (query.includes("query AdminProduct("))
      data = {
        adminProduct: {
          ...productBase,
          approvalStatus: productStatus,
          auditLogs: [],
        },
      };
    else if (query.includes("query AdminProducts")) {
      const requestedStatus = variables.filter?.approvalStatus;
      const nodes =
        !requestedStatus || requestedStatus === productStatus
          ? [{ ...productBase, approvalStatus: productStatus }]
          : [];
      data = { adminProducts: connection(nodes) };
    } else if (query.includes("mutation TransitionOrder")) {
      orderStatus = String(variables.input?.nextStatus);
      data = {
        transitionOrder: {
          ...orderBase,
          status: orderStatus,
          allowedNextStatuses:
            orderStatus === "FULFILLING" ? ["COMPLETED", "CANCELLED"] : [],
          auditLogs: [auditLog],
        },
      };
    } else if (query.includes("query AdminOrder("))
      data = {
        adminOrder: {
          ...orderBase,
          status: orderStatus,
          allowedNextStatuses:
            orderStatus === "PAID"
              ? ["FULFILLING", "CANCELLED"]
              : ["COMPLETED", "CANCELLED"],
          auditLogs: [],
        },
      };
    else if (query.includes("query AdminOrders"))
      data = {
        adminOrders: connection([
          {
            ...orderBase,
            status: orderStatus,
            allowedNextStatuses:
              orderStatus === "PAID"
                ? ["FULFILLING", "CANCELLED"]
                : ["COMPLETED", "CANCELLED"],
          },
        ]),
      };
    else if (query.includes("mutation CreateCategory")) {
      const input = variables.input ?? {};
      const created = {
        ...categoryBase,
        ...input,
        categoryId: `category-${categories.length + 1}`,
        parentId: input.parentId ?? null,
        updatedAt: createdAt,
      };
      categories = [...categories, created as MockCategory];
      data = { createCategory: created };
    } else if (query.includes("mutation UpdateCategory")) {
      const input = variables.input ?? {};
      categories = categories.map((category) =>
        category.categoryId === input.categoryId
          ? ({ ...category, ...input } as MockCategory)
          : category,
      );
      data = {
        updateCategory: categories.find(
          (category) => category.categoryId === input.categoryId,
        ),
      };
    } else if (query.includes("query AdminCategories"))
      data = { adminCategories: categories };
    else if (query.includes("mutation CreateAdminInvite")) {
      const created = {
        ...inviteBase,
        inviteId: `invite-${invites.length + 1}`,
        email: variables.input?.email,
      };
      invites = [...invites, created as MockInvite];
      data = { createAdminInvite: created };
    } else if (query.includes("mutation RevokeAdminInvite")) {
      invites = invites.map((invite) =>
        invite.inviteId === variables.input?.inviteId
          ? { ...invite, status: "REVOKED", revokedAt: createdAt }
          : invite,
      );
      data = {
        revokeAdminInvite: invites.find(
          (invite) => invite.inviteId === variables.input?.inviteId,
        ),
      };
    } else if (query.includes("query AdminInvites"))
      data = { adminInvites: connection(invites) };
    else if (query.includes("query AdminAuditLogs"))
      data = { adminAuditLogs: connection([auditLog]) };

    await route.fulfill({
      status: data ? 200 : 500,
      contentType: "application/json",
      body: JSON.stringify(
        data
          ? { data }
          : { errors: [{ message: `Unhandled operation: ${query}` }] },
      ),
    });
  });
};
