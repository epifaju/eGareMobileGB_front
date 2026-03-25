import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Text, View } from 'react-native';

import type { MainStackParamList } from '@/app/navigation/navigationTypes';
import { useGetVehicleRevenueQuery } from '@/features/vehicle/api/vehicleApi';
import { parseApiError } from '@/shared/utils/apiError';
import { useAppSelector } from '@/shared/store/hooks';

export type VehicleRevenueScreenProps = NativeStackScreenProps<MainStackParamList, 'VehicleRevenue'>;

function formatIso(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
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
  const { vehicleId, stationName, registrationCode, routeLabel } = route.params;
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data, isLoading, isError, error } = useGetVehicleRevenueQuery(
    { vehicleId },
    { skip: !isAuthenticated },
  );

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-auth`}>
        <Text className="text-center text-textSecondary">Connexion requise pour afficher les revenus.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">Calcul des revenus…</Text>
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

  return (
    <View className="flex-1 bg-background px-md" testID={testID}>
      <Text className="pt-sm text-lg font-semibold text-textPrimary" numberOfLines={2}>
        {stationName}
      </Text>
      <Text className="mt-xs text-sm text-textSecondary">
        {registrationCode} · {routeLabel}
      </Text>
      <Text className="mt-md text-xs text-textSecondary">
        Période : {formatIso(data.fromInclusive)} → {formatIso(data.toInclusive)}
      </Text>
      <View className="mt-lg rounded-default border border-border bg-surface p-md">
        <Text className="text-sm text-textSecondary">Total encaissé (paiements PAID)</Text>
        <Text className="mt-sm text-2xl font-bold text-textPrimary">
          {data.totalAmount.toLocaleString('fr-FR')} {data.currency}
        </Text>
        <Text className="mt-xs text-sm text-textSecondary">
          {data.paidBookingCount} réservation(s) confirmée(s) sur la période
        </Text>
      </View>
    </View>
  );
}
