import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '@/shared/constants/colors';

export type OfflineBannerProps = {
  testID?: string;
};

/**
 * Bandeau persistant si pas de connexion réseau (règle offline-first Guinée-Bissau).
 */
export default function OfflineBanner({ testID = 'offline-banner' }: OfflineBannerProps) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
    return () => {
      sub();
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <View
      className="w-full px-md py-sm"
      style={{ backgroundColor: colors.warning }}
      testID={testID}
    >
      <Text className="text-center text-sm font-medium text-textPrimary" testID={`${testID}-text`}>
        Hors ligne — certaines actions seront synchronisées plus tard
      </Text>
    </View>
  );
}
