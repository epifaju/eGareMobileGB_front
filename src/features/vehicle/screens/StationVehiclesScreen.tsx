import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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

import type { MainStackParamList } from '@/app/navigation/navigationTypes';
import {
  STATION_VEHICLES_QUERY_DEFAULTS,
  useGetStationVehiclesQuery,
  useUpdateVehicleLocationMutation,
  useUpdateVehicleStatusMutation,
} from '@/features/vehicle/api/vehicleApi';
import * as Location from 'expo-location';
import { useStationVehiclesRealtime } from '@/features/vehicle/hooks/useStationVehiclesRealtime';
import type { Vehicle, VehicleStatus } from '@/features/vehicle/types';
import { getAppRoleFromToken, isDriverOrAdminRole } from '@/shared/lib/jwtRole';
import { parseApiError } from '@/shared/utils/apiError';

const STATUS_LABEL: Record<VehicleStatus, string> = {
  EN_FILE: 'En file',
  REMPLISSAGE: 'Remplissage',
  COMPLET: 'Complet',
  PARTI: 'Parti',
};

const DRIVER_STATUS_OPTIONS: VehicleStatus[] = ['EN_FILE', 'REMPLISSAGE', 'COMPLET', 'PARTI'];

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

export type StationVehiclesScreenProps = NativeStackScreenProps<
  MainStackParamList,
  'StationVehicles'
>;

