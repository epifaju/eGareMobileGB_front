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

export type PageVehicle = {
  content: Vehicle[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
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
