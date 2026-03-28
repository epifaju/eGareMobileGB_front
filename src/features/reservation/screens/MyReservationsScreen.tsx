import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import { useMemo, useState } from 'react';

import {

  ActivityIndicator,

  Alert,

  FlatList,

  Pressable,

  RefreshControl,

  Switch,

  Text,

  View,

} from 'react-native';



import type { PassengerStackParamList } from '@/app/navigation/navigationTypes';

import {
  useCancelBookingMutation,

  useGetMyBookingsQuery,

  useSendBookingReceiptSmsMutation,

} from '@/features/reservation/api/bookingApi';
import { downloadAndShareBookingReceipt } from '@/features/reservation/lib/downloadAndShareBookingReceipt';
import BookingQrBlock from '@/features/reservation/components/BookingQrBlock';

import type { Booking, BookingStatus } from '@/features/reservation/types';

import type { VehicleStatus } from '@/features/vehicle/types';

import { parseApiError } from '@/shared/utils/apiError';
import { isOfflineQueuedError } from '@/shared/utils/offlineError';



const VEHICLE_STATUS_LABEL: Record<VehicleStatus, string> = {

  EN_FILE: 'En file',

  REMPLISSAGE: 'Remplissage',

  COMPLET: 'Complet',

  PARTI: 'Parti',

};



