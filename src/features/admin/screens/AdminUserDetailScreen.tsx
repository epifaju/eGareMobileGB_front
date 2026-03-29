import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import type { AdminStackParamList } from '@/app/navigation/navigationTypes';
import { useGetAdminUserByIdQuery, useUpdateAdminUserRoleMutation } from '@/features/admin/api/adminApi';
import type { UpdateUserRoleBody } from '@/features/admin/types';
import { parseApiError } from '@/shared/utils/apiError';

const ROLES: UpdateUserRoleBody['role'][] = ['USER', 'AGENT', 'DRIVER', 'ADMIN'];

export type AdminUserDetailScreenProps = NativeStackScreenProps<AdminStackParamList, 'AdminUserDetail'>;

export default function AdminUserDetailScreen({ navigation, route, testID = 'screen-admin-user-detail' }: AdminUserDetailScreenProps & { testID?: string }) {
  const { t } = useTranslation();
  const { userId } = route.params;
  const { data, isLoading, isError, error, refetch } = useGetAdminUserByIdQuery(userId);
  const [patchRole, { isLoading: isPatching }] = useUpdateAdminUserRoleMutation();

  useEffect(() => {
    if (data?.phoneNumber) {
      navigation.setOptions({ title: data.phoneNumber });
    }
  }, [navigation, data?.phoneNumber]);

  async function setRole(role: UpdateUserRoleBody['role']) {
    try {
      await patchRole({ userId, body: { role } }).unwrap();
      void refetch();
      Alert.alert(t('common.ok'), t('admin.roleUpdated', { role: t(`admin.roleLabels.${role}`) }));
    } catch (e) {
      Alert.alert(t('common.error'), parseApiError(e));
    }
  }

  if (isLoading && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-background" testID={`${testID}-loading`}>
        <ActivityIndicator size="large" />
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

  return (
    <View className="flex-1 bg-background px-md pt-md" testID={testID}>
      <Text className="text-lg font-semibold text-textPrimary">{data.phoneNumber}</Text>
      <Text className="mt-xs text-sm text-textSecondary">ID {data.id}</Text>
      <Text className="mt-sm text-textPrimary">
        {t('admin.currentRole')}: {t(`admin.roleLabels.${data.role}`, { defaultValue: data.role })}
      </Text>
      <Text className="mb-md mt-lg text-sm font-semibold text-textPrimary">{t('admin.changeRole')}</Text>
      {ROLES.map((r) => (
        <Pressable
          key={r}
          className={`mb-sm rounded-default border px-md py-md active:opacity-80 ${data.role === r ? 'border-primary bg-surface' : 'border-border bg-surface'}`}
          disabled={isPatching || data.role === r}
          onPress={() => void setRole(r)}
        >
          <Text className="text-center font-semibold text-textPrimary">
            {t(`admin.roleLabels.${r}`, { defaultValue: r })}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
