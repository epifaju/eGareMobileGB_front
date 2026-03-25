import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExpoExtra = {
  apiUrl?: string;
};

/**
 * URL du backend Spring Boot.
 * Priorité : extra.apiUrl (app.config.js + .env) → EXPO_PUBLIC_* au build Metro → défaut plateforme.
 * Téléphone physique : définir EXPO_PUBLIC_API_URL=http://IP_LAN:8080 dans .env puis redémarrer Metro avec --clear.
 */
function resolveApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  const fromExtra = extra?.apiUrl?.trim();
  if (fromExtra) {
    return fromExtra;
  }
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:8080' : 'http://localhost:8080';
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * PEM SPKI (clé publique RSA) — même paire que la clé privée `app.boarding.jwt` côté API.
 * Validation RS256 hors ligne uniquement ; ne jamais embarquer la clé privée.
 */
function normalizeEnvPem(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  return s.replace(/\\n/g, '\n');
}

export const BOARDING_JWT_PUBLIC_KEY_PEM = normalizeEnvPem(
  process.env.EXPO_PUBLIC_BOARDING_JWT_PUBLIC_KEY ?? '',
);
