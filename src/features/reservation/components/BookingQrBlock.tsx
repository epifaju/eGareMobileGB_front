import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export type BookingQrBlockProps = {
  value: string;
  expiresAt: string | null;
  testID?: string;
};

function formatExpires(iso: string | null): string {
  if (!iso) {
    return '';
  }
  try {
    return new Date(iso).toLocaleString('fr-FR', {
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
  return (
    <View className="mt-md items-center rounded-default border border-border bg-surface px-md py-md">
      <Text className="mb-sm text-center text-xs text-textSecondary" testID={`${testID}-hint`}>
        Billet QR — conservé localement avec le cache (24 h). Présentez ce code à l’embarquement.
      </Text>
      <View className="rounded-default bg-white p-sm">
        <QRCode value={value} size={176} />
      </View>
      {expiresAt ? (
        <Text className="mt-sm text-xs text-textSecondary" testID={`${testID}-expires`}>
          Fin de validité affichée : {formatExpires(expiresAt)}
        </Text>
      ) : null}
    </View>
  );
}
