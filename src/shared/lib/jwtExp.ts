/**
 * Payload JWT (sans vérification de signature — usage client uniquement).
 */
export function parseJwtPayload(accessToken: string | undefined): Record<string, unknown> | null {
  if (!accessToken) {
    return null;
  }
  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) {
      return null;
    }
    const jsonPayload = decodeBase64Url(parts[1]);
    return JSON.parse(jsonPayload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Lecture du claim `exp` (secondes) du JWT sans vérifier la signature (usage client : expiration seulement).
 */
export function getAccessTokenExpiryMs(accessToken: string | undefined): number | null {
  const payload = parseJwtPayload(accessToken);
  const exp = payload?.exp;
  if (typeof exp !== 'number') {
    return null;
  }
  return exp * 1000;
}

function decodeBase64Url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
