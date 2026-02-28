/**
 * Domain probe types and enums.
 */

export enum DnsStatus {
  NXDOMAIN = 'NXDOMAIN',
  NO_ANSWER = 'NO_ANSWER',
  RESOLVES = 'RESOLVES',
}

export enum HttpStatusCategory {
  OK = '2xx',
  REDIRECT = '3xx',
  CLIENT_ERROR = '4xx',
  SERVER_ERROR = '5xx',
  TIMEOUT = 'timeout',
  UNREACHABLE = 'unreachable',
}

export enum Category {
  ACTIVE_SITE = 'ACTIVE_SITE',
  PARKED_OR_FOR_SALE = 'PARKED_OR_FOR_SALE',
  INCONCLUSIVE = 'INCONCLUSIVE',
  NO_DOMAIN = 'NO_DOMAIN',
}

export interface DnsProbeResult {
  status: DnsStatus;
  aRecords: string[];
  aaaaRecords: string[];
  cname: string | null;
  ns: string[];
  mx: string[];
  reasons: string[];
}

export interface HttpProbeResult {
  attempted: boolean;
  finalUrl: string | null;
  status: number | null;
  statusCategory: HttpStatusCategory | null;
  redirectChain: string[];
  contentType: string | null;
  contentLength: number | null;
  timingMs: number | null;
  bodyFingerprint: string | null;
  parkingKeywordCount: number;
  linkCount: number;
  reasons: string[];
}

export interface DomainProbeResult {
  domain: string;
  dns: DnsProbeResult;
  http: HttpProbeResult;
  category: Category;
  confidence: number;
  reasons: string[];
}

export interface ProbeDomainsOptions {
  concurrency?: number;
  dnsTimeoutMs?: number;
  httpTimeoutMs?: number;
  maxRedirects?: number;
  retries?: number;
  userAgent?: string;
}
