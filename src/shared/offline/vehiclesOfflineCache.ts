import type { PageVehicle } from '@/features/vehicle/types';

import { readJsonCache, writeJsonCache } from '@/shared/offline/jsonKvCache';

export function stationVehiclesCacheKey(
  stationId: number,
  activeOnly: boolean,
  page: number,
  size: number,
): string {
  return `vehicles:station:${stationId}:${activeOnly}:${page}:${size}`;
}

export async function readStationVehiclesCache(
  key: string,
): Promise<{ data: PageVehicle; updatedAt: number } | null> {
  return readJsonCache<PageVehicle>(key);
}

export async function writeStationVehiclesCache(key: string, data: PageVehicle): Promise<void> {
  await writeJsonCache(key, data);
}
