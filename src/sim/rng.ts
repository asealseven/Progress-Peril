// Seeded random numbers. Every random choice in the game goes through here,
// so the same seed and inputs give the same run (CLAUDE.md rule 3).

const UINT32 = 0x1_0000_0000;

/** Mixes a 32-bit integer (the murmur3 finaliser). */
function mix(value: number): number {
  let h = value >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = mix(seed >>> 0) || 0x9e3779b9;
  }

  /** Uniform float in [0, 1). Mulberry32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Uniform integer in [min, max], both ends included. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** True with the given probability. */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick needs at least one item');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** An independent generator for a sub-system. The parent stream does not advance. */
  fork(label: number): Rng {
    return new Rng(mix(this.state ^ mix(label + 0x9e3779b9)));
  }
}

/** A fresh seed for a new run. The only source of outside entropy in the game. */
export function newSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] ?? 1;
  }
  return mix(Date.now());
}

/** The seed as shown on the pause screen. */
export function formatSeed(seed: number): string {
  return (seed >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

/** Reads a seed typed by the player. Returns undefined for invalid text. */
export function parseSeed(text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^[0-9a-z]{1,7}$/i.test(trimmed)) return undefined;
  const value = Number.parseInt(trimmed, 36);
  return Number.isFinite(value) && value < UINT32 ? value >>> 0 : undefined;
}
