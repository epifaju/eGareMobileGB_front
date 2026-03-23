import { baseApi } from '@/shared/api/baseApi';

import type { PageLowBandwidthStation, PageStation, Station } from '@/features/station/types';

export const stationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStations: builder.query<PageStation, { page?: number; size?: number }>({
      query: ({ page = 0, size = 20 }) => ({
        url: '/api/stations',
        params: { page, size, sort: 'name,asc' },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.content.map(({ id }) => ({ type: 'Station' as const, id })),
              { type: 'Station', id: 'LIST' },
            ]
          : [{ type: 'Station', id: 'LIST' }],
      keepUnusedDataFor: 3600,
    }),
    getStation: builder.query<Station, number>({
      query: (id) => `/api/stations/${id}`,
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
