import {
  focusManager,
  isCancelledError,
  onlineManager,
  useQueryClient,
} from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { GraphqlError } from "@dadamjang/graphql-client";

import { getCurrentUser } from "@/features/auth/api";

import {
  getFoNotification,
  markFoNotificationRead,
  registerFoPushDevice,
} from "./api";
import { foNotificationQueryKeys } from "./hooks";
import { getAllowedNotificationRoute } from "./rules";
import type {
  FoNotificationType,
  FoPushNotificationData,
  FoPushPlatform,
} from "./types";

type PushSession = { revision: number };
type SettledRegistration = { revision: number; token: string };
type RegistrationFlight = { revision: number };

const registrationTimeoutMs = 10_000;

const notificationHandler: Notifications.NotificationHandler = {
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
};

let notificationHandlerOwners = 0;

const acquireNotificationHandler = () => {
  if (notificationHandlerOwners === 0) {
    Notifications.setNotificationHandler(notificationHandler);
  }
  notificationHandlerOwners += 1;
  return () => {
    notificationHandlerOwners -= 1;
    if (notificationHandlerOwners === 0) {
      Notifications.setNotificationHandler(null);
    }
  };
};

const isNotificationType = (value: unknown): value is FoNotificationType =>
  value === "ORDER_STATUS" ||
  value === "WISH_PRICE_DROP" ||
  value === "WISH_RESTOCK" ||
  value === "STYLE_LIKE";

const parsePushData = (value: unknown): FoPushNotificationData | undefined => {
  if (value === null || typeof value !== "object") return undefined;
  const notificationId = Reflect.get(value, "notificationId");
  const type = Reflect.get(value, "type");
  const entityId = Reflect.get(value, "entityId");
  if (
    typeof notificationId !== "string" ||
    notificationId.length === 0 ||
    !isNotificationType(type) ||
    typeof entityId !== "string" ||
    entityId.length === 0
  ) {
    return undefined;
  }
  return { notificationId, type, entityId };
};

const hasIosAuthorization = (
  status: Notifications.IosAuthorizationStatus | undefined,
) =>
  status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
  status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
  status === Notifications.IosAuthorizationStatus.EPHEMERAL;

const throwIfPushRegistrationAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new Error("Push registration aborted");
};

const ensureNotificationPermission = async (signal: AbortSignal) => {
  throwIfPushRegistrationAborted(signal);
  const current = await Notifications.getPermissionsAsync();
  throwIfPushRegistrationAborted(signal);
  const permission =
    current.status === "undetermined"
      ? await Notifications.requestPermissionsAsync()
      : current;
  throwIfPushRegistrationAborted(signal);
  return permission.granted || hasIosAuthorization(permission.ios?.status);
};

export const getFoPushPlatform = (
  expoOs: string | undefined,
): FoPushPlatform | undefined => {
  if (expoOs === "ios") return "IOS";
  if (expoOs === "android") return "ANDROID";
  return undefined;
};

const getProjectId = () => {
  const value = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
};

export const getExpoPushRegistration = async (
  projectId: string,
  platform: FoPushPlatform,
  signal?: AbortSignal,
) => {
  throwIfPushRegistrationAborted(signal);
  if (platform === "ANDROID") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
    });
    throwIfPushRegistrationAborted(signal);
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  throwIfPushRegistrationAborted(signal);
  return { expoPushToken: token.data, platform };
};

