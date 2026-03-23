import { API_BASE_URL } from '@/shared/constants/env';

/**
 * URL STOMP (WebSocket natif `/ws-app`) dérivée de l’URL HTTP du backend.
 */
export function resolveStompBrokerUrl(): string {
  const u = new URL(API_BASE_URL);
  const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${u.host}/ws-app`;
}

export const WS_STOMP_URL = resolveStompBrokerUrl();
