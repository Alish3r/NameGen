/**
 * Seeded PRNG (mulberry32) for deterministic name generation.
 */

export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d89b4);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed?: number): () => number {
  if (seed !== undefined && seed !== null) {
    return mulberry32(seed);
  }
  return Math.random;
}
