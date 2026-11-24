/**
 * Deterministic seeded PRNG (FNV-1a seed hash + Mulberry32).
 * Guarantees identical boards, shifts, and targets across iPhone, iPad, and tests.
 */
export interface Prng {
  next(): number; // [0, 1)
  nextInt(maxExclusive: number): number;
  nextRange(minInclusive: number, maxInclusive: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function createPrng(seed: string): Prng {
  let state = hashSeed(seed) || 0x9e3779b9;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const nextInt = (maxExclusive: number): number => {
    if (maxExclusive <= 0) return 0;
    return Math.floor(next() * maxExclusive);
  };

  const nextRange = (minInclusive: number, maxInclusive: number): number => {
    if (maxInclusive <= minInclusive) return minInclusive;
    return minInclusive + nextInt(maxInclusive - minInclusive + 1);
  };

  const pick = <T>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    return items[nextInt(items.length)];
  };

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = nextInt(i + 1);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  };

  return { next, nextInt, nextRange, pick, shuffle };
}
