import type { PageStation } from '@/features/station/types';
import type { Station } from '@/features/station/types';

import { isCacheFresh } from '@/shared/offline/cacheUtils';
import { readJsonCache, writeJsonCache } from '@/shared/offline/jsonKvCache';

export { isCacheFresh };

export function stationsCacheKey(page: number, size: number): string {
  return `stations:${page}:${size}`;
}

export function stationCacheKey(id: number): string {
  return `station:${id}`;
}

export async function readStationsCache(
  key: string,
): Promise<{ data: PageStation; updatedAt: number } | null> {
  return readJsonCache<PageStation>(key);
}

export async function writeStationsCache(key: string, data: PageStation): Promise<void> {
  await writeJsonCache(key, data);
}

export async function readStationCache(
  key: string,
): Promise<{ data: Station; updatedAt: number } | null> {
  return readJsonCache<Station>(key);
}

export async function writeStationCache(key: string, data: Station): Promise<void> {
  await writeJsonCache(key, data);
}
