/**
 * HTTP probe using undici fetch.
 */

import { request } from 'undici';
import { computeHtmlFingerprint, countParkingKeywords } from './fingerprint.js';
import type { HttpProbeResult } from './types.js';
import { HttpStatusCategory } from './types.js';

const MAX_BODY_SAMPLE = 64 * 1024;
const DEFAULT_UA =
  'NameGen-DomainProbe/1.0 (Domain availability check; +https://github.com/namegen)';

export async function probeHttp(
  fqdn: string,
  timeoutMs: number,
  maxRedirects: number,
  userAgent: string = DEFAULT_UA
): Promise<HttpProbeResult> {
  const tryUrl = async (url: string): Promise<HttpProbeResult & { bodySample?: Buffer }> => {
    const reasons: string[] = [];
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const { statusCode, headers, body } = await request(url, {
        method: 'GET',
        headersTimeout: timeoutMs,
        bodyTimeout: timeoutMs,
        maxRedirections: maxRedirects,
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const timingMs = Date.now() - start;
      const contentType = headers['content-type']?.toString() ?? null;
      const contentLength = headers['content-length']
        ? parseInt(headers['content-length'].toString(), 10)
        : null;

      let statusCategory: HttpStatusCategory;
      if (statusCode >= 200 && statusCode < 300) statusCategory = HttpStatusCategory.OK;
      else if (statusCode >= 300 && statusCode < 400) statusCategory = HttpStatusCategory.REDIRECT;
      else if (statusCode >= 400 && statusCode < 500) statusCategory = HttpStatusCategory.CLIENT_ERROR;
      else if (statusCode >= 500) statusCategory = HttpStatusCategory.SERVER_ERROR;
      else statusCategory = HttpStatusCategory.UNREACHABLE;

      const loc = headers['location'];
      const redirectChain: string[] = loc ? [typeof loc === 'string' ? loc : loc.toString()] : [];

      reasons.push(`HTTP ${statusCode} in ${timingMs}ms`);

      let bodySample: Buffer | null = null;
      let parkingKeywordCount = 0;
      let linkCount = 0;
      if (statusCode === 200 && contentType?.includes('text/html') && body) {
        const chunks: Buffer[] = [];
        let total = 0;
        for await (const chunk of body) {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += buf.length;
          if (total <= MAX_BODY_SAMPLE) chunks.push(buf);
          if (total >= MAX_BODY_SAMPLE) break;
        }
        bodySample = Buffer.concat(chunks);
        const htmlStr = bodySample.toString('utf-8', 0, Math.min(bodySample.length, MAX_BODY_SAMPLE));
        parkingKeywordCount = countParkingKeywords(htmlStr);
        linkCount = (htmlStr.match(/<a\s+[^>]*href/gi) ?? []).length;
      }

      return {
        attempted: true,
        finalUrl: url,
        status: statusCode,
        statusCategory,
        redirectChain,
        contentType,
        contentLength,
        timingMs,
        bodyFingerprint: bodySample ? computeHtmlFingerprint(bodySample) : null,
        parkingKeywordCount,
        linkCount,
        reasons,
        bodySample: bodySample ?? undefined,
      };
    } catch (err) {
      clearTimeout(timeout);
      const timingMs = Date.now() - start;
      if ((err as Error)?.name === 'AbortError') {
        reasons.push(`Timeout after ${timingMs}ms`);
        return {
          attempted: true,
          finalUrl: null,
          status: null,
          statusCategory: HttpStatusCategory.TIMEOUT,
          redirectChain: [],
          contentType: null,
          contentLength: null,
          timingMs,
          bodyFingerprint: null,
          parkingKeywordCount: 0,
          linkCount: 0,
          reasons,
        };
      }
      reasons.push(`Error: ${(err as Error)?.message ?? 'Unknown'}`);
      return {
        attempted: true,
        finalUrl: null,
        status: null,
        statusCategory: HttpStatusCategory.UNREACHABLE,
        redirectChain: [],
        contentType: null,
        contentLength: null,
        timingMs,
        bodyFingerprint: null,
        parkingKeywordCount: 0,
        linkCount: 0,
        reasons,
      };
    }
  };

  const httpsUrl = `https://${fqdn}/`;
  const httpsResult = await tryUrl(httpsUrl);

  if (
    httpsResult.status === 200 ||
    (httpsResult.status !== null && httpsResult.status >= 300 && httpsResult.status < 400)
  ) {
    const { bodySample: _, ...rest } = httpsResult;
    return rest;
  }

  const httpUrl = `http://${fqdn}/`;
  const httpResult = await tryUrl(httpUrl);
  const { bodySample: __, ...rest } = httpResult;
  return rest;
}
