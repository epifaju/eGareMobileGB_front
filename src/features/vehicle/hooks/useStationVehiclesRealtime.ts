import { type Draft } from '@reduxjs/toolkit';
import { Client, type IMessage } from '@stomp/stompjs';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import type { AppDispatch } from '@/shared/store/store';

import {
  STATION_VEHICLES_QUERY_DEFAULTS,
  vehicleApi,
} from '@/features/vehicle/api/vehicleApi';
import type { StationVehiclesResponse, Vehicle } from '@/features/vehicle/types';
import { WS_STOMP_URL } from '@/shared/constants/ws';

function mergeVehicleUpdate(
  draft: Draft<StationVehiclesResponse['page']>,
  incoming: Vehicle,
  activeOnly: boolean,
) {
  const idx = draft.content.findIndex((v) => v.id === incoming.id);
  if (activeOnly && incoming.status === 'PARTI') {
    if (idx >= 0) {
      draft.content.splice(idx, 1);
      draft.totalElements = Math.max(0, draft.totalElements - 1);
    }
    return;
  }
  if (idx >= 0) {
    draft.content[idx] = incoming;
  } else {
    draft.content.push(incoming);
    draft.totalElements += 1;
  }
}

/**
 * Abonnement STOMP `/topic/stations/{stationId}/vehicles` — fusionne les mises à jour dans le cache RTK Query.
 * `activeOnly` doit correspondre à la requête affichée (véhicules actifs seulement ou tous).
 */
export function useStationVehiclesRealtime(stationId: number, activeOnly: boolean) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const client = new Client({
      brokerURL: WS_STOMP_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 15000,
      heartbeatOutgoing: 15000,
      webSocketFactory: () => new WebSocket(WS_STOMP_URL),
    });

    client.onConnect = () => {
      client.subscribe(`/topic/stations/${stationId}/vehicles`, (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body) as Vehicle;
          dispatch(
            vehicleApi.util.updateQueryData(
              'getStationVehicles',
              {
                stationId,
                activeOnly,
                page: STATION_VEHICLES_QUERY_DEFAULTS.page,
                size: STATION_VEHICLES_QUERY_DEFAULTS.size,
              },
              (draft) => {
                const d = draft as unknown as Draft<StationVehiclesResponse>;
                mergeVehicleUpdate(d.page as unknown as Draft<StationVehiclesResponse['page']>, payload, activeOnly);
              },
            ),
          );
        } catch {
          // JSON invalide ignoré
        }
      });
    };

    client.activate();

    return () => {
      void client.deactivate();
    };
  }, [dispatch, stationId, activeOnly]);
}
