/**
 * Classify domain probe results (parked, active, etc.).
 */

import { DnsStatus, HttpStatusCategory, Category } from './types.js';
import type { DomainProbeResult } from './types.js';

const PARKING_HOSTS = [
  'sedo.com',
  'dan.com',
  'afternic.com',
  'godaddy.com',
  'namecheap.com',
  'hugedomains',
  'namebright',
  'parkingcrew',
  'bodis',
  'uniregistry',
];

function isParkingRedirect(url: string): boolean {
  const lower = url.toLowerCase();
  return PARKING_HOSTS.some((h) => lower.includes(h));
}

export function classify(result: Omit<DomainProbeResult, 'category' | 'confidence' | 'reasons'>): DomainProbeResult {
  const reasons: string[] = [];
  let category: Category;
  let confidence: number;

  if (result.dns.status === DnsStatus.NXDOMAIN) {
    category = Category.NO_DOMAIN;
    confidence = 0.95;
    reasons.push('Domain does not exist (NXDOMAIN)');
    return {
      ...result,
      category,
      confidence,
      reasons,
    };
  }

  if (result.dns.status !== DnsStatus.RESOLVES) {
    const hasNsOrMx = (result.dns.ns?.length ?? 0) > 0 || (result.dns.mx?.length ?? 0) > 0;
    const isNetworkError = result.dns.reasons.some(
      (r) => r.includes('ECONNREFUSED') || r.includes('ETIMEDOUT') || r.includes('firewall')
    );
    category = Category.INCONCLUSIVE;
    confidence = hasNsOrMx ? 0.85 : isNetworkError ? 0.3 : 0.5;
    const primaryReason = hasNsOrMx
      ? 'Domain is registered (has nameservers) - taken but no web address'
      : isNetworkError
        ? 'DNS lookup failed - results unreliable'
        : 'DNS does not resolve to address';
    reasons.push(primaryReason);
    const dnsDetail = result.dns.reasons[0];
    if (dnsDetail && dnsDetail !== primaryReason) reasons.push(dnsDetail);
    return {
      ...result,
      category,
      confidence,
      reasons,
    };
  }

  if (!result.http.attempted) {
    category = Category.INCONCLUSIVE;
    confidence = 0.4;
    reasons.push('HTTP not attempted');
    return {
      ...result,
      category,
      confidence,
      reasons,
    };
  }

  const { status, statusCategory, finalUrl, redirectChain, parkingKeywordCount, linkCount } = result.http;

  if (statusCategory === HttpStatusCategory.TIMEOUT || statusCategory === HttpStatusCategory.UNREACHABLE) {
    category = Category.INCONCLUSIVE;
    confidence = 0.5;
    reasons.push(`HTTP ${statusCategory}`);
    return {
      ...result,
      category,
      confidence,
      reasons,
    };
  }

  if (status && status >= 400) {
    category = Category.INCONCLUSIVE;
    confidence = 0.5;
    reasons.push(`HTTP ${status}`);
    return {
      ...result,
      category,
      confidence,
      reasons,
    };
  }

  if (status && status >= 300 && status < 400) {
    const allUrls = [finalUrl, ...redirectChain].filter(Boolean) as string[];
    if (allUrls.some(isParkingRedirect)) {
      category = Category.PARKED_OR_FOR_SALE;
      confidence = 0.85;
      reasons.push('Redirects to known parking/marketplace');
      return {
        ...result,
        category,
        confidence,
        reasons,
      };
    }
  }

  if (status === 200) {
    if (parkingKeywordCount >= 1) {
      const hasManyLinks = linkCount > 10;
      category = Category.PARKED_OR_FOR_SALE;
      confidence = hasManyLinks ? 0.9 : 0.75;
      reasons.push(`Parking keywords in HTML (${parkingKeywordCount} hits)`);
      if (hasManyLinks) reasons.push('Many links typical of parking page');
      return {
        ...result,
        category,
        confidence,
        reasons,
      };
    }
    category = Category.ACTIVE_SITE;
    confidence = 0.8;
    reasons.push('Resolves with HTTP 200, no parking signals');
    return {
      ...result,
      category,
      confidence,
      reasons,
    };
  }

  category = Category.INCONCLUSIVE;
  confidence = 0.6;
  reasons.push('Could not determine category');
  return {
    ...result,
    category,
    confidence,
    reasons,
  };
}
