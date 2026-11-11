import { describe, expect, it } from 'vitest';
import { Rng, formatSeed, parseSeed } from '../src/sim/rng';

describe('Rng', () => {
  it('gives the same sequence for the same seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('gives different sequences for different seeds', () => {
    const a = new Rng(1);
    const b = new Rng(2);
    const same = Array.from({ length: 20 }, () => a.next() === b.next()).filter(Boolean).length;
    expect(same).toBeLessThan(3);
  });

  it('keeps floats in [0, 1) and spreads them evenly', () => {
    const rng = new Rng(7);
    let sum = 0;
    for (let i = 0; i < 20000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      sum += value;
    }
    expect(sum / 20000).toBeGreaterThan(0.48);
    expect(sum / 20000).toBeLessThan(0.52);
  });

  it('keeps integers inside both ends', () => {
    const rng = new Rng(9);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(rng.int(3, 5));
    expect([...seen].sort()).toEqual([3, 4, 5]);
  });

  it('forks without advancing the parent', () => {
    const parent = new Rng(5);
    const twin = new Rng(5);
    const child = parent.fork(1);
    expect(parent.next()).toBe(twin.next());
    expect(child.next()).not.toBe(new Rng(5).fork(2).next());
    expect(new Rng(5).fork(1).next()).toBe(new Rng(5).fork(1).next());
  });

  it('formats and parses seeds both ways', () => {
    for (const seed of [0, 1, 123456789, 0xffffffff]) {
      expect(parseSeed(formatSeed(seed))).toBe(seed);
    }
    expect(parseSeed('not a seed!')).toBeUndefined();
    expect(parseSeed('ZZZZZZZZ')).toBeUndefined();
  });
});
