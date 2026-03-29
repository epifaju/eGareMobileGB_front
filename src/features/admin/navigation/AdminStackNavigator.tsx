import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { AdminStackParamList } from '@/app/navigation/navigationTypes';
import LogoutButton from '@/features/auth/components/LogoutButton';
import AdminAuditLogScreen from '@/features/admin/screens/AdminAuditLogScreen';
import AdminDashboardScreen from '@/features/admin/screens/AdminDashboardScreen';
import AdminStationFormScreen from '@/features/admin/screens/AdminStationFormScreen';
import AdminStationsScreen from '@/features/admin/screens/AdminStationsScreen';
import AdminUserDetailScreen from '@/features/admin/screens/AdminUserDetailScreen';
import AdminUsersScreen from '@/features/admin/screens/AdminUsersScreen';
import AdminVehicleFormScreen from '@/features/admin/screens/AdminVehicleFormScreen';
import AdminVehiclesScreen from '@/features/admin/screens/AdminVehiclesScreen';
import { colors } from '@/shared/constants/colors';

const Stack = createNativeStackNavigator<AdminStackParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#fff' as const,
  headerRight: () => <LogoutButton />,
};

export default function AdminStackNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator initialRouteName="AdminDashboard" screenOptions={stackScreenOptions}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: t('nav.administration') }} />
      <Stack.Screen name="AdminStations" component={AdminStationsScreen} options={{ title: t('nav.stations') }} />
      <Stack.Screen name="AdminStationForm" component={AdminStationFormScreen} options={{ title: t('nav.station') }} />
      <Stack.Screen name="AdminVehicles" component={AdminVehiclesScreen} options={{ title: t('nav.vehicles') }} />
      <Stack.Screen name="AdminVehicleForm" component={AdminVehicleFormScreen} options={{ title: t('nav.vehicle') }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: t('nav.users') }} />
      <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: t('nav.user') }} />
      <Stack.Screen name="AdminAuditLog" component={AdminAuditLogScreen} options={{ title: t('nav.audit') }} />
    </Stack.Navigator>
  );
}
