import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { generateNames } from '@/generator';
import { createBlacklistFromText } from '@/blacklist-browser';
import type { NameResult } from '@/generator';
import type { WorkerResult } from './generator.worker';
import { ControlCard } from './components/ControlCard';
import { ToggleField } from './components/ToggleField';
import { SliderField } from './components/SliderField';
import { PrimaryButton } from './components/PrimaryButton';
import { ResultsTable } from './components/ResultsTable';
import { StepIndicator } from './components/StepIndicator';
import { BackgroundLayer } from './components/BackgroundLayer';
import type { TldStatusMap } from './components/ResultsTable';
import { BACKGROUND_THEMES, type BackgroundTheme } from './lib/background/themes';

interface DomainProbeResult {
  domain: string;
  category: string;
  confidence: number;
  dns: { status: string };
  http: { status: number | null };
  reasons: string[];
}

import englishBlacklistRaw from '../../wordlist/english-blacklist.txt?raw';
import cryptoBlacklistRaw from '../../wordlist/crypto-blacklist.txt?raw';

const BATCH_SIZE = 500;
const MAX_COUNT = 10_000;
const WORKER_POOL_SIZE = 4;
const FAVORITES_KEY = 'namegen-favorites';

const isBlacklist = createBlacklistFromText(englishBlacklistRaw, cryptoBlacklistRaw);

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveFavorites(fav: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...fav]));
  } catch {}
}

function doGenerate(
  count: number,
  length: 4 | 5 | 'both',
  seed: string,
  minScore: number,
  cryptoBias: number,
  includeY: boolean
): NameResult[] {
  const { names, warning } = generateNames({
    count,
    length,
    seed: seed === '' ? undefined : parseInt(seed, 10),
    minScore,
    cryptoBias,
    includeY,
    blacklist: isBlacklist,
  });
  if (warning) console.warn(warning);
  return names;
}

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

function toCsv(names: NameResult[]): string {
  const header = 'name,score,pattern,reasons';
  const rows = names.map((n) =>
    `"${n.name}",${n.score},"${n.patternUsed}","${n.reasons.join('; ').replace(/"/g, '""')}"`
  );
  return [header, ...rows].join('\n');
}

