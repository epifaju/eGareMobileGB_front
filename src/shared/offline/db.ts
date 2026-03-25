import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('gare_offline.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS kv_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS offline_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      created_at INTEGER NOT NULL,
      kind TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      body_json TEXT,
      meta_json TEXT
    );
    CREATE TABLE IF NOT EXISTS boarding_scan_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      created_at INTEGER NOT NULL,
      vehicle_id INTEGER NOT NULL,
      station_id INTEGER,
      qr_token TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'PENDING'
    );
    DELETE FROM offline_actions WHERE kind = 'BOARDING_VALIDATE';
  `);
  return db;
}

export async function getOfflineDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openAndMigrate();
  }
  return dbPromise;
}
