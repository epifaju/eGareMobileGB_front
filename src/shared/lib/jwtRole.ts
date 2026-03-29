import { parseJwtPayload } from '@/shared/lib/jwtExp';
import { tokenStorage } from '@/shared/lib/tokenStorage';

export type AppRole = 'USER' | 'AGENT' | 'DRIVER' | 'ADMIN';

/** Rôle issu du claim `role` du JWT d’accès (aligné sur le backend). */
export function getAppRoleFromToken(): AppRole | null {
  const payload = parseJwtPayload(tokenStorage.getAccessToken());
  if (!payload) {
    return null;
  }
  const r = payload.role;
  if (r === 'USER' || r === 'AGENT' || r === 'DRIVER' || r === 'ADMIN') {
    return r;
  }
  return null;
}

/** Onglet conducteur : chauffeurs et administrateurs (tests / support). */
export function isDriverOrAdminRole(role: AppRole | null): boolean {
  return role === 'DRIVER' || role === 'ADMIN';
}

export function isAgentRole(role: AppRole | null): boolean {
  return role === 'AGENT';
}

/** Contrôles file / statut / embarquement (API : AGENT, DRIVER, ADMIN). */
export function isStationOperationsRole(role: AppRole | null): boolean {
  return role === 'AGENT' || role === 'DRIVER' || role === 'ADMIN';
}

export function isAdminRole(role: AppRole | null): boolean {
  return role === 'ADMIN';
}
