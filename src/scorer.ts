/**
 * Pronounceability scoring (0-100) with reasons.
 */

import { CRYPTO_FAVORED_LETTERS } from './config.js';

export interface ScoreResult {
  score: number;
  reasons: string[];
}

const BASE_SCORE = 70;

/**
 * Check if name has good vowel/consonant alternation (CVCV-like).
 */
function vowelConsonantAlternation(name: string): { bonus: number; reason: string } {
  const chars = name.toLowerCase().split('');
  let alternations = 0;
  const isVowel = (c: string) => 'aeiouy'.includes(c);
  for (let i = 1; i < chars.length; i++) {
    if (isVowel(chars[i]) !== isVowel(chars[i - 1])) alternations++;
  }
  const maxAlternations = chars.length - 1;
  const ratio = maxAlternations > 0 ? alternations / maxAlternations : 1;
  if (ratio >= 0.8) return { bonus: 15, reason: 'Strong vowel/consonant alternation' };
  if (ratio >= 0.6) return { bonus: 8, reason: 'Good vowel/consonant alternation' };
  if (ratio >= 0.4) return { bonus: 0, reason: 'Moderate alternation' };
  return { bonus: -10, reason: 'Weak alternation (harder to pronounce)' };
}

/**
 * Penalize awkward clusters.
 */
function clusterPenalty(name: string): { penalty: number; reason: string } {
  const lower = name.toLowerCase();
  if (/xq|q[a-z]|[a-z]q|vv|jj|hh|ww/i.test(lower)) {
    return { penalty: 30, reason: 'Contains disallowed cluster' };
  }
  if (/ii|oo|lll|iii|ooo/.test(lower)) {
    return { penalty: 15, reason: 'Visually confusing pattern' };
  }
  return { penalty: 0, reason: '' };
}

/**
 * Repeated bigrams (e.g. "lolo" -> "lo" twice).
 */
function repeatedBigramPenalty(name: string): { penalty: number; reason: string } {
  const lower = name.toLowerCase();
  if (lower.length >= 4) {
    const bigrams: string[] = [];
    for (let i = 0; i < lower.length - 1; i++) {
      bigrams.push(lower.slice(i, i + 2));
    }
    const unique = new Set(bigrams);
    if (bigrams.length !== unique.size) {
      return { penalty: 12, reason: 'Repeated bigram' };
    }
  }
  return { penalty: 0, reason: '' };
}

/**
 * Triple letter penalty.
 */
function triplePenalty(name: string): { penalty: number; reason: string } {
  const lower = name.toLowerCase();
  if (/(.)\1\1/.test(lower)) {
    return { penalty: 20, reason: 'Triple letter' };
  }
  return { penalty: 0, reason: '' };
}

/**
 * Crypto vibe bonus for favored letters.
 */
function cryptoVibeBonus(name: string, cryptoBias: number): { bonus: number; reason: string } {
  if (cryptoBias <= 0) return { bonus: 0, reason: '' };
  const lower = name.toLowerCase();
  let count = 0;
  for (const c of lower) {
    if (CRYPTO_FAVORED_LETTERS.has(c)) count++;
  }
  if (count === 0) return { bonus: 0, reason: '' };
  const bonus = Math.round(count * 4 * cryptoBias);
  return { bonus: Math.min(bonus, 15), reason: `${count} crypto-favored letter(s): x/v/z/k/r/n/l` };
}

/**
 * Ending with 'h' or 'q' penalty (handled in filters, but double-check).
 */
function endingPenalty(name: string): { penalty: number; reason: string } {
  const last = name.toLowerCase().slice(-1);
  if (last === 'h' || last === 'q') {
    return { penalty: 15, reason: `Ends with ${last}` };
  }
  return { penalty: 0, reason: '' };
}

/**
 * At least 2 distinct consonants for 5-letter names.
 */
function distinctConsonantBonus(name: string): { delta: number; reason: string } {
  if (name.length !== 5) return { delta: 0, reason: '' };
  const consonants = name.toLowerCase().split('').filter(c => !'aeiouy'.includes(c));
  const distinct = new Set(consonants);
  if (distinct.size >= 2) return { delta: 5, reason: 'Good consonant diversity (5-letter)' };
  return { delta: -8, reason: 'Low consonant diversity (5-letter)' };
}

export function scoreName(
  name: string,
  cryptoBias: number = 0.5
): ScoreResult {
  const reasons: string[] = [];
  let score = BASE_SCORE;

  const vc = vowelConsonantAlternation(name);
  score += vc.bonus;
  if (vc.reason) reasons.push(vc.reason);

  const cp = clusterPenalty(name);
  score -= cp.penalty;
  if (cp.reason) reasons.push(cp.reason);

  const rbp = repeatedBigramPenalty(name);
  score -= rbp.penalty;
  if (rbp.reason) reasons.push(rbp.reason);

  const tp = triplePenalty(name);
  score -= tp.penalty;
  if (tp.reason) reasons.push(tp.reason);

  const ep = endingPenalty(name);
  score -= ep.penalty;
  if (ep.reason) reasons.push(ep.reason);

  const dc = distinctConsonantBonus(name);
  score += dc.delta;
  if (dc.reason) reasons.push(dc.reason);

  const cv = cryptoVibeBonus(name, cryptoBias);
  score += cv.bonus;
  if (cv.reason) reasons.push(cv.reason);

  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, reasons };
}
