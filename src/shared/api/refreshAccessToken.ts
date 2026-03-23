import type { TokenResponse } from '@/features/auth/types';
import { API_BASE_URL } from '@/shared/constants/env';
import { getAccessTokenExpiryMs } from '@/shared/lib/jwtExp';
import { tokenStorage } from '@/shared/lib/tokenStorage';

/** Rafraîchir si l’access token expire dans ce délai (évite un 401 sur la requête suivante). */
const PROACTIVE_REFRESH_BEFORE_MS = 90_000;

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Appelle POST /api/auth/refresh et met à jour MMKV. Une seule requête à la fois (mutex).
 * @returns true si de nouveaux tokens ont été stockés.
 */
export function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  refreshInFlight = performRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function performRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return false;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as TokenResponse;
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

/** Si le token est proche de l’expiration, tente un refresh avant l’appel API suivant. */
export async function maybeRefreshBeforeExpiry(): Promise<void> {
  const access = tokenStorage.getAccessToken();
  const expMs = getAccessTokenExpiryMs(access);
  if (expMs === null) {
    return;
  }
  if (expMs - Date.now() > PROACTIVE_REFRESH_BEFORE_MS) {
    return;
  }
  await refreshAccessToken();
}
