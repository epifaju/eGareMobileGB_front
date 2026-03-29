import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { intlLocaleFromLanguage } from '@/shared/lib/intlLocale';

export type BookingQrBlockProps = {
  value: string;
  expiresAt: string | null;
  testID?: string;
};

function formatExpires(iso: string | null, locale: string): string {
  if (!iso) {
    return '';
  }
  try {
    return new Date(iso).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * QR billet stocké via cache réservations (O3 — affichage local, sync serveur via file O2).
 */
export default function BookingQrBlock({ value, expiresAt, testID = 'booking-qr' }: BookingQrBlockProps) {
  const { t, i18n } = useTranslation();
  const locale = intlLocaleFromLanguage(i18n.language);
  const dateStr = expiresAt ? formatExpires(expiresAt, locale) : '';

  return (
    <View className="mt-md items-center rounded-default border border-border bg-surface px-md py-md">
      <Text className="mb-sm text-center text-xs text-textSecondary" testID={`${testID}-hint`}>
        {t('reservation.qrHint')}
      </Text>
      <View className="rounded-default bg-white p-sm">
        <QRCode value={value} size={176} />
      </View>
      {expiresAt ? (
        <Text className="mt-sm text-xs text-textSecondary" testID={`${testID}-expires`}>
          {t('reservation.bookingQrBlockExpires', { date: dateStr })}
        </Text>
      ) : null}
    </View>
  );
}
