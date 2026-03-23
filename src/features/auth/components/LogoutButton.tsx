import { Pressable, Text } from 'react-native';

import { logout } from '@/features/auth/store/authSlice';
import { useAppDispatch } from '@/shared/store/hooks';

export type LogoutButtonProps = {
  testID?: string;
};

export default function LogoutButton({ testID = 'auth-logout' }: LogoutButtonProps) {
  const dispatch = useAppDispatch();
  return (
    <Pressable
      onPress={() => {
        dispatch(logout());
      }}
      testID={testID}
    >
      <Text className="text-base font-medium text-white">Déconnexion</Text>
    </Pressable>
  );
}
