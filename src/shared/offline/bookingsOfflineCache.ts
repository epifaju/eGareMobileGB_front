import type { PageBooking } from '@/features/reservation/types';

import { readJsonCache, writeJsonCache } from '@/shared/offline/jsonKvCache';

export function myBookingsCacheKey(includeCancelled: boolean, page: number, size: number): string {
  return `bookings:me:${includeCancelled}:${page}:${size}`;
}

export async function readMyBookingsCache(
  key: string,
): Promise<{ data: PageBooking; updatedAt: number } | null> {
  return readJsonCache<PageBooking>(key);
}

export async function writeMyBookingsCache(key: string, data: PageBooking): Promise<void> {
  await writeJsonCache(key, data);
}
