import { describe, it, expect } from 'vitest';
import { generateNames } from '../src/generator';
import { scoreName } from '../src/scorer';

describe('generateNames', () => {
  it('returns requested count when possible', () => {
    const { names } = generateNames({ count: 10, length: 4, seed: 42, minScore: 50 });
    expect(names.length).toBe(10);
  });

  it('generates names of correct length when length=4', () => {
    const { names } = generateNames({ count: 20, length: 4, seed: 123, minScore: 50 });
    names.forEach((n) => expect(n.name.length).toBe(4));
  });

  it('generates names of correct length when length=5', () => {
    const { names } = generateNames({ count: 20, length: 5, seed: 456, minScore: 50 });
    names.forEach((n) => expect(n.name.length).toBe(5));
  });

  it('is deterministic with same seed', () => {
    const a = generateNames({ count: 20, length: 4, seed: 999, minScore: 55 });
    const b = generateNames({ count: 20, length: 4, seed: 999, minScore: 55 });
    expect(a.names.map((n) => n.name)).toEqual(b.names.map((n) => n.name));
  });

  it('produces different results with different seeds', () => {
    const a = generateNames({ count: 20, length: 4, seed: 1, minScore: 50 });
    const b = generateNames({ count: 20, length: 4, seed: 2, minScore: 50 });
    expect(a.names.map((n) => n.name)).not.toEqual(b.names.map((n) => n.name));
  });

  it('respects minScore', () => {
    const { names } = generateNames({ count: 30, length: 4, seed: 77, minScore: 75 });
    names.forEach((n) => expect(n.score).toBeGreaterThanOrEqual(75));
  });

  it('deduplicates results', () => {
    const { names } = generateNames({ count: 50, length: 4, seed: 11, minScore: 50 });
    const unique = new Set(names.map((n) => n.name));
    expect(unique.size).toBe(names.length);
  });

  it('uses valid phonotactic patterns', () => {
    const validPatterns4 = ['CVCV', 'CVVC', 'VCVC', 'VCCV'];
    const validPatterns5 = ['CVCVC', 'CVCCV', 'VCCVC'];
    const { names } = generateNames({ count: 50, length: 'both', seed: 222, minScore: 50 });
    names.forEach((n) => {
      if (n.name.length === 4) expect(validPatterns4).toContain(n.patternUsed);
      else expect(validPatterns5).toContain(n.patternUsed);
    });
  });

  it('returns warning when cannot find enough names', () => {
    const { names, warning } = generateNames({
      count: 1000,
      length: 4,
      seed: 1,
      minScore: 99,
    });
    expect(names.length).toBeLessThan(1000);
    if (names.length < 1000) expect(warning).toBeDefined();
  });
});

describe('scoreName', () => {
  it('returns score 0-100', () => {
    const { score } = scoreName('xevo');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives higher score for good alternation', () => {
    const good = scoreName('xevo'); // CVCV
    const bad = scoreName('xxxx');
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it('penalizes disallowed clusters', () => {
    const normal = scoreName('veta');
    const withQ = scoreName('veqa');
    expect(normal.score).toBeGreaterThan(withQ.score);
  });

  it('awards crypto vibe bonus for favored letters', () => {
    const crypto = scoreName('xevz', 0.8);
    const plain = scoreName('aebu', 0);
    expect(crypto.reasons.some((r) => r.includes('crypto'))).toBe(true);
  });
});
