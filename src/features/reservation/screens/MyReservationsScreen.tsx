import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useTranslation } from 'react-i18next';
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

import type { Booking, BookingStatus, PaymentStatus } from '@/features/reservation/types';
import type { VehicleStatus } from '@/features/vehicle/types';
import { intlLocaleFromLanguage } from '@/shared/lib/intlLocale';
import { parseApiError } from '@/shared/utils/apiError';
import { isOfflineQueuedError } from '@/shared/utils/offlineError';

function formatWhen(iso: string, locale: string): string {
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
  const { t, i18n } = useTranslation();
  const dateLocale = intlLocaleFromLanguage(i18n.language);

  const [includeCancelled, setIncludeCancelled] = useState(true);
  const bookingsQueryArg = { includeCancelled, page: 0, size: 50 };

  const { data, isLoading, isError, error, refetch, isFetching } = useGetMyBookingsQuery(bookingsQueryArg);
  const cacheMeta = data?.cache;

  const cacheHint = useMemo(() => {
    if (cacheMeta?.source !== 'sqlite') {
      return '';
    }
    if (cacheMeta.fallback) {
      return t('reservation.cacheOfflineQr');
    }
    if (cacheMeta.stale) {
      return t('reservation.cacheStale');
    }
    return t('reservation.cacheOffline');
  }, [cacheMeta, t, i18n.language]);

  const [cancelBooking, { isLoading: isCancelling }] = useCancelBookingMutation();
  const [sendReceiptSms, { isLoading: isSendingReceiptSms }] = useSendBookingReceiptSmsMutation();
  const [receiptDownloadId, setReceiptDownloadId] = useState<number | null>(null);

  const list = data?.page.content ?? [];
  const showInitialLoading = isLoading && !data;
  const empty = !showInitialLoading && !isError && list.length === 0;

  const title = includeCancelled ? t('reservation.titleAll') : t('reservation.titleActive');

  const vehicleLabel = (st: VehicleStatus) => t(`vehicleStatus.${st}` as const);
  const bookingLabel = (st: BookingStatus) => t(`bookingStatus.${st}` as const);
  const payLabel = (st: PaymentStatus) => t(`paymentStatus.${st}` as const);

  if (showInitialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">{t('reservation.loading')}</Text>
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
          <Text className="text-center text-sm text-textSecondary">{t('reservation.roleHint')}</Text>
        ) : (
          <Text className="text-center text-sm text-textSecondary">{t('reservation.serverErrorHint')}</Text>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <View className="flex-row items-center justify-between border-b border-border px-md py-sm">
        <View className="flex-1 pr-sm">
          <Text className="text-sm font-medium text-textPrimary">{title}</Text>
          <Text className="mt-xs text-xs text-textSecondary">{t('reservation.includeCancelled')}</Text>
        </View>
        <Switch
          accessibilityLabel={t('reservation.includeCancelledA11y')}
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
              {t('reservation.empty')}
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
            <View className="mb-sm rounded-default border border-border bg-surface p-md" testID={`${testID}-item-${item.id}`}>
              <Text className="text-base font-semibold text-textPrimary">{item.registrationCode}</Text>
              <Text className="text-sm text-textSecondary">{item.routeLabel}</Text>
              <Text className="mt-xs text-sm text-textPrimary">{item.stationName}</Text>
              <Text className="mt-xs text-xs text-textSecondary">
                {t('reservation.lineVehicle')} : {vehicleLabel(item.vehicleStatus)} · {t('reservation.bookedOn')}{' '}
                {formatWhen(item.createdAt, dateLocale)}
              </Text>
              <Text
                className={`mt-xs text-xs font-medium ${
                  tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-textSecondary'
                }`}
              >
                {bookingLabel(item.bookingStatus)} · {t('reservation.payment')} : {payLabel(item.paymentStatus)}
              </Text>
              {item.qrToken && item.bookingStatus !== 'CANCELLED' && item.bookingStatus !== 'EXPIRED' ? (
                <BookingQrBlock expiresAt={item.expiresAt} testID={`${testID}-qr-${item.id}`} value={item.qrToken} />
              ) : null}
              {item.bookingStatus === 'CONFIRMED' && item.boardingValidatedAt ? (
                <Text className="mt-xs text-xs text-success">
                  {t('reservation.boardingDone')} : {formatWhen(item.boardingValidatedAt, dateLocale)}
                </Text>
              ) : null}
              {canCancelBooking(item) ? (
                <Pressable
                  accessibilityRole="button"
                  className="mt-md self-start rounded-default border border-error px-md py-sm active:opacity-80 disabled:opacity-50"
                  disabled={isCancelling}
                  onPress={() => {
                    Alert.alert(t('reservation.cancelTitle'), t('reservation.cancelMessage'), [
                      { text: t('common.back'), style: 'cancel' },
                      {
                        text: t('reservation.cancelCta'),
                        style: 'destructive',
                        onPress: () => {
                          void (async () => {
                            try {
                              await cancelBooking(item.id).unwrap();
                            } catch (e) {
                              if (isOfflineQueuedError(e)) {
                                Alert.alert(t('reservation.offlineTitle'), t('reservation.offlineCancelQueued'));
                                return;
                              }
                              Alert.alert(t('common.error'), parseApiError(e));
                            }
                          })();
                        },
                      },
                    ]);
                  }}
                  testID={`${testID}-cancel-${item.id}`}
                >
                  <Text className="text-sm font-semibold text-error">{t('reservation.cancelCta')}</Text>
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
                          Alert.alert(t('reservation.receiptPdfTitle'), msg);
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
                      <Text className="text-sm font-semibold text-textPrimary">{t('reservation.receiptPdf')}</Text>
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
                          Alert.alert(t('reservation.smsTitle'), t('reservation.smsSent'));
                        } catch (e) {
                          Alert.alert(t('reservation.smsTitle'), parseApiError(e));
                        }
                      })();
                    }}
                    testID={`${testID}-receipt-sms-${item.id}`}
                  >
                    <Text className="text-sm font-semibold text-textPrimary">{t('reservation.smsReminder')}</Text>
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
