import { getOfflineDb } from '@/shared/offline/db';

export async function readJsonCache<T>(key: string): Promise<{ data: T; updatedAt: number } | null> {
  const db = await getOfflineDb();
  const row = await db.getFirstAsync<{ value_json: string; updated_at: number }>(
    'SELECT value_json, updated_at FROM kv_cache WHERE cache_key = ?',
    [key],
  );
  if (!row) {
    return null;
  }
  return { data: JSON.parse(row.value_json) as T, updatedAt: row.updated_at };
}

export async function writeJsonCache(key: string, data: unknown): Promise<void> {
  const db = await getOfflineDb();
  const now = Date.now();
  await db.runAsync(
    'INSERT OR REPLACE INTO kv_cache (cache_key, value_json, updated_at) VALUES (?, ?, ?)',
    [key, JSON.stringify(data), now],
  );
}
