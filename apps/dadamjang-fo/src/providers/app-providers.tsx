import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, type ReactNode } from "react";

import { setSessionResetHandler } from "@dadamjang/graphql-client";

import { AuthFlowProvider, useAuthFlow } from "@/features/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2, refetchOnReconnect: true },
  },
});

type AppProvidersProps = { children: ReactNode };

const SessionResetBoundary = ({ children }: AppProvidersProps) => {
  const { resetAuthFlow } = useAuthFlow();
  useEffect(
    () =>
      setSessionResetHandler(() => {
        queryClient.clear();
        resetAuthFlow();
      }),
    [resetAuthFlow],
  );
  return children;
};

export const AppProviders = ({ children }: AppProvidersProps) => {
  useEffect(
    () =>
      onlineManager.setEventListener((setOnline) =>
        NetInfo.addEventListener((state) =>
          setOnline(Boolean(state.isConnected)),
        ),
      ),
    [],
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthFlowProvider>
        <SessionResetBoundary>{children}</SessionResetBoundary>
      </AuthFlowProvider>
    </QueryClientProvider>
  );
};
