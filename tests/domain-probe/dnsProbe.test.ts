import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as dns from 'dns/promises';
import { probeDns } from '../../src/domain-probe/dnsProbe';
import { DnsStatus } from '../../src/domain-probe/types';

vi.mock('dns/promises', () => ({
  resolve4: vi.fn(),
  resolve6: vi.fn(),
  resolveCname: vi.fn(),
  resolveNs: vi.fn(),
  resolveMx: vi.fn(),
}));

describe('dnsProbe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns NXDOMAIN when resolve4 throws ENOTFOUND', async () => {
    const err = new Error('getaddrinfo ENOTFOUND') as NodeJS.ErrnoException;
    err.code = 'ENOTFOUND';
    vi.mocked(dns.resolve4).mockRejectedValue(err);
    vi.mocked(dns.resolve6).mockRejectedValue(err);
    vi.mocked(dns.resolveCname).mockResolvedValue([]);
    vi.mocked(dns.resolveNs).mockResolvedValue([]);
    vi.mocked(dns.resolveMx).mockResolvedValue([]);

    const result = await probeDns('nonexistent.example.xyz', 5000);
    expect(result.status).toBe(DnsStatus.NXDOMAIN);
    expect(result.reasons.some((r) => r.includes('NXDOMAIN'))).toBe(true);
  });

  it('returns RESOLVES when A records exist', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['1.2.3.4']);
    vi.mocked(dns.resolve6).mockResolvedValue([]);
    vi.mocked(dns.resolveCname).mockResolvedValue([]);
    vi.mocked(dns.resolveNs).mockResolvedValue([]);
    vi.mocked(dns.resolveMx).mockResolvedValue([]);

    const result = await probeDns('example.com', 5000);
    expect(result.status).toBe(DnsStatus.RESOLVES);
    expect(result.aRecords).toContain('1.2.3.4');
  });

  it('returns RESOLVES when CNAME exists', async () => {
    const enodata = new Error('no A') as NodeJS.ErrnoException;
    enodata.code = 'ENODATA';
    vi.mocked(dns.resolve4).mockRejectedValue(enodata);
    vi.mocked(dns.resolve6).mockRejectedValue(enodata);
    vi.mocked(dns.resolveCname).mockResolvedValue(['target.example.com']);
    vi.mocked(dns.resolveNs).mockResolvedValue([]);
    vi.mocked(dns.resolveMx).mockResolvedValue([]);

    const result = await probeDns('cname.example.com', 5000);
    expect(result.status).toBe(DnsStatus.RESOLVES);
    expect(result.cname).toBe('target.example.com');
  });
});
