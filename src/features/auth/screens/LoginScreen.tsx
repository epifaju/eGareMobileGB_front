import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AuthStackParamList } from '@/app/navigation/navigationTypes';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';
import { API_BASE_URL } from '@/shared/constants/env';
import { useLoginMutation } from '@/features/auth/api/authApi';
import { setAuthenticated } from '@/features/auth/store/authSlice';
import { tokenStorage } from '@/shared/lib/tokenStorage';
import { useAppDispatch } from '@/shared/store/hooks';
import { parseApiError } from '@/shared/utils/apiError';

export type LoginScreenProps = {
  testID?: string;
};

export default function LoginScreen({ testID = 'screen-login' }: LoginScreenProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const dispatch = useAppDispatch();
  const [phone, setPhone] = useState('+245');
  const [password, setPassword] = useState('');
  const [login, { isLoading }] = useLoginMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSubmit = async () => {
    setErrorMsg(null);
    try {
      const result = await login({
        phoneNumber: phone.trim(),
        password,
      }).unwrap();
      tokenStorage.setTokens(result.accessToken, result.refreshToken);
      dispatch(setAuthenticated(true));
    } catch (e: unknown) {
      setErrorMsg(parseApiError(e));
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background px-md py-lg"
      keyboardShouldPersistTaps="handled"
      testID={testID}
    >
      <Text className="mb-lg text-2xl font-bold text-textPrimary" testID={`${testID}-title`}>
        {t('auth.loginTitle')}
      </Text>

      <LanguageSwitcher testID={`${testID}-language`} />

      {__DEV__ ? (
        <Text
          className="mb-md rounded-default bg-surface px-sm py-xs text-xs text-textSecondary"
          selectable
          testID={`${testID}-api-url`}
        >
          {t('common.apiPrefix')}: {API_BASE_URL}
        </Text>
      ) : null}

      <Text className="mb-xs text-sm text-textSecondary">{t('auth.phoneE164')}</Text>
      <TextInput
        className="mb-md rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
        autoCapitalize="none"
        keyboardType="phone-pad"
        onChangeText={setPhone}
        placeholder="+245..."
        testID={`${testID}-input-phone`}
        value={phone}
      />

      <Text className="mb-xs text-sm text-textSecondary">{t('auth.password')}</Text>
      <TextInput
        className="mb-md rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
        autoCapitalize="none"
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        testID={`${testID}-input-password`}
        value={password}
      />

      {errorMsg ? (
        <Text className="mb-md text-sm text-error" testID={`${testID}-error`}>
          {errorMsg}
        </Text>
      ) : null}

      <Pressable
        className="mb-md items-center rounded-default bg-primary py-md"
        disabled={isLoading}
        onPress={() => {
          void onSubmit();
        }}
        testID={`${testID}-submit`}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" testID={`${testID}-loading`} />
        ) : (
          <Text className="font-semibold text-white">{t('auth.signIn')}</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => {
          navigation.navigate('Register');
        }}
        testID={`${testID}-link-register`}
      >
        <Text className="text-center text-primary underline">{t('auth.createAccount')}</Text>
      </Pressable>
    </ScrollView>
  );
}
