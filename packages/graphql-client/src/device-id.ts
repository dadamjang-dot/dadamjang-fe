import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const deviceIdKey = 'dadamjang.device-id';

export const getDeviceId = async () => {
  const savedDeviceId = await SecureStore.getItemAsync(deviceIdKey);
  if (savedDeviceId) return savedDeviceId;

  const deviceId = Crypto.randomUUID();
  await SecureStore.setItemAsync(deviceIdKey, deviceId);
  return deviceId;
};
