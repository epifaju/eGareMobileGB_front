import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useStationVehiclesRealtime } from '@/features/vehicle/hooks/useStationVehiclesRealtime';
import type { Vehicle, VehicleStatus } from '@/features/vehicle/types';
import { intlLocaleFromLanguage } from '@/shared/lib/intlLocale';
import { getAppRoleFromToken, isStationOperationsRole } from '@/shared/lib/jwtRole';
import { parseApiError } from '@/shared/utils/apiError';
import { isOfflineQueuedError } from '@/shared/utils/offlineError';

const DRIVER_STATUS_OPTIONS: VehicleStatus[] = ['EN_FILE', 'REMPLISSAGE', 'COMPLET', 'PARTI'];

function formatDeparture(iso: string | null, locale: string): string {
  if (!iso) {
    return '—';
  }
  try {
    return new Date(iso).toLocaleString(intlLocaleFromLanguage(locale), {
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
  const { t, i18n } = useTranslation();
  const { stationId, stationName } = route.params;

  const appRole = getAppRoleFromToken();
  const showDriverControls = isStationOperationsRole(appRole);
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
  const cacheMeta = data?.cache;

  const sqliteHint = useMemo(() => {
    if (cacheMeta?.source !== 'sqlite') {
      return '';
    }
    if (cacheMeta.fallback) {
      return t('stationVehicles.sqliteNetwork');
    }
    if (cacheMeta.stale) {
      return t('stationVehicles.sqliteStale');
    }
    return t('stationVehicles.sqliteOffline');
  }, [cacheMeta, t]);

  const [updateVehicleStatus, { isLoading: isUpdatingStatus }] = useUpdateVehicleStatusMutation();
  const [updateVehicleLocation, { isLoading: isUpdatingLocation }] = useUpdateVehicleLocationMutation();

  useStationVehiclesRealtime(stationId, activeOnly);

  const list = data?.page.content ?? [];
  const showInitialLoading = isLoading && !data;
  const empty = !showInitialLoading && !isError && list.length === 0;
  const emptyMessage =
    showDriverControls && activeOnly
      ? t('stationVehicles.emptyActive')
      : showDriverControls && !activeOnly
        ? t('stationVehicles.emptyAll')
        : t('stationVehicles.emptyActive');

  const cacheAge = useMemo(() => {
    if (!fulfilledTimeStamp) {
      return '';
    }
    const ms = Date.now() - fulfilledTimeStamp;
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) {
      return t('home.cacheJustNow');
    }
    if (minutes < 60) {
      return t('home.cacheMinutesAgo', { count: minutes });
    }
    const hours = Math.floor(minutes / 60);
    return t('home.cacheHoursAgo', { count: hours });
  }, [fulfilledTimeStamp, t]);

  if (showInitialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">{t('stationVehicles.loadingVehicles')}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-error`}>
        <Text className="mb-md text-center text-error">{parseApiError(error)}</Text>
        <Text className="text-center text-sm text-textSecondary">{t('stationVehicles.networkHint')}</Text>
      </View>
    );
  }

  const locale = intlLocaleFromLanguage(i18n.language);

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <Text className="px-md pt-sm text-lg font-semibold text-textPrimary" numberOfLines={2}>
        {stationName}
      </Text>
      <Text className="px-md pb-sm text-xs text-textSecondary">
        {t('stationVehicles.realtimePrefix')}
        {cacheAge ? t('stationVehicles.dataAgePrefix', { age: cacheAge }) : ''}
        {sqliteHint}
        {showDriverControls ? t('stationVehicles.driverListSuffix') : ''}
      </Text>

      {showDriverControls ? (
        <View className="flex-row items-center justify-between border-b border-border px-md py-sm">
          <View className="flex-1 pr-sm">
            <Text className="text-sm font-medium text-textPrimary">
              {t('stationVehicles.includeDepartedTitle')}
            </Text>
            <Text className="mt-xs text-xs text-textSecondary">
              {t('stationVehicles.includeDepartedSubtitle')}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t('stationVehicles.includeDepartedA11y')}
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
                {t('stationVehicles.placesAvailable', {
                  available: item.availableSeats,
                  capacity: item.capacity,
                })}
              </Text>
              <Text className="mt-xs text-xs text-textSecondary">
                {t('stationVehicles.occupiedConfirmed', {
                  occupied: item.occupiedSeats,
                  unavailable: item.unavailableSeats,
                })}
              </Text>
              <Text className="mt-xs text-sm text-textSecondary">
                {t('stationVehicles.statusLine', {
                  status: t(`vehicleStatus.${item.status}`),
                  departure: formatDeparture(item.departureScheduledAt, i18n.language),
                })}
              </Text>
              {item.estimatedWaitMinutes != null ? (
                <Text className="mt-xs text-sm text-textPrimary">
                  {t('stationVehicles.waitEstimate', { minutes: item.estimatedWaitMinutes })}
                </Text>
              ) : null}
              {item.fareAmountXof != null ? (
                <Text className="mt-xs text-sm text-textPrimary">
                  {t('stationVehicles.fareIndicative', {
                    amount: item.fareAmountXof.toLocaleString(locale),
                  })}
                </Text>
              ) : null}

              {showDriverControls ? (
                <View className="mt-md">
                  <Text className="mb-xs text-xs font-medium text-textSecondary">
                    {t('stationVehicles.changeStatus')}
                  </Text>
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
                              Alert.alert(t('stationVehicles.updateFailedTitle'), parseApiError(e));
                            }
                          }}
                          testID={`${testID}-status-${item.id}-${st}`}
                        >
                          <Text
                            className={`text-xs ${selected ? 'font-semibold text-primary' : 'text-textPrimary'}`}
                          >
                            {t(`vehicleStatus.${st}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    className="mt-sm self-start rounded-default border border-border bg-surface px-md py-sm active:opacity-80"
                    onPress={() => {
                      navigation.navigate('DriverScanBoarding', {
                        vehicleId: item.id,
                        stationId,
                        stationName,
                        registrationCode: item.registrationCode,
                        routeLabel: item.routeLabel,
                      });
                    }}
                  >
                    <Text className="text-xs font-semibold text-textPrimary">
                      {t('stationVehicles.scanBoardingQr')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    className="mt-sm self-start rounded-default border border-border bg-surface px-md py-sm active:opacity-80"
                    onPress={() => {
                      navigation.navigate('VehicleManifest', {
                        vehicleId: item.id,
                        stationId,
                        stationName,
                        registrationCode: item.registrationCode,
                        routeLabel: item.routeLabel,
                      });
                    }}
                  >
                    <Text className="text-xs font-semibold text-textPrimary">
                      {t('stationVehicles.passengerManifest')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    className="mt-sm self-start rounded-default border border-border bg-surface px-md py-sm active:opacity-80"
                    onPress={() => {
                      navigation.navigate('VehicleRevenue', {
                        vehicleId: item.id,
                        stationId,
                        stationName,
                        registrationCode: item.registrationCode,
                        routeLabel: item.routeLabel,
                      });
                    }}
                  >
                    <Text className="text-xs font-semibold text-textPrimary">
                      {t('stationVehicles.revenue30d')}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    className="mt-sm self-start rounded-default border border-primary px-md py-sm active:opacity-80 disabled:opacity-50"
                    disabled={isUpdatingLocation}
                    onPress={async () => {
                      try {
                        const permission = await Location.requestForegroundPermissionsAsync();
                        if (permission.status !== 'granted') {
                          Alert.alert(
                            t('stationVehicles.locationPermissionTitle'),
                            t('stationVehicles.locationPermissionBody'),
                          );
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
                        Alert.alert(
                          t('stationVehicles.positionPublishedTitle'),
                          t('stationVehicles.positionPublishedBody'),
                        );
                      } catch (e) {
                        if (isOfflineQueuedError(e)) {
                          Alert.alert(t('reservation.offlineTitle'), t('stationVehicles.offlinePositionQueued'));
                          return;
                        }
                        Alert.alert(t('stationVehicles.positionFailedTitle'), parseApiError(e));
                      }
                    }}
                  >
                    <Text className="text-xs font-semibold text-primary">
                      {t('stationVehicles.publishGps')}
                    </Text>
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
                  <Text className="text-sm font-semibold text-white">{t('search.chooseSeat')}</Text>
                </Pressable>
              ) : (
                <Text className="mt-md text-sm text-textSecondary">
                  {t('stationVehicles.noSeatsAvailable')}
                </Text>
              )}
            </View>
          );
        }}
        testID={`${testID}-list`}
      />
    </View>
  );
}