export const useFoPushNotifications = (
  hasSession: boolean,
  sessionRevision: number,
) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pendingNotificationId, setPendingNotificationId] = useState<string>();
  const activeSession = useRef<PushSession | undefined>(undefined);
  const settledRegistration = useRef<SettledRegistration | undefined>(
    undefined,
  );
  const registrationFlight = useRef<RegistrationFlight | undefined>(undefined);
  const registrationQueued = useRef(false);
  const registerForPushRef = useRef<(session: PushSession) => void>(() => {});
  const handledResponseIds = useRef(new Set<string>());
  const resolvingNotificationId = useRef<string | undefined>(undefined);

  const registerForPush = useCallback((session: PushSession) => {
    if (registrationFlight.current) {
      registrationQueued.current = true;
      return;
    }
    if (!onlineManager.isOnline()) return;
    const flight = { revision: session.revision };
    const controller = new AbortController();
    registrationFlight.current = flight;
    const workflow = (async () => {
      try {
        await getCurrentUser(controller.signal);
        if (
          controller.signal.aborted ||
          activeSession.current?.revision !== session.revision
        ) {
          return;
        }
        if (!(await ensureNotificationPermission(controller.signal))) return;
        const platform = getFoPushPlatform(process.env.EXPO_OS);
        const projectId = getProjectId();
        if (!platform || !projectId) return;
        if (
          controller.signal.aborted ||
          activeSession.current?.revision !== session.revision
        ) {
          return;
        }
        const registration = await getExpoPushRegistration(
          projectId,
          platform,
          controller.signal,
        );
        if (
          controller.signal.aborted ||
          activeSession.current?.revision !== session.revision ||
          registration.expoPushToken.length === 0
        ) {
          return;
        }
        const settled = settledRegistration.current;
        if (
          settled?.revision === session.revision &&
          settled.token === registration.expoPushToken
        ) {
          return;
        }
        throwIfPushRegistrationAborted(controller.signal);
        await registerFoPushDevice(registration, controller.signal);
        if (
          !controller.signal.aborted &&
          activeSession.current?.revision === session.revision
        ) {
          settledRegistration.current = {
            revision: session.revision,
            token: registration.expoPushToken,
          };
        }
      } catch {
        return;
      }
    })();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        resolve();
      }, registrationTimeoutMs);
    });
    void Promise.race([workflow, timeout]).finally(() => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (registrationFlight.current !== flight) return;
      registrationFlight.current = undefined;
      const latestSession = activeSession.current;
      const shouldRetry =
        registrationQueued.current ||
        latestSession?.revision !== flight.revision;
      registrationQueued.current = false;
      if (latestSession && shouldRetry) {
        registerForPushRef.current(latestSession);
      }
    });
  }, []);

  useEffect(() => {
    registerForPushRef.current = registerForPush;
  }, [registerForPush]);

  useEffect(() => {
    settledRegistration.current = undefined;
    const session = hasSession ? { revision: sessionRevision } : undefined;
    activeSession.current = session;
    if (session) registerForPush(session);
    return () => {
      if (activeSession.current?.revision === session?.revision)
        activeSession.current = undefined;
    };
  }, [hasSession, registerForPush, sessionRevision]);

  useEffect(
    () =>
      focusManager.subscribe((isFocused) => {
        const session = activeSession.current;
        if (isFocused && session) registerForPush(session);
      }),
    [registerForPush],
  );

  useEffect(
    () =>
      onlineManager.subscribe((isOnline) => {
        const session = activeSession.current;
        if (isOnline && session) registerForPush(session);
      }),
    [registerForPush],
  );

  const handleResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (handledResponseIds.current.has(responseId)) return;
      handledResponseIds.current.add(responseId);
      const data = parsePushData(response.notification.request.content.data);
      if (data) setPendingNotificationId(data.notificationId);
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;
    const releaseNotificationHandler = acquireNotificationHandler();
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      queueMicrotask(() => {
        if (isMounted) handleResponse(lastResponse);
      });
    }
    return () => {
      isMounted = false;
      responseSubscription.remove();
      releaseNotificationHandler();
    };
  }, [handleResponse]);

  useEffect(() => {
    if (!pendingNotificationId || !hasSession) return;
    if (resolvingNotificationId.current === pendingNotificationId) return;
    let isActive = true;
    let preservePending = false;
    let resolutionSignal: AbortSignal | undefined;
    const resolutionSessionRevision = sessionRevision;
    resolvingNotificationId.current = pendingNotificationId;
    const resolveNotification = async () => {
      try {
        const authoritative = await queryClient.fetchQuery({
          queryKey: foNotificationQueryKeys.detail(pendingNotificationId),
          queryFn: ({ signal }) => {
            resolutionSignal = signal;
            return getFoNotification(pendingNotificationId, signal);
          },
          retry: false,
          staleTime: 0,
        });
        if (!isActive) return;
        if (
          !resolutionSignal ||
          resolutionSignal.aborted ||
          activeSession.current?.revision !== resolutionSessionRevision
        ) {
          preservePending = true;
          return;
        }
        const route = getAllowedNotificationRoute(authoritative);
        if (!route) {
          router.replace("/notifications");
          return;
        }
        const marked = await markFoNotificationRead(pendingNotificationId);
        if (!isActive) return;
        queryClient.setQueryData(
          foNotificationQueryKeys.detail(pendingNotificationId),
          marked,
        );
        await queryClient.invalidateQueries({
          queryKey: foNotificationQueryKeys.list(),
        });
        if (!isActive) return;
        router.push(route);
      } catch (error) {
        preservePending =
          isCancelledError(error) ||
          (error instanceof GraphqlError && error.status === 401);
        if (isActive && !preservePending) router.replace("/notifications");
      } finally {
        if (
          isActive &&
          resolvingNotificationId.current === pendingNotificationId
        ) {
          if (!preservePending) setPendingNotificationId(undefined);
          resolvingNotificationId.current = undefined;
        }
      }
    };
    void resolveNotification();
    return () => {
      isActive = false;
      if (resolvingNotificationId.current === pendingNotificationId)
        resolvingNotificationId.current = undefined;
    };
  }, [hasSession, pendingNotificationId, queryClient, router, sessionRevision]);
};
