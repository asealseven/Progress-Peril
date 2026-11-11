import { describe, expect, it } from 'vitest';
import { ARMOUR_LIMIT, TIERS, scaledTierValue, stepTier, tierValue } from '../src/data/tiers';
import {
  armourFromPoints,
  armourPoints,
  computeDamage,
  effectiveArmour,
  resolvePlayerHit,
  stackArmour,
  stepArmourDown,
} from '../src/sim/modifiers';

describe('tiers', () => {
  it('steps tiers and clamps at both ends', () => {
    expect(stepTier('Low', 1)).toBe('Medium');
    expect(stepTier('Extreme', 1)).toBe('Extreme');
    expect(stepTier('Minimal', -1)).toBe('Minimal');
  });

  it('multiplies by 2.5 per step above Extreme (GDD 9.10)', () => {
    expect(scaledTierValue('enemyHealth', 'Medium', 1)).toBe(90);
    expect(scaledTierValue('enemyHealth', 'High', 2)).toBe(400 * 2.5);
    expect(scaledTierValue('enemyHealth', 'Extreme', 2)).toBe(400 * 2.5 * 2.5);
  });
});

describe('Armour returns (GDD 3.7)', () => {
  it('keeps the tier value for a single source', () => {
    for (const tier of TIERS) {
      const value = tierValue('armour', tier);
      expect(stackArmour([value])).toBeCloseTo(value, 10);
      expect(armourFromPoints(armourPoints(value))).toBeCloseTo(value, 10);
    }
  });

  it('gives diminishing returns when stacked', () => {
    const one = stackArmour([0.25]);
    const two = stackArmour([0.25, 0.25]);
    const three = stackArmour([0.25, 0.25, 0.25]);
    expect(two).toBeGreaterThan(one);
    expect(two).toBeLessThan(0.5);
    expect(three - two).toBeLessThan(two - one);
  });

  it('approaches 75 per cent without reaching the limit', () => {
    const heavy = stackArmour(Array.from({ length: 50 }, () => 0.6));
    expect(heavy).toBeGreaterThan(0.74);
    expect(heavy).toBeLessThan(ARMOUR_LIMIT);
  });

  it('steps Armour down along the tier scale', () => {
    expect(stepArmourDown(0.25, 1)).toBeCloseTo(0.1, 10);
    expect(stepArmourDown(0.6, 2)).toBeCloseTo(0.25, 10);
    expect(stepArmourDown(0.1, 1)).toBe(0);
    expect(stepArmourDown(0, 1)).toBe(0);
    // Halfway between Low and Medium moves to halfway between Minimal and Low.
    expect(stepArmourDown(0.175, 1)).toBeCloseTo(0.05, 10);
  });

  it('lets Piercing damage ignore one Armour step (GDD 7.14 step 6)', () => {
    expect(effectiveArmour(0.25, 'Piercing')).toBeCloseTo(0.1, 10);
    expect(effectiveArmour(0.25, 'Slashing')).toBe(0.25);
    expect(effectiveArmour(0.4, 'Slashing', 1)).toBeCloseTo(0.25, 10);
  });
});

describe('damage order (GDD 7.14)', () => {
  it('returns base damage with no modifiers', () => {
    expect(computeDamage({ base: 20 })).toBe(20);
  });

  it('adds flat bonuses before percentage bonuses', () => {
    const damage = computeDamage({
      base: 10,
      flat: 5,
      percentBonuses: [{ source: 'components', amount: 0.2 }],
    });
    expect(damage).toBeCloseTo(18, 10);
  });

  it('adds bonuses of one source type and multiplies across source types', () => {
    const damage = computeDamage({
      base: 100,
      percentBonuses: [
        { source: 'components', amount: 0.2 },
        { source: 'components', amount: 0.1 },
        { source: 'research', amount: 0.5 },
      ],
    });
    expect(damage).toBeCloseTo(100 * 1.3 * 1.5, 10);
  });

  it('applies critical, type, Armour and reaction steps in order', () => {
    const damage = computeDamage({
      base: 20,
      flat: 4,
      percentBonuses: [{ source: 'player', amount: 0.25 }],
      criticalMultiplier: 2,
      typeMultiplier: 1.2,
      armour: 0.25,
      reactionBonus: 0.5,
    });
    expect(damage).toBeCloseTo((20 + 4) * 1.25 * 2 * 1.2 * 0.75 * 1.5, 10);
  });

  it('gives the Crossbow 18 damage against a Royal Footman', () => {
    const damage = computeDamage({
      base: tierValue('weaponDamage', 'High'),
      armour: effectiveArmour(tierValue('armour', 'Medium'), 'Piercing'),
    });
    expect(damage).toBeCloseTo(18, 10);
  });

  it('never returns negative damage', () => {
    expect(computeDamage({ base: 5, flat: -20 })).toBe(0);
  });
});

describe('hits against the player (GDD 3.7)', () => {
  it('checks Evasion first', () => {
    const result = resolvePlayerHit({ damage: 10, evasion: 0.15, evasionRoll: 0.1, armour: 0.1, adaptation: 0 });
    expect(result).toEqual({ evaded: true, damage: 0 });
  });

  it('applies Armour, then adaptation', () => {
    const result = resolvePlayerHit({ damage: 10, evasion: 0.03, evasionRoll: 0.5, armour: 0.1, adaptation: 0.1 });
    expect(result.evaded).toBe(false);
    expect(result.damage).toBeCloseTo(10 * 0.9 * 0.9, 10);
  });
});
