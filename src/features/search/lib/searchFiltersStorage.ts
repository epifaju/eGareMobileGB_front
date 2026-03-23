import { createMMKV } from 'react-native-mmkv';

export type PersistedSearchFilters = {
  stationId?: number;
  statusFilter?: 'EN_FILE' | 'REMPLISSAGE' | 'COMPLET' | 'PARTI';
  minFare?: string;
  maxFare?: string;
  activeOnly: boolean;
  departurePreset: 'none' | 'next2h' | 'next6h' | 'today';
  departureFromMinutes?: string;
  departureToMinutes?: string;
  sort: 'departureScheduledAt,asc' | 'departureScheduledAt,desc' | 'fareAmountXof,asc' | 'fareAmountXof,desc';
};

const storage = createMMKV({ id: 'gare-search-filters' });
const KEY = 'search.filters.v1';

export const searchFiltersStorage = {
  read(): PersistedSearchFilters | null {
    const raw = storage.getString(KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as PersistedSearchFilters;
    } catch {
      return null;
    }
  },
  write(value: PersistedSearchFilters): void {
    storage.set(KEY, JSON.stringify(value));
  },
  clear(): void {
    storage.remove(KEY);
  },
};
