import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { API_BASE_URL } from '@/shared/constants/env';
import { tokenStorage } from '@/shared/lib/tokenStorage';
import { useAppSelector } from '@/shared/store/hooks';

/**
 * Phase 6 — enregistre le jeton Expo Push pour tout utilisateur connecté (conducteurs : paliers
 * remplissage ; passagers : rappels départ). Nécessite `extra.eas.projectId` (EAS) en build dev client.
 */
export default function DriverPushRegistration() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const didRegister = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      didRegister.current = false;
      return;
    }
    if (didRegister.current) {
      return;
    }
    void (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          return;
        }
        const projectId =
          (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas
            ?.projectId ??
          (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
        if (!projectId) {
          return;
        }
        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
        const access = tokenStorage.getAccessToken();
        if (!access) {
          return;
        }
        const res = await fetch(`${API_BASE_URL}/api/me/push-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${access}`,
          },
          body: JSON.stringify({ expoPushToken }),
        });
        if (res.ok) {
          didRegister.current = true;
        }
      } catch {
        // réseau / simulateur sans push : ignorer
      }
    })();
  }, [isAuthenticated]);

  return null;
}
