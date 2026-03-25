import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

export function isOfflineQueuedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const e = error as FetchBaseQueryError;
  if (e.status === 'FETCH_ERROR' && e.error === 'OFFLINE_QUEUED') {
    return true;
  }
  const data = e.data;
  if (data && typeof data === 'object' && 'offlineQueued' in data) {
    return (data as { offlineQueued?: boolean }).offlineQueued === true;
  }
  return false;
}
