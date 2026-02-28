/**
 * Brandable Name Generator - Public API
 */

export { generateNames } from './generator.js';
export type { GenerateNamesOptions, NameResult } from './generator.js';
export { scoreName } from './scorer.js';
export type { ScoreResult } from './scorer.js';
export { createRng, mulberry32 } from './prng.js';
export {
  loadBlacklists,
  isBlacklisted,
  getDefaultBlacklist,
  createBlacklistFromText,
} from './blacklist.js';
export * from './config.js';
export { probeDomains } from './domain-probe/index.js';
export type { DomainProbeResult, ProbeDomainsOptions } from './domain-probe/index.js';
