const permissionResponse = {
  status: "granted",
  granted: true,
  canAskAgain: true,
  expires: "never",
};

const subscription = () => ({ remove: jest.fn() });

export const getPermissionsAsync = jest.fn(async () => permissionResponse);
export const requestPermissionsAsync = jest.fn(async () => permissionResponse);
export const getExpoPushTokenAsync = jest.fn(async () => ({
  type: "expo",
  data: "ExponentPushToken[test-token]",
}));
export const addNotificationReceivedListener = jest.fn(subscription);
export const addNotificationResponseReceivedListener = jest.fn(subscription);
export const getLastNotificationResponseAsync = jest.fn(async () => null);
export const getLastNotificationResponse = jest.fn(() => null);
export const setNotificationHandler = jest.fn();
export const setNotificationChannelAsync = jest.fn(async (channelId: string) => ({
  id: channelId,
  name: channelId,
  importance: 4,
  bypassDnd: false,
  description: null,
  groupId: null,
  lightColor: null,
  lockscreenVisibility: 0,
  sound: "default",
  vibrationPattern: [],
  enableLights: false,
  enableVibrate: false,
}));

export const DEFAULT_ACTION_IDENTIFIER =
  "expo.modules.notifications.actions.DEFAULT";

export const IosAuthorizationStatus = {
  NOT_DETERMINED: 0,
  DENIED: 1,
  AUTHORIZED: 2,
  PROVISIONAL: 3,
  EPHEMERAL: 4,
};

export const PermissionStatus = {
  DENIED: "denied",
  GRANTED: "granted",
  UNDETERMINED: "undetermined",
};
