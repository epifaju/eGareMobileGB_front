export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type StationVehiclesParams = {
  stationId: number;
  stationName: string;
};

export type SeatMapParams = {
  vehicleId: number;
  stationId: number;
  stationName: string;
  registrationCode: string;
  routeLabel: string;
  capacity: number;
};

/** Scan QR embarquement (conducteur) — lié au véhicule courant. */
export type DriverScanBoardingParams = {
  vehicleId: number;
  stationId: number;
  stationName: string;
  registrationCode: string;
  routeLabel: string;
};

/** Manifeste / revenus (conducteur) — contexte véhicule. */
export type VehicleOpsParams = {
  vehicleId: number;
  stationId: number;
  stationName: string;
  registrationCode: string;
  routeLabel: string;
};

/** Stack « voyageur » : gares puis véhicules. */
export type PassengerStackParamList = {
  Home: undefined;
  LowBandwidthStations: undefined;
  SearchDestination: undefined;
  StationsMap: undefined;
  StationVehicles: StationVehiclesParams;
  SeatMap: SeatMapParams;
  MyReservations: undefined;
  DriverScanBoarding: DriverScanBoardingParams;
  VehicleManifest: VehicleOpsParams;
  VehicleRevenue: VehicleOpsParams;
};

/** Stack « conducteur » : même liste de gares, libellés adaptés. */
export type DriverStackParamList = {
  DriverHome: undefined;
  LowBandwidthStations: undefined;
  StationsMap: undefined;
  StationVehicles: StationVehiclesParams;
  SeatMap: SeatMapParams;
  DriverScanBoarding: DriverScanBoardingParams;
  VehicleManifest: VehicleOpsParams;
  VehicleRevenue: VehicleOpsParams;
};

/**
 * Union des routes des deux stacks (typage des écrans partagés).
 * Ne pas utiliser comme un seul stack : deux navigateurs natifs distincts.
 */
export type MainStackParamList = PassengerStackParamList & DriverStackParamList;