function formatWhen(iso: string): string {

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



function bookingStatusLabel(status: BookingStatus): string {

  switch (status) {

    case 'CONFIRMED':

      return 'Confirmée';

    case 'PENDING_PAYMENT':

      return 'En attente de paiement';

    case 'CANCELLED':

      return 'Annulée';

    case 'EXPIRED':

      return 'Expirée';

    default:

      return status;

  }

}



function bookingStatusTone(status: BookingStatus): 'success' | 'muted' | 'warning' {

  if (status === 'CONFIRMED') {

    return 'success';

  }

  if (status === 'PENDING_PAYMENT') {

    return 'warning';

  }

  return 'muted';

}



function canCancelBooking(item: Booking): boolean {

  if (item.vehicleStatus === 'PARTI') {

    return false;

  }

  return item.bookingStatus === 'CONFIRMED' || item.bookingStatus === 'PENDING_PAYMENT';

}

function canDownloadReceipt(item: Booking): boolean {

  const s = item.paymentStatus;

  return s === 'PAID' || s === 'REFUNDED' || s === 'REFUND_PENDING';

}

function extractHttpStatus(error: unknown): number | null {

  if (!error || typeof error !== 'object') {

    return null;

  }

  const maybe = error as FetchBaseQueryError;

  return typeof maybe.status === 'number' ? maybe.status : null;

}



export type MyReservationsScreenProps = NativeStackScreenProps<PassengerStackParamList, 'MyReservations'>;



export default function MyReservationsScreen({

  testID = 'screen-my-reservations',

}: MyReservationsScreenProps & { testID?: string }) {

  const [includeCancelled, setIncludeCancelled] = useState(true);

  const bookingsQueryArg = { includeCancelled, page: 0, size: 50 };

  const { data, isLoading, isError, error, refetch, isFetching } = useGetMyBookingsQuery(bookingsQueryArg);
  const cacheMeta = data?.cache;

  const cacheHint = useMemo(() => {
    if (cacheMeta?.source !== 'sqlite') {
      return '';
    }
    if (cacheMeta.fallback) {
      return 'Données cache SQLite (réseau indisponible) — QR billet si déjà synchronisé.';
    }
    if (cacheMeta.stale) {
      return 'Cache SQLite (>24 h) — reconnectez-vous pour rafraîchir les billets.';
    }
    return 'Hors ligne — billets et QR issus du cache local.';
  }, [cacheMeta]);

  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();

  const [sendReceiptSms, { isLoading: isSendingReceiptSms }] = useSendBookingReceiptSmsMutation();

  const [receiptDownloadId, setReceiptDownloadId] = useState<number | null>(null);



  const list = data?.page.content ?? [];

  const showInitialLoading = isLoading && !data;

  const empty = !showInitialLoading && !isError && list.length === 0;



  const title = useMemo(

    () => (includeCancelled ? 'Toutes les réservations' : 'Réservations actives'),

    [includeCancelled],

  );



  if (showInitialLoading) {

    return (

      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>

        <ActivityIndicator size="large" />

        <Text className="mt-md text-textSecondary">Chargement…</Text>

      </View>

    );

  }



  if (isError) {
    const status = extractHttpStatus(error);
    const showRoleHint = status === 401 || status === 403;

    return (

      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-error`}>

        <Text className="mb-md text-center text-error">{parseApiError(error)}</Text>

        {showRoleHint ? (
          <Text className="text-center text-sm text-textSecondary">

            Réservé aux comptes voyageur (rôle USER).

          </Text>
        ) : (
          <Text className="text-center text-sm text-textSecondary">

            Erreur technique côté serveur. Vérifiez la migration SQL locale puis relancez le backend.

          </Text>
        )}

      </View>

    );

  }



  return (

    <View className="flex-1 bg-background" testID={testID}>

      <View className="flex-row items-center justify-between border-b border-border px-md py-sm">

        <View className="flex-1 pr-sm">

          <Text className="text-sm font-medium text-textPrimary">{title}</Text>

          <Text className="mt-xs text-xs text-textSecondary">Afficher aussi les annulations</Text>

        </View>

        <Switch

          accessibilityLabel="Inclure les réservations annulées"

          onValueChange={setIncludeCancelled}

          testID={`${testID}-switch-cancelled`}

          value={includeCancelled}

        />

      </View>

      {cacheHint ? (
        <Text className="border-b border-border px-md py-xs text-xs text-textSecondary" testID={`${testID}-cache-hint`}>
          {cacheHint}
        </Text>
      ) : null}



      <FlatList

        className="flex-1 px-md"

        contentContainerStyle={{ paddingBottom: 24 }}

        data={list}

        keyExtractor={(item: Booking) => String(item.id)}

        ListEmptyComponent={

          empty ? (

            <Text className="mt-lg text-center text-textSecondary" testID={`${testID}-empty`}>

              Aucune réservation pour le moment.

            </Text>

          ) : null

        }

        refreshControl={

          <RefreshControl

            onRefresh={() => {

              void refetch();

            }}

            refreshing={isFetching && !isLoading}

          />

        }

        renderItem={({ item }) => {

          const tone = bookingStatusTone(item.bookingStatus);

          return (

            <View

              className="mb-sm rounded-default border border-border bg-surface p-md"

              testID={`${testID}-item-${item.id}`}

            >

              <Text className="text-base font-semibold text-textPrimary">{item.registrationCode}</Text>

              <Text className="text-sm text-textSecondary">{item.routeLabel}</Text>

              <Text className="mt-xs text-sm text-textPrimary">{item.stationName}</Text>

              <Text className="mt-xs text-xs text-textSecondary">

                Véhicule : {VEHICLE_STATUS_LABEL[item.vehicleStatus]} · Réservée le {formatWhen(item.createdAt)}

              </Text>

              <Text

                className={`mt-xs text-xs font-medium ${

                  tone === 'success'

                    ? 'text-success'

                    : tone === 'warning'

                      ? 'text-warning'

                      : 'text-textSecondary'

                }`}

              >

                {bookingStatusLabel(item.bookingStatus)} · Paiement : {item.paymentStatus}

              </Text>

              {item.qrToken &&
              item.bookingStatus !== 'CANCELLED' &&
              item.bookingStatus !== 'EXPIRED' ? (
                <BookingQrBlock
                  expiresAt={item.expiresAt}
                  testID={`${testID}-qr-${item.id}`}
                  value={item.qrToken}
                />
              ) : null}

              {item.bookingStatus === 'CONFIRMED' && item.boardingValidatedAt ? (
                <Text className="mt-xs text-xs text-success">
                  Embarquement constaté : {formatWhen(item.boardingValidatedAt)}
                </Text>
              ) : null}

              {canCancelBooking(item) ? (

                <Pressable

                  accessibilityRole="button"

                  className="mt-md self-start rounded-default border border-error px-md py-sm active:opacity-80 disabled:opacity-50"

                  disabled={isCancelling}

                  onPress={() => {

                    Alert.alert(

                      'Annuler la réservation',

                      'Une place sera libérée sur ce véhicule si la réservation était confirmée.',

                      [

                        { text: 'Retour', style: 'cancel' },

                        {

                          text: 'Annuler',

                          style: 'destructive',

                          onPress: () => {

                            void (async () => {

                              try {

                                await cancelBooking(item.id).unwrap();

                              } catch (e) {

                                if (isOfflineQueuedError(e)) {

                                  Alert.alert(

                                    'Hors ligne',

                                    'L’annulation sera synchronisée à la reconnexion (file FIFO).',

                                  );

                                  return;

                                }

                                Alert.alert('Erreur', parseApiError(e));

                              }

                            })();

                          },

                        },

                      ],

                    );

                  }}

                  testID={`${testID}-cancel-${item.id}`}

                >

                  <Text className="text-sm font-semibold text-error">Annuler la réservation</Text>

                </Pressable>

              ) : null}

              {canDownloadReceipt(item) ? (

                <View className="mt-md flex-row flex-wrap gap-xs">

                  <Pressable

                    accessibilityRole="button"

                    className="mr-sm mb-xs rounded-default border border-border bg-surface px-md py-sm active:opacity-80 disabled:opacity-50"

                    disabled={receiptDownloadId === item.id}

                    onPress={() => {

                      void (async () => {

                        setReceiptDownloadId(item.id);

                        try {

                          await downloadAndShareBookingReceipt(item.id);

                        } catch (e) {

                          const msg = e instanceof Error ? e.message : parseApiError(e);

                          Alert.alert('Reçu PDF', msg);

                        } finally {

                          setReceiptDownloadId(null);

                        }

                      })();

                    }}

                    testID={`${testID}-receipt-pdf-${item.id}`}

                  >

                    {receiptDownloadId === item.id ? (

                      <ActivityIndicator color="#444" size="small" />

                    ) : (

                      <Text className="text-sm font-semibold text-textPrimary">Reçu PDF</Text>

                    )}

                  </Pressable>

                  <Pressable

                    accessibilityRole="button"

                    className="mb-xs rounded-default border border-border bg-surface px-md py-sm active:opacity-80 disabled:opacity-50"

                    disabled={isSendingReceiptSms}

                    onPress={() => {

                      void (async () => {

                        try {

                          await sendReceiptSms(item.id).unwrap();

                          Alert.alert(

                            'SMS',

                            'Un SMS de rappel a été envoyé (ou journalisé en mode développement).',

                          );

                        } catch (e) {

                          Alert.alert('SMS', parseApiError(e));

                        }

                      })();

                    }}

                    testID={`${testID}-receipt-sms-${item.id}`}

                  >

                    <Text className="text-sm font-semibold text-textPrimary">Rappel SMS</Text>

                  </Pressable>

                </View>

              ) : null}

            </View>

          );

        }}

        testID={`${testID}-list`}

      />

    </View>

  );

}

