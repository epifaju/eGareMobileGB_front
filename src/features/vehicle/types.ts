export type VehicleStatus = 'EN_FILE' | 'REMPLISSAGE' | 'COMPLET' | 'PARTI';
export type VehicleSeatLayout = 'L8' | 'L15' | 'L20' | 'L45';

export type Vehicle = {
  id: number;
  stationId: number;
  registrationCode: string;
  routeLabel: string;
  capacity: number;
  seatLayout: VehicleSeatLayout;
  occupiedSeats: number;
  unavailableSeats: number;
  availableSeats: number;
  status: VehicleStatus;
  departureScheduledAt: string | null;
  estimatedWaitMinutes: number | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  locationUpdatedAt: string | null;
  /** Tarif indicatif XOF (nullable). */
  fareAmountXof: number | null;
};

export type CacheMeta = {
  source: 'network' | 'sqlite';
  /** Données trop anciennes (TTL dépassé) */
  stale?: true;
  /** Réseau en erreur, repli sur cache */
  fallback?: true;
  updatedAt?: number;
};

export type MapVehiclesResponse = {
  vehicles: Vehicle[];
  cache?: CacheMeta;
};

export type StationVehiclesResponse = {
  page: PageVehicle;
  cache?: CacheMeta;
};

export type PageVehicle = {
  content: Vehicle[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

/** Réponse POST /api/vehicles/{id}/reserve-seat (Phase 4 : paiement). */
export type ReserveSeatResponse = {
  bookingId: number;
  bookingStatus: string;
  vehicle: Vehicle;
};

export type SeatMap = {
  vehicleId: number;
  layout: VehicleSeatLayout;
  rows: number;
  columns: number;
  capacity: number;
  occupiedSeats: number;
  unavailableSeats: number[];
  availableSeats: number[];
  cells: SeatCell[];
};

export type SeatCellType = 'SEAT_AVAILABLE' | 'SEAT_UNAVAILABLE' | 'AISLE';

export type SeatCell = {
  rowIndex: number;
  colIndex: number;
  type: SeatCellType;
  seatNumber: number | null;
};

/** GET /api/vehicles/{id}/manifest */
export type ManifestPassengerRow = {
  bookingId: number;
  seatNumber: number | null;
  phoneMasked: string;
  bookingStatus: string;
  paymentStatus: string;
  boardingValidatedAt: string | null;
};

/** GET /api/vehicles/{id}/revenue */
export type VehicleRevenue = {
  vehicleId: number;
  registrationCode: string;
  fromInclusive: string;
  toInclusive: string;
  totalAmount: number;
  currency: string;
  paidBookingCount: number;
};
