import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type { ButtonHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PartnerShell } from "@/_app/shell/partner-shell";

const auth = vi.hoisted(() => ({
  session: vi.fn(),
  partner: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@seed-design/react", () => ({
  ActionButton: (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props} />
  ),
}));

vi.mock("@/shared/auth", () => ({
  logout: vi.fn(),
  myPartner: auth.partner,
  sessionQuery: () => ({
    queryKey: ["partner-session"],
    queryFn: auth.session,
    retry: false,
  }),
}));

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
});
