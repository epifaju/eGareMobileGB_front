import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

import type { MainStackParamList } from '@/app/navigation/navigationTypes';
import { useGetVehicleManifestQuery } from '@/features/vehicle/api/vehicleApi';
import type { ManifestPassengerRow } from '@/features/vehicle/types';
import { parseApiError } from '@/shared/utils/apiError';
import { useAppSelector } from '@/shared/store/hooks';

export type VehicleManifestScreenProps = NativeStackScreenProps<MainStackParamList, 'VehicleManifest'>;

function formatEmbark(iso: string | null): string {
  if (!iso) {
    return 'Non';
  }
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Oui';
  }
}

export default function VehicleManifestScreen({
  route,
  testID = 'screen-vehicle-manifest',
}: VehicleManifestScreenProps & { testID?: string }) {
  const { vehicleId, stationName, registrationCode, routeLabel } = route.params;
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const { data, isLoading, isError, error } = useGetVehicleManifestQuery(vehicleId, {
    skip: !isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-auth`}>
        <Text className="text-center text-textSecondary">Connexion requise pour afficher le manifeste.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
        <Text className="mt-md text-textSecondary">Chargement du manifeste…</Text>
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

  const list = data ?? [];

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <Text className="px-md pt-sm text-lg font-semibold text-textPrimary" numberOfLines={2}>
        {stationName}
      </Text>
      <Text className="px-md text-sm text-textSecondary">
        {registrationCode} · {routeLabel}
      </Text>
      <Text className="px-md pb-sm text-xs text-textSecondary">
        {list.length} passager(s) listé(s) (confirmés ou paiement en cours).
      </Text>
      <FlatList
        className="flex-1 px-md"
        contentContainerStyle={{ paddingBottom: 24 }}
        data={list}
        keyExtractor={(item: ManifestPassengerRow) => String(item.bookingId)}
        ListEmptyComponent={
          <Text className="mt-lg text-center text-textSecondary">Aucun passager sur ce véhicule.</Text>
        }
        renderItem={({ item }) => (
          <View className="mb-sm rounded-default border border-border bg-surface p-md">
            <Text className="text-base font-semibold text-textPrimary">
              Siège {item.seatNumber != null ? item.seatNumber : '—'}
            </Text>
            <Text className="mt-xs text-sm text-textSecondary">{item.phoneMasked}</Text>
            <Text className="mt-xs text-xs text-textSecondary">
              Résa : {item.bookingStatus} · Paiement : {item.paymentStatus}
            </Text>
            <Text className="mt-xs text-xs text-textPrimary">
              Embarquement : {item.boardingValidatedAt ? formatEmbark(item.boardingValidatedAt) : 'Non'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
