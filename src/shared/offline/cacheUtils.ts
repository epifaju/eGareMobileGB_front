export function isCacheFresh(updatedAt: number, ttlMs: number): boolean {
  return Date.now() - updatedAt <= ttlMs;
}
