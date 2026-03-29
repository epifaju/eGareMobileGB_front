import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
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
  AgentStackParamList,
  DriverStackParamList,
  MainStackParamList,
  PassengerStackParamList,
} from '@/app/navigation/navigationTypes';
import { useGetStationsQuery } from '@/features/station/api/stationApi';
import type { Station } from '@/features/station/types';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';
import { getAppRoleFromToken } from '@/shared/lib/jwtRole';
import { parseApiError } from '@/shared/utils/apiError';

export type HomeStationsScreenProps =
  | NativeStackScreenProps<PassengerStackParamList, 'Home'>
  | NativeStackScreenProps<DriverStackParamList, 'DriverHome'>
  | NativeStackScreenProps<AgentStackParamList, 'AgentHome'>;

export default function HomeStationsScreen({
  route,
  testID = 'screen-home-stations',
}: HomeStationsScreenProps & { testID?: string }) {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const variant = route.name === 'Home' ? 'passenger' : 'driver';
  const showReservationsEntry = variant === 'passenger' && getAppRoleFromToken() === 'USER';

  const stationsQueryArg = { page: 0, size: 50 } as const;

  const { data, isLoading, isError, error, refetch, isFetching, fulfilledTimeStamp } = useGetStationsQuery(
    stationsQueryArg,
  );
  const cacheMeta = data?.cache;

  const age = useMemo(() => {
    const dataUpdatedAt = fulfilledTimeStamp ?? 0;
    if (!dataUpdatedAt) {
      return '';
    }
    const ms = Date.now() - dataUpdatedAt;
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) {
      return t('home.cacheJustNow');
    }
    if (minutes < 60) {
      return t('home.cacheMinutesAgo', { count: minutes });
    }
    const hours = Math.floor(minutes / 60);
    return t('home.cacheHoursAgo', { count: hours });
  }, [fulfilledTimeStamp, t, i18n.language]);

  const cacheHint = useMemo(() => {
    if (cacheMeta?.source !== 'sqlite') {
      return '';
    }
    if (cacheMeta.fallback) {
      return t('home.cacheSqliteOffline');
    }
    if (cacheMeta.stale) {
      return t('home.cacheSqliteStale');
    }
    return t('home.cacheSqliteOfflineShort');
  }, [cacheMeta, t, i18n.language]);

  const list = data?.page.content ?? [];
  const showInitialLoading = isLoading && !data;
  const empty = !showInitialLoading && !isError && list.length === 0;

  if (showInitialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">{t('home.loadingStations')}</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-error`}>
        <Text className="mb-md text-center text-error">{parseApiError(error)}</Text>
        <Text className="text-center text-sm text-textSecondary">{t('auth.networkErrorHint')}</Text>
      </View>
    );
  }

  const ctaLabel = variant === 'driver' ? t('home.ctaDriver') : t('home.ctaPassenger');

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <LanguageSwitcher testID={`${testID}-language`} />
      <Pressable
        accessibilityRole="button"
        className="mx-md mt-sm rounded-default border border-border bg-surface px-md py-sm active:opacity-80"
        onPress={() => navigation.navigate('StationsMap')}
        testID={`${testID}-link-map`}
      >
        <Text className="text-center text-sm font-semibold text-textPrimary">{t('home.mapLink')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        className="mx-md mt-sm rounded-default border border-border bg-surface px-md py-sm active:opacity-80"
        onPress={() => navigation.navigate('LowBandwidthStations')}
        testID={`${testID}-link-low-bandwidth`}
      >
        <Text className="text-center text-sm font-semibold text-textPrimary">{t('home.lowBandwidthLink')}</Text>
      </Pressable>
      {variant === 'passenger' ? (
        <Pressable
          accessibilityRole="button"
          className="mx-md mt-sm rounded-default border border-border bg-surface px-md py-sm active:opacity-80"
          onPress={() => navigation.navigate('SearchDestination')}
          testID={`${testID}-link-search`}
        >
          <Text className="text-center text-sm font-semibold text-textPrimary">{t('home.searchDestination')}</Text>
        </Pressable>
      ) : null}
      {showReservationsEntry ? (
        <Pressable
          accessibilityRole="button"
          className="mx-md mt-sm rounded-default border border-primary bg-surface px-md py-sm active:opacity-80"
          onPress={() => navigation.navigate('MyReservations')}
          testID={`${testID}-link-reservations`}
        >
          <Text className="text-center text-sm font-semibold text-primary">{t('home.myReservations')}</Text>
        </Pressable>
      ) : null}
      {variant === 'driver' ? (
        <Text className="px-md pt-sm text-sm leading-5 text-textSecondary" testID={`${testID}-driver-intro`}>
          {t('home.driverIntro')}
        </Text>
      ) : null}
      {(fulfilledTimeStamp ?? 0) > 0 || cacheHint ? (
        <Text className="px-md pt-sm text-xs text-textSecondary" testID={`${testID}-cache-age`}>
          {t('home.dataUpdated')} {age}
          {cacheHint}
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
              {t('home.emptyStations')}
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
