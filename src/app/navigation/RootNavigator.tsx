import { NavigationContainer } from '@react-navigation/native';
import { useEffect } from 'react';
import { View } from 'react-native';

import AuthStackNavigator from '@/app/navigation/AuthStackNavigator';
import MainStackNavigator from '@/app/navigation/MainStackNavigator';
import { hydrateFromStorage } from '@/features/auth/store/authSlice';
import OfflineBanner from '@/shared/components/OfflineBanner';
import { useAppDispatch, useAppSelector } from '@/shared/store/hooks';

export default function RootNavigator() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  useEffect(() => {
    dispatch(hydrateFromStorage());
  }, [dispatch]);

  return (
    <View className="flex-1" testID="root-navigator">
      <OfflineBanner />
      <View className="flex-1">
        <NavigationContainer>
          {isAuthenticated ? <MainStackNavigator /> : <AuthStackNavigator />}
        </NavigationContainer>
      </View>
    </View>
  );
}
