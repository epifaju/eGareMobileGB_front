import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import type {
  DriverStackParamList,
  MainStackParamList,
  PassengerStackParamList,
} from '@/app/navigation/navigationTypes';
import { useGetStationsQuery } from '@/features/station/api/stationApi';
import type { Station } from '@/features/station/types';
import { getAppRoleFromToken } from '@/shared/lib/jwtRole';
import { parseApiError } from '@/shared/utils/apiError';

function cacheAgeLabel(dataUpdatedAt: number): string {
  if (!dataUpdatedAt) {
    return '';
  }
  const ms = Date.now() - dataUpdatedAt;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) {
    return 'à l’instant';
  }
  if (minutes < 60) {
    return `il y a ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  return `il y a ${hours} h`;
}

export type HomeStationsScreenProps =
  | Pick<NativeStackScreenProps<PassengerStackParamList, 'Home'>, 'route'>
  | Pick<NativeStackScreenProps<DriverStackParamList, 'DriverHome'>, 'route'>;

export default function HomeStationsScreen({
  route,
  testID = 'screen-home-stations',
}: HomeStationsScreenProps & { testID?: string }) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const variant = route.name === 'DriverHome' ? 'driver' : 'passenger';
  const showReservationsEntry = variant === 'passenger' && getAppRoleFromToken() === 'USER';

  const { data, isLoading, isError, error, refetch, isFetching, fulfilledTimeStamp } = useGetStationsQuery({
    page: 0,
    size: 50,
  });

  const age = useMemo(() => cacheAgeLabel(fulfilledTimeStamp ?? 0), [fulfilledTimeStamp]);

  const list = data?.content ?? [];
  const showInitialLoading = isLoading && !data;
  const empty = !showInitialLoading && !isError && list.length === 0;

  if (showInitialLoading) {
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
        <Text className="text-center text-sm text-textSecondary">
          Vérifiez le réseau ou l’URL API (émulateur Android : 10.0.2.2:8080).
        </Text>
      </View>
    );
  }

  const ctaLabel = variant === 'driver' ? 'Gérer les véhicules →' : 'Voir les véhicules →';

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <Pressable
        accessibilityRole="button"
        className="mx-md mt-sm rounded-default border border-border bg-surface px-md py-sm active:opacity-80"
        onPress={() => navigation.navigate('StationsMap')}
        testID={`${testID}-link-map`}
      >
        <Text className="text-center text-sm font-semibold text-textPrimary">Carte des gares</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        className="mx-md mt-sm rounded-default border border-border bg-surface px-md py-sm active:opacity-80"
        onPress={() => navigation.navigate('LowBandwidthStations')}
        testID={`${testID}-link-low-bandwidth`}
      >
        <Text className="text-center text-sm font-semibold text-textPrimary">Vue réseau faible (&lt;50KB)</Text>
      </Pressable>
      {variant === 'passenger' ? (
        <Pressable
          accessibilityRole="button"
          className="mx-md mt-sm rounded-default border border-border bg-surface px-md py-sm active:opacity-80"
          onPress={() => navigation.navigate('SearchDestination')}
          testID={`${testID}-link-search`}
        >
          <Text className="text-center text-sm font-semibold text-textPrimary">
            Rechercher une destination
          </Text>
        </Pressable>
      ) : null}
      {showReservationsEntry ? (
        <Pressable
          accessibilityRole="button"
          className="mx-md mt-sm rounded-default border border-primary bg-surface px-md py-sm active:opacity-80"
          onPress={() => navigation.navigate('MyReservations')}
          testID={`${testID}-link-reservations`}
        >
          <Text className="text-center text-sm font-semibold text-primary">Mes réservations</Text>
        </Pressable>
      ) : null}
      {variant === 'driver' ? (
        <Text className="px-md pt-sm text-sm leading-5 text-textSecondary" testID={`${testID}-driver-intro`}>
          Choisissez une gare pour afficher les véhicules, mettre à jour les statuts (En file → Parti) et
          consulter les départs si besoin.
        </Text>
      ) : null}
      {(fulfilledTimeStamp ?? 0) > 0 ? (
        <Text className="px-md pt-sm text-xs text-textSecondary" testID={`${testID}-cache-age`}>
          Données {age}
        </Text>
      ) : null}

      <FlatList
        className="flex-1 px-md"
        contentContainerStyle={{ paddingBottom: 24 }}
        data={list}
        keyExtractor={(item: Station) => String(item.id)}
        ListEmptyComponent={
          empty ? (
            <Text className="mt-lg text-center text-textSecondary" testID={`${testID}-empty`}>
              Aucune gare pour le moment.
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
            accessibilityRole="button"
            className="mb-sm rounded-default border border-border bg-surface p-md active:opacity-80"
            onPress={() =>
              navigation.navigate('StationVehicles', {
                stationId: item.id,
                stationName: item.name,
              })
            }
            testID={`${testID}-station-${item.id}`}
          >
            <Text className="text-lg font-semibold text-textPrimary">{item.name}</Text>
            {item.city ? (
              <Text className="text-sm text-textSecondary">{item.city}</Text>
            ) : null}
            {item.description ? (
              <Text className="mt-xs text-sm text-textSecondary" numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <Text className="mt-sm text-xs text-primary">{ctaLabel}</Text>
          </Pressable>
        )}
        testID={`${testID}-list`}
      />
    </View>
  );
}
