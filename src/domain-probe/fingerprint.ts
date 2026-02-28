/**
 * Content fingerprint for parked-page detection.
 */

import { createHash } from 'crypto';

const MAX_BODY_SAMPLE = 64 * 1024;

export function computeHtmlFingerprint(buf: Buffer): string {
  const normalized = buf
    .toString('utf-8', 0, Math.min(buf.length, MAX_BODY_SAMPLE))
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
  return createHash('sha256').update(normalized).digest('hex');
}

const PARKING_KEYWORDS = [
  'domain for sale',
  'buy this domain',
  'inquire about this domain',
  'parking',
  'sedo',
  'dan.com',
  'afternic',
  'bodis',
  'parkingcrew',
  'namebright',
  'hugedomains',
];

export function countParkingKeywords(html: string): number {
  const lower = html.toLowerCase();
  let count = 0;
  for (const kw of PARKING_KEYWORDS) {
    if (lower.includes(kw)) count++;
  }
  return count;
}

export function getParkingKeywords(): string[] {
  return [...PARKING_KEYWORDS];
}
