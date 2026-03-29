import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AdminStackParamList } from '@/app/navigation/navigationTypes';
import { useGetAdminUsersQuery } from '@/features/admin/api/adminApi';
import { parseApiError } from '@/shared/utils/apiError';

export type AdminUsersScreenProps = NativeStackScreenProps<AdminStackParamList, 'AdminUsers'>;

export default function AdminUsersScreen({ testID = 'screen-admin-users' }: AdminUsersScreenProps & { testID?: string }) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAdminUsersQuery({
    q: debouncedQ || undefined,
    page: 0,
    size: 50,
  });

  const list = data?.content ?? [];

  return (
    <View className="flex-1 bg-background" testID={testID}>
      <View className="border-b border-border px-md py-sm">
        <Text className="mb-xs text-sm text-textSecondary">{t('admin.filterPhone')}</Text>
        <View className="flex-row items-center">
          <TextInput
            className="min-h-[44px] mr-sm flex-1 rounded border border-border bg-surface px-md py-sm text-textPrimary"
            autoCapitalize="none"
            onChangeText={setQ}
            onSubmitEditing={() => setDebouncedQ(q.trim())}
            placeholder="+245…"
            value={q}
          />
          <Pressable
            className="justify-center rounded bg-primary px-md active:opacity-90"
            onPress={() => setDebouncedQ(q.trim())}
          >
            <Text className="font-semibold text-white">{t('admin.okSearch')}</Text>
          </Pressable>
        </View>
      </View>
      {isLoading && !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : null}
      {isError ? (
        <View className="flex-1 items-center justify-center px-md">
          <Text className="text-center text-error">{parseApiError(error)}</Text>
        </View>
      ) : null}
      {!isLoading && !isError ? (
        <FlatList
          className="flex-1 px-md"
          contentContainerStyle={{ paddingBottom: 24 }}
          data={list}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
          }
          ListEmptyComponent={
            <Text className="mt-lg text-center text-textSecondary">Aucun utilisateur.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              className="mb-sm rounded-default border border-border bg-surface p-md active:opacity-80"
              onPress={() => navigation.navigate('AdminUserDetail', { userId: item.id })}
            >
              <Text className="font-semibold text-textPrimary">{item.phoneNumber}</Text>
              <Text className="text-sm text-textSecondary">
                {t(`admin.roleLabels.${item.role}`, { defaultValue: item.role })}
              </Text>
            </Pressable>
          )}
        />
      ) : null}
    </View>
  );
}
