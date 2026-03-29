import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import type { MainStackParamList } from '@/app/navigation/navigationTypes';
import { useGetStationsLowBandwidthQuery } from '@/features/station/api/stationApi';
import type { LowBandwidthStation } from '@/features/station/types';
import { intlLocaleFromLanguage } from '@/shared/lib/intlLocale';
import { parseApiError } from '@/shared/utils/apiError';

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

export type LowBandwidthStationsScreenProps = NativeStackScreenProps<
  MainStackParamList,
  'LowBandwidthStations'
>;

export default function LowBandwidthStationsScreen({
  navigation,
  testID = 'screen-low-bandwidth-stations',
}: LowBandwidthStationsScreenProps & { testID?: string }) {
  const { t, i18n } = useTranslation();
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
        <Text className="mt-md text-textSecondary">{t('lowBandwidth.loading')}</Text>
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

  const locale = intlLocaleFromLanguage(i18n.language);

  return (
    <View className="flex-1 bg-background px-md pt-sm" testID={testID}>
      <Text className="text-sm text-textSecondary">{t('lowBandwidth.intro')}</Text>
      {approxPayloadKb != null ? (
        <Text className="mt-xs text-xs text-textSecondary">
          {t('lowBandwidth.payloadApprox', { kb: approxPayloadKb.toFixed(1) })}
        </Text>
      ) : null}
      <FlatList
        className="mt-sm flex-1"
        data={list}
        keyExtractor={(item: LowBandwidthStation) => String(item.id)}
        ListEmptyComponent={
          empty ? (
            <Text className="mt-lg text-center text-textSecondary" testID={`${testID}-empty`}>
              {t('lowBandwidth.empty')}
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
            <Text className="mt-xs text-sm text-textPrimary">
              {t('lowBandwidth.activeVehicles', { count: item.activeVehicles })}
            </Text>
            <Text className="mt-xs text-xs text-textSecondary">
              {t('lowBandwidth.nextDeparture')}{' '}
              {formatDeparture(item.nextDepartureAt, i18n.language)}
            </Text>
            {item.minFareXof != null ? (
              <Text className="mt-xs text-xs text-textSecondary">
                {t('lowBandwidth.minFare', {
                  amount: item.minFareXof.toLocaleString(locale),
                })}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}
