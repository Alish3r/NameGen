/**
 * Blacklist loading and lookup.
 * Swap wordlist/english-blacklist.txt for a larger list (e.g. top 10k English words).
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

let cachedChecker: ((name: string) => boolean) | null = null;

function loadLines(filePath: string): string[] {
  try {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    return content
      .split(/\r?\n/)
      .map((s: string) => s.trim().toLowerCase())
      .filter((s: string) => s.length >= 2);
  } catch {
    return [];
  }
}

function getWordlistPath(name: string): string {
  return join(__dirname, '..', 'wordlist', name);
}

export function loadBlacklists(): { english: Set<string>; crypto: Set<string> } {
  const englishLines = loadLines(getWordlistPath('english-blacklist.txt'));
  const cryptoLines = loadLines(getWordlistPath('crypto-blacklist.txt'));
  return {
    english: new Set(englishLines),
    crypto: new Set(cryptoLines),
  };
}

export function isBlacklisted(name: string): boolean {
  const { english, crypto } = loadBlacklists();
  const lower = name.toLowerCase();
  return english.has(lower) || crypto.has(lower);
}

/** Returns the default blacklist checker (Node file-based). Use in browser: pass blacklist Set from bundled wordlist. */
export function getDefaultBlacklist(): (name: string) => boolean {
  if (cachedChecker) return cachedChecker;
  try {
    const { english, crypto } = loadBlacklists();
    const combined = new Set([...english, ...crypto]);
    cachedChecker = (n: string) => combined.has(n.toLowerCase());
    return cachedChecker;
  } catch {
    cachedChecker = () => false;
    return cachedChecker;
  }
}

/** Build a blacklist checker from raw text (for browser/bundled use). */
export function createBlacklistFromText(englishText: string, cryptoText: string): (name: string) => boolean {
  const english = new Set(
    englishText.split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(s => s.length >= 2)
  );
  const crypto = new Set(
    cryptoText.split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(s => s.length >= 2)
  );
  const combined = new Set([...english, ...crypto]);
  return (n: string) => combined.has(n.toLowerCase());
}
