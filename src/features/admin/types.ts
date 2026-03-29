import type { VehicleSeatLayout, VehicleStatus } from '@/features/vehicle/types';

/** Page Spring Data (JSON). */
export type SpringPage<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

export type AdminDashboard = {
  totalUsers: number;
  usersByRole: Record<string, number>;
  activeStations: number;
  archivedStations: number;
  activeVehicles: number;
  archivedVehicles: number;
  activeVehiclesByStatus: Record<string, number>;
  bookingsTodayUtc: number;
};

export type AdminStation = {
  id: number;
  name: string;
  city: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  archived: boolean;
};

export type AdminStationWrite = {
  name: string;
  city?: string | null;
  latitude: number;
  longitude: number;
  description?: string | null;
};

export type AdminVehicle = {
  id: number;
  stationId: number;
  registrationCode: string;
  routeLabel: string;
  capacity: number;
  seatLayout: VehicleSeatLayout;
  occupiedSeats: number;
  status: VehicleStatus;
  departureScheduledAt: string | null;
  fareAmountXof: number | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  locationUpdatedAt: string | null;
  archived: boolean;
};

export type AdminVehicleCreate = {
  registrationCode: string;
  routeLabel: string;
  seatLayout: VehicleSeatLayout;
  occupiedSeats: number;
  fareAmountXof?: number | null;
  departureScheduledAt?: string | null;
  status?: VehicleStatus | null;
};

/** Champs optionnels : absents ou null = inchangé côté serveur. */
export type AdminVehicleUpdate = {
  registrationCode?: string | null;
  routeLabel?: string | null;
  seatLayout?: VehicleSeatLayout | null;
  occupiedSeats?: number | null;
  fareAmountXof?: number | null;
  departureScheduledAt?: string | null;
  status?: VehicleStatus | null;
  stationId?: number | null;
};

export type AdminUserSummary = {
  id: number;
  phoneNumber: string;
  role: string;
  createdAt: string;
};

export type AdminAuditEntry = {
  id: number;
  createdAt: string;
  actorUserId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  detailsJson: string | null;
};

export type UpdateUserRoleBody = {
  role: 'USER' | 'AGENT' | 'DRIVER' | 'ADMIN';
};
