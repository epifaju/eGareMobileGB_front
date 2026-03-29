import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';

import type { MainStackParamList } from '@/app/navigation/navigationTypes';
import { useGetStationsQuery } from '@/features/station/api/stationApi';
import type { Station } from '@/features/station/types';
import { useGetMapVehiclesQuery } from '@/features/vehicle/api/vehicleApi';
import type { VehicleStatus } from '@/features/vehicle/types';
import { useMapVehiclesRealtime } from '@/features/vehicle/hooks/useMapVehiclesRealtime';
import { parseApiError } from '@/shared/utils/apiError';

const INITIAL_REGION: Region = {
  latitude: 11.88,
  longitude: -15.6,
  latitudeDelta: 2.8,
  longitudeDelta: 2.8,
};

function hasGoogleMapsAndroidKey(): boolean {
  const k = Constants.expoConfig?.extra?.googleMapsAndroidApiKey;
  return typeof k === 'string' && k.trim().length > 0;
}

export type StationsMapScreenProps = NativeStackScreenProps<MainStackParamList, 'StationsMap'>;

export default function StationsMapScreen({
  navigation,
  testID = 'screen-stations-map',
}: StationsMapScreenProps & { testID?: string }) {
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const { data, isLoading, isError, error, refetch, isFetching } = useGetStationsQuery({
    page: 0,
    size: 100,
  });
  const { data: mapVehicles } = useGetMapVehiclesQuery();
  const [locationPerm, setLocationPerm] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  useMapVehiclesRealtime();

  const stations = data?.page.content ?? [];
  const liveVehicles = mapVehicles?.vehicles ?? [];

  const stationsCacheBadge = useMemo(() => {
    if (data?.cache?.source !== 'sqlite') {
      return null;
    }
    return data.cache.stale ? t('stationsMap.stationsCacheStale') : t('stationsMap.stationsCacheLocal');
  }, [data?.cache, t]);

  const cacheBadge = useMemo(() => {
    if (mapVehicles?.cache?.source !== 'sqlite') {
      return null;
    }
    return mapVehicles.cache.stale ? t('stationsMap.vehiclesCacheStale') : t('stationsMap.vehiclesCacheLocal');
  }, [mapVehicles?.cache, t]);

  const showMap = useMemo(() => {
    if (Platform.OS === 'web') {
      return false;
    }
    if (Platform.OS === 'android') {
      return hasGoogleMapsAndroidKey();
    }
    return true;
  }, []);

  const centerOnUser = useCallback(async () => {
    if (!showMap) {
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPerm(status === 'granted' ? 'granted' : 'denied');
    if (status !== 'granted') {
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    mapRef.current?.animateToRegion(
      {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        latitudeDelta: 0.45,
        longitudeDelta: 0.45,
      },
      600,
    );
  }, [showMap]);

  useEffect(() => {
    void centerOnUser();
  }, [centerOnUser]);

  const listForWeb = useMemo(() => stations, [stations]);

  const noMapHint = useMemo(() => {
    if (Platform.OS === 'web') {
      return t('stationsMap.webMapUnavailable');
    }
    return t('stationsMap.androidMapsSetup');
  }, [t]);

  if (isLoading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">{t('stationsMap.loadingStations')}</Text>
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

  if (!showMap) {
    return (
      <View className="flex-1 bg-background px-md pt-md" testID={testID}>
        <Text className="mb-sm text-sm text-textSecondary">{noMapHint}</Text>
        <Text className="mb-md text-sm text-textPrimary">{t('stationsMap.stationListHeading')}</Text>
        <FlatList
          data={listForWeb}
          keyExtractor={(item: Station) => String(item.id)}
          refreshing={isFetching}
          onRefresh={() => {
            void refetch();
          }}
          renderItem={({ item }) => (
            <Pressable
              className="mb-sm rounded-default border border-border bg-surface p-md active:opacity-80"
              onPress={() =>
                navigation.navigate('StationVehicles', {
                  stationId: item.id,
                  stationName: item.name,
                })
              }
              testID={`${testID}-list-station-${item.id}`}
            >
              <Text className="font-semibold text-textPrimary">{item.name}</Text>
              <Text className="text-xs text-textSecondary">
                {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
              </Text>
            </Pressable>
          )}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <Text className="px-md pt-sm text-xs text-textSecondary">{t('stationsMap.mapLegend')}</Text>
      {stationsCacheBadge ? (
        <Text className="px-md pt-xs text-xs text-textSecondary">{stationsCacheBadge}</Text>
      ) : null}
      {cacheBadge ? (
        <Text className="px-md pt-xs text-xs text-textSecondary">{cacheBadge}</Text>
      ) : null}
      {locationPerm === 'denied' ? (
        <Text className="px-md pt-xs text-xs text-warning">{t('stationsMap.locationDenied')}</Text>
      ) : null}
      <MapView
        ref={mapRef}
        initialRegion={INITIAL_REGION}
        showsUserLocation={locationPerm === 'granted'}
        showsMyLocationButton
        style={{ flex: 1 }}
        testID={`${testID}-map`}
      >
        {stations.map((s) => (
          <Marker
            key={s.id}
            coordinate={{ latitude: s.latitude, longitude: s.longitude }}
            title={s.name}
            description={s.city ?? undefined}
            testID={`${testID}-marker-${s.id}`}
            onCalloutPress={() =>
              navigation.navigate('StationVehicles', {
                stationId: s.id,
                stationName: s.name,
              })
            }
          >
            <Callout>
              <View className="max-w-xs p-sm">
                <Text className="font-semibold text-textPrimary">{s.name}</Text>
                {s.city ? <Text className="text-sm text-textSecondary">{s.city}</Text> : null}
                <Text className="mt-sm text-sm text-primary">{t('stationsMap.calloutVehicles')}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
        {liveVehicles
          .filter((v) => v.currentLatitude != null && v.currentLongitude != null)
          .map((v) => (
            <Marker
              key={`vehicle-${v.id}`}
              coordinate={{ latitude: v.currentLatitude as number, longitude: v.currentLongitude as number }}
              pinColor="red"
              title={`${v.registrationCode}`}
              description={t('stationsMap.markerVehicleDesc', {
                route: v.routeLabel,
                status: t(`vehicleStatus.${v.status as VehicleStatus}`),
                wait:
                  v.estimatedWaitMinutes != null
                    ? String(v.estimatedWaitMinutes)
                    : t('stationsMap.waitUnknown'),
              })}
              onCalloutPress={() =>
                navigation.navigate('StationVehicles', {
                  stationId: v.stationId,
                  stationName:
                    stations.find((s) => s.id === v.stationId)?.name ??
                    t('search.stationHash', { id: v.stationId }),
                })
              }
            />
          ))}
      </MapView>
    </View>
  );
}
