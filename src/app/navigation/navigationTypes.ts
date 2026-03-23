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

/** Stack « voyageur » : gares puis véhicules. */
export type PassengerStackParamList = {
  Home: undefined;
  LowBandwidthStations: undefined;
  SearchDestination: undefined;
  StationsMap: undefined;
  StationVehicles: StationVehiclesParams;
  SeatMap: SeatMapParams;
  MyReservations: undefined;
};

/** Stack « conducteur » : même liste de gares, libellés adaptés. */
export type DriverStackParamList = {
  DriverHome: undefined;
  LowBandwidthStations: undefined;
  StationsMap: undefined;
  StationVehicles: StationVehiclesParams;
  SeatMap: SeatMapParams;
};

/**
 * Union des routes des deux stacks (typage des écrans partagés).
 * Ne pas utiliser comme un seul stack : deux navigateurs natifs distincts.
 */
export type MainStackParamList = PassengerStackParamList & DriverStackParamList;
