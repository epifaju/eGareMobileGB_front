/** Locale BCP 47 pour `Date#toLocaleString` selon la langue i18n active (`pt`, `fr`, `en`). */
export function intlLocaleFromLanguage(lng: string | undefined): string {
  const base = (lng ?? 'pt').split('-')[0]?.toLowerCase() ?? 'pt';
  if (base === 'fr') {
    return 'fr-FR';
  }
  if (base === 'en') {
    return 'en-US';
  }
  return 'pt-PT';
}
