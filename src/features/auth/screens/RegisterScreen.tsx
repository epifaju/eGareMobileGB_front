import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { useRegisterMutation, useRequestOtpMutation } from '@/features/auth/api/authApi';
import { setAuthenticated } from '@/features/auth/store/authSlice';
import { tokenStorage } from '@/shared/lib/tokenStorage';
import LanguageSwitcher from '@/shared/components/LanguageSwitcher';
import { useAppDispatch } from '@/shared/store/hooks';
import { parseApiError } from '@/shared/utils/apiError';

export type RegisterScreenProps = {
  testID?: string;
};

export default function RegisterScreen({ testID = 'screen-register' }: RegisterScreenProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [phone, setPhone] = useState('+245');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [registerAsDriver, setRegisterAsDriver] = useState(false);
  const [requestOtp, { isLoading: otpLoading }] = useRequestOtpMutation();
  const [register, { isLoading: regLoading }] = useRegisterMutation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [otpHint, setOtpHint] = useState<string | null>(null);

  const onRequestOtp = async () => {
    setErrorMsg(null);
    setOtpHint(null);
    try {
      const res = await requestOtp({ phoneNumber: phone.trim() }).unwrap();
      if (res.debugOtp) {
        setOtpHint(t('auth.otpDev', { code: res.debugOtp }));
      } else {
        setOtpHint(t('auth.otpSent'));
      }
    } catch (e: unknown) {
      setErrorMsg(parseApiError(e));
    }
  };

  const onSubmit = async () => {
    setErrorMsg(null);
    try {
      const result = await register({
        phoneNumber: phone.trim(),
        password,
        otp: otp.trim(),
        ...(registerAsDriver ? { registerAsDriver: true } : {}),
      }).unwrap();
      tokenStorage.setTokens(result.accessToken, result.refreshToken);
      dispatch(setAuthenticated(true));
    } catch (e: unknown) {
      setErrorMsg(parseApiError(e));
    }
  };

  const busy = otpLoading || regLoading;

  return (
    <ScrollView
      className="flex-1 bg-background px-md py-lg"
      keyboardShouldPersistTaps="handled"
      testID={testID}
    >
      <Text className="mb-lg text-2xl font-bold text-textPrimary" testID={`${testID}-title`}>
        {t('auth.registerTitle')}
      </Text>

      <LanguageSwitcher testID={`${testID}-language`} />

      <Text className="mb-xs text-sm text-textSecondary">{t('auth.phoneE164')}</Text>
      <TextInput
        className="mb-md rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
        autoCapitalize="none"
        keyboardType="phone-pad"
        onChangeText={setPhone}
        testID={`${testID}-input-phone`}
        value={phone}
      />

      <Pressable
        className="mb-md items-center rounded-default border border-primary bg-surface py-md"
        disabled={otpLoading}
        onPress={() => {
          void onRequestOtp();
        }}
        testID={`${testID}-request-otp`}
      >
        {otpLoading ? (
          <ActivityIndicator color="#1E3A8A" />
        ) : (
          <Text className="font-semibold text-primary">{t('auth.requestSmsCode')}</Text>
        )}
      </Pressable>

      {otpHint ? (
        <Text className="mb-md text-sm text-textSecondary" testID={`${testID}-otp-hint`}>
          {otpHint}
        </Text>
      ) : null}

      <Text className="mb-xs text-sm text-textSecondary">{t('auth.otpCode')}</Text>
      <TextInput
        className="mb-md rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
        keyboardType="number-pad"
        maxLength={6}
        onChangeText={setOtp}
        placeholder="123456"
        testID={`${testID}-input-otp`}
        value={otp}
      />

      <Text className="mb-xs text-sm text-textSecondary">{t('auth.passwordMin8')}</Text>
      <TextInput
        className="mb-md rounded-default border border-border bg-surface px-md py-sm text-textPrimary"
        onChangeText={setPassword}
        secureTextEntry
        testID={`${testID}-input-password`}
        value={password}
      />

      <View className="mb-md flex-row items-center justify-between gap-md rounded-default border border-border bg-surface px-md py-sm">
        <View className="flex-1 pr-sm">
          <Text className="text-sm font-medium text-textPrimary">{t('auth.driverAccount')}</Text>
          <Text className="mt-xs text-xs text-textSecondary">{t('auth.driverAccountHint')}</Text>
        </View>
        <Switch
          accessibilityLabel={t('auth.driverAccount')}
          onValueChange={setRegisterAsDriver}
          testID={`${testID}-switch-driver`}
          value={registerAsDriver}
        />
      </View>

      {errorMsg ? (
        <Text className="mb-md text-sm text-error" testID={`${testID}-error`}>
          {errorMsg}
        </Text>
      ) : null}

      <Pressable
        className="items-center rounded-default bg-primary py-md"
        disabled={busy}
        onPress={() => {
          void onSubmit();
        }}
        testID={`${testID}-submit`}
      >
        {regLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="font-semibold text-white">{t('auth.signUp')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
