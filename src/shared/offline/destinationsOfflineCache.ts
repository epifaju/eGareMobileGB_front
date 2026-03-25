import type { DestinationSuggestion } from '@/features/search/types';

import { readJsonCache, writeJsonCache } from '@/shared/offline/jsonKvCache';

export function destinationSuggestCacheKey(q: string): string {
  const clean = q.trim().toLowerCase();
  return `destinations:suggest:${clean}`;
}

export async function readDestinationSuggestCache(
  key: string,
): Promise<{ data: DestinationSuggestion[]; updatedAt: number } | null> {
  return readJsonCache<DestinationSuggestion[]>(key);
}

export async function writeDestinationSuggestCache(
  key: string,
  data: DestinationSuggestion[],
): Promise<void> {
  await writeJsonCache(key, data);
}

