import type { PageVehicle } from '@/features/vehicle/types';
import type { DestinationSuggestion, SearchVehiclesParams } from '@/features/search/types';
import { baseApi } from '@/shared/api/baseApi';

function buildSearchParams(p: SearchVehiclesParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {
    page: p.page ?? 0,
    size: p.size ?? 50,
    sort: p.sort ?? 'departureScheduledAt,asc',
  };
  if (p.stationId !== undefined) {
    out.stationId = p.stationId;
  }
  if (p.q !== undefined && p.q.trim() !== '') {
    out.q = p.q.trim();
  }
  if (p.status !== undefined) {
    out.status = p.status;
  }
  if (p.minFareXof !== undefined) {
    out.minFareXof = p.minFareXof;
  }
  if (p.maxFareXof !== undefined) {
    out.maxFareXof = p.maxFareXof;
  }
  if (p.departureAfter !== undefined) {
    out.departureAfter = p.departureAfter;
  }
  if (p.departureBefore !== undefined) {
    out.departureBefore = p.departureBefore;
  }
  if (p.activeOnly !== undefined) {
    out.activeOnly = p.activeOnly;
  }
  return out;
}

export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDestinationSuggestions: builder.query<DestinationSuggestion[], string>({
      query: (q) => ({
        url: '/api/destinations/suggest',
        params: { q },
      }),
    }),
    searchVehicles: builder.query<PageVehicle, SearchVehiclesParams>({
      query: (p) => ({
        url: '/api/search/vehicles',
        params: buildSearchParams(p),
      }),
    }),
  }),
});

export const { useLazyGetDestinationSuggestionsQuery, useLazySearchVehiclesQuery } = searchApi;
