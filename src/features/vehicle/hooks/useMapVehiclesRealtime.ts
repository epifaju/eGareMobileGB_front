import { type Draft } from '@reduxjs/toolkit';
import { Client, type IMessage } from '@stomp/stompjs';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { vehicleApi } from '@/features/vehicle/api/vehicleApi';
import type { MapVehiclesResponse, Vehicle } from '@/features/vehicle/types';
import { WS_STOMP_URL } from '@/shared/constants/ws';
import type { AppDispatch } from '@/shared/store/store';

function mergeVehicle(draft: Draft<Vehicle[]>, incoming: Vehicle) {
  const idx = draft.findIndex((v) => v.id === incoming.id);
  if (incoming.status === 'PARTI') {
    if (idx >= 0) {
      draft.splice(idx, 1);
    }
    return;
  }
  if (idx >= 0) {
    draft[idx] = incoming;
  } else {
    draft.push(incoming);
  }
}

export function useMapVehiclesRealtime() {
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
      client.subscribe('/topic/map/vehicles', (message: IMessage) => {
        try {
          const payload = JSON.parse(message.body) as Vehicle;
          dispatch(
            vehicleApi.util.updateQueryData('getMapVehicles', undefined, (draft) => {
              const d = draft as unknown as Draft<MapVehiclesResponse>;
              mergeVehicle(d.vehicles as unknown as Draft<Vehicle[]>, payload);
            }),
          );
        } catch {
          // ignore malformed payload
        }
      });
    };

    client.activate();
    return () => {
      void client.deactivate();
    };
  }, [dispatch]);
}
