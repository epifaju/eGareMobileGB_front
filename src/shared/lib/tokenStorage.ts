import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'gare-sessions' });

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export const tokenStorage = {
  setTokens(access: string, refresh: string): void {
    storage.set(ACCESS_KEY, access);
    storage.set(REFRESH_KEY, refresh);
  },
  getAccessToken(): string | undefined {
    return storage.getString(ACCESS_KEY);
  },
  getRefreshToken(): string | undefined {
    return storage.getString(REFRESH_KEY);
  },
  clearTokens(): void {
    storage.remove(ACCESS_KEY);
    storage.remove(REFRESH_KEY);
  },
  hasValidSession(): boolean {
    return !!storage.getString(ACCESS_KEY);
  },
};
