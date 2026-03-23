import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

import RootNavigator from '@/app/navigation/RootNavigator';
import { store } from '@/shared/store/store';

export type AppProps = {
  testID?: string;
};

/**
 * Racine : Redux + navigation + Safe Area (Sprint 1).
 */
export default function App({ testID = 'app-root' }: AppProps) {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <View className="flex-1" testID={testID}>
          <RootNavigator />
          <StatusBar style="auto" />
        </View>
      </SafeAreaProvider>
    </Provider>
  );
}
