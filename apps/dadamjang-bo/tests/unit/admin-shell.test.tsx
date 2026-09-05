import { QueryClient } from "@tanstack/react-query";
import { act, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "@/_app/admin-shell/admin-shell";
import { AppProviders } from "@/_app/providers/app-providers";
import { AdminApiError } from "@/shared/api";

const state = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  session: {
    data: {
      userId: "user-1",
      userid: "partner",
      email: "partner@example.com",
      role: "PARTNER",
    },
    isError: false,
    isPending: false,
    refetch: vi.fn(),
    error: null as Error | null,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => state.router,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: () => ({ isPending: false, mutate: vi.fn() }),
    useQuery: () => state.session,
  };
});

vi.mock("@seed-design/react", () => {
  const Wrapper = ({ children }: { children?: ReactNode }) => <>{children}</>;
  return {
    ActionButton: (props: ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button {...props} />
    ),
    Callout: {
      Root: Wrapper,
      Content: Wrapper,
      Title: Wrapper,
      Description: Wrapper,
    },
    Snackbar: {
      HiddenCloseButton: () => null,
      Region: Wrapper,
      Renderer: () => null,
      Root: Wrapper,
      RootProvider: Wrapper,
    },
    SidePanel: {},
    Skeleton: () => null,
    useSnackbarAdapter: () => ({ visible: false }),
  };
});

vi.mock("@/shared/ui", () => ({ useAdminSnackbar: () => vi.fn() }));

describe("AdminShell session boundary", () => {
  afterEach(() => {
    state.router.replace.mockReset();
    vi.restoreAllMocks();
  });

  it("offers a retry without navigating away after a transient session failure", async () => {
    const original = { ...state.session };
    Object.assign(state.session, { data: undefined, isError: true });
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () => root.render(<AdminShell>관리자</AdminShell>));
      expect(state.router.replace).not.toHaveBeenCalled();
      const retry = container.querySelector("button");
      expect(retry?.textContent).toContain("다시 시도");
      await act(async () => retry?.click());
      expect(state.session.refetch).toHaveBeenCalledOnce();
    } finally {
      Object.assign(state.session, original);
      await act(async () => root.unmount());
    }
  });

  it("expires an authoritatively rejected session through the provider", async () => {
    const original = { ...state.session };
    Object.assign(state.session, {
      data: undefined,
      isError: true,
      error: new AdminApiError("Expired", "UNAUTHENTICATED"),
    });
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <AppProviders>
            <AdminShell>관리자</AdminShell>
          </AppProviders>,
        ),
      );
      expect(state.router.replace).toHaveBeenCalledWith("/login");
    } finally {
      Object.assign(state.session, original);
      await act(async () => root.unmount());
    }
  });

  it("invalidates through the provider when the initial role is not admin", async () => {
    const clear = vi.spyOn(QueryClient.prototype, "clear");
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const container = document.createElement("div");
    const root = createRoot(container);

    try {
      await act(async () =>
        root.render(
          <AppProviders>
            <AdminShell>관리자</AdminShell>
          </AppProviders>,
        ),
      );

      expect(clear).toHaveBeenCalledOnce();
      expect(state.router.replace).toHaveBeenCalledOnce();
      expect(state.router.replace).toHaveBeenCalledWith("/login");
      expect(storage).toHaveBeenCalledOnce();
    } finally {
      await act(async () => root.unmount());
    }
  });
});
