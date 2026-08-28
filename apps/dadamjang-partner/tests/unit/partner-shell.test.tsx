import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type { ButtonHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PartnerShell } from "@/_app/shell/partner-shell";
import { subscribeToSessionInvalidation } from "@/shared/auth";

const auth = vi.hoisted(() => ({
  session: vi.fn(),
  partner: vi.fn(),
}));

const navigation = vi.hoisted(() => ({ router: { replace: vi.fn() } }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => navigation.router,
}));

vi.mock("@seed-design/react", () => ({
  ActionButton: (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));

vi.mock("@/shared/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/auth")>();
  return {
    ...actual,
    logout: vi.fn(),
    myPartner: auth.partner,
    sessionQuery: () => ({
      queryKey: ["partner-session"],
      queryFn: auth.session,
      retry: false,
    }),
  };
});

describe("PartnerShell", () => {
  afterEach(() => vi.clearAllMocks());

  it("starts session and partner gates in parallel", async () => {
    auth.session.mockImplementation(() => new Promise(() => {}));
    auth.partner.mockResolvedValue({
      myPartner: {
        partnerId: "partner-1",
        tradeName: "파트너",
        status: "APPROVED",
        brand: { brandId: "brand-1", name: "브랜드", slug: "brand" },
      },
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = render(
      <QueryClientProvider client={client}>
        <PartnerShell>대시보드</PartnerShell>
      </QueryClientProvider>,
    );

    try {
      await waitFor(() => expect(auth.partner).toHaveBeenCalledOnce());
    } finally {
      view.unmount();
      client.clear();
    }
  });

  it("invalidates every tab when the session role is not partner", async () => {
    auth.session.mockResolvedValue({
      userId: "user-1",
      userid: "admin",
      email: "admin@example.com",
      role: "ADMIN",
    });
    auth.partner.mockResolvedValue({ myPartner: null });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const clear = vi.spyOn(client, "clear");
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const unsubscribe = subscribeToSessionInvalidation(() => {
      client.clear();
      navigation.router.replace("/login");
    });
    const view = render(
      <QueryClientProvider client={client}>
        <PartnerShell>대시보드</PartnerShell>
      </QueryClientProvider>,
    );

    try {
      await waitFor(() => expect(storage).toHaveBeenCalledOnce());
      expect(clear).toHaveBeenCalledOnce();
      expect(navigation.router.replace).toHaveBeenCalledOnce();
      expect(navigation.router.replace).toHaveBeenCalledWith("/login");
    } finally {
      unsubscribe();
      view.unmount();
      client.clear();
    }
  });
});
