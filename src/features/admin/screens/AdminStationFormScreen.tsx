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
import { useCreateAdminStationMutation, useUpdateAdminStationMutation } from '@/features/admin/api/adminApi';
import type { AdminStationWrite } from '@/features/admin/types';
import { parseApiError } from '@/shared/utils/apiError';

export type AdminStationFormScreenProps = NativeStackScreenProps<AdminStackParamList, 'AdminStationForm'>;

export default function AdminStationFormScreen({ navigation, route, testID = 'screen-admin-station-form' }: AdminStationFormScreenProps & { testID?: string }) {
  const { t } = useTranslation();
  const station = route.params?.station;
  const isEdit = station != null;

  const [name, setName] = useState(station?.name ?? '');
  const [city, setCity] = useState(station?.city ?? '');
  const [lat, setLat] = useState(station != null ? String(station.latitude) : '');
  const [lng, setLng] = useState(station != null ? String(station.longitude) : '');
  const [description, setDescription] = useState(station?.description ?? '');

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? t('admin.stationFormEditTitle') : t('admin.stationFormNewTitle') });
  }, [navigation, isEdit, t]);

  const [createStation, { isLoading: isCreating }] = useCreateAdminStationMutation();
  const [updateStation, { isLoading: isUpdating }] = useUpdateAdminStationMutation();
  const busy = isCreating || isUpdating;

  function buildBody(): AdminStationWrite | null {
    const latitude = Number.parseFloat(lat.replace(',', '.'));
    const longitude = Number.parseFloat(lng.replace(',', '.'));
    if (!name.trim()) {
      Alert.alert(t('common.validation'), t('admin.stationNameRequired'));
      return null;
    }
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      Alert.alert(t('common.validation'), t('admin.latLngRequired'));
      return null;
    }
    return {
      name: name.trim(),
      city: city.trim() || null,
      latitude,
      longitude,
      description: description.trim() || null,
    };
  }

  async function onSubmit() {
    const body = buildBody();
    if (!body) {
      return;
    }
    try {
      if (isEdit && station) {
        await updateStation({ stationId: station.id, body }).unwrap();
      } else {
        await createStation(body).unwrap();
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', parseApiError(e));
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-background"
      testID={testID}
    >
      <ScrollView className="flex-1 px-md" contentContainerStyle={{ paddingBottom: 32, paddingTop: 12 }}>
        <Text className="mb-xs text-sm text-textSecondary">{t('admin.formName')}</Text>
        <TextInput
          className="mb-md rounded border border-border bg-surface px-md py-sm text-textPrimary"
          editable={!busy}
          onChangeText={setName}
          placeholder={t('admin.placeholderStation')}
          value={name}
        />
        <Text className="mb-xs text-sm text-textSecondary">Ville</Text>
        <TextInput
          className="mb-md rounded border border-border bg-surface px-md py-sm text-textPrimary"
          editable={!busy}
          onChangeText={setCity}
          value={city}
        />
        <Text className="mb-xs text-sm text-textSecondary">{t('admin.formLatitude')}</Text>
        <TextInput
          className="mb-md rounded border border-border bg-surface px-md py-sm text-textPrimary"
          editable={!busy}
          keyboardType="decimal-pad"
          onChangeText={setLat}
          value={lat}
        />
        <Text className="mb-xs text-sm text-textSecondary">{t('admin.formLongitude')}</Text>
        <TextInput
          className="mb-md rounded border border-border bg-surface px-md py-sm text-textPrimary"
          editable={!busy}
          keyboardType="decimal-pad"
          onChangeText={setLng}
          value={lng}
        />
        <Text className="mb-xs text-sm text-textSecondary">Description</Text>
        <TextInput
          className="mb-lg min-h-[80px] rounded border border-border bg-surface px-md py-sm text-textPrimary"
          editable={!busy}
          multiline
          onChangeText={setDescription}
          value={description ?? ''}
        />
        <Pressable
          className="items-center rounded-default bg-primary py-md active:opacity-90"
          disabled={busy}
          onPress={() => void onSubmit()}
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
