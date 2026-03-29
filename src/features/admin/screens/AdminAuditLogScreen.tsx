import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';

import type { AdminStackParamList } from '@/app/navigation/navigationTypes';
import { useGetAdminAuditLogQuery } from '@/features/admin/api/adminApi';
import { parseApiError } from '@/shared/utils/apiError';

export type AdminAuditLogScreenProps = NativeStackScreenProps<AdminStackParamList, 'AdminAuditLog'>;

export default function AdminAuditLogScreen({ testID = 'screen-admin-audit' }: AdminAuditLogScreenProps & { testID?: string }) {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch, isFetching } = useGetAdminAuditLogQuery({
    page: 0,
    size: 100,
  });

  const list = data?.content ?? [];

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
    <FlatList
      className="flex-1 bg-background px-md"
      contentContainerStyle={{ paddingBottom: 24, paddingTop: 12 }}
      data={list}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
      }
      ListEmptyComponent={
        <Text className="mt-lg text-center text-textSecondary">Aucune entrée.</Text>
      }
      renderItem={({ item }) => (
        <View className="mb-sm rounded-default border border-border bg-surface p-md">
          <Text className="text-xs text-textSecondary">{item.createdAt}</Text>
          <Text className="mt-xs text-sm text-textPrimary">
            {item.action} · {item.entityType}
            {item.entityId != null ? ` #${item.entityId}` : ''}
          </Text>
          <Text className="mt-xs text-xs text-textSecondary">{t('admin.auditActorLine', { id: item.actorUserId })}</Text>
          {item.detailsJson ? (
            <Text className="mt-sm font-mono text-xs text-textSecondary" numberOfLines={4}>
              {item.detailsJson}
            </Text>
          ) : null}
        </View>
      )}
      testID={testID}
    />
  );
}
