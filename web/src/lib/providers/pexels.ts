/**
 * Server-side Pexels API provider. Never import in client code.
 */

import { THEME_TO_QUERY, type BackgroundTheme } from '../background/themes';
import { getCacheKey, get, set } from '../cache/ttlCache';
import { getRecentIds, addRecentId } from '../cache/recentIds';

const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    landscape: string;
    medium: string;
    small: string;
    portrait: string;
    tiny: string;
  };
  avg_color?: string;
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
  total_results: number;
  page: number;
  per_page: number;
}

function bucketize(w: number): number {
  if (w <= 1024) return 1024;
  if (w <= 1440) return 1440;
  if (w <= 1920) return 1920;
  return 2560;
}

function bucketizeH(h: number): number {
  if (h <= 720) return 720;
  if (h <= 900) return 900;
  if (h <= 1080) return 1080;
  return 1440;
}

export interface BackgroundResult {
  imageUrl: string;
  photographer: string;
  sourceUrl: string;
  avgColor: string;
  provider: 'pexels';
}

export async function fetchBackgroundFromPexels(
  apiKey: string,
  theme: BackgroundTheme,
  viewportW: number,
  viewportH: number,
  dpr: number
): Promise<BackgroundResult | null> {
  const targetW = Math.min(Math.max(viewportW * dpr, 1024), 2560);
  const wBucket = bucketize(viewportW);
  const hBucket = bucketizeH(viewportH);
  const cacheKey = getCacheKey(theme, wBucket, hBucket);

  const cached = get<{ photos: PexelsPhoto[] }>(cacheKey);
  let photos: PexelsPhoto[];

  if (cached) {
    photos = cached.photos;
  } else {
    const query = THEME_TO_QUERY[theme];
    const url = new URL(PEXELS_SEARCH_URL);
    url.searchParams.set('query', query);
    url.searchParams.set('orientation', 'landscape');
    url.searchParams.set('per_page', '30');
    url.searchParams.set('page', '1');

    const res = await fetch(url.toString(), {
      headers: { Authorization: apiKey },
    });

    if (!res.ok) {
      console.warn('[pexels] API error:', res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as PexelsSearchResponse;
    photos = data.photos ?? [];
    set(cacheKey, { photos });
  }

  if (photos.length === 0) return null;

  const recentIds = getRecentIds(theme);
  const candidates = photos.filter((p) => !recentIds.includes(p.id));
  const pool = candidates.length > 0 ? candidates : photos;
  const photo = pool[Math.floor(Math.random() * pool.length)];

  addRecentId(theme, photo.id);

  const imageUrl =
    targetW >= 1920 && photo.src.large2x
      ? photo.src.large2x
      : photo.src.large || photo.src.landscape || photo.src.original;

  return {
    imageUrl,
    photographer: photo.photographer,
    sourceUrl: photo.url,
    avgColor: photo.avg_color ?? '#0e0a1f',
    provider: 'pexels',
  };
}
