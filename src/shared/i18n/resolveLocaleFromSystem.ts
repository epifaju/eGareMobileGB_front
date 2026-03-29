import type { SupportedLocale } from '@/shared/i18n/localeStorage';

/**
 * Mappe la langue système (ex. expo-localization) vers une locale supportée.
 * Repli : portugais pour toute langue non prise en charge.
 */
export function resolveLocaleFromSystem(languageCode: string | undefined | null): SupportedLocale {
  if (!languageCode) {
    return 'pt';
  }
  const lower = languageCode.toLowerCase();
  if (lower.startsWith('fr')) {
    return 'fr';
  }
  if (lower.startsWith('en')) {
    return 'en';
  }
  if (lower.startsWith('pt')) {
    return 'pt';
  }
  return 'pt';
}
