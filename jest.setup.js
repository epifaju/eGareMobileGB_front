jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    set: jest.fn(),
    getString: jest.fn(() => undefined),
    remove: jest.fn(),
  })),
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt' }],
}));

require('./src/shared/i18n');

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  },
}));

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    Marker: View,
    Callout: View,
  };
});

jest.mock('react-native-qrcode-svg', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() =>
    Promise.resolve({
      execAsync: jest.fn(() => Promise.resolve()),
      runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 0, changes: 0 })),
      getFirstAsync: jest.fn(() => Promise.resolve(null)),
      getAllAsync: jest.fn(() => Promise.resolve([])),
    }),
  ),
}));

jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: '' } } },
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
}));

jest.mock('expo-camera', () => {
  const { View } = require('react-native');
  return {
    CameraView: View,
    useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  };
});

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({ coords: { latitude: 11.86, longitude: -15.6 } }),
  ),
  Accuracy: { Balanced: 2 },
}));
