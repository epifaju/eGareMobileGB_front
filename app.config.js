/**
 * Charge .env puis expose l’URL API et la config Maps dans extra (expo-constants).
 * Quand ce fichier existe, Expo l’utilise à la place de app.json seul.
 */
module.exports = () => {
  const appJson = require('./app.json');
  const url = process.env.EXPO_PUBLIC_API_URL || '';
  /** Obligatoire sur Android pour react-native-maps (SDK Google Maps). Voir docs/MAPS_ANDROID.md */
  const googleMapsAndroid = process.env.GOOGLE_MAPS_ANDROID_API_KEY || '';
  const googleMapsIos =
    process.env.GOOGLE_MAPS_IOS_API_KEY || googleMapsAndroid || '';
  const easProjectId = process.env.EAS_PROJECT_ID || '';

  return {
    expo: {
      ...appJson.expo,
      plugins: [
        ...(appJson.expo.plugins || []),
        'expo-sqlite',
        [
          'expo-camera',
          {
            cameraPermission:
              "L'app utilise la caméra pour scanner les QR codes des billets à l'embarquement.",
          },
        ],
        'expo-notifications',
      ],
      android: {
        ...appJson.expo.android,
        config: {
          ...(appJson.expo.android?.config || {}),
          googleMaps: {
            apiKey: googleMapsAndroid,
          },
        },
      },
      ios: {
        ...appJson.expo.ios,
        config: {
          ...(appJson.expo.ios?.config || {}),
          googleMapsApiKey: googleMapsIos,
        },
      },
      extra: {
        ...(appJson.expo.extra || {}),
        apiUrl: url,
        googleMapsAndroidApiKey: googleMapsAndroid,
        eas: {
          projectId: easProjectId,
        },
      },
    },
  };
};
