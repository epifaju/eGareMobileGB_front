import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';

import type { MainStackParamList } from '@/app/navigation/navigationTypes';
import { useValidateBoardingQrMutation } from '@/features/vehicle/api/vehicleApi';
import { intlLocaleFromLanguage } from '@/shared/lib/intlLocale';
import { verifyBoardingQrJwt } from '@/shared/lib/boardingQrJwt';
import { isOfflineQueuedError } from '@/shared/utils/offlineError';
import { parseApiError } from '@/shared/utils/apiError';

export type DriverScanBoardingScreenProps = NativeStackScreenProps<
  MainStackParamList,
  'DriverScanBoarding'
>;

function formatWhen(iso: string | null, locale: string): string {
  if (!iso) {
    return '';
  }
  try {
    return new Date(iso).toLocaleString(intlLocaleFromLanguage(locale), {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function DriverScanBoardingScreen({
  route,
  navigation,
  testID = 'screen-driver-scan-boarding',
}: DriverScanBoardingScreenProps & { testID?: string }) {
  const { t, i18n } = useTranslation();
  const { vehicleId, stationId, stationName, registrationCode, routeLabel } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [validateBoardingQr, { isLoading }] = useValidateBoardingQrMutation();
  const scanningPaused = useRef(false);

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (scanningPaused.current || isLoading) {
        return;
      }
      const token = data?.trim();
      if (!token) {
        return;
      }
      scanningPaused.current = true;
      void (async () => {
        try {
          const res = await validateBoardingQr({ vehicleId, stationId, qrToken: token }).unwrap();
          const seat =
            res.seatNumber != null ? String(res.seatNumber) : t('common.noneDash');
          const title = res.alreadyValidated
            ? t('scanBoarding.alreadyBoardedTitle')
            : t('scanBoarding.validatedTitle');
          const msg = [
            t('scanBoarding.registrationRoute', {
              registration: res.registrationCode,
              route: res.routeLabel,
            }),
            t('scanBoarding.seatLine', { seat }),
            res.validatedAt
              ? t('scanBoarding.timestampLine', {
                  date: formatWhen(res.validatedAt, i18n.language),
                })
              : '',
          ]
            .filter(Boolean)
            .join('\n');
          Alert.alert(title, msg, [
            {
              text: t('common.ok'),
              onPress: () => {
                scanningPaused.current = false;
              },
            },
          ]);
        } catch (e) {
          if (isOfflineQueuedError(e)) {
            const local = verifyBoardingQrJwt(token, vehicleId);
            if (local.ok) {
              const seat =
                local.seatNumber != null ? String(local.seatNumber) : t('common.noneDash');
              Alert.alert(
                t('scanBoarding.offlineTitle'),
                t('scanBoarding.offlineBody', {
                  registration: registrationCode,
                  route: routeLabel,
                  bookingId: local.bookingId,
                  seatLine: t('scanBoarding.seatLine', { seat }),
                  queueHint: t('scanBoarding.offlineQueueHint'),
                }),
                [
                  {
                    text: t('common.ok'),
                    onPress: () => {
                      scanningPaused.current = false;
                    },
                  },
                ],
              );
            } else {
              scanningPaused.current = false;
              Alert.alert(t('scanBoarding.scanDenied'), t(`boardingQr.${local.code}`));
            }
            return;
          }
          scanningPaused.current = false;
          Alert.alert(t('scanBoarding.scanDenied'), parseApiError(e));
        }
      })();
    },
    [isLoading, registrationCode, routeLabel, stationId, t, i18n.language, validateBoardingQr, vehicleId],
  );

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-md" testID={`${testID}-perm-loading`}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 justify-center bg-background px-md" testID={`${testID}-perm-denied`}>
        <Text className="text-center text-textPrimary">{t('scanBoarding.cameraRequired')}</Text>
        <Pressable
          accessibilityRole="button"
          className="mt-md self-center rounded-default bg-primary px-md py-sm"
          onPress={() => {
            void requestPermission();
          }}
        >
          <Text className="font-semibold text-white">{t('scanBoarding.allowCamera')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black" testID={testID}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        facing="back"
        onBarcodeScanned={onBarcodeScanned}
        style={{ flex: 1 }}
      />
      <View className="absolute left-0 right-0 top-0 bg-black/60 px-md pb-md pt-lg">
        <Text className="text-sm font-semibold text-white" numberOfLines={1}>
          {stationName}
        </Text>
        <Text className="mt-xs text-xs text-white/90" numberOfLines={2}>
          {registrationCode} · {routeLabel}
        </Text>
        <Text className="mt-sm text-xs text-white/80">{t('scanBoarding.scanInstructions')}</Text>
      </View>
      {isLoading ? (
        <View className="absolute bottom-8 left-0 right-0 items-center">
          <View className="rounded-default bg-black/70 px-md py-sm">
            <ActivityIndicator color="#fff" />
            <Text className="mt-xs text-center text-xs text-white">{t('scanBoarding.verifying')}</Text>
          </View>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        className="absolute bottom-8 right-md rounded-default border border-white/80 bg-black/50 px-md py-sm"
        onPress={() => {
          navigation.goBack();
        }}
      >
        <Text className="text-sm font-medium text-white">{t('scanBoarding.close')}</Text>
      </Pressable>
    </View>
  );
}
