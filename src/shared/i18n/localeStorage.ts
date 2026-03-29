import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'gare-app-prefs' });

const LOCALE_KEY = 'locale';

export type SupportedLocale = 'pt' | 'fr' | 'en';

export const localeStorage = {
  get(): SupportedLocale | undefined {
    const v = storage.getString(LOCALE_KEY);
    if (v === 'pt' || v === 'fr' || v === 'en') {
      return v;
    }
    return undefined;
  },

  set(locale: SupportedLocale): void {
    storage.set(LOCALE_KEY, locale);
  },
};
