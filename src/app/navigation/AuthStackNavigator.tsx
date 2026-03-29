import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import type { AuthStackParamList } from '@/app/navigation/navigationTypes';
import LoginScreen from '@/features/auth/screens/LoginScreen';
import RegisterScreen from '@/features/auth/screens/RegisterScreen';
import { colors } from '@/shared/constants/colors';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStackNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: t('auth.loginTitle') }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: t('auth.registerTitle') }} />
    </Stack.Navigator>
  );
}
