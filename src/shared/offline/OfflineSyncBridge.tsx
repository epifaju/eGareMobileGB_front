import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';

import { processOfflineQueue } from '@/shared/offline/actionQueue';
import { processBoardingScanLogs } from '@/shared/offline/boardingScanLogs';

/**
 * Écoute le retour réseau et rejoue la file FIFO (PRD §4.4 O2).
 */
export default function OfflineSyncBridge() {
  const wasOffline = useRef(false);

  useEffect(() => {
    void NetInfo.fetch().then((s) => {
      if (s.isConnected !== false) {
        void processOfflineQueue();
      }
    });
  }, []);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false;
      if (wasOffline.current && !offline) {
        void (async () => {
          await processBoardingScanLogs();
          await processOfflineQueue();
        })();
      }
      wasOffline.current = offline;
    });
    void NetInfo.fetch().then((s) => {
      wasOffline.current = s.isConnected === false;
    });
    return () => {
      sub();
    };
  }, []);

  return null;
}
