/**
 * Configuration for name generation: letter pools, patterns, and weights.
 */

export const DEFAULT_VOWELS = ['a', 'e', 'i', 'o', 'u'];
export const VOWELS_WITH_Y = ['a', 'e', 'i', 'o', 'u', 'y'];
export const DEFAULT_CONSONANTS = [
  'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
  'n', 'p', 'r', 's', 't', 'v', 'x', 'z'
];

/** Letters favored in crypto/fintech branding (x, v, z, k, r, n, l) */
export const CRYPTO_FAVORED_LETTERS = new Set(['x', 'v', 'z', 'k', 'r', 'n', 'l']);

/** Phonotactic patterns: C=consonant, V=vowel */
export const PATTERNS_4: string[] = ['CVCV', 'CVVC', 'VCVC', 'VCCV'];
export const PATTERNS_5: string[] = ['CVCVC', 'CVCCV', 'VCCVC'];

export const ALL_PATTERNS: Record<4 | 5, string[]> = {
  4: PATTERNS_4,
  5: PATTERNS_5,
};

/** Optional allowed fragments (used only if they fit within 4-5 chars) */
export const CRYPTO_FRAGMENTS = [
  'ex', 'xo', 'fi', 'io', 'dex', 'pay', 'chain', 'swap'
] as const;

/** Awkward clusters to disallow */
export const DISALLOWED_CLUSTERS = [
  'xq', 'q', 'vv', 'jj', 'hh', 'ww',
  /q[a-z]/, /[a-z]q/  // *q, q*
];
export const DISALLOWED_REGEX = /xq|q[a-z]|[a-z]q|vv|jj|hh|ww/i;

/** No triples, repeated bigrams, ending with h or q */
export const DISALLOWED_ENDINGS = ['h', 'q'];
export const VISUALLY_CONFUSING = ['ii', 'oo', 'lll', 'iii', 'ooo'];

export interface GeneratorConfig {
  vowels: string[];
  consonants: string[];
  patterns4: string[];
  patterns5: string[];
  cryptoBias: number;
  includeY: boolean;
}

export function getDefaultConfig(
  cryptoBias: number = 0.5,
  includeY: boolean = false
): GeneratorConfig {
  return {
    vowels: includeY ? [...VOWELS_WITH_Y] : [...DEFAULT_VOWELS],
    consonants: [...DEFAULT_CONSONANTS],
    patterns4: [...PATTERNS_4],
    patterns5: [...PATTERNS_5],
    cryptoBias,
    includeY,
  };
}
