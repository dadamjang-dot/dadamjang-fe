import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor } from "@testing-library/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "@/_app/providers/app-providers";
import { PartnerShell } from "@/_app/shell/partner-shell";

const auth = vi.hoisted(() => ({
  initialSession: null as null | {
    userId: string;
    userid: string;
    email: string;
    role: string;
  },
  session: vi.fn(),
  partner: vi.fn(),
}));

const navigation = vi.hoisted(() => ({ router: { replace: vi.fn() } }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => navigation.router,
}));

vi.mock("@seed-design/react", () => {
  const Wrapper = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    ActionButton: (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props} />
    ),
    Snackbar: {
      HiddenCloseButton: () => null,
      Region: Wrapper,
      Renderer: () => null,
      Root: Wrapper,
      RootProvider: Wrapper,
    },
    useSnackbarAdapter: () => ({ visible: false }),
  };
});

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
      initialData: auth.initialSession ?? undefined,
    }),
  };
});

describe("PartnerShell", () => {
  afterEach(() => {
    auth.initialSession = null;
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

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

  it("invalidates through the provider when the initial role is not partner", async () => {
    auth.initialSession = {
      userId: "user-1",
      userid: "admin",
      email: "admin@example.com",
      role: "ADMIN",
    };
    auth.session.mockImplementation(() => new Promise(() => {}));
    auth.partner.mockResolvedValue({ myPartner: null });
    const clear = vi.spyOn(QueryClient.prototype, "clear");
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const view = render(
      <AppProviders>
        <PartnerShell>대시보드</PartnerShell>
      </AppProviders>,
    );

    try {
      await waitFor(() => expect(storage).toHaveBeenCalledOnce());
      expect(clear).toHaveBeenCalledOnce();
      expect(navigation.router.replace).toHaveBeenCalledOnce();
      expect(navigation.router.replace).toHaveBeenCalledWith("/login");
    } finally {
      view.unmount();
    }
  });
});
