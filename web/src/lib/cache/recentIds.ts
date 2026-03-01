/**
 * Ring buffer of recent image IDs per theme to avoid repeats.
 */

const RING_SIZE = 10;
const recentByTheme = new Map<string, number[]>();

export function getRecentIds(theme: string): number[] {
  return recentByTheme.get(theme) ?? [];
}

export function addRecentId(theme: string, id: number): void {
  let arr = recentByTheme.get(theme);
  if (!arr) {
    arr = [];
    recentByTheme.set(theme, arr);
  }
  arr.push(id);
  if (arr.length > RING_SIZE) {
    arr.shift();
  }
}

export function isRecent(theme: string, id: number): boolean {
  return getRecentIds(theme).includes(id);
}
