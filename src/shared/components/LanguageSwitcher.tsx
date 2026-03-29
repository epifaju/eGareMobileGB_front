import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { SupportedLocale } from '@/shared/i18n/localeStorage';

const LOCALES: SupportedLocale[] = ['pt', 'fr', 'en'];

const LOCALE_LABEL: Record<SupportedLocale, string> = {
  pt: 'PT',
  fr: 'FR',
  en: 'EN',
};

export type LanguageSwitcherProps = {
  testID?: string;
};

export default function LanguageSwitcher({ testID = 'language-switcher' }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const active = (i18n.resolvedLanguage ?? i18n.language).split('-')[0] as SupportedLocale;

  return (
    <View className="mb-md flex-row flex-wrap items-center justify-center" testID={testID}>
      <Text className="mr-sm text-sm text-textSecondary">{t('common.language')}:</Text>
      <View className="flex-row flex-wrap gap-xs">
        {LOCALES.map((lng) => {
          const isActive = active === lng;
          return (
            <Pressable
              key={lng}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              className={`rounded-default border px-sm py-xs ${isActive ? 'border-primary bg-surface' : 'border-border bg-background'}`}
              onPress={() => {
                void i18n.changeLanguage(lng);
              }}
              testID={`${testID}-${lng}`}
            >
              <Text className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-textPrimary'}`}>
                {LOCALE_LABEL[lng]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
