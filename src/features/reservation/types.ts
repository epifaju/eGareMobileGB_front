import type { VehicleStatus } from '@/features/vehicle/types';

export type BookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type PaymentProvider = 'INTERNAL' | 'ORANGE_MONEY' | 'WAVE' | 'MTN' | 'CARD';

export type Booking = {
  id: number;
  vehicleId: number;
  stationId: number;
  stationName: string;
  registrationCode: string;
  routeLabel: string;
  vehicleStatus: VehicleStatus;
  createdAt: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  currency: string;
  paymentProvider: PaymentProvider;
  seatNumber: number | null;
  qrToken: string | null;
  expiresAt: string | null;
  /** Premier scan valide à l’embarquement (ISO), si déjà enregistré côté serveur. */
  boardingValidatedAt?: string | null;
};

/** Réponse POST `/api/vehicles/{id}/boarding/validate-qr`. */
export type BoardingValidationResponse = {
  bookingId: number;
  vehicleId: number;
  registrationCode: string;
  routeLabel: string;
  seatNumber: number | null;
  alreadyValidated: boolean;
  validatedAt: string | null;
};

export type PageBooking = {
  content: Booking[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

export type CacheMeta = {
  source: 'network' | 'sqlite';
  stale?: true;
  fallback?: true;
  updatedAt?: number;
};

export type MyBookingsResponse = {
  page: PageBooking;
  cache?: CacheMeta;
};

export type PaymentInitiateResponse = {
  checkoutUrl: string;
  paymentToken: string;
  amount: number;
  currency: string;
  provider: PaymentProvider;
};

/** Corps POST `/api/bookings/{id}/payment/initiate` — Phase 3. */
export type PaymentInitiateRequestBody = {
  provider: Exclude<PaymentProvider, 'INTERNAL' | 'CARD'>;
  idempotencyKey?: string | null;
  /** Si vrai, chaîne Orange → Wave → MTN côté serveur (hors sandbox). */
  tryFallback?: boolean | null;
};
