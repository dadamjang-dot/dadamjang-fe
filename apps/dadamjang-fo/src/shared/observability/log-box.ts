import { LogBox } from 'react-native';

export const configureLogBox = () => {
  if (__DEV__) {
    LogBox.ignoreAllLogs(true);

    return;
  }

  LogBox.ignoreLogs(['You are using an unsupported debugging client']);
};
