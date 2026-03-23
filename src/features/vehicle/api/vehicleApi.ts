import type { PageVehicle, SeatMap, Vehicle, VehicleStatus } from '@/features/vehicle/types';
import { baseApi } from '@/shared/api/baseApi';

/** Aligné sur les appels `useGetStationVehiclesQuery` + hook temps réel. */
export const STATION_VEHICLES_QUERY_DEFAULTS = {
  activeOnly: true as const,
  page: 0,
  size: 50,
};

export const vehicleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStationVehicles: builder.query<
      PageVehicle,
      { stationId: number; activeOnly?: boolean; page?: number; size?: number }
    >({
      query: ({
        stationId,
        activeOnly = STATION_VEHICLES_QUERY_DEFAULTS.activeOnly,
        page = STATION_VEHICLES_QUERY_DEFAULTS.page,
        size = STATION_VEHICLES_QUERY_DEFAULTS.size,
      }) => ({
        url: `/api/stations/${stationId}/vehicles`,
        params: { page, size, activeOnly, sort: 'departureScheduledAt,asc' },
      }),
      providesTags: (_r, _e, { stationId }) => [{ type: 'Vehicle', id: stationId }],
    }),
    getVehicleSeatMap: builder.query<SeatMap, number>({
      query: (vehicleId) => ({
        url: `/api/vehicles/${vehicleId}/seat-map`,
      }),
    }),
    getMapVehicles: builder.query<Vehicle[], void>({
      query: () => ({ url: '/api/map/vehicles' }),
    }),
    reserveSeat: builder.mutation<
      Vehicle,
      { vehicleId: number; stationId: number; seatNumber?: number }
    >({
      query: ({ vehicleId, seatNumber }) => ({
        url: `/api/vehicles/${vehicleId}/reserve-seat`,
        method: 'POST',
        body: seatNumber != null ? { seatNumber } : undefined,
      }),
      invalidatesTags: (_r, _e, { stationId }) => [
        { type: 'Vehicle', id: stationId },
        { type: 'Booking', id: 'LIST' },
      ],
    }),
    updateVehicleStatus: builder.mutation<
      Vehicle,
      { vehicleId: number; stationId: number; status: VehicleStatus }
    >({
      query: ({ vehicleId, status }) => ({
        url: `/api/vehicles/${vehicleId}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (_r, _e, { stationId }) => [{ type: 'Vehicle', id: stationId }],
    }),
    updateVehicleLocation: builder.mutation<
      Vehicle,
      { vehicleId: number; stationId: number; latitude: number; longitude: number }
    >({
      query: ({ vehicleId, latitude, longitude }) => ({
        url: `/api/vehicles/${vehicleId}/location`,
        method: 'PUT',
        body: { latitude, longitude },
      }),
      invalidatesTags: (_r, _e, { stationId }) => [{ type: 'Vehicle', id: stationId }],
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
} = vehicleApi;