export default function App() {
  const [count, setCount] = useState(50);
  const [length, setLength] = useState<4 | 5 | 'both'>('both');
  const [seed, setSeed] = useState('');
  const [articulation, setArticulation] = useState(60);
  const [cryptoBias, setCryptoBias] = useState(0.5);
  const [includeY, setIncludeY] = useState(false);
  const [names, setNames] = useState<NameResult[]>([]);
  const [copiedSource, setCopiedSource] = useState<'all' | 'shortlist' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [probeResults, setProbeResults] = useState<DomainProbeResult[]>([]);
  const [probing, setProbing] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [showShortlistOnly, setShowShortlistOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'name' | 'available'>('score');
  const [tableDensity, setTableDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [backgroundTheme, setBackgroundTheme] = useState<BackgroundTheme>('Dark Abstract');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  const exampleKey = useMemo(
    () =>
      [
        seed,
        articulation,
        cryptoBias,
        length,
        includeY,
      ].join('|'),
    [seed, articulation, cryptoBias, length, includeY]
  );

  const [exampleName, setExampleName] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      const derivedSeed = hashString(exampleKey);
      const result = doGenerate(
        1,
        length,
        String(derivedSeed),
        articulation,
        cryptoBias,
        includeY
      );
      setExampleName(result[0]?.name ?? '—');
    }, 120);
    return () => clearTimeout(id);
  }, [exampleKey, articulation, cryptoBias, length, includeY]);

  const handleGenerate = useCallback(async () => {
    const n = seed !== '' ? parseInt(seed, 10) : undefined;
    if (seed !== '' && (n === undefined || isNaN(n) || n < 0)) return;

    setGenerating(true);
    setProgress({ done: 0, total: count });

    const batchCount = Math.ceil(count / BATCH_SIZE);
    const batches = Array.from({ length: batchCount }, (_, i) => ({
      index: i,
      size: Math.min(BATCH_SIZE, count - i * BATCH_SIZE),
    }));

    try {
      let completed = 0;
      const results: WorkerResult[] = [];

      const runBatch = (batch: { index: number; size: number }): Promise<WorkerResult> =>
        new Promise((resolve, reject) => {
          const worker = new Worker(
            new URL('./generator.worker.ts', import.meta.url),
            { type: 'module' }
          );
          worker.onmessage = (e: MessageEvent<WorkerResult>) => {
            completed += e.data.names.length;
            setProgress((p) => (p ? { ...p, done: completed } : null));
            worker.terminate();
            resolve(e.data);
          };
          worker.onerror = () => {
            worker.terminate();
            reject(new Error('Worker failed'));
          };
          worker.postMessage({
            batchIndex: batch.index,
            batchSize: batch.size,
            baseSeed: n,
            length,
            minScore: articulation,
            cryptoBias,
            includeY,
          });
        });

      const poolSize = Math.min(WORKER_POOL_SIZE, batchCount);
      for (let i = 0; i < batches.length; i += poolSize) {
        const wave = batches.slice(i, i + poolSize);
        const waveResults = await Promise.all(wave.map(runBatch));
        results.push(...waveResults);
      }

      const allNames = results.flatMap((r) => r.names);
      const seen = new Set<string>();
      const deduped: NameResult[] = [];
      for (const name of allNames) {
        if (!seen.has(name.name)) {
          seen.add(name.name);
          deduped.push(name);
        }
      }
      deduped.sort((a, b) => b.score - a.score);
      setNames(deduped);
      setProbeResults([]);
      setProbeError(null);
    } catch (err) {
      console.error('Worker error, falling back to main thread:', err);
      const results = doGenerate(count, length, seed, articulation, cryptoBias, includeY);
      setNames(results);
      setProbeResults([]);
      setProbeError(null);
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  }, [count, length, seed, articulation, cryptoBias, includeY]);

  const handleProbe = useCallback(async () => {
    const topN = Math.min(50, names.length);
    if (topN === 0) return;
    const tlds = ['com', 'net', 'io'] as const;
    const domains = names
      .slice(0, topN)
      .flatMap((n) => tlds.map((tld) => `${n.name}.${tld}`));
    setProbing(true);
    setProbeResults([]);
    setProbeError(null);
    try {
      const res = await fetch('/api/probe-domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Probe failed (${res.status})`);
      setProbeResults(data.results ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Probe failed';
      setProbeError(msg);
      setProbeResults([]);
    } finally {
      setProbing(false);
    }
  }, [names]);

  const nameProbeMap = useMemo(() => {
    const map = new Map<string, DomainProbeResult[]>();
    for (const r of probeResults) {
      const match = r.domain.match(/^(.+)\.(com|net|io)$/);
      if (match) {
        const [, base] = match;
        if (!map.has(base)) map.set(base, []);
        map.get(base)!.push(r);
      }
    }
    return map;
  }, [probeResults]);

  const getAvailability = useCallback(
    (name: string): 'available' | 'unavailable' | 'unsure' | null => {
      const results = nameProbeMap.get(name);
      if (!results || results.length === 0) return null;
      const hasAvailable = results.some((r) => r.category === 'NO_DOMAIN');
      const allTaken = results.every((r) =>
        ['PARKED_OR_FOR_SALE', 'ACTIVE_SITE'].includes(r.category)
      );
      if (hasAvailable) return 'available';
      if (allTaken) return 'unavailable';
      return 'unsure';
    },
    [nameProbeMap]
  );

  const getTldStatus = useCallback(
    (name: string): TldStatusMap => {
      const results = nameProbeMap.get(name) ?? [];
      const out: TldStatusMap = {};
      for (const r of results) {
        const tld = r.domain.split('.').pop() as 'com' | 'net' | 'io';
        const status =
          r.category === 'NO_DOMAIN'
            ? 'available'
            : r.category === 'PARKED_OR_FOR_SALE'
              ? 'parked'
              : r.category === 'ACTIVE_SITE'
                ? 'active'
                : 'unknown';
        out[tld] = status;
      }
      return out;
    },
    [nameProbeMap]
  );

  const displayNames = useMemo(() => {
    let list = [...names];
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter((n) => n.name.toLowerCase().includes(q));
    if (showAvailableOnly && probeResults.length > 0) {
      list = list.filter((n) => getAvailability(n.name) === 'available');
    }
    if (showShortlistOnly && favorites.size > 0) {
      list = list.filter((n) => favorites.has(n.name));
    }
    if (sortBy === 'score') list.sort((a, b) => b.score - a.score);
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'available' && probeResults.length > 0) {
      list.sort((a, b) => {
        const avA = getAvailability(a.name);
        const avB = getAvailability(b.name);
        const order = { available: 0, unsure: 1, unavailable: 2, null: 3 } as const;
        const sa = order[avA ?? 'null'];
        const sb = order[avB ?? 'null'];
        return sa !== sb ? sa - sb : b.score - a.score;
      });
    }
    return list;
  }, [names, searchQuery, showAvailableOnly, showShortlistOnly, sortBy, probeResults.length, favorites, getAvailability]);

  const handleFavoriteToggle = useCallback((name: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleClearResults = useCallback(() => {
    setNames([]);
    setProbeResults([]);
    setProbeError(null);
    setSearchQuery('');
    setShowAvailableOnly(false);
    setShowShortlistOnly(false);
    setSortBy('score');
  }, []);

  const handleCopyAll = useCallback(() => {
    const text = displayNames.map((n) => n.name).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedSource('all');
    setTimeout(() => setCopiedSource(null), 1500);
  }, [displayNames]);

  const handleExportCsv = useCallback(() => {
    const blob = new Blob([toCsv(displayNames)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `namegen-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayNames]);

  const shortlistNames = useMemo(
    () => displayNames.filter((n) => favorites.has(n.name)),
    [displayNames, favorites]
  );

  const handleCopyShortlist = useCallback(() => {
    const text = shortlistNames.map((n) => n.name).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedSource('shortlist');
    setTimeout(() => setCopiedSource(null), 1500);
  }, [shortlistNames]);

  const handleExportShortlist = useCallback(() => {
    if (shortlistNames.length === 0) return;
    const blob = new Blob([toCsv(shortlistNames)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `namegen-shortlist-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [shortlistNames]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && names.length > 0) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (!generating) handleGenerate();
      } else if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current) {
          setSearchQuery('');
        }
        (document.activeElement as HTMLElement)?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [names.length, generating, handleGenerate]);

  return (
    <div className="app">
      <BackgroundLayer theme={backgroundTheme} showNewButton />
      <header className="header">
        <h1>NameGen</h1>
        <p className="tagline">Brandable name generator · 4–5 letters · Crypto/Fintech vibe</p>
        <div className="header__background-controls">
          <label className="header__theme-label">
            <span className="header__theme-text">Background:</span>
            <select
              value={backgroundTheme}
              onChange={(e) => setBackgroundTheme(e.target.value as BackgroundTheme)}
              className="header__theme-select"
              aria-label="Background theme"
            >
              {BACKGROUND_THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="controls">
        <ControlCard
          title="Generate"
          action={
            <button
              type="button"
              className="control-reset-btn"
              onClick={() => {
                setCount(50);
                setLength('both');
                setSeed('');
                setIncludeY(false);
              }}
              disabled={generating}
              aria-label="Reset Generate to defaults"
            >
              Reset
            </button>
          }
        >
          <div className="generate-grid">
            <div className="generate-row">
              <label>
                <span className="label-text">Count (1–{MAX_COUNT.toLocaleString()})</span>
                <input
                  type="number"
                  min={1}
                  max={MAX_COUNT}
                  value={count}
                  onChange={(e) =>
                    setCount(Math.max(1, Math.min(MAX_COUNT, parseInt(e.target.value, 10) || 1)))
                  }
                  disabled={generating}
                  aria-label="Number of names to generate"
                />
              </label>
              <label>
                <span className="label-text">Length</span>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value as 4 | 5 | 'both')}
                  disabled={generating}
                  aria-label="Name length"
                >
                  <option value="both">4 & 5</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>
              <label>
                <span className="label-text">Seed (optional)</span>
                <input
                  type="text"
                  placeholder="e.g. 123"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  disabled={generating}
                  aria-label="Random seed for reproducible results"
                />
              </label>
            </div>
            <ToggleField
              label="Extended vowel set"
              description="Adds 'y' to vowel pool (e.g., lyne, kyo)."
              checked={includeY}
              onChange={setIncludeY}
              disabled={generating}
              id="toggle-include-y"
            />
          </div>
        </ControlCard>

        <ControlCard
          title="Quality"
          action={
            <button
              type="button"
              className="control-reset-btn"
              onClick={() => {
                setArticulation(60);
                setCryptoBias(0.5);
              }}
              disabled={generating}
              aria-label="Reset Quality to defaults"
            >
              Reset
            </button>
          }
        >
          <div className="quality-presets">
            <span className="quality-presets__label">Presets:</span>
            <button
              type="button"
              className="quality-preset-chip"
              onClick={() => {
                setArticulation(60);
                setCryptoBias(0.5);
                setIncludeY(false);
              }}
              disabled={generating}
              aria-label="Balanced preset: pronounceability 60, crypto 50"
            >
              Balanced
            </button>
            <button
              type="button"
              className="quality-preset-chip"
              onClick={() => {
                setArticulation(80);
                setCryptoBias(0.35);
                setIncludeY(true);
              }}
              disabled={generating}
              aria-label="Pronounceable preset: pronounceability 80, crypto 35"
            >
              Pronounceable
            </button>
            <button
              type="button"
              className="quality-preset-chip"
              onClick={() => {
                setArticulation(55);
                setCryptoBias(0.8);
                setIncludeY(false);
              }}
              disabled={generating}
              aria-label="Crypto-heavy preset: pronounceability 55, crypto 80"
            >
              Crypto-heavy
            </button>
          </div>
          <div className="quality-sliders">
            <SliderField
              label="Pronounceability"
              leftLabel="Loose"
              rightLabel="Strict"
              value={articulation}
              min={0}
              max={100}
              onChange={setArticulation}
              helper="Higher = stricter rules"
              disabled={generating}
              id="slider-pronounceability"
              gradient={{
                start: '#ff4d6d',
                end: '#ff8a00',
                track: 'rgba(255,255,255,0.06)',
              }}
              thumbGradient="linear-gradient(135deg, #ff4d6d, #ff8a00)"
              thumbGlow="rgba(255, 77, 109, 0.5)"
              extraInlineInfo={
                <span className="slider-field__example">
                  Example: <strong>{exampleName ?? '…'}</strong>
                </span>
              }
            />
            <SliderField
              label="Crypto style"
              leftLabel="Neutral"
              rightLabel="Crypto-heavy"
              value={Math.round(cryptoBias * 100)}
              min={0}
              max={100}
              onChange={(v) => setCryptoBias(v / 100)}
              helper="Weights letters like x, v, z, k"
              disabled={generating}
              id="slider-crypto"
              rightUnit="%"
              gradient={{
                start: '#ff8a00',
                end: '#8b5cf6',
                track: 'rgba(255,255,255,0.06)',
              }}
              thumbGradient="linear-gradient(135deg, #ff8a00, #8b5cf6)"
              thumbGlow="rgba(139, 92, 246, 0.5)"
            />
          </div>
        </ControlCard>

        <div className="actions actions--primary">
          <PrimaryButton
            onClick={handleGenerate}
            disabled={generating}
            loading={generating}
            variant="primary"
            aria-label="Generate names"
          >
            {generating ? 'Generating…' : 'Generate'}
          </PrimaryButton>
          {progress && (
            <span className="progress-text" aria-live="polite">
              Batches: {Math.ceil(progress.done / BATCH_SIZE)}/{Math.ceil(progress.total / BATCH_SIZE)}
            </span>
          )}
        </div>
      </section>

      {names.length > 0 && (
        <section className="results">
          <StepIndicator
            hasResults={names.length > 0}
            hasProbed={probeResults.length > 0}
            hasShortlist={favorites.size > 0}
          />
          <div className="result-actions result-actions--sticky">
            <div className="result-actions__primary">
              <PrimaryButton
                onClick={handleProbe}
                disabled={probing}
                loading={probing}
                variant="primary"
                aria-label="Check domain availability for top 50 names"
              >
                {probing ? 'Checking…' : 'Check availability'}
              </PrimaryButton>
              <span className="probe-hint text-muted">Probes top 50</span>
            </div>
            <div className="density-control">
              <button
                type="button"
                className={`density-control__btn ${tableDensity === 'comfortable' ? 'density-control__btn--active' : ''}`}
                onClick={() => setTableDensity('comfortable')}
                aria-pressed={tableDensity === 'comfortable'}
                aria-label="Comfortable density"
              >
                Comfortable
              </button>
              <button
                type="button"
                className={`density-control__btn ${tableDensity === 'compact' ? 'density-control__btn--active' : ''}`}
                onClick={() => setTableDensity('compact')}
                aria-pressed={tableDensity === 'compact'}
                aria-label="Compact density"
              >
                Compact
              </button>
            </div>
            <div className="result-actions__secondary">
              {favorites.size > 0 && (
                <>
                  <span className="shortlist-badge" aria-label={`${favorites.size} in shortlist`}>
                    {favorites.size}
                  </span>
                  <PrimaryButton
                    onClick={handleCopyShortlist}
                    disabled={shortlistNames.length === 0}
                    variant="secondary"
                    aria-label="Copy shortlist"
                  >
                    {copiedSource === 'shortlist' ? 'Copied!' : 'Copy shortlist'}
                  </PrimaryButton>
                  <PrimaryButton
                    onClick={handleExportShortlist}
                    disabled={shortlistNames.length === 0}
                    variant="secondary"
                    aria-label="Export shortlist CSV"
                  >
                    Export shortlist
                  </PrimaryButton>
                </>
              )}
              <PrimaryButton
                onClick={handleCopyAll}
                variant="secondary"
                aria-label="Copy all names to clipboard"
              >
                {copiedSource === 'all' ? 'Copied!' : 'Copy all'}
              </PrimaryButton>
              <PrimaryButton
                onClick={handleExportCsv}
                variant="secondary"
                aria-label="Export names as CSV"
              >
                Export CSV
              </PrimaryButton>
              <PrimaryButton
                onClick={handleClearResults}
                variant="secondary"
                aria-label="Clear results"
              >
                Clear
              </PrimaryButton>
            </div>
          </div>
          <div className="result-filters">
            <input
              ref={searchInputRef}
              type="search"
              className="result-filters__search"
              placeholder="Search by name… (/ to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search names"
            />
            <label>
              <input
                type="checkbox"
                checked={showAvailableOnly}
                onChange={(e) => setShowAvailableOnly(e.target.checked)}
                disabled={probeResults.length === 0}
                aria-label="Show only available domains"
              />
              <span className="text-muted">Available only</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={showShortlistOnly}
                onChange={(e) => setShowShortlistOnly(e.target.checked)}
                disabled={favorites.size === 0}
                aria-label="Shortlist only"
              />
              <span className="text-muted">Shortlist only</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'name' | 'available')}
              aria-label="Sort by"
            >
              <option value="score">Highest score</option>
              <option value="name">Name A→Z</option>
              <option value="available" disabled={probeResults.length === 0}>
                Available first
              </option>
            </select>
          </div>
          {probeError && (
            <p className="probe-error-inline" role="alert">
              {probeError}
            </p>
          )}
          <ResultsTable
            names={displayNames}
            probeColumns={probeResults.length > 0}
            getAvailability={getAvailability}
            getTldStatus={getTldStatus}
            favorites={favorites}
            onFavoriteToggle={handleFavoriteToggle}
            density={tableDensity}
          />
        </section>
      )}

      {names.length === 0 && !generating && (
        <div className="empty-state">
          <h2 className="empty-state__title">Ready to generate</h2>
          <p className="empty-state__text">
            Adjust the controls above and click Generate to discover brandable names.
          </p>
        </div>
      )}
    </div>
  );
}
