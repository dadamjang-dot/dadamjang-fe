import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { useEffect, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";

import {
  getAccessToken,
  setSessionResetHandler,
} from "@dadamjang/graphql-client";

import {
  AuthFlowProvider,
  AuthSessionStateProvider,
  useAuthFlow,
} from "@/features/auth";
import { useFoPushNotifications } from "@/features/notification";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2, refetchOnReconnect: true },
  },
});

type AppProvidersProps = { children: ReactNode };

type SessionHydration = {
  error: unknown | null;
  hasSession: boolean;
};

const getIsOnline = ({
  isConnected,
  isInternetReachable,
}: Pick<NetInfoState, "isConnected" | "isInternetReachable">) =>
  isConnected === true && isInternetReachable !== false;

const readSessionHydration = async (): Promise<SessionHydration> => {
  try {
    return { error: null, hasSession: Boolean(await getAccessToken()) };
  } catch (error) {
    return { error, hasSession: false };
  }
};

type SessionResetBoundaryProps = AppProvidersProps & {
  hasSession: boolean;
  refreshSessionHydration: () => Promise<SessionHydration>;
  sessionRevision: number;
};

const SessionResetBoundary = ({
  children,
  hasSession,
  refreshSessionHydration,
  sessionRevision,
}: SessionResetBoundaryProps) => {
  const { resetAuthFlow } = useAuthFlow();
  useFoPushNotifications(hasSession, sessionRevision);
  useEffect(
    () =>
      setSessionResetHandler(async () => {
        await queryClient.cancelQueries();
        queryClient.clear();
        resetAuthFlow();
        const session = await refreshSessionHydration();
        if (session.error !== null) throw session.error;
      }),
    [refreshSessionHydration, resetAuthFlow],
  );
  return children;
};

export const AppProviders = ({ children }: AppProvidersProps) => {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [sessionHydration, setSessionHydration] = useState<SessionHydration>({
    error: null,
    hasSession: false,
  });
  const refreshSessionHydration = async () => {
    const session = await readSessionHydration();
    setSessionHydration(session);
    setSessionRevision((current) => current + 1);
    return session;
  };

  useEffect(() => {
    const updateFocus = (state: AppStateStatus) =>
      focusManager.setFocused(state === "active");
    if (AppState.currentState) updateFocus(AppState.currentState);
    const subscription = AppState.addEventListener("change", updateFocus);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let isMounted = true;
    let networkRevision = 0;
    const removeNetworkListener = NetInfo.addEventListener((state) => {
      networkRevision += 1;
      if (isMounted) onlineManager.setOnline(getIsOnline(state));
    });

    const bootstrap = async () => {
      const initialNetworkRevision = networkRevision;
      const [initialNetworkState, session] = await Promise.all([
        NetInfo.fetch().catch(() => null),
        readSessionHydration(),
      ]);
      if (!isMounted) return;
      if (networkRevision === initialNetworkRevision) {
        onlineManager.setOnline(
          initialNetworkState ? getIsOnline(initialNetworkState) : false,
        );
      }
      setSessionHydration(session);
      setSessionRevision((current) => current + 1);
      setIsBootstrapped(true);
    };

    void bootstrap();
    return () => {
      isMounted = false;
      removeNetworkListener();
    };
  }, []);

  const authSessionState = {
    ...sessionHydration,
    retry: async () => {
      await refreshSessionHydration();
    },
  };

  if (!isBootstrapped) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionStateProvider value={authSessionState}>
        <AuthFlowProvider>
          <SessionResetBoundary
            hasSession={sessionHydration.hasSession}
            refreshSessionHydration={refreshSessionHydration}
            sessionRevision={sessionRevision}
          >
            {children}
          </SessionResetBoundary>
        </AuthFlowProvider>
      </AuthSessionStateProvider>
    </QueryClientProvider>
  );
};
