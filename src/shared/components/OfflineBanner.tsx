import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter, Text, View } from 'react-native';

import { getQueuedActionCount } from '@/shared/offline/actionQueue';
import { OFFLINE_QUEUE_CHANGED } from '@/shared/offline/queueEvents';
import { colors } from '@/shared/constants/colors';

export type OfflineBannerProps = {
  testID?: string;
};

/**
 * Bandeau si pas de connexion et/ou actions en file FIFO (PRD §4.4).
 */
export default function OfflineBanner({ testID = 'offline-banner' }: OfflineBannerProps) {
  const [offline, setOffline] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
    return () => {
      sub();
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      void getQueuedActionCount().then(setQueueCount);
    };
    refresh();
    const sub = DeviceEventEmitter.addListener(OFFLINE_QUEUE_CHANGED, refresh);
    return () => {
      sub.remove();
    };
  }, []);

  if (!offline && queueCount === 0) {
    return null;
  }

  const line1 = offline
    ? 'Hors ligne — réservations / statuts GPS et scans embarquement sont mis en file puis synchronisés au retour réseau.'
    : 'Synchronisation différée — actions et scans embarquement en file (FIFO).';
  const line2 =
    queueCount > 0 ? `${queueCount} élément(s) en attente` : null;

  return (
    <View className="w-full px-md py-sm" style={{ backgroundColor: colors.warning }} testID={testID}>
      <Text className="text-center text-sm font-medium text-textPrimary" testID={`${testID}-text`}>
        {line1}
      </Text>
      {line2 ? (
        <Text
          className="mt-xs text-center text-xs font-semibold text-textPrimary"
          testID={`${testID}-queue`}
        >
          {line2}
        </Text>
      ) : null}
    </View>
  );
}
