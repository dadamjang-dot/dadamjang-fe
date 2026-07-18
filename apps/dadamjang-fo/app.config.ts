import 'tsx/cjs';

import withIosBuildSettings from './plugins/with-ios-build-settings';

const DEPLOYMENT_TARGET = '16.4';

const appConfig = ({ config }: { config: Record<string, unknown> }) => ({
  ...config,
  name: '다담장',
  slug: 'dadamjang-fo',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  scheme: 'dadamjang',
  icon: './assets/images/icon.png',
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#4D45DF',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.dadamjang.fo',
    icon: './assets/images/icon.png',
  },
  android: {
    package: 'com.dadamjang.fo',
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#4D45DF',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    [
      'expo-router',
      {
        root: './src/app',
      },
    ],
    'expo-secure-store',
    'expo-image',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: DEPLOYMENT_TARGET,
          buildReactNativeFromSource: true,
        },
      },
    ],
    [
      withIosBuildSettings,
      {
        deploymentTarget: DEPLOYMENT_TARGET,
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        url: 'https://sentry.io/',
        project: 'dadamjang-fo',
        organization: 'dadamjang-dot',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});

export default appConfig;
