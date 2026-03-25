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

/**
 * Vérifie un JWT RS256 émis par le backend (BoardingQrJwtService), sans appel réseau.
 * Nécessite la clé publique (EXPO_PUBLIC_BOARDING_JWT_PUBLIC_KEY), pas la clé privée.
 */
export function verifyBoardingQrJwt(
  token: string,
  expectedVehicleId: number,
): { ok: true; bookingId: number; seatNumber: number | null } | { ok: false; reason: string } {
  const pem = BOARDING_JWT_PUBLIC_KEY_PEM;
  if (!pem || !pem.includes('BEGIN PUBLIC')) {
    return {
      ok: false,
      reason: 'Clé publique QR manquante (EXPO_PUBLIC_BOARDING_JWT_PUBLIC_KEY).',
    };
  }
  let pub: RSAKey;
  try {
    pub = KEYUTIL.getKey(pem) as RSAKey;
  } catch {
    return { ok: false, reason: 'Clé publique QR illisible.' };
  }
  const trimmed = token.trim();
  try {
    const okJwt = KJUR.jws.JWS.verifyJWT(trimmed, pub, { alg: ['RS256'] });
    if (!okJwt) {
      return { ok: false, reason: 'Signature du billet invalide.' };
    }
  } catch {
    return { ok: false, reason: 'Signature du billet invalide ou jeton expiré.' };
  }
  const parsed = KJUR.jws.JWS.parse(trimmed);
  const rawPayload = parsed.payloadObj;
  const payload =
    typeof rawPayload === 'string'
      ? (JSON.parse(rawPayload) as Record<string, unknown>)
      : (rawPayload as Record<string, unknown>);
  if (payload[CLAIM_TYP] !== TYP_BOARDING_QR) {
    return { ok: false, reason: 'Type de billet invalide.' };
  }
  const expSec = payload.exp;
  if (typeof expSec === 'number' && expSec * 1000 < Date.now()) {
    return { ok: false, reason: 'Billet expiré.' };
  }
  const vid = asPositiveInt(payload[CLAIM_VEHICLE_ID_SPEC] ?? payload[CLAIM_VEHICLE_ID]);
  if (vid == null || vid !== expectedVehicleId) {
    return { ok: false, reason: 'Ce billet n’est pas valable pour ce véhicule.' };
  }
  const bid = asPositiveInt(payload[CLAIM_BOOKING_ID_SPEC] ?? payload[CLAIM_BOOKING_ID]);
  if (bid == null) {
    return { ok: false, reason: 'Référence réservation manquante dans le QR.' };
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
