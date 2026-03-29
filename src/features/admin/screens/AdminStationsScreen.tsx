import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
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

import type { AdminStackParamList } from '@/app/navigation/navigationTypes';
import { useArchiveAdminStationMutation, useGetAdminStationsQuery } from '@/features/admin/api/adminApi';
import type { AdminStation } from '@/features/admin/types';
import { parseApiError } from '@/shared/utils/apiError';

export type AdminStationsScreenProps = NativeStackScreenProps<AdminStackParamList, 'AdminStations'>;

export default function AdminStationsScreen({ testID = 'screen-admin-stations' }: AdminStationsScreenProps & { testID?: string }) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAdminStationsQuery({
    page: 0,
    size: 100,
    includeArchived,
  });
  const [archiveStation, { isLoading: isArchiving }] = useArchiveAdminStationMutation();

  const list = data?.content ?? [];

  function confirmArchive(item: AdminStation) {
    Alert.alert(
      t('admin.archiveStationTitle'),
      t('admin.archiveStationMessage', { name: item.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.archive'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await archiveStation(item.id).unwrap();
              } catch (e) {
                Alert.alert(t('common.error'), parseApiError(e));
              }
            })();
          },
        },
      ],
    );
  }

  if (isLoading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-error`}>
        <Text className="text-center text-error">{parseApiError(error)}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <View className="flex-row items-center justify-between border-b border-border px-md py-sm">
        <Text className="text-sm text-textSecondary">{t('admin.includeArchived')}</Text>
        <Switch value={includeArchived} onValueChange={setIncludeArchived} />
      </View>
      <Pressable
        className="mx-md mt-sm rounded-default bg-primary px-md py-sm active:opacity-90"
        onPress={() => navigation.navigate('AdminStationForm', {})}
      >
        <Text className="text-center font-semibold text-white">{t('admin.newStation')}</Text>
      </Pressable>
      <FlatList
        className="mt-sm flex-1 px-md"
        contentContainerStyle={{ paddingBottom: 24 }}
        data={list}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
        }
        ListEmptyComponent={
          <Text className="mt-lg text-center text-textSecondary">{t('admin.noStations')}</Text>
        }
        renderItem={({ item }) => (
          <View className="mb-sm rounded-default border border-border bg-surface p-md">
            <Text className="text-lg font-semibold text-textPrimary">{item.name}</Text>
            {item.city ? <Text className="text-sm text-textSecondary">{item.city}</Text> : null}
            <Text className="mt-xs text-xs text-textSecondary">
              {item.archived ? t('admin.archived') : t('admin.active')} · {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </Text>
            <View className="mt-sm flex-row flex-wrap gap-xs">
              <Pressable
                className="rounded border border-primary px-sm py-xs active:opacity-80"
                onPress={() => navigation.navigate('AdminStationForm', { station: item })}
              >
                <Text className="text-sm text-primary">{t('common.modify')}</Text>
              </Pressable>
              <Pressable
                className="rounded border border-border px-sm py-xs active:opacity-80"
                onPress={() => navigation.navigate('AdminVehicles', { stationId: item.id })}
              >
                <Text className="text-sm text-textPrimary">{t('nav.vehicles')}</Text>
              </Pressable>
              {!item.archived ? (
                <Pressable
                  className="rounded border border-error px-sm py-xs active:opacity-80"
                  disabled={isArchiving}
                  onPress={() => confirmArchive(item)}
                >
                  <Text className="text-sm text-error">{t('common.archive')}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      />
    </View>
  );
}
