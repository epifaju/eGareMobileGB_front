import { parseJwtPayload } from '@/shared/lib/jwtExp';
import { tokenStorage } from '@/shared/lib/tokenStorage';

export type AppRole = 'USER' | 'DRIVER' | 'ADMIN';

/** Rôle issu du claim `role` du JWT d’accès (aligné sur le backend). */
export function getAppRoleFromToken(): AppRole | null {
  const payload = parseJwtPayload(tokenStorage.getAccessToken());
  if (!payload) {
    return null;
  }
  const r = payload.role;
  if (r === 'USER' || r === 'DRIVER' || r === 'ADMIN') {
    return r;
  }
  return null;
}

export function isDriverOrAdminRole(role: AppRole | null): boolean {
  return role === 'DRIVER' || role === 'ADMIN';
}
