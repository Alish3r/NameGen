/**
 * Browser-safe blacklist utilities (no Node.js APIs).
 * Use when importing from web/browser - no fs, no Node built-ins.
 */

/** No-op for browser; caller must pass blacklist. */
export function getDefaultBlacklist(): (name: string) => boolean {
  return () => false;
}

/** Build a blacklist checker from raw text (for browser/bundled use). */
export function createBlacklistFromText(
  englishText: string,
  cryptoText: string
): (name: string) => boolean {
  const english = new Set(
    englishText
      .split(/\r?\n/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length >= 2)
  );
  const crypto = new Set(
    cryptoText
      .split(/\r?\n/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length >= 2)
  );
  const combined = new Set([...english, ...crypto]);
  return (n: string) => combined.has(n.toLowerCase());
}
