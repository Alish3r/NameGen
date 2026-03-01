/**
 * Simple in-memory rate limiter per IP.
 */

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 30;

const requestsByIp = new Map<string, number[]>();

function prune(entries: number[]): number[] {
  const cutoff = Date.now() - WINDOW_MS;
  return entries.filter((t) => t > cutoff);
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let entries = requestsByIp.get(ip) ?? [];
  entries = prune(entries);
  if (entries.length >= MAX_REQUESTS) {
    return false;
  }
  entries.push(now);
  requestsByIp.set(ip, entries);
  return true;
}
