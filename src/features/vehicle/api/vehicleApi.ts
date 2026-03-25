import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { QueryReturnValue } from '@reduxjs/toolkit/query';

import type { BoardingValidationResponse } from '@/features/reservation/types';
import type {
  ManifestPassengerRow,
  MapVehiclesResponse,
  ReserveSeatResponse,
  SeatMap,
  StationVehiclesResponse,
  Vehicle,
  VehicleRevenue,
  VehicleStatus,
} from '@/features/vehicle/types';
import { baseApi } from '@/shared/api/baseApi';
import { verifyBoardingQrJwt } from '@/shared/lib/boardingQrJwt';
import { isCacheFresh } from '@/shared/offline/cacheUtils';
import { OFFLINE_CACHE_TTL_MS } from '@/shared/offline/constants';
import { enqueueBoardingScanLog } from '@/shared/offline/boardingScanLogs';
import { enqueueOfflineAction, offlineQueuedError } from '@/shared/offline/actionQueue';
import { isOnline } from '@/shared/offline/net';
import {
  mapVehiclesCacheKey,
  readMapVehiclesCache,
  writeMapVehiclesCache,
} from '@/shared/offline/mapVehiclesCache';
import {
  readStationVehiclesCache,
  stationVehiclesCacheKey,
  writeStationVehiclesCache,
} from '@/shared/offline/vehiclesOfflineCache';

/** Aligné sur les appels `useGetStationVehiclesQuery` + hook temps réel. */
export const STATION_VEHICLES_QUERY_DEFAULTS = {
  activeOnly: true as const,
  page: 0,
  size: 50,
};

