import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import type { ApiErrorBody } from '@/features/auth/types';
import { i18n } from '@/shared/i18n';

const API_ERROR_BY_CODE: Record<string, string> = {
  BOOKING_EXISTS: 'bookingErrors.bookingExistsOnVehicle',
};

export function parseApiError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const e = error as FetchBaseQueryError;
    if (e.status === 'FETCH_ERROR' && 'error' in e && e.error) {
      return String(e.error);
    }
    if ('data' in e && e.data) {
      const data = e.data as ApiErrorBody | undefined;
      const key = data?.code ? API_ERROR_BY_CODE[data.code] : undefined;
      if (key) {
        return i18n.t(key);
      }
      if (data?.message) {
        return data.message;
      }
    }
  }
  return i18n.t('common.genericApiError');
}
