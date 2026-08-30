import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as auth from "@/shared/auth";

const api = vi.hoisted(() => ({ requestGraphQl: vi.fn() }));

vi.mock("@/shared/api", () => api);

type SessionWindow = {
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  dispatchEvent: (event: Event) => boolean;
  localStorage: { setItem: (key: string, value: string) => void };
};

type SessionEvents = {
  SESSION_INVALIDATION_STORAGE_KEY?: string;
  invalidateSession?: (target?: SessionWindow) => void;
  subscribeToSessionInvalidation?: (
    listener: () => void,
    target?: SessionWindow,
  ) => () => void;
};

const sessionEvents = auth as SessionEvents;

const requireSessionEvents = () => {
  expect(sessionEvents.invalidateSession).toBeTypeOf("function");
  expect(sessionEvents.subscribeToSessionInvalidation).toBeTypeOf("function");
  expect(sessionEvents.SESSION_INVALIDATION_STORAGE_KEY).toBeTypeOf("string");
  return sessionEvents as Required<SessionEvents>;
};

const createWindowChannel = () => {
  const windows: SessionWindow[] = [];
  const writes: ReturnType<typeof vi.fn>[] = [];
  const createWindow = () => {
    const target = new EventTarget();
    const setItem = vi.fn((key: string) => {
      for (const peer of windows) {
        if (peer === logicalWindow) continue;
        const event = new Event("storage");
        Object.defineProperty(event, "key", { value: key });
        peer.dispatchEvent(event);
      }
    });
    const logicalWindow: SessionWindow = {
      addEventListener: (type, listener) =>
        target.addEventListener(type, listener),
      removeEventListener: (type, listener) =>
        target.removeEventListener(type, listener),
      dispatchEvent: (event) => target.dispatchEvent(event),
      localStorage: { setItem },
    };
    windows.push(logicalWindow);
    writes.push(setItem);
    return logicalWindow;
  };
  return { createWindow, writes };
};

describe("partner session invalidation", () => {
  afterEach(() => {
    api.requestGraphQl.mockReset();
    vi.restoreAllMocks();
  });

  it("invalidates the origin and receiving tab once without rebroadcast", () => {
    const { invalidateSession, subscribeToSessionInvalidation } =
      requireSessionEvents();
    const channel = createWindowChannel();
    const firstWindow = channel.createWindow();
    const secondWindow = channel.createWindow();
    const firstClient = new QueryClient();
    const secondClient = new QueryClient();
    const firstClear = vi.spyOn(firstClient, "clear");
    const secondClear = vi.spyOn(secondClient, "clear");
    const firstRouter = { replace: vi.fn() };
    const secondRouter = { replace: vi.fn() };
    const unsubscribeFirst = subscribeToSessionInvalidation(() => {
      firstClient.clear();
      firstRouter.replace("/login");
    }, firstWindow);
    const unsubscribeSecond = subscribeToSessionInvalidation(() => {
      secondClient.clear();
      secondRouter.replace("/login");
    }, secondWindow);

    invalidateSession(firstWindow);

    expect(firstClear).toHaveBeenCalledOnce();
    expect(secondClear).toHaveBeenCalledOnce();
    expect(firstRouter.replace).toHaveBeenCalledOnce();
    expect(firstRouter.replace).toHaveBeenCalledWith("/login");
    expect(secondRouter.replace).toHaveBeenCalledOnce();
    expect(secondRouter.replace).toHaveBeenCalledWith("/login");
    expect(channel.writes[0]).toHaveBeenCalledOnce();
    expect(channel.writes[1]).not.toHaveBeenCalled();

    unsubscribeFirst();
    unsubscribeSecond();
  });

  it("still invalidates the origin when storage access fails", () => {
    const { invalidateSession, subscribeToSessionInvalidation } =
      requireSessionEvents();
    const target = new EventTarget();
    const logicalWindow = {
      addEventListener: (type: string, listener: EventListener) =>
        target.addEventListener(type, listener),
      removeEventListener: (type: string, listener: EventListener) =>
        target.removeEventListener(type, listener),
      dispatchEvent: (event: Event) => target.dispatchEvent(event),
      get localStorage(): SessionWindow["localStorage"] {
        throw new Error("storage disabled");
      },
    };
    const listener = vi.fn();
    const unsubscribe = subscribeToSessionInvalidation(listener, logicalWindow);

    expect(() => invalidateSession(logicalWindow)).not.toThrow();
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
  });

  it("always refetches the partner session on window focus", () => {
    expect(auth.sessionQuery().refetchOnWindowFocus).toBe("always");
  });

  it("broadcasts a successful explicit logout", async () => {
    const { SESSION_INVALIDATION_STORAGE_KEY, subscribeToSessionInvalidation } =
      requireSessionEvents();
    const listener = vi.fn();
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const unsubscribe = subscribeToSessionInvalidation(listener);
    api.requestGraphQl.mockResolvedValue({ logout: true });

    await auth.logout();

    expect(listener).toHaveBeenCalledOnce();
    expect(storage).toHaveBeenCalledWith(
      SESSION_INVALIDATION_STORAGE_KEY,
      expect.any(String),
    );
    unsubscribe();
  });

  it("invalidates the local session when explicit logout fails", async () => {
    const { SESSION_INVALIDATION_STORAGE_KEY, subscribeToSessionInvalidation } =
      requireSessionEvents();
    const queryClient = new QueryClient();
    const clear = vi.spyOn(queryClient, "clear");
    const router = { replace: vi.fn() };
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const unsubscribe = subscribeToSessionInvalidation(() => {
      queryClient.clear();
      router.replace("/login");
    });
    const failure = new Error("logout unavailable");
    api.requestGraphQl.mockRejectedValue(failure);

    await expect(auth.logout()).rejects.toBe(failure);

    expect(clear).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/login");
    expect(storage).toHaveBeenCalledWith(
      SESSION_INVALIDATION_STORAGE_KEY,
      expect.any(String),
    );
    unsubscribe();
  });
});
