import type { Vehicle } from '@/features/vehicle/types';

import { readJsonCache, writeJsonCache } from '@/shared/offline/jsonKvCache';

export function mapVehiclesCacheKey(): string {
  return 'map:vehicles';
}

export async function readMapVehiclesCache(
  key: string,
): Promise<{ data: Vehicle[]; updatedAt: number } | null> {
  return readJsonCache<Vehicle[]>(key);
}

export async function writeMapVehiclesCache(key: string, data: Vehicle[]): Promise<void> {
  await writeJsonCache(key, data);
}

