export const SESSION_INVALIDATION_STORAGE_KEY =
  "dadamjang:session-invalidation:v1";

const SESSION_INVALIDATION_EVENT = "dadamjang:session-expired";

type SessionWindow = {
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
  dispatchEvent: (event: Event) => boolean;
  localStorage: { setItem: (key: string, value: string) => void };
};

const currentWindow = () => window as unknown as SessionWindow;

export const invalidateSession = (target = currentWindow()) => {
  target.dispatchEvent(new Event(SESSION_INVALIDATION_EVENT));
  try {
    target.localStorage.setItem(
      SESSION_INVALIDATION_STORAGE_KEY,
      crypto.randomUUID(),
    );
  } catch {}
};

export const subscribeToSessionInvalidation = (
  listener: () => void,
  target = currentWindow(),
) => {
  const handleSessionEvent = () => listener();
  const handleStorage = (event: Event) => {
    if ((event as StorageEvent).key === SESSION_INVALIDATION_STORAGE_KEY)
      listener();
  };
  target.addEventListener(SESSION_INVALIDATION_EVENT, handleSessionEvent);
  target.addEventListener("storage", handleStorage);
  return () => {
    target.removeEventListener(SESSION_INVALIDATION_EVENT, handleSessionEvent);
    target.removeEventListener("storage", handleStorage);
  };
};
