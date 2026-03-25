import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { logout } from '@/features/auth/store/authSlice';
import { maybeRefreshBeforeExpiry, refreshAccessToken } from '@/shared/api/refreshAccessToken';
import { API_BASE_URL } from '@/shared/constants/env';
import { tokenStorage } from '@/shared/lib/tokenStorage';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  /** Async : si l’access a disparu mais le refresh est encore là, on récupère un access avant la requête. */
  prepareHeaders: async (headers) => {
    let token = tokenStorage.getAccessToken();
    if (!token && tokenStorage.getRefreshToken()) {
      await refreshAccessToken();
      token = tokenStorage.getAccessToken();
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

function isPublicAuthPath(args: string | FetchArgs): boolean {
  const url = typeof args === 'string' ? args : args.url;
  if (!url || typeof url !== 'string') {
    return false;
  }
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/otp')
  );
}

export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  await maybeRefreshBeforeExpiry();
  let result = await rawBaseQuery(args, api, extraOptions);
  const status = result.error?.status;
  const is401 = status === 401;
  if (result.error && is401) {
    if (isPublicAuthPath(args)) {
      return result;
    }
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else if (tokenStorage.getRefreshToken()) {
      api.dispatch(logout());
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Station', 'Vehicle', 'Auth', 'Booking'],
  endpoints: () => ({}),
});
