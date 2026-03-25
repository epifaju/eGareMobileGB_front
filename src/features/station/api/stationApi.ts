import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { QueryReturnValue } from '@reduxjs/toolkit/query';

import type { PageLowBandwidthStation, PageStation, Station, StationsResponse } from '@/features/station/types';
import { baseApi } from '@/shared/api/baseApi';
import { STATIONS_CACHE_TTL_MS } from '@/shared/offline/constants';
import { isOnline } from '@/shared/offline/net';
import {
  isCacheFresh,
  readStationCache,
  readStationsCache,
  stationCacheKey,
  writeStationCache,
  stationsCacheKey,
  writeStationsCache,
} from '@/shared/offline/stationsCache';

export const stationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStations: builder.query<StationsResponse, { page?: number; size?: number }>({
      async queryFn({ page = 0, size = 20 }, _api, _extraOptions, baseQuery) {
        const cacheKey = stationsCacheKey(page, size);
        const online = await isOnline();
        if (online) {
          const result = (await baseQuery({
            url: '/api/stations',
            params: { page, size, sort: 'name,asc' },
          })) as QueryReturnValue<PageStation, FetchBaseQueryError, {} | undefined>;
          if (result.data) {
            await writeStationsCache(cacheKey, result.data);
            return {
              data: { page: result.data, cache: { source: 'network' as const } },
            } as QueryReturnValue<StationsResponse, FetchBaseQueryError, {} | undefined>;
          }
          if (result.error) {
            const cached = await readStationsCache(cacheKey);
            if (cached) {
              return {
                data: {
                  page: cached.data,
                  cache: { source: 'sqlite' as const, fallback: true, updatedAt: cached.updatedAt },
                },
              } as QueryReturnValue<StationsResponse, FetchBaseQueryError, {} | undefined>;
            }
          }
          return {
            error: result.error as FetchBaseQueryError,
          } as QueryReturnValue<StationsResponse, FetchBaseQueryError, {} | undefined>;
        }
        const cached = await readStationsCache(cacheKey);
        if (cached && isCacheFresh(cached.updatedAt, STATIONS_CACHE_TTL_MS)) {
          return {
            data: {
              page: cached.data,
              cache: { source: 'sqlite' as const, updatedAt: cached.updatedAt },
            },
          } as QueryReturnValue<StationsResponse, FetchBaseQueryError, {} | undefined>;
        }
        if (cached) {
          return {
            data: {
              page: cached.data,
              cache: { source: 'sqlite' as const, stale: true, updatedAt: cached.updatedAt },
            },
          } as QueryReturnValue<StationsResponse, FetchBaseQueryError, {} | undefined>;
        }
        return {
          error: {
            status: 'FETCH_ERROR',
            error:
              'Aucune donnée gare hors ligne. Connectez-vous au moins une fois pour mettre en cache.',
          },
        } as QueryReturnValue<StationsResponse, FetchBaseQueryError, {} | undefined>;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.page.content.map(({ id }) => ({ type: 'Station' as const, id })),
              { type: 'Station', id: 'LIST' },
            ]
          : [{ type: 'Station', id: 'LIST' }],
      keepUnusedDataFor: 3600,
    }),
    getStation: builder.query<Station, number>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const cacheKey = stationCacheKey(id);
        const online = await isOnline();
        if (online) {
          const result = (await baseQuery({
            url: `/api/stations/${id}`,
          })) as QueryReturnValue<Station, FetchBaseQueryError, {} | undefined>;
          if (result.data) {
            await writeStationCache(cacheKey, result.data);
          }
          if (result.error) {
            const cached = await readStationCache(cacheKey);
            if (cached) {
              return {
                data: cached.data,
                meta: { cacheSource: 'sqlite' as const, fallback: true } as const,
              } as QueryReturnValue<Station, FetchBaseQueryError, {} | undefined>;
            }
          }
          return result as QueryReturnValue<Station, FetchBaseQueryError, {} | undefined>;
        }
        const cached = await readStationCache(cacheKey);
        if (cached && isCacheFresh(cached.updatedAt, STATIONS_CACHE_TTL_MS)) {
          return {
            data: cached.data,
            meta: { cacheSource: 'sqlite' as const },
          } as QueryReturnValue<Station, FetchBaseQueryError, {} | undefined>;
        }
        if (cached) {
          return {
            data: cached.data,
            meta: { cacheSource: 'sqlite' as const, stale: true },
          } as QueryReturnValue<Station, FetchBaseQueryError, {} | undefined>;
        }
        return {
          error: {
            status: 'FETCH_ERROR',
            error:
              'Aucune donnée gare hors ligne. Connectez-vous au moins une fois pour mettre en cache.',
          },
        } as QueryReturnValue<Station, FetchBaseQueryError, {} | undefined>;
      },
      providesTags: (_r, _e, id) => [{ type: 'Station', id }],
    }),
    getStationsLowBandwidth: builder.query<PageLowBandwidthStation, { page?: number; size?: number }>({
      query: ({ page = 0, size = 20 }) => ({
        url: '/api/stations/low-bandwidth',
        params: { page, size, sort: 'name,asc' },
      }),
      keepUnusedDataFor: 1800,
    }),
  }),
});

export const { useGetStationsQuery, useGetStationQuery, useGetStationsLowBandwidthQuery } = stationApi;
