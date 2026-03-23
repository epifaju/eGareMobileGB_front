export type Station = {
  id: number;
  name: string;
  city: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
};

export type PageStation = {
  content: Station[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

export type LowBandwidthStation = {
  id: number;
  name: string;
  city: string | null;
  activeVehicles: number;
  nextDepartureAt: string | null;
  minFareXof: number | null;
};

export type PageLowBandwidthStation = {
  content: LowBandwidthStation[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};