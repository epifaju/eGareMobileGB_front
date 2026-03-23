import type { VehicleStatus } from '@/features/vehicle/types';

export type DestinationSuggestion = {
  label: string;
};

export type SearchVehiclesParams = {
  stationId?: number;
  q?: string;
  status?: VehicleStatus;
  minFareXof?: number;
  maxFareXof?: number;
  departureAfter?: string;
  departureBefore?: string;
  sort?: 'departureScheduledAt,asc' | 'departureScheduledAt,desc' | 'fareAmountXof,asc' | 'fareAmountXof,desc';
  activeOnly?: boolean;
  page?: number;
  size?: number;
};
