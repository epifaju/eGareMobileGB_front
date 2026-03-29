import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AdminStackParamList } from '@/app/navigation/navigationTypes';
import { useCreateAdminVehicleMutation, useUpdateAdminVehicleMutation } from '@/features/admin/api/adminApi';
import type { AdminVehicleCreate, AdminVehicleUpdate } from '@/features/admin/types';
import type { VehicleSeatLayout, VehicleStatus } from '@/features/vehicle/types';
import { parseApiError } from '@/shared/utils/apiError';

const LAYOUTS: VehicleSeatLayout[] = ['L8', 'L15', 'L20', 'L45'];
const CREATE_STATUSES: VehicleStatus[] = ['EN_FILE', 'REMPLISSAGE', 'COMPLET'];

export type AdminVehicleFormScreenProps = NativeStackScreenProps<AdminStackParamList, 'AdminVehicleForm'>;

export default function AdminVehicleFormScreen({ navigation, route, testID = 'screen-admin-vehicle-form' }: AdminVehicleFormScreenProps & { testID?: string }) {
  const { t } = useTranslation();
  const { stationId, vehicle } = route.params;
  const isEdit = vehicle != null;

  const [registrationCode, setRegistrationCode] = useState(vehicle?.registrationCode ?? '');
  const [routeLabel, setRouteLabel] = useState(vehicle?.routeLabel ?? '');
  const [seatLayout, setSeatLayout] = useState<VehicleSeatLayout>(vehicle?.seatLayout ?? 'L20');
  const [occupiedSeats, setOccupiedSeats] = useState(vehicle != null ? String(vehicle.occupiedSeats) : '0');
  const [fare, setFare] = useState(vehicle?.fareAmountXof != null ? String(vehicle.fareAmountXof) : '');
  const [departureIso, setDepartureIso] = useState(vehicle?.departureScheduledAt ?? '');
  const [createStatus, setCreateStatus] = useState<VehicleStatus>('EN_FILE');

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? t('admin.vehicleFormEditTitle') : t('admin.vehicleFormNewTitle') });
  }, [navigation, isEdit, t]);

  const [createV, { isLoading: isCreating }] = useCreateAdminVehicleMutation();
  const [updateV, { isLoading: isUpdating }] = useUpdateAdminVehicleMutation();
  const busy = isCreating || isUpdating;

  async function onSubmitCreate() {
    const occ = Number.parseInt(occupiedSeats, 10);
    if (!registrationCode.trim() || !routeLabel.trim()) {
      Alert.alert(t('common.validation'), t('admin.vehicleRegRouteRequired'));
      return;
    }
    if (Number.isNaN(occ) || occ < 0) {
      Alert.alert(t('common.validation'), t('admin.vehicleOccupiedInvalid'));
      return;
    }
    const body: AdminVehicleCreate = {
      registrationCode: registrationCode.trim(),
      routeLabel: routeLabel.trim(),
      seatLayout,
      occupiedSeats: occ,
      fareAmountXof: fare.trim() === '' ? null : Number.parseInt(fare, 10),
      departureScheduledAt: departureIso.trim() === '' ? null : departureIso.trim(),
      status: createStatus,
    };
    if (body.fareAmountXof != null && Number.isNaN(body.fareAmountXof)) {
      Alert.alert(t('common.validation'), t('admin.vehicleFareInvalid'));
      return;
    }
    try {
      await createV({ stationId, body }).unwrap();
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), parseApiError(e));
    }
  }

  async function onSubmitEdit() {
    if (!vehicle) {
      return;
    }
    const occ = Number.parseInt(occupiedSeats, 10);
    const body: AdminVehicleUpdate = {
      registrationCode: registrationCode.trim(),
      routeLabel: routeLabel.trim(),
      seatLayout,
      occupiedSeats: Number.isNaN(occ) ? undefined : occ,
      fareAmountXof: fare.trim() === '' ? null : Number.parseInt(fare, 10),
      departureScheduledAt: departureIso.trim() === '' ? null : departureIso.trim(),
      status: vehicle.status,
    };
    try {
      await updateV({ vehicleId: vehicle.id, body }).unwrap();
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), parseApiError(e));
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
      testID={testID}
    >
      <ScrollView className="flex-1 px-md" contentContainerStyle={{ paddingBottom: 32, paddingTop: 12 }}>
        <Text className="mb-xs text-sm text-textSecondary">{t('admin.formRegistration')}</Text>
        <TextInput
          className="mb-md rounded border border-border bg-surface px-md py-sm text-textPrimary"
          editable={!busy}
          onChangeText={setRegistrationCode}
          value={registrationCode}
        />
        <Text className="mb-xs text-sm text-textSecondary">{t('admin.formRoute')}</Text>
        <TextInput
          className="mb-md rounded border border-border bg-surface px-md py-sm text-textPrimary"
          editable={!busy}
          onChangeText={setRouteLabel}
          value={routeLabel}
        />
        <Text className="mb-xs text-sm text-textSecondary">{t('admin.formSeatLayout')}</Text>
        <View className="mb-md flex-row flex-wrap">
          {LAYOUTS.map((l) => (
            <Pressable
              key={l}
              className={`mb-xs mr-xs rounded border px-sm py-xs ${seatLayout === l ? 'border-primary bg-surface' : 'border-border bg-surface'}`}
              onPress={() => setSeatLayout(l)}
            >
              <Text className={seatLayout === l ? 'text-primary' : 'text-textPrimary'}>{l}</Text>
            </Pressable>
          ))}
        </View>
        <Text className="mb-xs text-sm text-textSecondary">{t('admin.formOccupied')}</Text>
        <TextInput
          className="mb-md rounded border border-border bg-surface px-md py-sm text-textPrimary"
          editable={!busy}
          keyboardType="number-pad"
          onChangeText={setOccupiedSeats}
          value={occupiedSeats}
        />
        <Text className="mb-xs text-sm text-textSecondary">{t('admin.formFare')}</Text>
        <TextInput
          className="mb-md rounded border border-border bg-surface px-md py-sm text-textPrimary"
          editable={!busy}
          keyboardType="number-pad"
          onChangeText={setFare}
          value={fare}
        />
        <Text className="mb-xs text-sm text-textSecondary">{t('admin.formDepartureIso')}</Text>
        <TextInput
          className="mb-md rounded border border-border bg-surface px-md py-sm text-textPrimary"
          editable={!busy}
          onChangeText={setDepartureIso}
          placeholder="2026-03-29T12:00:00Z"
          value={departureIso}
        />
        {!isEdit ? (
          <>
            <Text className="mb-xs text-sm text-textSecondary">{t('admin.formInitialStatus')}</Text>
            <View className="mb-lg flex-row flex-wrap">
              {CREATE_STATUSES.map((s) => (
                <Pressable
                  key={s}
                  className={`mb-xs mr-xs rounded border px-sm py-xs ${createStatus === s ? 'border-primary bg-surface' : 'border-border bg-surface'}`}
                  onPress={() => setCreateStatus(s)}
                >
                  <Text className={createStatus === s ? 'text-primary' : 'text-textPrimary'}>
                    {t(`vehicleStatus.${s}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <Pressable
          className="items-center rounded-default bg-primary py-md active:opacity-90"
          disabled={busy}
          onPress={() => void (isEdit ? onSubmitEdit() : onSubmitCreate())}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-semibold text-white">{isEdit ? t('common.save') : t('common.create')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
