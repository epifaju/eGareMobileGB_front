import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { QueryReturnValue } from '@reduxjs/toolkit/query';

import type { PageVehicle, Vehicle } from '@/features/vehicle/types';
import type { DestinationSuggestion, SearchVehiclesParams } from '@/features/search/types';
import { baseApi } from '@/shared/api/baseApi';
import { isCacheFresh } from '@/shared/offline/cacheUtils';
import { OFFLINE_CACHE_TTL_MS } from '@/shared/offline/constants';
import { isOnline } from '@/shared/offline/net';
import {
  destinationSuggestCacheKey,
  readDestinationSuggestCache,
  writeDestinationSuggestCache,
} from '@/shared/offline/destinationsOfflineCache';
import {
  readSearchVehiclesCache,
  searchVehiclesCacheKey,
  writeSearchVehiclesCache,
} from '@/shared/offline/searchOfflineCache';

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

/** Assure un PageVehicle exploitable (évite listes vides si la forme JSON diverge). */
function normalizePageVehicle(raw: unknown): PageVehicle {
  const empty: PageVehicle = {
    content: [],
    totalElements: 0,
    totalPages: 0,
    size: 0,
    number: 0,
  };
  if (raw == null || typeof raw !== 'object') {
    return empty;
  }
  const o = raw as Record<string, unknown>;
  const content = o.content;
  if (Array.isArray(content)) {
    return {
      content: content as Vehicle[],
      totalElements: Number(o.totalElements ?? content.length),
      totalPages: Number(o.totalPages ?? 0),
      size: Number(o.size ?? content.length),
      number: Number(o.number ?? 0),
    };
  }
  const page = o.page as Record<string, unknown> | undefined;
  if (page && Array.isArray(page.content)) {
    const c = page.content as Vehicle[];
    return {
      content: c,
      totalElements: Number(page.totalElements ?? c.length),
      totalPages: Number(page.totalPages ?? 0),
      size: Number(page.size ?? c.length),
      number: Number(page.number ?? 0),
    };
  }
  return empty;
}

export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDestinationSuggestions: builder.query<DestinationSuggestion[], string>({
      async queryFn(q, _api, _extraOptions, baseQuery) {
        const trimmed = q?.trim() ?? '';
        if (trimmed.length < 2) {
          return { data: [] } as QueryReturnValue<DestinationSuggestion[], FetchBaseQueryError, {} | undefined>;
        }
        const cacheKey = destinationSuggestCacheKey(trimmed);
        const online = await isOnline();
        if (online) {
          const result = (await baseQuery({
            url: '/api/destinations/suggest',
            params: { q: trimmed },
          })) as QueryReturnValue<DestinationSuggestion[], FetchBaseQueryError, {} | undefined>;
          if (result.data) {
            await writeDestinationSuggestCache(cacheKey, result.data);
          }
          if (result.error) {
            const cached = await readDestinationSuggestCache(cacheKey);
            if (cached) {
              return {
                data: cached.data,
                meta: { cacheSource: 'sqlite' as const, fallback: true } as const,
              } as QueryReturnValue<DestinationSuggestion[], FetchBaseQueryError, {} | undefined>;
            }
          }
          return result as QueryReturnValue<DestinationSuggestion[], FetchBaseQueryError, {} | undefined>;
        }
        const cached = await readDestinationSuggestCache(cacheKey);
        if (cached && isCacheFresh(cached.updatedAt, OFFLINE_CACHE_TTL_MS)) {
          return {
            data: cached.data,
            meta: { cacheSource: 'sqlite' as const },
          } as QueryReturnValue<DestinationSuggestion[], FetchBaseQueryError, {} | undefined>;
        }
        if (cached) {
          return {
            data: cached.data,
            meta: { cacheSource: 'sqlite' as const, stale: true },
          } as QueryReturnValue<DestinationSuggestion[], FetchBaseQueryError, {} | undefined>;
        }
        return { data: [] } as QueryReturnValue<DestinationSuggestion[], FetchBaseQueryError, {} | undefined>;
      },
    }),
    searchVehicles: builder.query<PageVehicle, SearchVehiclesParams>({
      async queryFn(arg, _api, _extraOptions, baseQuery) {
        const cacheKey = searchVehiclesCacheKey(arg);
        /**
         * Toujours tenter le réseau en premier : NetInfo peut annoncer « hors ligne » alors que
         * l’émulateur / l’appareil joint quand même l’API (10.0.2.2, LAN, etc.) — l’ancien branchement
         * « offline d’abord » renvoyait alors un cache vide sans appeler le backend.
         */
        const result = (await baseQuery({
          url: '/api/search/vehicles',
          params: buildSearchParams(arg),
        })) as QueryReturnValue<unknown, FetchBaseQueryError, {} | undefined>;

        if (result.error) {
          const cached = await readSearchVehiclesCache(cacheKey);
          if (cached) {
            return {
              data: normalizePageVehicle(cached.data),
              meta: { cacheSource: 'sqlite' as const, fallback: true } as const,
            } as QueryReturnValue<PageVehicle, FetchBaseQueryError, {} | undefined>;
          }
          return result as QueryReturnValue<PageVehicle, FetchBaseQueryError, {} | undefined>;
        }

        if (result.data !== undefined) {
          const page = normalizePageVehicle(result.data);
          await writeSearchVehiclesCache(cacheKey, page);
          return {
            data: page,
          } as QueryReturnValue<PageVehicle, FetchBaseQueryError, {} | undefined>;
        }

        return {
          error: {
            status: 'FETCH_ERROR',
            error: 'Réponse recherche vide ou invalide.',
          },
        } as QueryReturnValue<PageVehicle, FetchBaseQueryError, {} | undefined>;
      },
    }),
  }),
});

export const { useLazyGetDestinationSuggestionsQuery, useLazySearchVehiclesQuery } = searchApi;
