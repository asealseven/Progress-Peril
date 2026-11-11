import { describe, expect, it } from 'vitest';
import { budgetMultiplier, roundDuration, roundKind, threatBudget } from '../src/data/rounds';
import { planCost, planRound, splitBudget, threatCost } from '../src/sim/director';
import { Rng } from '../src/sim/rng';
import { FOOTMAN } from './helpers';

describe('round tables', () => {
  it('follows the round lengths in GDD 4.3', () => {
    expect(roundDuration(1)).toBe(30);
    expect(roundDuration(7)).toBe(45);
    expect(roundDuration(8)).toBe(40);
    expect(roundDuration(14)).toBe(60);
    expect(roundDuration(15)).toBe(50);
    expect(roundDuration(21)).toBe(75);
    expect(roundDuration(2)).toBeGreaterThan(roundDuration(1));
  });

  it('marks mini-boss and boss rounds (GDD 4.2)', () => {
    expect([4, 11, 18].map(roundKind)).toEqual(['mini-boss', 'mini-boss', 'mini-boss']);
    expect([7, 14, 21].map(roundKind)).toEqual(['boss', 'boss', 'boss']);
    expect(roundKind(1)).toBe('encounter');
  });

  it('follows the budget curve in GDD 4.11', () => {
    expect(threatBudget(1)).toBe(40);
    expect(budgetMultiplier(3)).toBe(2);
    expect(budgetMultiplier(6)).toBe(3);
    expect(budgetMultiplier(10)).toBe(5);
    expect(budgetMultiplier(20)).toBe(10);
    expect(budgetMultiplier(21)).toBe(5);
  });
});

describe('director', () => {
  it('prices a Royal Footman at 2 units', () => {
    expect(threatCost(FOOTMAN)).toBe(2);
  });

  it('splits the budget three ways', () => {
    const split = splitBudget(40);
    expect(split.trickle + split.groups + split.assault).toBe(40);
    expect(split.trickle).toBe(13);
    expect(split.groups).toBe(20);
    expect(split.assault).toBe(7);
  });

  it('spends the round budget without going over', () => {
    for (const round of [1, 2, 3]) {
      const plan = planRound(round, FOOTMAN, new Rng(round));
      const spent = planCost(plan);
      expect(spent).toBeLessThanOrEqual(threatBudget(round));
      expect(spent).toBeGreaterThan(threatBudget(round) - threatCost(FOOTMAN));
    }
  });

  it('spawns 20 Royal Footmen in Round 1', () => {
    const plan = planRound(1, FOOTMAN, new Rng(1));
    expect(plan.reduce((sum, entry) => sum + entry.count, 0)).toBe(20);
  });

  it('schedules every spawn inside the round, in time order, ending with the assault', () => {
    const plan = planRound(2, FOOTMAN, new Rng(99));
    const duration = roundDuration(2);
    for (let i = 0; i < plan.length; i++) {
      const entry = plan[i]!;
      expect(entry.time).toBeGreaterThan(0);
      expect(entry.time).toBeLessThan(duration);
      if (i > 0) expect(entry.time).toBeGreaterThanOrEqual(plan[i - 1]!.time);
    }
    expect(plan[plan.length - 1]!.kind).toBe('assault');
  });

  it('gives the same plan for the same seed', () => {
    expect(planRound(3, FOOTMAN, new Rng(4))).toEqual(planRound(3, FOOTMAN, new Rng(4)));
  });
});
