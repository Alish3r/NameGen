import { describe, it, expect } from 'vitest';
import {
  computeHtmlFingerprint,
  countParkingKeywords,
  getParkingKeywords,
} from '../../src/domain-probe/fingerprint';

describe('fingerprint', () => {
  it('computes deterministic hash', () => {
    const html = '<html><body>  Hello   World  </body></html>';
    const h1 = computeHtmlFingerprint(Buffer.from(html, 'utf-8'));
    const h2 = computeHtmlFingerprint(Buffer.from(html.toLowerCase().replace(/\s+/g, ' '), 'utf-8'));
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('counts parking keywords', () => {
    expect(countParkingKeywords('This domain for sale')).toBe(1);
    expect(countParkingKeywords('Domain for sale and buy this domain')).toBe(2);
    expect(countParkingKeywords('Powered by sedo')).toBe(1);
    expect(countParkingKeywords('Welcome to our site')).toBe(0);
    expect(countParkingKeywords('DAN.COM marketplace')).toBe(1);
  });

  it('returns parking keywords list', () => {
    const kws = getParkingKeywords();
    expect(kws).toContain('domain for sale');
    expect(kws).toContain('sedo');
    expect(kws.length).toBeGreaterThan(5);
  });
});
