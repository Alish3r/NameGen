/**
 * Server-side background API handler. Uses Pexels API with fallback to bundled images.
 */

import { fetchBackgroundFromPexels } from '../src/lib/providers/pexels';
import { checkRateLimit } from './rateLimiter';
import type { BackgroundTheme } from '../src/lib/background/themes';
import { BACKGROUND_THEMES } from '../src/lib/background/themes';

export interface BackgroundRequest {
  theme?: string;
  tags?: string[];
  viewportW?: number;
  viewportH?: number;
  dpr?: number;
}

export interface BackgroundResponse {
  imageUrl: string;
  photographer: string;
  sourceUrl: string;
  avgColor: string;
  provider: string;
}

// SVG data URLs - work without /public/backgrounds/ files
const FALLBACK_SVG = (color: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><radialGradient id="g" cx="50%" cy="30%"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="#080614"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`
  )}`;

const FALLBACK_IMAGES: BackgroundResponse[] = [
  {
    imageUrl: FALLBACK_SVG('#1a0a2e'),
    photographer: 'NameGen',
    sourceUrl: '',
    avgColor: '#0e0a1f',
    provider: 'local',
  },
  {
    imageUrl: FALLBACK_SVG('#0d1b2a'),
    photographer: 'NameGen',
    sourceUrl: '',
    avgColor: '#1a1628',
    provider: 'local',
  },
  {
    imageUrl: FALLBACK_SVG('#1b0a1f'),
    photographer: 'NameGen',
    sourceUrl: '',
    avgColor: '#0d0a14',
    provider: 'local',
  },
  {
    imageUrl: FALLBACK_SVG('#0f0a1a'),
    photographer: 'NameGen',
    sourceUrl: '',
    avgColor: '#0e0a1f',
    provider: 'local',
  },
  {
    imageUrl: FALLBACK_SVG('#0a0e1a'),
    photographer: 'NameGen',
    sourceUrl: '',
    avgColor: '#0a0e1a',
    provider: 'local',
  },
];

let fallbackIndex = 0;

function getFallback(): BackgroundResponse {
  const img = FALLBACK_IMAGES[fallbackIndex % FALLBACK_IMAGES.length];
  fallbackIndex++;
  return img;
}

function getClientIp(req: { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return (forwarded[0] ?? '').split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? '127.0.0.1';
}

export async function handleBackgroundRequest(
  req: { method?: string; url?: string; headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string }; on: (ev: string, fn: (chunk: Buffer) => void) => void },
  res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (s: string) => void }
): Promise<void> {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Try again in 10 minutes.' }));
    return;
  }

  let body: BackgroundRequest = {};
  try {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on!('data', (c: Buffer) => chunks.push(c));
      req.on!('end', () => resolve());
      req.on!('error', reject);
    });
    const raw = Buffer.concat(chunks).toString('utf-8');
    body = raw ? (JSON.parse(raw) as BackgroundRequest) : {};
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }

  const theme = (body.theme && BACKGROUND_THEMES.includes(body.theme as BackgroundTheme))
    ? (body.theme as BackgroundTheme)
    : 'Dark Abstract';
  const viewportW = Math.min(Math.max(Number(body.viewportW) || 1440, 320), 3840);
  const viewportH = Math.min(Math.max(Number(body.viewportH) || 900, 240), 2160);
  const dpr = Math.min(Math.max(Number(body.dpr) || 2, 1), 3);

  const apiKey = process.env.PEXELS_API_KEY;
  let result: BackgroundResponse | null = null;

  if (apiKey) {
    try {
      result = await fetchBackgroundFromPexels(apiKey, theme, viewportW, viewportH, dpr);
    } catch (err) {
      console.warn('[background-api] Pexels error:', (err as Error)?.message);
    }
  }

  if (!result) {
    result = getFallback();
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(result));
}
