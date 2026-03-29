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
import { useArchiveAdminVehicleMutation, useGetAdminVehiclesQuery } from '@/features/admin/api/adminApi';
import type { AdminVehicle } from '@/features/admin/types';
import { parseApiError } from '@/shared/utils/apiError';

export type AdminVehiclesScreenProps = NativeStackScreenProps<AdminStackParamList, 'AdminVehicles'>;

export default function AdminVehiclesScreen({ route, testID = 'screen-admin-vehicles' }: AdminVehiclesScreenProps & { testID?: string }) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const stationIdFilter = route.params?.stationId;
  const [includeArchived, setIncludeArchived] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useGetAdminVehiclesQuery({
    stationId: stationIdFilter,
    page: 0,
    size: 100,
    includeArchived,
  });
  const [archiveVehicle, { isLoading: isArchiving }] = useArchiveAdminVehicleMutation();

  const list = data?.content ?? [];

  function confirmArchive(item: AdminVehicle) {
    Alert.alert(
      t('admin.archiveVehicleTitle'),
      t('admin.archiveVehicleMessage', { registration: item.registrationCode, route: item.routeLabel }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.archive'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await archiveVehicle(item.id).unwrap();
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

  const createStationId = stationIdFilter ?? list[0]?.stationId;

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <View className="flex-row items-center justify-between border-b border-border px-md py-sm">
        <Text className="text-sm text-textSecondary">{t('admin.includeArchivedVehicles')}</Text>
        <Switch value={includeArchived} onValueChange={setIncludeArchived} />
      </View>
      {stationIdFilter != null ? (
        <Text className="px-md pt-sm text-sm text-textSecondary">Gare (filtre) : #{stationIdFilter}</Text>
      ) : (
        <Text className="px-md pt-sm text-sm text-textSecondary">Toutes les gares</Text>
      )}
      <Pressable
        className="mx-md mt-sm rounded-default bg-primary px-md py-sm active:opacity-90"
        disabled={createStationId == null}
        onPress={() => {
          if (createStationId != null) {
            navigation.navigate('AdminVehicleForm', { stationId: createStationId });
          }
        }}
      >
        <Text className="text-center font-semibold text-white">
          {createStationId != null ? t('admin.newVehicle') : t('admin.newVehicleNeedList')}
        </Text>
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
          <Text className="mt-lg text-center text-textSecondary">Aucun véhicule.</Text>
        }
        renderItem={({ item }) => (
          <View className="mb-sm rounded-default border border-border bg-surface p-md">
            <Text className="text-lg font-semibold text-textPrimary">{item.registrationCode}</Text>
            <Text className="text-sm text-textSecondary">{item.routeLabel}</Text>
            <Text className="mt-xs text-xs text-textSecondary">
              {t('admin.stationHash', { id: item.stationId })} · {t(`vehicleStatus.${item.status}`)} ·{' '}
              {item.archived ? t('admin.archivedM') : t('admin.activeM')} · {item.occupiedSeats}/{item.capacity} {t('admin.seatsShort')}
            </Text>
            <View className="mt-sm flex-row flex-wrap">
              <Pressable
                className="mr-sm rounded border border-primary px-sm py-xs active:opacity-80"
                onPress={() => navigation.navigate('AdminVehicleForm', { stationId: item.stationId, vehicle: item })}
              >
                <Text className="text-sm text-primary">{t('common.modify')}</Text>
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
