import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, RefreshControl, Text, View } from 'react-native';

import type { MainStackParamList } from '@/app/navigation/navigationTypes';
import { useInitiatePaymentMutation } from '@/features/reservation/api/bookingApi';
import { useGetVehicleSeatMapQuery, useReserveSeatMutation } from '@/features/vehicle/api/vehicleApi';
import type { SeatCell } from '@/features/vehicle/types';
import { parseApiError } from '@/shared/utils/apiError';
import { isOfflineQueuedError } from '@/shared/utils/offlineError';

export type SeatMapScreenProps = NativeStackScreenProps<MainStackParamList, 'SeatMap'>;

export default function SeatMapScreen({
  route,
  navigation,
  testID = 'screen-seat-map',
}: SeatMapScreenProps & { testID?: string }) {
  const { vehicleId, stationId, stationName, registrationCode, routeLabel } = route.params;
  const { data, isLoading, isError, error, refetch, isFetching } = useGetVehicleSeatMapQuery(vehicleId, {
    pollingInterval: 3000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [reserveSeat, { isLoading: isReserving }] = useReserveSeatMutation();
  const [initiatePayment, { isLoading: isInitiatingPay }] = useInitiatePaymentMutation();

  const seatsByRow = useMemo(() => {
    if (!data) {
      return [];
    }
    const rows: SeatCell[][] = [];
    for (let r = 0; r < data.rows; r++) {
      rows.push(
        data.cells
          .filter((c) => c.rowIndex === r)
          .sort((a, b) => a.colIndex - b.colIndex),
      );
    }
    return rows;
  }, [data]);

  const layoutLabel = useMemo(() => {
    switch (data?.layout) {
      case 'L8':
        return 'Format 8 places (2+2)';
      case 'L15':
        return 'Format 15 places (2+1)';
      case 'L20':
        return 'Format 20 places (2+2)';
      case 'L45':
        return 'Format 45 places (2+3)';
      default:
        return '';
    }
  }, [data?.layout]);

  if (isLoading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">Chargement du plan de sièges…</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-error`}>
        <Text className="mb-md text-center text-error">{parseApiError(error)}</Text>
        <Pressable
          className="rounded-default border border-primary px-md py-sm"
          onPress={() => {
            void refetch();
          }}
        >
          <Text className="text-primary">Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-md pt-sm" testID={testID}>
      <Text className="text-base font-semibold text-textPrimary">{registrationCode}</Text>
      <Text className="text-sm text-textSecondary">{routeLabel}</Text>
      <Text className="mt-xs text-xs text-textSecondary">
        {stationName} · {layoutLabel} · Occupés: {data.occupiedSeats} / {data.capacity}
      </Text>
      <Text className="mt-xs text-xs text-textSecondary">
        Indisponibles (inclut attente): {data.unavailableSeats.length}
      </Text>
      <View className="mt-sm flex-row items-center gap-sm">
        <View className="h-3 w-3 rounded bg-surface border border-border" />
        <Text className="text-xs text-textSecondary">Disponible</Text>
        <View className="h-3 w-3 rounded bg-background border border-border opacity-50" />
        <Text className="text-xs text-textSecondary">Occupé</Text>
        <View className="h-3 w-3 rounded bg-primary" />
        <Text className="text-xs text-textSecondary">Sélectionné</Text>
      </View>

      <FlatList
        className="mt-md flex-1"
        data={seatsByRow}
        keyExtractor={(_row, idx) => `row-${idx}`}
        contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => {
              void refetch();
            }}
          />
        }
        renderItem={({ item: row, index }) => {
          return (
            <View className="flex-row items-center gap-xs" testID={`${testID}-row-${index}`}>
              {row.map((cell) => {
                if (cell.type === 'AISLE') {
                  return <View key={`aisle-${cell.rowIndex}-${cell.colIndex}`} className="w-4" />;
                }
                const seat = cell.seatNumber;
                const unavailable = cell.type === 'SEAT_UNAVAILABLE';
                const selected = seat != null && selectedSeat === seat;
                return (
                  <Pressable
                    key={`seat-${seat}`}
                    disabled={unavailable || seat == null}
                    className={`flex-1 rounded-default border px-sm py-md ${
                      unavailable
                        ? 'border-border bg-background opacity-50'
                        : selected
                          ? 'border-primary bg-primary'
                          : 'border-border bg-surface'
                    }`}
                    onPress={() => {
                      if (seat != null) {
                        setSelectedSeat(seat);
                      }
                    }}
                    testID={`${testID}-seat-${seat}`}
                  >
                    <Text
                      className={`text-center text-sm ${
                        selected ? 'font-semibold text-white' : 'text-textPrimary'
                      }`}
                    >
                      {seat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        }}
      />

      <Pressable
        accessibilityRole="button"
        className="mb-md rounded-default bg-primary px-md py-sm active:opacity-80 disabled:opacity-50"
        disabled={selectedSeat == null || isReserving || isInitiatingPay}
        onPress={async () => {
          if (selectedSeat == null) {
            return;
          }
          try {
            const result = await reserveSeat({ vehicleId, stationId, seatNumber: selectedSeat }).unwrap();
            if (result.bookingStatus === 'PENDING_PAYMENT') {
              Alert.alert(
                'Paiement requis',
                `Réservation #${result.bookingId} — place bloquée jusqu’au paiement. Ouvrir la page sandbox (Orange Money) ?`,
                [
                  { text: 'Plus tard', style: 'cancel', onPress: () => navigation.goBack() },
                  {
                    text: 'Payer',
                    onPress: () => {
                      void (async () => {
                        try {
                          const pay = await initiatePayment({
                            bookingId: result.bookingId,
                            body: { provider: 'ORANGE_MONEY' },
                          }).unwrap();
                          const canOpen = await Linking.canOpenURL(pay.checkoutUrl);
                          if (canOpen) {
                            await Linking.openURL(pay.checkoutUrl);
                          } else {
                            Alert.alert('Ouvrir le lien', pay.checkoutUrl);
                          }
                          Alert.alert(
                            'Paiement',
                            'Validez sur la page web (webhook sandbox → PAID), puis vérifiez Mes réservations.',
                            [{ text: 'OK', onPress: () => navigation.goBack() }],
                          );
                        } catch (err) {
                          Alert.alert('Paiement', parseApiError(err));
                        }
                      })();
                    },
                  },
                ],
              );
              return;
            }
            Alert.alert('Réservation', `Siège ${selectedSeat} réservé.`, [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]);
          } catch (e) {
            if (isOfflineQueuedError(e)) {
              Alert.alert(
                'Hors ligne',
                'La réservation sera envoyée à la reconnexion (file FIFO).',
                [{ text: 'OK', onPress: () => navigation.goBack() }],
              );
              return;
            }
            Alert.alert('Impossible de réserver', parseApiError(e));
            void refetch();
          }
        }}
        testID={`${testID}-confirm`}
      >
        <Text className="text-center text-sm font-semibold text-white">
          {selectedSeat == null ? 'Choisir un siège' : `Réserver le siège ${selectedSeat}`}
        </Text>
      </Pressable>
    </View>
  );
}
