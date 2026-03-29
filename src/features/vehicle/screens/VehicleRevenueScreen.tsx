import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import type { MainStackParamList } from '@/app/navigation/navigationTypes';
import { useGetVehicleRevenueQuery } from '@/features/vehicle/api/vehicleApi';
import { intlLocaleFromLanguage } from '@/shared/lib/intlLocale';
import { parseApiError } from '@/shared/utils/apiError';
import { useAppSelector } from '@/shared/store/hooks';

export type VehicleRevenueScreenProps = NativeStackScreenProps<MainStackParamList, 'VehicleRevenue'>;

function formatIso(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(intlLocaleFromLanguage(locale), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function VehicleRevenueScreen({
  route,
  testID = 'screen-vehicle-revenue',
}: VehicleRevenueScreenProps & { testID?: string }) {
  const { t, i18n } = useTranslation();
  const { vehicleId, stationName, registrationCode, routeLabel } = route.params;
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data, isLoading, isError, error } = useGetVehicleRevenueQuery(
    { vehicleId },
    { skip: !isAuthenticated },
  );

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-auth`}>
        <Text className="text-center text-textSecondary">{t('vehicleRevenue.authRequired')}</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">{t('vehicleRevenue.loading')}</Text>
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

  if (!data) {
    return null;
  }

  const locale = intlLocaleFromLanguage(i18n.language);

  return (
    <View className="flex-1 bg-background px-md" testID={testID}>
      <Text className="pt-sm text-lg font-semibold text-textPrimary" numberOfLines={2}>
        {stationName}
      </Text>
      <Text className="mt-xs text-sm text-textSecondary">
        {registrationCode} · {routeLabel}
      </Text>
      <Text className="mt-md text-xs text-textSecondary">
        {t('vehicleRevenue.period', {
          from: formatIso(data.fromInclusive, i18n.language),
          to: formatIso(data.toInclusive, i18n.language),
        })}
      </Text>
      <View className="mt-lg rounded-default border border-border bg-surface p-md">
        <Text className="text-sm text-textSecondary">{t('vehicleRevenue.totalPaid')}</Text>
        <Text className="mt-sm text-2xl font-bold text-textPrimary">
          {data.totalAmount.toLocaleString(locale)} {data.currency}
        </Text>
        <Text className="mt-xs text-sm text-textSecondary">
          {t('vehicleRevenue.countPaid', { count: data.paidBookingCount })}
        </Text>
      </View>
    </View>
  );
}
