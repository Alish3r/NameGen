import { useState, useCallback, useEffect, useRef } from 'react';
import type { BackgroundTheme } from '../lib/background/themes';

interface BackgroundImage {
  imageUrl: string;
  photographer: string;
  sourceUrl: string;
  avgColor: string;
  provider: string;
}

interface BackgroundLayerProps {
  theme: BackgroundTheme;
  onNewBackground?: () => void;
  showNewButton?: boolean;
}

async function fetchBackground(
  theme: BackgroundTheme,
  viewportW: number,
  viewportH: number,
  dpr: number
): Promise<BackgroundImage> {
  const res = await fetch('/api/background', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      theme,
      viewportW,
      viewportH,
      dpr,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Background fetch failed (${res.status})`);
  }
  return res.json();
}

export function BackgroundLayer({
  theme,
  onNewBackground,
  showNewButton = true,
}: BackgroundLayerProps) {
  const [current, setCurrent] = useState<BackgroundImage | null>(null);
  const [next, setNext] = useState<BackgroundImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const currentRef = useRef<BackgroundImage | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  currentRef.current = current;

  const loadBackground = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 2, 3);
      const img = await fetchBackground(theme, w, h, dpr);

      if (!mountedRef.current) return;

      if (currentRef.current) {
        setNext(img);
        transitionTimeoutRef.current = setTimeout(() => {
          transitionTimeoutRef.current = null;
          if (mountedRef.current) {
            setCurrent(img);
            setNext(null);
          }
        }, 500);
      } else {
        setCurrent(img);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load background');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [theme]);

  useEffect(() => {
    mountedRef.current = true;
    loadBackground();
    return () => {
      mountedRef.current = false;
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [theme, loadBackground]);

  const handleNewBackground = useCallback(() => {
    loadBackground();
    onNewBackground?.();
  }, [loadBackground, onNewBackground]);

  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="bg-layer__images">
        {current && (
          <div
            className={`bg-layer__img ${next ? 'bg-layer__img--fade-out' : ''}`}
            style={{ backgroundImage: `url(${current.imageUrl})` }}
          />
        )}
        {next && (
          <div
            className="bg-layer__img bg-layer__img--fade-in"
            style={{ backgroundImage: `url(${next.imageUrl})` }}
          />
        )}
      </div>
      <div className="bg-layer__vignette" />
      <div className="bg-layer__grain" aria-hidden="true" />
      {showNewButton && (
        <button
          type="button"
          className="bg-layer__new-btn"
          onClick={handleNewBackground}
          disabled={loading}
          aria-label="New background"
          title="New background"
        >
          {loading ? '…' : '⟳'}
        </button>
      )}
      {error && (
        <span className="bg-layer__error" role="status">
          {error}
        </span>
      )}
    </div>
  );
}
