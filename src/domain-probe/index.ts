/**
 * Domain probe - public API.
 */

import pLimit from 'p-limit';
import { probeDns } from './dnsProbe.js';
import { probeHttp } from './httpProbe.js';
import { classify } from './classify.js';
import { DnsStatus, Category, HttpStatusCategory } from './types.js';
import type { DomainProbeResult, HttpProbeResult, ProbeDomainsOptions } from './types.js';

const DEFAULT_UA =
  'NameGen-DomainProbe/1.0 (Domain availability check; +https://github.com/namegen)';

async function probeOne(
  domain: string,
  opts: Required<ProbeDomainsOptions>
): Promise<DomainProbeResult> {
  let dnsResult = await probeDns(domain, opts.dnsTimeoutMs);
  const wasTimeout = dnsResult.reasons.some((r) => r.includes('timeout'));
  if (wasTimeout && dnsResult.status === DnsStatus.NO_ANSWER && opts.retries > 0) {
    await new Promise((r) => setTimeout(r, 800));
    dnsResult = await probeDns(domain, opts.dnsTimeoutMs + 2000);
  }
  let httpResult: HttpProbeResult = {
    attempted: false,
    finalUrl: null,
    status: null,
    statusCategory: null,
    redirectChain: [] as string[],
    contentType: null as string | null,
    contentLength: null as number | null,
    timingMs: null as number | null,
    bodyFingerprint: null as string | null,
    parkingKeywordCount: 0,
    linkCount: 0,
    reasons: [] as string[],
  };

  if (dnsResult.status === DnsStatus.RESOLVES) {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      try {
        httpResult = await probeHttp(
          domain,
          opts.httpTimeoutMs,
          opts.maxRedirects,
          opts.userAgent
        );
        break;
      } catch (err) {
        lastError = err as Error;
        if (attempt < opts.retries) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }
    if (lastError && !httpResult.attempted) {
      httpResult = {
        attempted: true,
        finalUrl: null,
        status: null,
        statusCategory: HttpStatusCategory.UNREACHABLE,
        redirectChain: [],
        contentType: null,
        contentLength: null,
        timingMs: null,
        bodyFingerprint: null,
        parkingKeywordCount: 0,
        linkCount: 0,
        reasons: [`Error: ${lastError.message}`],
      };
    }
  } else {
    httpResult.reasons.push('HTTP skipped (DNS did not resolve)');
  }

  const raw = {
    domain,
    dns: dnsResult,
    http: httpResult,
  };
  return classify(raw);
}

export async function probeDomains(
  domains: string[],
  options: ProbeDomainsOptions = {}
): Promise<DomainProbeResult[]> {
  const opts: Required<ProbeDomainsOptions> = {
    concurrency: options.concurrency ?? 15,
    dnsTimeoutMs: options.dnsTimeoutMs ?? 4000,
    httpTimeoutMs: options.httpTimeoutMs ?? 2500,
    maxRedirects: options.maxRedirects ?? 3,
    retries: options.retries ?? 1,
    userAgent: options.userAgent ?? DEFAULT_UA,
  };

  const limit = pLimit(opts.concurrency);
  const results = await Promise.all(
    domains.map((domain) =>
      limit(async () => {
        try {
          return await probeOne(domain, opts);
        } catch (err) {
          return {
            domain,
            dns: {
              status: DnsStatus.NO_ANSWER,
              aRecords: [],
              aaaaRecords: [],
              cname: null,
              ns: [],
              mx: [],
              reasons: [`Probe error: ${(err as Error)?.message}`],
            },
            http: {
              attempted: false,
              finalUrl: null,
              status: null,
              statusCategory: HttpStatusCategory.UNREACHABLE,
              redirectChain: [],
              contentType: null,
              contentLength: null,
              timingMs: null,
              bodyFingerprint: null,
              parkingKeywordCount: 0,
              linkCount: 0,
              reasons: [],
            },
            category: Category.INCONCLUSIVE,
            confidence: 0.3,
            reasons: [(err as Error)?.message ?? 'Unknown error'],
          } as DomainProbeResult;
        }
      })
    )
  );
  return results;
}

export { DnsStatus, HttpStatusCategory, Category } from './types.js';
export type { DomainProbeResult, ProbeDomainsOptions } from './types.js';
