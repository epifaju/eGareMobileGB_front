import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

import type { ApiErrorBody } from '@/features/auth/types';

export function parseApiError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const e = error as FetchBaseQueryError;
    if (e.status === 'FETCH_ERROR' && 'error' in e && e.error) {
      return String(e.error);
    }
    if ('data' in e && e.data) {
      const data = e.data as ApiErrorBody | undefined;
      if (data?.message) {
        return data.message;
      }
    }
  }
  return 'Une erreur est survenue';
}
