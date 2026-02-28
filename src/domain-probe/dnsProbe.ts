/**
 * DNS resolution probe using Node dns/promises.
 */

import * as dns from 'dns/promises';
import { DnsStatus, type DnsProbeResult } from './types.js';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('DNS_TIMEOUT')), ms)
    ),
  ]);
}

function extractAddresses(val: string[] | { address: string }[]): string[] {
  return val.map((v) => (typeof v === 'string' ? v : v.address));
}

export async function probeDns(fqdn: string, timeoutMs: number): Promise<DnsProbeResult> {
  const reasons: string[] = [];
  const aRecords: string[] = [];
  const aaaaRecords: string[] = [];
  let cname: string | null = null;
  const ns: string[] = [];
  const mx: string[] = [];

  try {
    const [aRes, aaaaRes, cnameRes, nsRes, mxRes] = await Promise.allSettled([
      withTimeout(dns.resolve4(fqdn), timeoutMs),
      withTimeout(dns.resolve6(fqdn), timeoutMs),
      withTimeout(dns.resolveCname(fqdn).catch(() => [] as string[]), timeoutMs),
      withTimeout(dns.resolveNs(fqdn).catch(() => [] as string[]), timeoutMs),
      withTimeout(
        dns.resolveMx(fqdn).then((r) => r.map((m) => m.exchange)).catch(() => [] as string[]),
        timeoutMs
      ),
    ]);

    if (aRes.status === 'fulfilled' && aRes.value.length > 0) {
      aRecords.push(...extractAddresses(aRes.value as string[]));
      reasons.push(`${aRecords.length} A record(s)`);
    }
    if (aaaaRes.status === 'fulfilled' && aaaaRes.value.length > 0) {
      aaaaRecords.push(...extractAddresses(aaaaRes.value as string[]));
      reasons.push(`${aaaaRecords.length} AAAA record(s)`);
    }
    if (cnameRes.status === 'fulfilled' && Array.isArray(cnameRes.value) && cnameRes.value.length > 0) {
      cname = (cnameRes.value as string[])[0];
      reasons.push(`CNAME → ${cname}`);
    }
    if (nsRes.status === 'fulfilled' && Array.isArray(nsRes.value) && nsRes.value.length > 0) {
      ns.push(...(nsRes.value as string[]));
    }
    if (mxRes.status === 'fulfilled' && Array.isArray(mxRes.value) && mxRes.value.length > 0) {
      mx.push(...(mxRes.value as string[]));
    }

    const nxDomainReject = [aRes, aaaaRes].find(
      (r) => r.status === 'rejected' && (r as PromiseRejectedResult).reason?.code === 'ENOTFOUND'
    );
    if (nxDomainReject && nxDomainReject.status === 'rejected') {
      const code = (nxDomainReject as PromiseRejectedResult).reason?.code;
      return {
        status: DnsStatus.NXDOMAIN,
        aRecords,
        aaaaRecords,
        cname,
        ns,
        mx,
        reasons: [`NXDOMAIN from resolver (${code})`],
      };
    }

    const hasResolvable = aRecords.length > 0 || aaaaRecords.length > 0 || cname !== null;
    if (hasResolvable) {
      return {
        status: DnsStatus.RESOLVES,
        aRecords,
        aaaaRecords,
        cname,
        ns,
        mx,
        reasons: reasons.length > 0 ? reasons : ['Resolves to IP or CNAME'],
      };
    }

    const hasNsOrMx = ns.length > 0 || mx.length > 0;
    const wasTimeout = [aRes, aaaaRes].some(
      (r) => r.status === 'rejected' && (r as PromiseRejectedResult).reason?.message === 'DNS_TIMEOUT'
    );
    const reasonsOut = hasNsOrMx
      ? ['Domain registered (has NS/MX) but no A/AAAA/CNAME - likely taken']
      : wasTimeout
        ? ['DNS timeout - may be rate limited, try lower concurrency']
        : ['Exists but no A/AAAA/CNAME records'];

    return {
      status: DnsStatus.NO_ANSWER,
      aRecords,
      aaaaRecords,
      cname,
      ns,
      mx,
      reasons: reasonsOut,
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    const msg = (err as Error)?.message ?? '';
    if (code === 'ENOTFOUND') {
      return {
        status: DnsStatus.NXDOMAIN,
        aRecords,
        aaaaRecords,
        cname,
        ns,
        mx,
        reasons: [`NXDOMAIN from resolver (${code})`],
      };
    }
    const isNetworkError = ['ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH', 'EAI_AGAIN'].includes(code ?? '');
    if (isNetworkError) {
      return {
        status: DnsStatus.NO_ANSWER,
        aRecords,
        aaaaRecords,
        cname,
        ns,
        mx,
        reasons: [`DNS lookup failed (${code}) - check network/firewall, try lower concurrency`],
      };
    }
    throw err;
  }
}
