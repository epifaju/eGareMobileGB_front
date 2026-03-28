import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { maybeRefreshBeforeExpiry, refreshAccessToken } from '@/shared/api/refreshAccessToken';
import { API_BASE_URL } from '@/shared/constants/env';
import { tokenStorage } from '@/shared/lib/tokenStorage';

/**
 * Télécharge le PDF authentifié puis ouvre le partage système (WhatsApp, Drive, fichiers…).
 */
export async function downloadAndShareBookingReceipt(bookingId: number): Promise<void> {
  await maybeRefreshBeforeExpiry();
  let token = tokenStorage.getAccessToken();
  if (!token && tokenStorage.getRefreshToken()) {
    await refreshAccessToken();
    token = tokenStorage.getAccessToken();
  }
  if (!token) {
    throw new Error('Connectez-vous pour télécharger le reçu.');
  }
  const dest = new File(Paths.cache, `recu-reservation-${bookingId}.pdf`);
  const downloaded = await File.downloadFileAsync(
    `${API_BASE_URL}/api/bookings/${bookingId}/receipt`,
    dest,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      idempotent: true,
    },
  );
  if (!downloaded.size || downloaded.size < 4) {
    throw new Error('Réponse vide ou invalide du serveur.');
  }
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Le partage de fichiers n’est pas disponible sur cet appareil.');
  }
  await Sharing.shareAsync(downloaded.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Reçu eGare',
  });
}
