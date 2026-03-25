import { DeviceEventEmitter } from 'react-native';

export const OFFLINE_QUEUE_CHANGED = 'gare-offline-queue-changed';

export function emitOfflineQueueChanged(): void {
  DeviceEventEmitter.emit(OFFLINE_QUEUE_CHANGED);
}
