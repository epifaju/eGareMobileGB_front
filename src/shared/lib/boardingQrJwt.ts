import { KEYUTIL, KJUR, RSAKey } from 'jsrsasign';

import { BOARDING_JWT_PUBLIC_KEY_PEM } from '@/shared/constants/env';

const TYP_BOARDING_QR = 'boarding_qr';
const CLAIM_TYP = 'typ';
const CLAIM_BOOKING_ID = 'bid';
const CLAIM_VEHICLE_ID = 'vid';
const CLAIM_SEAT = 'sn';
const CLAIM_BOOKING_ID_SPEC = 'bookingId';
const CLAIM_VEHICLE_ID_SPEC = 'vehicleId';
const CLAIM_SEAT_SPEC = 'seat';
const SEAT_UNASSIGNED = -1;

export type BoardingQrRejectCode =
  | 'PUBLIC_KEY_MISSING'
  | 'PUBLIC_KEY_INVALID'
  | 'SIGNATURE_INVALID'
  | 'SIGNATURE_OR_EXPIRED'
  | 'INVALID_TICKET_TYPE'
  | 'TICKET_EXPIRED'
  | 'WRONG_VEHICLE'
  | 'BOOKING_REF_MISSING';

export type VerifyBoardingQrResult =
  | { ok: true; bookingId: number; seatNumber: number | null }
  | { ok: false; code: BoardingQrRejectCode };

/**
 * Vérifie un JWT RS256 émis par le backend (BoardingQrJwtService), sans appel réseau.
 * Nécessite la clé publique (EXPO_PUBLIC_BOARDING_JWT_PUBLIC_KEY), pas la clé privée.
 */
export function verifyBoardingQrJwt(token: string, expectedVehicleId: number): VerifyBoardingQrResult {
  const pem = BOARDING_JWT_PUBLIC_KEY_PEM;
  if (!pem || !pem.includes('BEGIN PUBLIC')) {
    return {
      ok: false,
      code: 'PUBLIC_KEY_MISSING',
    };
  }
  let pub: RSAKey;
  try {
    pub = KEYUTIL.getKey(pem) as RSAKey;
  } catch {
    return { ok: false, code: 'PUBLIC_KEY_INVALID' };
  }
  const trimmed = token.trim();
  try {
    const okJwt = KJUR.jws.JWS.verifyJWT(trimmed, pub, { alg: ['RS256'] });
    if (!okJwt) {
      return { ok: false, code: 'SIGNATURE_INVALID' };
    }
  } catch {
    return { ok: false, code: 'SIGNATURE_OR_EXPIRED' };
  }
  const parsed = KJUR.jws.JWS.parse(trimmed);
  const rawPayload = parsed.payloadObj;
  const payload =
    typeof rawPayload === 'string'
      ? (JSON.parse(rawPayload) as Record<string, unknown>)
      : (rawPayload as Record<string, unknown>);
  if (payload[CLAIM_TYP] !== TYP_BOARDING_QR) {
    return { ok: false, code: 'INVALID_TICKET_TYPE' };
  }
  const expSec = payload.exp;
  if (typeof expSec === 'number' && expSec * 1000 < Date.now()) {
    return { ok: false, code: 'TICKET_EXPIRED' };
  }
  const vid = asPositiveInt(payload[CLAIM_VEHICLE_ID_SPEC] ?? payload[CLAIM_VEHICLE_ID]);
  if (vid == null || vid !== expectedVehicleId) {
    return { ok: false, code: 'WRONG_VEHICLE' };
  }
  const bid = asPositiveInt(payload[CLAIM_BOOKING_ID_SPEC] ?? payload[CLAIM_BOOKING_ID]);
  if (bid == null) {
    return { ok: false, code: 'BOOKING_REF_MISSING' };
  }
  const seatRaw = payload[CLAIM_SEAT_SPEC] ?? payload[CLAIM_SEAT];
  const seatNumber = seatFromClaim(seatRaw);
  return { ok: true, bookingId: bid, seatNumber };
}

function seatFromClaim(v: unknown): number | null {
  if (v === SEAT_UNASSIGNED || v === '-1') {
    return null;
  }
  if (v === undefined || v === null) {
    return null;
  }
  return asPositiveInt(v);
}

function asPositiveInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v) && v > 0 && v === Math.floor(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0 && n === Math.floor(n)) {
      return n;
    }
  }
  return null;
}
