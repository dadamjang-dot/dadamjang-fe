import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { getSessionGeneration } from "@dadamjang/graphql-client";
import { addWish, removeWish } from "@/features/wish/api";
import { useWishActions } from "@/features/wish/hooks";
import { updateFoNotificationPreferences } from "@/features/notification/api";
import {
  foNotificationQueryKeys,
  useUpdateFoNotificationPreferences,
} from "@/features/notification/hooks";

jest.mock("@dadamjang/graphql-client", () => ({
  getSessionGeneration: jest.fn(() => 0),
}));
jest.mock("@/features/wish/api", () => ({
  addWish: jest.fn(),
  removeWish: jest.fn(),
}));
jest.mock("@/features/notification/api", () => ({
  updateFoNotificationPreferences: jest.fn(),
}));

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
};

const setup = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper: Wrapper };
};

beforeEach(() => jest.mocked(getSessionGeneration).mockReturnValue(0));

it("persists the last wish intent across independent hook instances", async () => {
  const { client, wrapper } = setup();
  const flight = deferred<void>();
  const persisted = new Set<string>();
  jest.mocked(addWish).mockImplementation(async (id) => {
    await flight.promise;
    persisted.add(id);
  });
  jest.mocked(removeWish).mockImplementation(async (id) => {
    persisted.delete(id);
  });
  const { result, unmount } = renderHook(
    () => ({ first: useWishActions(), second: useWishActions() }),
    { wrapper },
  );
  let add!: Promise<unknown>;
  let remove!: Promise<unknown>;
  await act(async () => {
    add = result.current.first.add.mutateAsync("p");
    remove = result.current.second.remove.mutateAsync("p");
  });
  await act(async () => {
    flight.resolve();
    await Promise.all([add, remove]);
  });
  expect([...persisted]).toEqual([]);
  act(() => {
    unmount();
    client.clear();
  });
});

it("discards queued wish intent after session replacement", async () => {
  const { client, wrapper } = setup();
  const flight = deferred<void>();
  const replacement = new Set(["p"]);
  jest.mocked(addWish).mockImplementation(async () => {
    await flight.promise;
  });
  jest.mocked(removeWish).mockImplementation(async (id) => {
    replacement.delete(id);
  });
  const { result, unmount } = renderHook(useWishActions, { wrapper });
  let add!: Promise<unknown>;
  let remove!: Promise<unknown>;
  await act(async () => {
    add = result.current.add.mutateAsync("p").catch(() => undefined);
    remove = result.current.remove.mutateAsync("p").catch(() => undefined);
  });
  await act(async () => {
    jest.mocked(getSessionGeneration).mockReturnValue(1);
    client.clear();
    flight.reject(new Error("session changed"));
    await Promise.all([add, remove]);
  });
  expect([...replacement]).toEqual(["p"]);
  act(() => {
    unmount();
    client.clear();
  });
});

it("does not resurrect notification preferences after logout", async () => {
  const { client, wrapper } = setup();
  const flight =
    deferred<Awaited<ReturnType<typeof updateFoNotificationPreferences>>>();
  const key = foNotificationQueryKeys.preferences();
  client.setQueryData(key, {
    pushEnabled: true,
    orderPushEnabled: true,
    wishPushEnabled: true,
    stylePushEnabled: true,
  });
  jest
    .mocked(updateFoNotificationPreferences)
    .mockReturnValueOnce(flight.promise);
  const { result, unmount } = renderHook(useUpdateFoNotificationPreferences, {
    wrapper,
  });
  let request!: Promise<unknown>;
  await act(async () => {
    request = result.current
      .mutateAsync({ pushEnabled: false })
      .catch(() => undefined);
  });
  await waitFor(() =>
    expect(client.getQueryData(key)).toMatchObject({ pushEnabled: false }),
  );
  await act(async () => {
    jest.mocked(getSessionGeneration).mockReturnValue(1);
    client.clear();
    flight.reject(new Error("session changed"));
    await request;
  });
  expect(client.getQueryData(key)).toBeUndefined();
  act(() => {
    unmount();
    client.clear();
  });
});
