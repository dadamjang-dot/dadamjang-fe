import { QueryClient } from "@tanstack/react-query";
import { act, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "@/_app/admin-shell/admin-shell";
import { subscribeToSessionInvalidation } from "@/shared/auth";

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
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => state.router,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-query")>();
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
    SidePanel: {},
    Skeleton: () => null,
  };
});

vi.mock("@/shared/ui", () => ({ useAdminSnackbar: () => vi.fn() }));

describe("AdminShell session boundary", () => {
  afterEach(() => {
    state.router.replace.mockReset();
    vi.restoreAllMocks();
  });

  it("invalidates every tab when the session role is not admin", async () => {
    const client = new QueryClient();
    const clear = vi.spyOn(client, "clear");
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const unsubscribe = subscribeToSessionInvalidation(() => {
      client.clear();
      state.router.replace("/login");
    });
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => root.render(<AdminShell>관리자</AdminShell>));

    expect(clear).toHaveBeenCalledOnce();
    expect(state.router.replace).toHaveBeenCalledOnce();
    expect(state.router.replace).toHaveBeenCalledWith("/login");
    expect(storage).toHaveBeenCalledOnce();

    await act(async () => root.unmount());
    unsubscribe();
  });
});
