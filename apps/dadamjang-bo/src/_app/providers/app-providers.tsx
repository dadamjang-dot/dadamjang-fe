"use client";

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Snackbar, useSnackbarAdapter } from "@seed-design/react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

const SnackbarViewport = () => {
  const snackbar = useSnackbarAdapter();
  return (
    <Snackbar.Region>
      {snackbar.visible ? (
        <Snackbar.Root>
          <Snackbar.Renderer />
          <Snackbar.HiddenCloseButton aria-label="알림 닫기" />
        </Snackbar.Root>
      ) : null}
    </Snackbar.Region>
  );
};

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache(),
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
          mutations: { retry: false },
        },
      }),
  );
  useEffect(() => {
    const expireSession = () => {
      queryClient.clear();
      router.replace("/login");
    };
    window.addEventListener("dadamjang:session-expired", expireSession);
    return () =>
      window.removeEventListener("dadamjang:session-expired", expireSession);
  }, [queryClient, router]);
  return (
    <QueryClientProvider client={queryClient}>
      <Snackbar.RootProvider strategy="queued">
        {children}
        <SnackbarViewport />
      </Snackbar.RootProvider>
    </QueryClientProvider>
  );
};
