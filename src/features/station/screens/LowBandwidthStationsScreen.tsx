import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import type { MainStackParamList } from '@/app/navigation/navigationTypes';
import { useGetStationsLowBandwidthQuery } from '@/features/station/api/stationApi';
import type { LowBandwidthStation } from '@/features/station/types';
import { parseApiError } from '@/shared/utils/apiError';

function formatDeparture(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

export type LowBandwidthStationsScreenProps = NativeStackScreenProps<
  MainStackParamList,
  'LowBandwidthStations'
>;

export default function LowBandwidthStationsScreen({
  navigation,
  testID = 'screen-low-bandwidth-stations',
}: LowBandwidthStationsScreenProps & { testID?: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useGetStationsLowBandwidthQuery({
    page: 0,
    size: 20,
  });

  const list = data?.content ?? [];
  const showInitialLoading = isLoading && !data;
  const empty = !showInitialLoading && !isError && list.length === 0;

  const approxPayloadKb = useMemo(() => {
    if (!data) {
      return null;
    }
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(data)).length;
      return bytes / 1024;
    } catch {
      return null;
    }
  }, [data]);

  if (showInitialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">Chargement léger…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-error`}>
        <Text className="mb-md text-center text-error">{parseApiError(error)}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-md pt-sm" testID={testID}>
      <Text className="text-sm text-textSecondary">
        Mode réseau faible : données compactes (objectif &lt; 50 KB).
      </Text>
      {approxPayloadKb != null ? (
        <Text className="mt-xs text-xs text-textSecondary">
          Payload actuel : ~{approxPayloadKb.toFixed(1)} KB
        </Text>
      ) : null}
      <FlatList
        className="mt-sm flex-1"
        data={list}
        keyExtractor={(item: LowBandwidthStation) => String(item.id)}
        ListEmptyComponent={
          empty ? (
            <Text className="mt-lg text-center text-textSecondary" testID={`${testID}-empty`}>
              Aucune gare disponible.
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
        renderItem={({ item }) => (
          <Pressable
            className="mb-sm rounded-default border border-border bg-surface p-md active:opacity-80"
            onPress={() =>
              navigation.navigate('StationVehicles', {
                stationId: item.id,
                stationName: item.name,
              })
            }
            testID={`${testID}-station-${item.id}`}
          >
            <Text className="text-base font-semibold text-textPrimary">{item.name}</Text>
            {item.city ? <Text className="text-xs text-textSecondary">{item.city}</Text> : null}
            <Text className="mt-xs text-sm text-textPrimary">Véhicules actifs: {item.activeVehicles}</Text>
            <Text className="mt-xs text-xs text-textSecondary">
              Prochain départ: {formatDeparture(item.nextDepartureAt)}
            </Text>
            {item.minFareXof != null ? (
              <Text className="mt-xs text-xs text-textSecondary">
                Tarif min: {item.minFareXof.toLocaleString('fr-FR')} F CFA
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}
