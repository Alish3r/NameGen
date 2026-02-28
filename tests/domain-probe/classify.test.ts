import { describe, it, expect } from 'vitest';
import { classify } from '../../src/domain-probe/classify';
import { DnsStatus, Category, HttpStatusCategory } from '../../src/domain-probe/types';

describe('classify', () => {
  it('returns NO_DOMAIN for NXDOMAIN', () => {
    const result = classify({
      domain: 'nonexistent12345.xyz',
      dns: {
        status: DnsStatus.NXDOMAIN,
        aRecords: [],
        aaaaRecords: [],
        cname: null,
        ns: [],
        mx: [],
        reasons: ['NXDOMAIN from resolver (ENOTFOUND)'],
      },
      http: {
        attempted: false,
        finalUrl: null,
        status: null,
        statusCategory: null,
        redirectChain: [],
        contentType: null,
        contentLength: null,
        timingMs: null,
        bodyFingerprint: null,
        parkingKeywordCount: 0,
        linkCount: 0,
        reasons: [],
      },
    });
    expect(result.category).toBe(Category.NO_DOMAIN);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('returns INCONCLUSIVE for NO_ANSWER', () => {
    const result = classify({
      domain: 'example.xyz',
      dns: {
        status: DnsStatus.NO_ANSWER,
        aRecords: [],
        aaaaRecords: [],
        cname: null,
        ns: [],
        mx: [],
        reasons: ['Exists but no A/AAAA/CNAME'],
      },
      http: {
        attempted: false,
        finalUrl: null,
        status: null,
        statusCategory: null,
        redirectChain: [],
        contentType: null,
        contentLength: null,
        timingMs: null,
        bodyFingerprint: null,
        parkingKeywordCount: 0,
        linkCount: 0,
        reasons: [],
      },
    });
    expect(result.category).toBe(Category.INCONCLUSIVE);
  });

  it('returns PARKED_OR_FOR_SALE when parking keywords in HTML', () => {
    const result = classify({
      domain: 'example.com',
      dns: {
        status: DnsStatus.RESOLVES,
        aRecords: ['1.2.3.4'],
        aaaaRecords: [],
        cname: null,
        ns: [],
        mx: [],
        reasons: ['1 A record(s)'],
      },
      http: {
        attempted: true,
        finalUrl: 'https://example.com/',
        status: 200,
        statusCategory: HttpStatusCategory.OK,
        redirectChain: [],
        contentType: 'text/html',
        contentLength: 1000,
        timingMs: 100,
        bodyFingerprint: 'abc123',
        parkingKeywordCount: 2,
        linkCount: 50,
        reasons: ['HTTP 200 in 100ms'],
      },
    });
    expect(result.category).toBe(Category.PARKED_OR_FOR_SALE);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('returns ACTIVE_SITE when 200 and no parking keywords', () => {
    const result = classify({
      domain: 'example.com',
      dns: {
        status: DnsStatus.RESOLVES,
        aRecords: ['1.2.3.4'],
        aaaaRecords: [],
        cname: null,
        ns: [],
        mx: [],
        reasons: ['1 A record(s)'],
      },
      http: {
        attempted: true,
        finalUrl: 'https://example.com/',
        status: 200,
        statusCategory: HttpStatusCategory.OK,
        redirectChain: [],
        contentType: 'text/html',
        contentLength: 5000,
        timingMs: 80,
        bodyFingerprint: 'def456',
        parkingKeywordCount: 0,
        linkCount: 20,
        reasons: ['HTTP 200 in 80ms'],
      },
    });
    expect(result.category).toBe(Category.ACTIVE_SITE);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('returns INCONCLUSIVE for HTTP 404', () => {
    const result = classify({
      domain: 'example.com',
      dns: {
        status: DnsStatus.RESOLVES,
        aRecords: ['1.2.3.4'],
        aaaaRecords: [],
        cname: null,
        ns: [],
        mx: [],
        reasons: ['1 A record(s)'],
      },
      http: {
        attempted: true,
        finalUrl: null,
        status: 404,
        statusCategory: HttpStatusCategory.CLIENT_ERROR,
        redirectChain: [],
        contentType: null,
        contentLength: null,
        timingMs: 50,
        bodyFingerprint: null,
        parkingKeywordCount: 0,
        linkCount: 0,
        reasons: ['HTTP 404'],
      },
    });
    expect(result.category).toBe(Category.INCONCLUSIVE);
  });

  it('returns INCONCLUSIVE for timeout', () => {
    const result = classify({
      domain: 'example.com',
      dns: {
        status: DnsStatus.RESOLVES,
        aRecords: ['1.2.3.4'],
        aaaaRecords: [],
        cname: null,
        ns: [],
        mx: [],
        reasons: ['1 A record(s)'],
      },
      http: {
        attempted: true,
        finalUrl: null,
        status: null,
        statusCategory: HttpStatusCategory.TIMEOUT,
        redirectChain: [],
        contentType: null,
        contentLength: null,
        timingMs: 2500,
        bodyFingerprint: null,
        parkingKeywordCount: 0,
        linkCount: 0,
        reasons: ['Timeout after 2500ms'],
      },
    });
    expect(result.category).toBe(Category.INCONCLUSIVE);
  });
});
