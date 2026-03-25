import type { PageVehicle } from '@/features/vehicle/types';
import type { SearchVehiclesParams } from '@/features/search/types';

import { readJsonCache, writeJsonCache } from '@/shared/offline/jsonKvCache';

/** Clé stable pour le cache recherche (mêmes filtres → même entrée SQLite). */
export function searchVehiclesCacheKey(p: SearchVehiclesParams): string {
  const normalized: Record<string, string | number | boolean | undefined> = {
    page: p.page ?? 0,
    size: p.size ?? 50,
    sort: p.sort ?? 'departureScheduledAt,asc',
    stationId: p.stationId,
    q: p.q?.trim() || undefined,
    status: p.status,
    minFareXof: p.minFareXof,
    maxFareXof: p.maxFareXof,
    departureAfter: p.departureAfter,
    departureBefore: p.departureBefore,
    activeOnly: p.activeOnly,
  };
  const keys = Object.keys(normalized)
    .filter((k) => normalized[k as keyof typeof normalized] !== undefined)
    .sort();
  const sorted: Record<string, string | number | boolean> = {};
  for (const k of keys) {
    const v = normalized[k as keyof typeof normalized];
    if (v !== undefined) {
      sorted[k] = v;
    }
  }
  return `search:${JSON.stringify(sorted)}`;
}

export async function readSearchVehiclesCache(
  key: string,
): Promise<{ data: PageVehicle; updatedAt: number } | null> {
  return readJsonCache<PageVehicle>(key);
}

export async function writeSearchVehiclesCache(key: string, data: PageVehicle): Promise<void> {
  await writeJsonCache(key, data);
}
