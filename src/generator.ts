/**
 * Core name generator using phonotactic templates.
 */

import { createRng } from './prng.js';
import { getDefaultConfig, CRYPTO_FAVORED_LETTERS, type GeneratorConfig } from './config.js';
import { scoreName } from './scorer.js';
import { getDefaultBlacklist } from './blacklist.js';

export interface GenerateNamesOptions {
  count?: number;
  length?: 4 | 5 | 'both';
  seed?: number;
  minScore?: number;
  includeY?: boolean;
  cryptoBias?: number;
  patterns?: { 4?: string[]; 5?: string[] };
  /** Optional: custom blacklist Set or checker. If not provided, uses file-based loader (Node only). */
  blacklist?: Set<string> | ((name: string) => boolean);
}

export interface NameResult {
  name: string;
  score: number;
  reasons: string[];
  patternUsed: string;
}

const DISALLOWED_ENDINGS = ['h', 'q'];
const VISUALLY_CONFUSING = /ii|oo|lll|iii|ooo/i;
const DISALLOWED_CLUSTERS = /xq|q[a-z]|[a-z]q|vv|jj|hh|ww/i;

function weightedPick<T>(items: T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function getLetterWeights(
  letters: string[],
  cryptoBias: number
): number[] {
  return letters.map(c => {
    const base = 1;
    if (CRYPTO_FAVORED_LETTERS.has(c)) {
      return base + cryptoBias * 2;
    }
    return base;
  });
}

function buildName(pattern: string, config: GeneratorConfig, rng: () => number): string {
  const result: string[] = [];
  const vWeights = getLetterWeights(config.vowels, config.cryptoBias);
  const cWeights = getLetterWeights(config.consonants, config.cryptoBias);

  for (const slot of pattern) {
    if (slot === 'V') {
      result.push(weightedPick(config.vowels, vWeights, rng));
    } else {
      result.push(weightedPick(config.consonants, cWeights, rng));
    }
  }
  return result.join('').toLowerCase();
}

function passesFilters(name: string): boolean {
  const lower = name.toLowerCase();
  if (DISALLOWED_CLUSTERS.test(lower)) return false;
  if (DISALLOWED_ENDINGS.includes(lower.slice(-1))) return false;
  if (VISUALLY_CONFUSING.test(lower)) return false;
  if (/(.)\1\1/.test(lower)) return false; // triples
  if (lower.length >= 4) {
    const bigrams: string[] = [];
    for (let i = 0; i < lower.length - 1; i++) {
      bigrams.push(lower.slice(i, i + 2));
    }
    if (new Set(bigrams).size !== bigrams.length) return false; // repeated bigram
  }
  if (name.length === 5) {
    const consonants = lower.split('').filter(c => !'aeiouy'.includes(c));
    if (new Set(consonants).size < 2) return false;
  }
  return true;
}

export function generateNames(options: GenerateNamesOptions = {}): {
  names: NameResult[];
  warning?: string;
} {
  const {
    count = 50,
    length = 'both',
    seed,
    minScore = 60,
    includeY = false,
    cryptoBias = 0.5,
    patterns: patternOverride,
    blacklist: blacklistOpt,
  } = options;

  const isBlacklistedFn =
    blacklistOpt instanceof Set
      ? (n: string) => blacklistOpt.has(n.toLowerCase())
      : typeof blacklistOpt === 'function'
        ? blacklistOpt
        : getDefaultBlacklist();

  const rng = createRng(seed);
  const config = getDefaultConfig(cryptoBias, includeY);

  if (patternOverride) {
    if (patternOverride[4]) config.patterns4 = patternOverride[4];
    if (patternOverride[5]) config.patterns5 = patternOverride[5];
  }

  const targetLengths: (4 | 5)[] =
    length === 'both' ? [4, 5] : [length];

  const seen = new Set<string>();
  const results: NameResult[] = [];
  const maxAttempts = count * 200;
  let attempts = 0;

  while (results.length < count && attempts < maxAttempts) {
    attempts++;
    const len = targetLengths[Math.floor(rng() * targetLengths.length)] as 4 | 5;
    const patterns = len === 4 ? config.patterns4 : config.patterns5;
    const pattern = patterns[Math.floor(rng() * patterns.length)];
    const name = buildName(pattern, config, rng);

    if (name.length !== len) continue;
    if (seen.has(name)) continue;
    if (!passesFilters(name)) continue;
    if (isBlacklistedFn(name)) continue;

    const { score, reasons } = scoreName(name, cryptoBias);
    if (score < minScore) continue;

    seen.add(name);
    results.push({ name, score, reasons, patternUsed: pattern });
  }

  const warning =
    results.length < count && attempts >= maxAttempts
      ? `Only found ${results.length} names meeting criteria (minScore=${minScore}). Consider lowering minScore or relaxing filters.`
      : undefined;

  return { names: results, warning };
}
