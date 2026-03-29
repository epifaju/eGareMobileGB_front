import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import type { AdminStackParamList } from '@/app/navigation/navigationTypes';
import { useGetAdminDashboardQuery } from '@/features/admin/api/adminApi';
import { parseApiError } from '@/shared/utils/apiError';

export type AdminDashboardScreenProps = NativeStackScreenProps<AdminStackParamList, 'AdminDashboard'>;

export default function AdminDashboardScreen({ testID = 'screen-admin-dashboard' }: AdminDashboardScreenProps & { testID?: string }) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAdminDashboardQuery();

  if (isLoading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">{t('admin.dashboardLoading')}</Text>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-error`}>
        <Text className="text-center text-error">{parseApiError(error)}</Text>
      </View>
    );
  }

  const roleLines = Object.entries(data.usersByRole)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
  const statusLines = Object.entries(data.activeVehiclesByStatus)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
      }
      testID={testID}
    >
      <Text className="mb-md text-lg font-semibold text-textPrimary">{t('admin.overview')}</Text>
      <View className="mb-md rounded-default border border-border bg-surface p-md">
        <Text className="text-textPrimary">
          {t('admin.usersTotal')} : {data.totalUsers}
        </Text>
        <Text className="mt-xs text-sm text-textSecondary">{roleLines || t('common.noneDash')}</Text>
      </View>
      <View className="mb-md rounded-default border border-border bg-surface p-md">
        <Text className="text-textPrimary">
          {t('admin.stationsActive')} : {data.activeStations} · {t('admin.archivedF')} : {data.archivedStations}
        </Text>
        <Text className="mt-xs text-textPrimary">
          {t('admin.vehiclesActive')} : {data.activeVehicles} · {t('admin.archivedM')} : {data.archivedVehicles}
        </Text>
        <Text className="mt-xs text-sm text-textSecondary">{statusLines || t('common.noneDash')}</Text>
      </View>
      <View className="mb-lg rounded-default border border-border bg-surface p-md">
        <Text className="text-textPrimary">
          {t('admin.bookingsTodayUtc')} : {data.bookingsTodayUtc}
        </Text>
      </View>

      <Text className="mb-sm text-md font-semibold text-textPrimary">{t('admin.management')}</Text>
      <Pressable
        className="mb-sm rounded-default border border-border bg-surface px-md py-md active:opacity-80"
        onPress={() => navigation.navigate('AdminStations')}
      >
        <Text className="font-semibold text-primary">{t('nav.stations')}</Text>
        <Text className="text-sm text-textSecondary">{t('admin.stationsSubtitle')}</Text>
      </Pressable>
      <Pressable
        className="mb-sm rounded-default border border-border bg-surface px-md py-md active:opacity-80"
        onPress={() => navigation.navigate('AdminVehicles', {})}
      >
        <Text className="font-semibold text-primary">{t('nav.vehicles')}</Text>
        <Text className="text-sm text-textSecondary">{t('admin.vehiclesSubtitle')}</Text>
      </Pressable>
      <Pressable
        className="mb-sm rounded-default border border-border bg-surface px-md py-md active:opacity-80"
        onPress={() => navigation.navigate('AdminUsers')}
      >
        <Text className="font-semibold text-primary">{t('nav.users')}</Text>
        <Text className="text-sm text-textSecondary">{t('admin.usersSubtitle')}</Text>
      </Pressable>
      <Pressable
        className="mb-sm rounded-default border border-border bg-surface px-md py-md active:opacity-80"
        onPress={() => navigation.navigate('AdminAuditLog')}
      >
        <Text className="font-semibold text-primary">{t('nav.audit')}</Text>
        <Text className="text-sm text-textSecondary">{t('admin.auditSubtitle')}</Text>
      </Pressable>
    </ScrollView>
  );
}