export default function StationVehiclesScreen({
  route,
  navigation,
  testID = 'screen-station-vehicles',
}: StationVehiclesScreenProps & { testID?: string }) {
  const { stationId, stationName } = route.params;

  const appRole = getAppRoleFromToken();
  const showDriverControls = isDriverOrAdminRole(appRole);
  const [includeDeparted, setIncludeDeparted] = useState(false);

  const activeOnly = !includeDeparted;

  const queryArgs = useMemo(
    () => ({
      stationId,
      ...STATION_VEHICLES_QUERY_DEFAULTS,
      activeOnly,
    }),
    [stationId, activeOnly],
  );

  const { data, isLoading, isError, error, refetch, isFetching, fulfilledTimeStamp } =
    useGetStationVehiclesQuery(queryArgs);

  const [updateVehicleStatus, { isLoading: isUpdatingStatus }] = useUpdateVehicleStatusMutation();
  const [updateVehicleLocation, { isLoading: isUpdatingLocation }] = useUpdateVehicleLocationMutation();

  useStationVehiclesRealtime(stationId, activeOnly);

  const list = data?.content ?? [];
  const showInitialLoading = isLoading && !data;
  const empty = !showInitialLoading && !isError && list.length === 0;
  const emptyMessage =
    showDriverControls && activeOnly
      ? 'Aucun véhicule actif pour cette gare.'
      : showDriverControls && !activeOnly
        ? 'Aucun véhicule enregistré pour cette gare.'
        : 'Aucun véhicule actif pour cette gare.';

  const cacheAge = useMemo(() => {
    if (!fulfilledTimeStamp) {
      return '';
    }
    const ms = Date.now() - fulfilledTimeStamp;
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) {
      return 'à l’instant';
    }
    if (minutes < 60) {
      return `il y a ${minutes} min`;
    }
    return `il y a ${Math.floor(minutes / 60)} h`;
  }, [fulfilledTimeStamp]);

  if (showInitialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">Chargement des véhicules…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-error`}>
        <Text className="mb-md text-center text-error">{parseApiError(error)}</Text>
        <Text className="text-center text-sm text-textSecondary">
          Vérifiez le réseau, l’API et le WebSocket (même hôte que l’API, chemin /ws-app).
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <Text className="px-md pt-sm text-lg font-semibold text-textPrimary" numberOfLines={2}>
        {stationName}
      </Text>
      <Text className="px-md pb-sm text-xs text-textSecondary">
        Mises à jour temps réel · {cacheAge ? `données ${cacheAge}` : ''}
        {showDriverControls ? ' · Liste des véhicules' : ''}
      </Text>

      {showDriverControls ? (
        <View className="flex-row items-center justify-between border-b border-border px-md py-sm">
          <View className="flex-1 pr-sm">
            <Text className="text-sm font-medium text-textPrimary">Inclure les départs (Parti)</Text>
            <Text className="mt-xs text-xs text-textSecondary">
              Affiche aussi les véhicules marqués comme partis.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Inclure les véhicules partis"
            onValueChange={setIncludeDeparted}
            testID={`${testID}-switch-include-departed`}
            value={includeDeparted}
          />
        </View>
      ) : null}

      <FlatList
        className="flex-1 px-md"
        contentContainerStyle={{ paddingBottom: 24 }}
        data={list}
        keyExtractor={(item: Vehicle) => String(item.id)}
        ListEmptyComponent={
          empty ? (
            <Text className="mt-lg text-center text-textSecondary" testID={`${testID}-empty`}>
              {emptyMessage}
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
          const canReserve = item.availableSeats > 0 && item.status !== 'PARTI';
          return (
            <View
              className="mb-sm rounded-default border border-border bg-surface p-md"
              testID={`${testID}-vehicle-${item.id}`}
            >
              <Text className="text-base font-semibold text-textPrimary">{item.registrationCode}</Text>
              <Text className="text-sm text-textSecondary">{item.routeLabel}</Text>
              <Text className="mt-xs text-sm text-textPrimary">
                Places disponibles : {item.availableSeats} / {item.capacity}
              </Text>
              <Text className="mt-xs text-xs text-textSecondary">
                Occupés confirmés : {item.occupiedSeats} · Indisponibles : {item.unavailableSeats}
              </Text>
              <Text className="mt-xs text-sm text-textSecondary">
                Statut : {STATUS_LABEL[item.status]} · Départ : {formatDeparture(item.departureScheduledAt)}
              </Text>
              {item.estimatedWaitMinutes != null ? (
                <Text className="mt-xs text-sm text-textPrimary">
                  Attente estimée : ~{item.estimatedWaitMinutes} min
                </Text>
              ) : null}
              {item.fareAmountXof != null ? (
                <Text className="mt-xs text-sm text-textPrimary">
                  Tarif indicatif : {item.fareAmountXof.toLocaleString('fr-FR')} F CFA
                </Text>
              ) : null}

              {showDriverControls ? (
                <View className="mt-md">
                  <Text className="mb-xs text-xs font-medium text-textSecondary">Changer le statut</Text>
                  <View className="flex-row flex-wrap gap-xs">
                    {DRIVER_STATUS_OPTIONS.map((st) => {
                      const selected = item.status === st;
                      return (
                        <Pressable
                          key={st}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          className={`rounded-default border px-sm py-xs ${
                            selected ? 'border-primary bg-surface' : 'border-border bg-background'
                          }`}
                          disabled={isUpdatingStatus}
                          onPress={async () => {
                            if (st === item.status) {
                              return;
                            }
                            try {
                              await updateVehicleStatus({
                                vehicleId: item.id,
                                stationId,
                                status: st,
                              }).unwrap();
                            } catch (e) {
                              Alert.alert('Mise à jour impossible', parseApiError(e));
                            }
                          }}
                          testID={`${testID}-status-${item.id}-${st}`}
                        >
                          <Text
                            className={`text-xs ${selected ? 'font-semibold text-primary' : 'text-textPrimary'}`}
                          >
                            {STATUS_LABEL[st]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    className="mt-sm self-start rounded-default border border-primary px-md py-sm active:opacity-80 disabled:opacity-50"
                    disabled={isUpdatingLocation}
                    onPress={async () => {
                      try {
                        const permission = await Location.requestForegroundPermissionsAsync();
                        if (permission.status !== 'granted') {
                          Alert.alert('Localisation', 'Autorisez la localisation pour publier la position.');
                          return;
                        }
                        const pos = await Location.getCurrentPositionAsync({
                          accuracy: Location.Accuracy.Balanced,
                        });
                        await updateVehicleLocation({
                          vehicleId: item.id,
                          stationId,
                          latitude: pos.coords.latitude,
                          longitude: pos.coords.longitude,
                        }).unwrap();
                        Alert.alert('Position publiée', 'Position véhicule mise à jour.');
                      } catch (e) {
                        Alert.alert('Position non publiée', parseApiError(e));
                      }
                    }}
                  >
                    <Text className="text-xs font-semibold text-primary">Publier ma position GPS</Text>
                  </Pressable>
                </View>
              ) : canReserve ? (
                <Pressable
                  accessibilityRole="button"
                  className="mt-md self-start rounded-default bg-primary px-md py-sm active:opacity-80"
                  onPress={() => {
                    navigation.navigate('SeatMap', {
                      vehicleId: item.id,
                      stationId,
                      stationName,
                      registrationCode: item.registrationCode,
                      routeLabel: item.routeLabel,
                      capacity: item.capacity,
                    });
                  }}
                  testID={`${testID}-reserve-${item.id}`}
                >
                  <Text className="text-sm font-semibold text-white">Choisir un siège</Text>
                </Pressable>
              ) : (
                <Text className="mt-md text-sm text-textSecondary">Aucune place disponible</Text>
              )}
            </View>
          );
        }}
        testID={`${testID}-list`}
      />
    </View>
  );
}
