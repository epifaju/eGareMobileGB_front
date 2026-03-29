import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/shared/i18n/locales/en.json';
import fr from '@/shared/i18n/locales/fr.json';
import pt from '@/shared/i18n/locales/pt.json';
import { localeStorage, type SupportedLocale } from '@/shared/i18n/localeStorage';
import { resolveLocaleFromSystem } from '@/shared/i18n/resolveLocaleFromSystem';

function getInitialLng(): SupportedLocale {
  const stored = localeStorage.get();
  if (stored) {
    return stored;
  }
  const fromSystem = resolveLocaleFromSystem(Localization.getLocales()[0]?.languageCode);
  localeStorage.set(fromSystem);
  return fromSystem;
}

void i18n.use(initReactI18next).init({
  resources: {
    pt: { translation: pt },
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: getInitialLng(),
  fallbackLng: 'pt',
  supportedLngs: ['pt', 'fr', 'en'],
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

i18n.on('languageChanged', (lng) => {
  if (lng === 'pt' || lng === 'fr' || lng === 'en') {
    localeStorage.set(lng);
  }
});

export { i18n };
