import type { BaseQueryApi, FetchArgs } from '@reduxjs/toolkit/query';
import type { Store } from '@reduxjs/toolkit';

import { baseApi, baseQueryWithReauth } from '@/shared/api/baseApi';
import { getOfflineDb } from '@/shared/offline/db';
import { emitOfflineQueueChanged } from '@/shared/offline/queueEvents';

function getStore(): Store {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/shared/store/store').store as Store;
}

export type BoardingScanSyncResponse = {
  results: Array<{
    clientLogId: number;
    status: 'SYNCED' | 'ERROR';
    errorCode?: string | null;
    errorMessage?: string | null;
  }>;
};

type LogRow = {
  id: number;
  created_at: number;
  vehicle_id: number;
  station_id: number | null;
  qr_token: string;
};

/**
 * Enregistre un scan validé hors ligne (Phase 2.3) — synchronisé via {@link processBoardingScanLogs}.
 */
export async function enqueueBoardingScanLog(params: {
  vehicleId: number;
  stationId: number;
  qrToken: string;
  scannedAtMs: number;
}): Promise<void> {
  const db = await getOfflineDb();
  await db.runAsync(
    `INSERT INTO boarding_scan_logs (created_at, vehicle_id, station_id, qr_token, sync_status)
     VALUES (?, ?, ?, ?, 'PENDING')`,
    [params.scannedAtMs, params.vehicleId, params.stationId, params.qrToken],
  );
  emitOfflineQueueChanged();
}

export async function getPendingBoardingScanLogCount(): Promise<number> {
  const db = await getOfflineDb();
  const row = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) AS c FROM boarding_scan_logs WHERE sync_status = 'PENDING'",
  );
  return row?.c ?? 0;
}

function invalidateAfterBoardingSync(stationIds: Set<number>): void {
  const dispatch = getStore().dispatch;
  dispatch(baseApi.util.invalidateTags([{ type: 'Booking', id: 'LIST' }]));
  for (const stationId of stationIds) {
    dispatch(baseApi.util.invalidateTags([{ type: 'Vehicle', id: stationId }]));
  }
}

let boardingProcessing = false;

/**
 * Envoie les logs PENDING vers POST /api/vehicles/{id}/boarding/sync-scans (FIFO par véhicule).
 */
export async function processBoardingScanLogs(): Promise<void> {
  if (boardingProcessing) {
    return;
  }
  boardingProcessing = true;
  try {
    const db = await getOfflineDb();
    const rows = await db.getAllAsync<LogRow>(
      `SELECT id, created_at, vehicle_id, station_id, qr_token
       FROM boarding_scan_logs
       WHERE sync_status = 'PENDING'
       ORDER BY id ASC`,
    );
    if (rows.length === 0) {
      return;
    }
    const byVehicle = new Map<number, LogRow[]>();
    for (const r of rows) {
      const list = byVehicle.get(r.vehicle_id) ?? [];
      list.push(r);
      byVehicle.set(r.vehicle_id, list);
    }

    for (const [vehicleId, batch] of byVehicle.entries()) {
      const body = {
        scans: batch.map((r) => ({
          clientLogId: r.id,
          qrToken: r.qr_token,
          scannedAt: new Date(r.created_at).toISOString(),
        })),
      };
      const args: FetchArgs = {
        url: `/api/vehicles/${vehicleId}/boarding/sync-scans`,
        method: 'POST',
        body,
      };
      const controller = new AbortController();
      const st = getStore();
      const api: BaseQueryApi = {
        signal: controller.signal,
        abort: (reason?: string) => controller.abort(reason),
        dispatch: st.dispatch,
        getState: st.getState,
        extra: undefined,
        endpoint: 'boardingScanSync',
        type: 'mutation',
      };
      const result = await baseQueryWithReauth(args, api, {});
      if (result.error) {
        break;
      }
      const data = result.data as BoardingScanSyncResponse;
      const stationIds = new Set<number>();
      for (const r of batch) {
        if (r.station_id != null) {
          stationIds.add(r.station_id);
        }
      }
      if (data?.results) {
        for (const item of data.results) {
          if (item.status === 'SYNCED') {
            await db.runAsync('DELETE FROM boarding_scan_logs WHERE id = ?', [item.clientLogId]);
          }
        }
      }
      invalidateAfterBoardingSync(stationIds);
    }
  } finally {
    boardingProcessing = false;
    emitOfflineQueueChanged();
  }
}
