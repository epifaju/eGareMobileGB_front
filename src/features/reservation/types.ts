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
};

export type PageBooking = {
  content: Booking[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};
