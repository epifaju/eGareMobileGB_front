import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { QueryReturnValue } from '@reduxjs/toolkit/query';

import type {
  MyBookingsResponse,
  PageBooking,
  PaymentInitiateRequestBody,
  PaymentInitiateResponse,
} from '@/features/reservation/types';
import { baseApi } from '@/shared/api/baseApi';
import { isCacheFresh } from '@/shared/offline/cacheUtils';
import { OFFLINE_CACHE_TTL_MS } from '@/shared/offline/constants';
import {
  myBookingsCacheKey,
  readMyBookingsCache,
  writeMyBookingsCache,
} from '@/shared/offline/bookingsOfflineCache';
import { enqueueOfflineAction, offlineQueuedError } from '@/shared/offline/actionQueue';
import { isOnline } from '@/shared/offline/net';

export const bookingApi = baseApi.injectEndpoints({
  // Avoid crashes when Metro/HMR evaluates this module more than once.
  overrideExisting: true,
  endpoints: (builder) => ({
    getMyBookings: builder.query<
      MyBookingsResponse,
      { includeCancelled: boolean; page: number; size: number }
    >({
      async queryFn({ includeCancelled, page, size }, _api, _extraOptions, baseQuery) {
        const cacheKey = myBookingsCacheKey(includeCancelled, page, size);
        const online = await isOnline();
        if (online) {
          const result = (await baseQuery({
            url: '/api/me/bookings',
            params: { includeCancelled, page, size },
          })) as QueryReturnValue<PageBooking, FetchBaseQueryError, {} | undefined>;
          if (result.data) {
            await writeMyBookingsCache(cacheKey, result.data);
            return {
              data: { page: result.data, cache: { source: 'network' as const } },
            } as QueryReturnValue<MyBookingsResponse, FetchBaseQueryError, {} | undefined>;
          }
          if (result.error) {
            const cached = await readMyBookingsCache(cacheKey);
            if (cached) {
              return {
                data: {
                  page: cached.data,
                  cache: { source: 'sqlite' as const, fallback: true, updatedAt: cached.updatedAt },
                },
              } as QueryReturnValue<MyBookingsResponse, FetchBaseQueryError, {} | undefined>;
            }
          }
          return {
            error: result.error as FetchBaseQueryError,
          } as QueryReturnValue<MyBookingsResponse, FetchBaseQueryError, {} | undefined>;
        }
        const cached = await readMyBookingsCache(cacheKey);
        if (cached && isCacheFresh(cached.updatedAt, OFFLINE_CACHE_TTL_MS)) {
          return {
            data: { page: cached.data, cache: { source: 'sqlite' as const, updatedAt: cached.updatedAt } },
          } as QueryReturnValue<MyBookingsResponse, FetchBaseQueryError, {} | undefined>;
        }
        if (cached) {
          return {
            data: {
              page: cached.data,
              cache: { source: 'sqlite' as const, stale: true, updatedAt: cached.updatedAt },
            },
          } as QueryReturnValue<MyBookingsResponse, FetchBaseQueryError, {} | undefined>;
        }
        return {
          error: {
            status: 'FETCH_ERROR',
            error:
              'Aucune réservation en cache. Connectez-vous une fois en ligne pour afficher billets et QR.',
          },
        } as QueryReturnValue<MyBookingsResponse, FetchBaseQueryError, {} | undefined>;
      },
      providesTags: [{ type: 'Booking', id: 'LIST' }],
    }),
    cancelBooking: builder.mutation<void, number>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const online = await isOnline();
        if (!online) {
          await enqueueOfflineAction({
            kind: 'CANCEL_BOOKING',
            method: 'DELETE',
            path: `/api/bookings/${id}`,
          });
          return { error: offlineQueuedError as unknown as FetchBaseQueryError };
        }
        return baseQuery({
          url: `/api/bookings/${id}`,
          method: 'DELETE',
        }) as Promise<QueryReturnValue<void, FetchBaseQueryError, {} | undefined>>;
      },
      invalidatesTags: [{ type: 'Booking', id: 'LIST' }],
    }),
    initiatePayment: builder.mutation<
      PaymentInitiateResponse,
      { bookingId: number; body: PaymentInitiateRequestBody; idempotencyKey?: string }
    >({
      query: ({ bookingId, body, idempotencyKey }) => ({
        url: `/api/bookings/${bookingId}/payment/initiate`,
        method: 'POST',
        body,
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      }),
      invalidatesTags: [{ type: 'Booking', id: 'LIST' }],
    }),
  }),
});

export const { useGetMyBookingsQuery, useCancelBookingMutation, useInitiatePaymentMutation } =
  bookingApi;
