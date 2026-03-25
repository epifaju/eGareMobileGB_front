import type { BaseQueryApi, FetchArgs } from '@reduxjs/toolkit/query';

import type { Store } from '@reduxjs/toolkit';

import { baseApi, baseQueryWithReauth } from '@/shared/api/baseApi';
import { getPendingBoardingScanLogCount } from '@/shared/offline/boardingScanLogs';
import { getOfflineDb } from '@/shared/offline/db';
import { emitOfflineQueueChanged } from '@/shared/offline/queueEvents';

function getStore(): Store {
  // Évite store → api → actionQueue → store au chargement des modules.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/shared/store/store').store as Store;
}

export type OfflineActionKind =
  | 'CANCEL_BOOKING'
  | 'RESERVE_SEAT'
  | 'VEHICLE_STATUS'
  | 'VEHICLE_LOCATION';

export type QueuedActionMeta = {
  stationId?: number;
  vehicleId?: number;
};

type ActionRow = {
  id: number;
  created_at: number;
  kind: OfflineActionKind;
  method: string;
  path: string;
  body_json: string | null;
  meta_json: string | null;
};

const offlineQueuedError = {
  status: 'FETCH_ERROR' as const,
  error: 'OFFLINE_QUEUED',
  data: { offlineQueued: true as const },
};

export { offlineQueuedError };

export async function enqueueOfflineAction(params: {
  kind: OfflineActionKind;
  method: string;
  path: string;
  body?: unknown;
  meta?: QueuedActionMeta;
}): Promise<void> {
  const db = await getOfflineDb();
  await db.runAsync(
    `INSERT INTO offline_actions (created_at, kind, method, path, body_json, meta_json) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      Date.now(),
      params.kind,
      params.method,
      params.path,
      params.body !== undefined ? JSON.stringify(params.body) : null,
      params.meta !== undefined ? JSON.stringify(params.meta) : null,
    ],
  );
  emitOfflineQueueChanged();
}

export async function getQueuedActionCount(): Promise<number> {
  const db = await getOfflineDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM offline_actions');
  return row?.c ?? 0;
}

function parseMeta(json: string | null): QueuedActionMeta {
  if (!json) {
    return {};
  }
  try {
    return JSON.parse(json) as QueuedActionMeta;
  } catch {
    return {};
  }
}

function invalidateAfterReplay(kind: OfflineActionKind, meta: QueuedActionMeta): void {
  const dispatch = getStore().dispatch;
  if (kind === 'CANCEL_BOOKING' || kind === 'RESERVE_SEAT') {
    dispatch(baseApi.util.invalidateTags([{ type: 'Booking', id: 'LIST' }]));
  }
  if (meta.stationId != null) {
    dispatch(baseApi.util.invalidateTags([{ type: 'Vehicle', id: meta.stationId }]));
  }
}

let processing = false;

export async function processOfflineQueue(): Promise<void> {
  if (processing) {
    return;
  }
  processing = true;
  try {
    const db = await getOfflineDb();
    const rows = await db.getAllAsync<ActionRow>(
      'SELECT id, created_at, kind, method, path, body_json, meta_json FROM offline_actions ORDER BY id ASC',
    );
    for (const row of rows) {
      const args: FetchArgs = {
        url: row.path,
        method: row.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      };
      if (row.body_json) {
        args.body = JSON.parse(row.body_json) as Record<string, unknown>;
      }
      const controller = new AbortController();
      const st = getStore();
      const api: BaseQueryApi = {
        signal: controller.signal,
        abort: (reason?: string) => controller.abort(reason),
        dispatch: st.dispatch,
        getState: st.getState,
        extra: undefined,
        endpoint: 'offlineQueue',
        type: 'mutation',
      };
      const result = await baseQueryWithReauth(args, api, {});
      if (result.error) {
        break;
      }
      await db.runAsync('DELETE FROM offline_actions WHERE id = ?', [row.id]);
      const meta = parseMeta(row.meta_json);
      invalidateAfterReplay(row.kind, meta);
    }
  } finally {
    processing = false;
    emitOfflineQueueChanged();
  }
}