export const vehicleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStationVehicles: builder.query<
      StationVehiclesResponse,
      { stationId: number; activeOnly?: boolean; page?: number; size?: number }
    >({
      async queryFn(
        {
          stationId,
          activeOnly = STATION_VEHICLES_QUERY_DEFAULTS.activeOnly,
          page = STATION_VEHICLES_QUERY_DEFAULTS.page,
          size = STATION_VEHICLES_QUERY_DEFAULTS.size,
        },
        _api,
        _extraOptions,
        baseQuery,
      ) {
        const cacheKey = stationVehiclesCacheKey(stationId, activeOnly, page, size);
        const online = await isOnline();
        if (online) {
          const result = (await baseQuery({
            url: `/api/stations/${stationId}/vehicles`,
            params: { page, size, activeOnly, sort: 'departureScheduledAt,asc' },
          })) as QueryReturnValue<
            StationVehiclesResponse['page'],
            FetchBaseQueryError,
            {} | undefined
          >;
          if (result.data) {
            await writeStationVehiclesCache(cacheKey, result.data);
            return {
              data: { page: result.data, cache: { source: 'network' as const } },
            } as QueryReturnValue<StationVehiclesResponse, FetchBaseQueryError, {} | undefined>;
          }
          if (result.error) {
            const cached = await readStationVehiclesCache(cacheKey);
            if (cached) {
              return {
                data: {
                  page: cached.data,
                  cache: { source: 'sqlite' as const, fallback: true, updatedAt: cached.updatedAt },
                },
              } as QueryReturnValue<StationVehiclesResponse, FetchBaseQueryError, {} | undefined>;
            }
          }
          return {
            error: result.error as FetchBaseQueryError,
          } as QueryReturnValue<StationVehiclesResponse, FetchBaseQueryError, {} | undefined>;
        }
        const cached = await readStationVehiclesCache(cacheKey);
        if (cached && isCacheFresh(cached.updatedAt, OFFLINE_CACHE_TTL_MS)) {
          return {
            data: { page: cached.data, cache: { source: 'sqlite' as const, updatedAt: cached.updatedAt } },
          } as QueryReturnValue<StationVehiclesResponse, FetchBaseQueryError, {} | undefined>;
        }
        if (cached) {
          return {
            data: {
              page: cached.data,
              cache: { source: 'sqlite' as const, stale: true, updatedAt: cached.updatedAt },
            },
          } as QueryReturnValue<StationVehiclesResponse, FetchBaseQueryError, {} | undefined>;
        }
        return {
          error: {
            status: 'FETCH_ERROR',
            error:
              'Aucune donnée véhicules hors ligne. Ouvrez cette gare une fois en ligne pour mettre en cache.',
          },
        } as QueryReturnValue<StationVehiclesResponse, FetchBaseQueryError, {} | undefined>;
      },
      providesTags: (_r, _e, { stationId }) => [{ type: 'Vehicle', id: stationId }],
    }),
    getVehicleSeatMap: builder.query<SeatMap, number>({
      query: (vehicleId) => ({
        url: `/api/vehicles/${vehicleId}/seat-map`,
      }),
    }),
    getMapVehicles: builder.query<MapVehiclesResponse, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const cacheKey = mapVehiclesCacheKey();
        const online = await isOnline();
        if (online) {
          const result = (await baseQuery({
            url: '/api/map/vehicles',
          })) as QueryReturnValue<Vehicle[], FetchBaseQueryError, {} | undefined>;
          if (result.data) {
            await writeMapVehiclesCache(cacheKey, result.data);
            return {
              data: { vehicles: result.data, cache: { source: 'network' as const } },
            } as QueryReturnValue<MapVehiclesResponse, FetchBaseQueryError, {} | undefined>;
          }
          if (result.error) {
            const cached = await readMapVehiclesCache(cacheKey);
            if (cached) {
              return {
                data: {
                  vehicles: cached.data,
                  cache: { source: 'sqlite' as const, fallback: true, updatedAt: cached.updatedAt },
                },
              } as QueryReturnValue<MapVehiclesResponse, FetchBaseQueryError, {} | undefined>;
            }
          }
          return {
            error: result.error as FetchBaseQueryError,
          } as QueryReturnValue<MapVehiclesResponse, FetchBaseQueryError, {} | undefined>;
        }
        const cached = await readMapVehiclesCache(cacheKey);
        if (cached && isCacheFresh(cached.updatedAt, OFFLINE_CACHE_TTL_MS)) {
          return {
            data: { vehicles: cached.data, cache: { source: 'sqlite' as const, updatedAt: cached.updatedAt } },
          } as QueryReturnValue<MapVehiclesResponse, FetchBaseQueryError, {} | undefined>;
        }
        if (cached) {
          return {
            data: {
              vehicles: cached.data,
              cache: { source: 'sqlite' as const, stale: true, updatedAt: cached.updatedAt },
            },
          } as QueryReturnValue<MapVehiclesResponse, FetchBaseQueryError, {} | undefined>;
        }
        return {
          error: {
            status: 'FETCH_ERROR',
            error:
              'Aucune donnée carte hors ligne. Ouvrez la carte une fois en ligne pour mettre en cache.',
          },
        } as QueryReturnValue<MapVehiclesResponse, FetchBaseQueryError, {} | undefined>;
      },
    }),
    reserveSeat: builder.mutation<
      ReserveSeatResponse,
      { vehicleId: number; stationId: number; seatNumber?: number }
    >({
      async queryFn({ vehicleId, stationId, seatNumber }, _api, _extraOptions, baseQuery) {
        const online = await isOnline();
        if (!online) {
          await enqueueOfflineAction({
            kind: 'RESERVE_SEAT',
            method: 'POST',
            path: `/api/vehicles/${vehicleId}/reserve-seat`,
            body: seatNumber != null ? { seatNumber } : undefined,
            meta: { stationId, vehicleId },
          });
          return { error: offlineQueuedError as unknown as FetchBaseQueryError };
        }
        return baseQuery({
          url: `/api/vehicles/${vehicleId}/reserve-seat`,
          method: 'POST',
          body: seatNumber != null ? { seatNumber } : undefined,
        }) as Promise<QueryReturnValue<ReserveSeatResponse, FetchBaseQueryError, {} | undefined>>;
      },
      invalidatesTags: (_r, _e, { stationId }) => [
        { type: 'Vehicle', id: stationId },
        { type: 'Booking', id: 'LIST' },
      ],
    }),
    updateVehicleStatus: builder.mutation<
      Vehicle,
      { vehicleId: number; stationId: number; status: VehicleStatus }
    >({
      async queryFn({ vehicleId, stationId, status }, _api, _extraOptions, baseQuery) {
        const online = await isOnline();
        if (!online) {
          await enqueueOfflineAction({
            kind: 'VEHICLE_STATUS',
            method: 'PUT',
            path: `/api/vehicles/${vehicleId}/status`,
            body: { status },
            meta: { stationId, vehicleId },
          });
          return { error: offlineQueuedError as unknown as FetchBaseQueryError };
        }
        return baseQuery({
          url: `/api/vehicles/${vehicleId}/status`,
          method: 'PUT',
          body: { status },
        }) as Promise<QueryReturnValue<Vehicle, FetchBaseQueryError, {} | undefined>>;
      },
      invalidatesTags: (_r, _e, { stationId }) => [{ type: 'Vehicle', id: stationId }],
    }),
    updateVehicleLocation: builder.mutation<
      Vehicle,
      { vehicleId: number; stationId: number; latitude: number; longitude: number }
    >({
      async queryFn({ vehicleId, stationId, latitude, longitude }, _api, _extraOptions, baseQuery) {
        const online = await isOnline();
        if (!online) {
          await enqueueOfflineAction({
            kind: 'VEHICLE_LOCATION',
            method: 'PUT',
            path: `/api/vehicles/${vehicleId}/location`,
            body: { latitude, longitude },
            meta: { stationId, vehicleId },
          });
          return { error: offlineQueuedError as unknown as FetchBaseQueryError };
        }
        return baseQuery({
          url: `/api/vehicles/${vehicleId}/location`,
          method: 'PUT',
          body: { latitude, longitude },
        }) as Promise<QueryReturnValue<Vehicle, FetchBaseQueryError, {} | undefined>>;
      },
      invalidatesTags: (_r, _e, { stationId }) => [{ type: 'Vehicle', id: stationId }],
    }),
    validateBoardingQr: builder.mutation<
      BoardingValidationResponse,
      { vehicleId: number; stationId: number; qrToken: string }
    >({
      async queryFn({ vehicleId, stationId, qrToken }, _api, _extraOptions, baseQuery) {
        const online = await isOnline();
        if (!online) {
          const local = verifyBoardingQrJwt(qrToken, vehicleId);
          if (!local.ok) {
            return {
              error: {
                status: 400,
                data: { message: local.reason },
              } as FetchBaseQueryError,
            };
          }
          await enqueueBoardingScanLog({
            vehicleId,
            stationId,
            qrToken,
            scannedAtMs: Date.now(),
          });
          return { error: offlineQueuedError as unknown as FetchBaseQueryError };
        }
        return baseQuery({
          url: `/api/vehicles/${vehicleId}/boarding/validate-qr`,
          method: 'POST',
          body: { qrToken },
        }) as Promise<
          QueryReturnValue<BoardingValidationResponse, FetchBaseQueryError, {} | undefined>
        >;
      },
      invalidatesTags: [{ type: 'Booking', id: 'LIST' }],
    }),
    getVehicleManifest: builder.query<ManifestPassengerRow[], number>({
      query: (vehicleId) => ({ url: `/api/vehicles/${vehicleId}/manifest` }),
    }),
    getVehicleRevenue: builder.query<
      VehicleRevenue,
      { vehicleId: number; from?: string; to?: string }
    >({
      query: ({ vehicleId, from, to }) => ({
        url: `/api/vehicles/${vehicleId}/revenue`,
        params:
          from !== undefined || to !== undefined
            ? { ...(from !== undefined ? { from } : {}), ...(to !== undefined ? { to } : {}) }
            : undefined,
      }),
    }),
  }),
});

export const {
  useGetStationVehiclesQuery,
  useGetVehicleSeatMapQuery,
  useGetMapVehiclesQuery,
  useReserveSeatMutation,
  useUpdateVehicleStatusMutation,
  useUpdateVehicleLocationMutation,
  useValidateBoardingQrMutation,
  useGetVehicleManifestQuery,
  useGetVehicleRevenueQuery,
} = vehicleApi;
