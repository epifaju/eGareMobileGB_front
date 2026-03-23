import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const mapRef = useRef<MapView>(null);
  const { data, isLoading, isError, error, refetch, isFetching } = useGetStationsQuery({
    page: 0,
    size: 100,
  });
  const { data: liveVehicles = [] } = useGetMapVehiclesQuery();
  const [locationPerm, setLocationPerm] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  useMapVehiclesRealtime();

  const stations = data?.content ?? [];

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

  if (isLoading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">Chargement des gares…</Text>
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
    const hint =
      Platform.OS === 'web'
        ? 'La carte n’est pas disponible sur le web dans cette version.'
        : 'Carte Google indisponible : ajoutez GOOGLE_MAPS_ANDROID_API_KEY dans mobile/.env puis reconstruisez (npx expo run:android). Voir docs/MAPS_ANDROID.md';
    return (
      <View className="flex-1 bg-background px-md pt-md" testID={testID}>
        <Text className="mb-sm text-sm text-textSecondary">{hint}</Text>
        <Text className="mb-md text-sm text-textPrimary">Liste des gares :</Text>
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
      <Text className="px-md pt-sm text-xs text-textSecondary">
        Marqueurs bleus = gares · rouges = véhicules actifs (temps réel).
      </Text>
      {locationPerm === 'denied' ? (
        <Text className="px-md pt-xs text-xs text-warning">
          Position refusée : carte centrée sur le pays. Activez la localisation pour vous centrer.
        </Text>
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
                <Text className="mt-sm text-sm text-primary">Appuyer pour les véhicules →</Text>
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
              description={`${v.routeLabel} · ${v.status} · ~${v.estimatedWaitMinutes ?? '?'} min`}
              onCalloutPress={() =>
                navigation.navigate('StationVehicles', {
                  stationId: v.stationId,
                  stationName: stations.find((s) => s.id === v.stationId)?.name ?? `Gare #${v.stationId}`,
                })
              }
            />
          ))}
      </MapView>
    </View>
  );
}
