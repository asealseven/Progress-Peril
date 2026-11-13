import { describe, expect, it } from 'vitest';
import { CHAMPION_FIRST_ROUND } from '../src/data/champions';
import { ENEMIES } from '../src/data/enemies';
import { KINGDOMS, KINGDOM_NAMES } from '../src/data/kingdoms';
import type { KingdomName } from '../src/data/palette';
import { budgetMultiplier, roundDuration, roundKind, threatBudget } from '../src/data/rounds';
import { DIRECTOR_RULES, PERFORMANCE_LIMITS, THREAT_COST, activeEnemyLimit } from '../src/data/tiers';
import {
  availableEnemies,
  factionShares,
  planCost,
  planRound,
  splitBudget,
  summarisePlan,
  threatCost,
} from '../src/sim/director';
import { Rng } from '../src/sim/rng';
import type { SpawnEntry } from '../src/sim/world/types';
import { FOOTMAN } from './helpers';

const ROUNDS = Array.from({ length: 21 }, (_, index) => index + 1);

function ranks(plan: readonly SpawnEntry[]): string[] {
  return plan.flatMap((entry) => [entry.rank ?? 'normal', ...(entry.with ?? []).map((member) => member.rank ?? 'normal')]);
}

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

  it('sets the active enemy limit by round and platform (GDD 4.11, 15.11)', () => {
    const pc = PERFORMANCE_LIMITS.pc;
    const mobile = PERFORMANCE_LIMITS.mobile;
    expect([1, 6, 7, 14, 15, 21].map((round) => activeEnemyLimit(pc, round))).toEqual([120, 120, 200, 200, 300, 300]);
    expect([1, 7, 15].map((round) => activeEnemyLimit(mobile, round))).toEqual([40, 60, 100]);
  });
});

describe('threat costs (GDD 4.11)', () => {
  it('prices enemies by threat tier', () => {
    expect(threatCost(FOOTMAN)).toBe(2);
    expect(threatCost(ENEMIES['static-mote'])).toBe(1);
    expect(threatCost(ENEMIES['royal-bastion'])).toBe(4);
    expect(threatCost(ENEMIES['iron-sentinel'])).toBe(8);
    expect(threatCost(ENEMIES['ancient-guardian'])).toBe(16);
  });

  it('prices elites at three times and champions at six times the base cost', () => {
    expect(threatCost(FOOTMAN, 'elite')).toBe(6);
    expect(threatCost(FOOTMAN, 'champion')).toBe(12);
    const plan: SpawnEntry[] = [
      { time: 1, enemy: FOOTMAN, count: 2, kind: 'group', with: [{ enemy: FOOTMAN, count: 1, rank: 'elite' }] },
      { time: 2, enemy: ENEMIES['royal-bastion'], count: 1, rank: 'champion', kind: 'group' },
    ];
    expect(planCost(plan)).toBe(2 * 2 + 6 + 24);
  });
});

describe('budget spending (GDD 4.11)', () => {
  it('splits the budget three ways', () => {
    const split = splitBudget(40);
    expect(split.trickle + split.groups + split.assault).toBe(40);
    expect(split.trickle).toBe(13);
    expect(split.groups).toBe(20);
    expect(split.assault).toBe(7);
  });

  it('spends the round budget in every round of every kingdom without going over', () => {
    for (const kingdom of KINGDOM_NAMES) {
      for (const round of ROUNDS) {
        for (const seed of [1, 2, 3]) {
          const plan = planRound(round, kingdom, new Rng(seed * 100 + round));
          const spent = planCost(plan);
          const budget = threatBudget(round);
          expect(spent).toBeLessThanOrEqual(budget);
          // Less than one Low enemy stays unspent.
          expect(spent).toBeGreaterThan(budget - THREAT_COST.Low);
        }
      }
    }
  });

  it('spawns 20 Royal Footmen in Round 1 of Keldrath', () => {
    const plan = planRound(1, 'Keldrath', new Rng(1));
    const summary = summarisePlan(plan);
    expect(summary.enemies).toBe(20);
    expect(summary.byFaction).toEqual({ 'Kingdom Armies': 40 });
    expect(plan.every((entry) => entry.enemy === FOOTMAN)).toBe(true);
  });

  it('schedules every spawn inside the round, in time order, ending with the assault', () => {
    for (const round of [2, 9, 16]) {
      const plan = planRound(round, 'Keldrath', new Rng(99));
      const duration = roundDuration(round);
      for (let i = 0; i < plan.length; i++) {
        const entry = plan[i]!;
        expect(entry.time).toBeGreaterThan(0);
        expect(entry.time).toBeLessThan(duration);
        if (i > 0) expect(entry.time).toBeGreaterThanOrEqual(plan[i - 1]!.time);
      }
      expect(plan[plan.length - 1]!.kind).toBe('assault');
      expect(new Set(plan.map((entry) => entry.kind))).toEqual(new Set(['trickle', 'group', 'assault']));
    }
  });

  it('gives the same plan for the same seed, and a different plan for a different seed', () => {
    expect(planRound(12, 'Nymora', new Rng(4))).toEqual(planRound(12, 'Nymora', new Rng(4)));
    expect(planRound(12, 'Nymora', new Rng(4))).not.toEqual(planRound(12, 'Nymora', new Rng(5)));
  });
});

describe('faction mix (GDD 5.6)', () => {
  it('fields one faction in Rounds 1 to 4, then two, then three in Territory 3', () => {
    expect(factionShares(1)).toEqual({ home: 1, guest: 0, incursion: 0 });
    expect(factionShares(5).guest).toBeCloseTo(0.25);
    expect(factionShares(5).home).toBeCloseTo(0.75);
    expect(factionShares(10).incursion).toBe(0);
    expect(factionShares(15)).toEqual({ home: 0.65, guest: 0.25, incursion: 0.1 });
  });

  it('keeps the spending near 65, 25 and 10 per cent in Territory 3', () => {
    for (const kingdom of KINGDOM_NAMES) {
      const totals = { home: 0, guest: 0, incursion: 0, all: 0 };
      const def = KINGDOMS[kingdom];
      for (const round of [15, 16, 17, 19, 20]) {
        for (const seed of [11, 12, 13, 14]) {
          const summary = summarisePlan(planRound(round, kingdom, new Rng(seed + round)));
          totals.home += summary.byFaction[def.homeFaction] ?? 0;
          totals.guest += summary.byFaction[def.guestFaction] ?? 0;
          totals.incursion += summary.byFaction[def.incursionFaction] ?? 0;
          totals.all += summary.spent;
        }
      }
      expect(totals.home / totals.all).toBeGreaterThan(0.55);
      expect(totals.home / totals.all).toBeLessThan(0.75);
      expect(totals.guest / totals.all).toBeGreaterThan(0.17);
      expect(totals.guest / totals.all).toBeLessThan(0.33);
      expect(totals.incursion / totals.all).toBeGreaterThan(0.04);
      expect(totals.incursion / totals.all).toBeLessThan(0.17);
    }
  });

  it('uses Outlaws for Orthelyn incursions, since Unknown is the home faction there', () => {
    expect(KINGDOMS.Orthelyn.incursionFaction).toBe('Outlaws');
    for (const kingdom of ['Keldrath', 'Myrathis', 'Merovant', 'Nymora'] as KingdomName[]) {
      expect(KINGDOMS[kingdom].incursionFaction).toBe('Unknown');
    }
  });

  it('keeps signature enemies in their home kingdom', () => {
    const names = (kingdom: KingdomName, slot: 'home' | 'guest' | 'incursion'): string[] =>
      availableEnemies(kingdom, slot, 21).map((enemy) => enemy.name);
    expect(names('Keldrath', 'home')).toContain('Forgeguard Knight');
    // Kingdom Armies visit Merovant as guests, without the Forgeguard Knight.
    expect(names('Merovant', 'guest')).not.toContain('Forgeguard Knight');
    expect(names('Merovant', 'guest')).toContain('Royal Footman');
    expect(names('Nymora', 'guest')).not.toContain('Vat Chimera');
    expect(names('Keldrath', 'incursion')).not.toContain('Static Mote');
    expect(names('Orthelyn', 'home')).toContain('Static Mote');
  });

  it('brings costlier enemies in later rounds', () => {
    const names = (round: number): string[] => availableEnemies('Keldrath', 'home', round).map((enemy) => enemy.name);
    expect(names(1)).toEqual(['Royal Footman']);
    expect(names(2)).toContain('Royal Bastion');
    expect(availableEnemies('Keldrath', 'guest', 4).map((enemy) => enemy.name)).not.toContain('Mercenary Captain');
    expect(availableEnemies('Keldrath', 'guest', 5).map((enemy) => enemy.name)).toContain('Mercenary Captain');
    expect(availableEnemies('Orthelyn', 'home', 7).map((enemy) => enemy.name)).not.toContain('Ancient Guardian');
    expect(availableEnemies('Orthelyn', 'home', 8).map((enemy) => enemy.name)).toContain('Ancient Guardian');
  });
});

describe('difficulty scaling (GDD 4.12, 9.12, 9.13)', () => {
  it('brings elites from Round 5 and champions from Round 15, one champion per round', () => {
    let elites = 0;
    let champions = 0;
    for (const kingdom of KINGDOM_NAMES) {
      for (const round of ROUNDS) {
        for (let seed = 0; seed < 12; seed++) {
          const found = ranks(planRound(round, kingdom, new Rng(seed * 31 + round)));
          const eliteCount = found.filter((rank) => rank === 'elite').length;
          const championCount = summarisePlan(planRound(round, kingdom, new Rng(seed * 31 + round))).champions;
          if (round < DIRECTOR_RULES.eliteFirstRound) expect(eliteCount).toBe(0);
          if (round < CHAMPION_FIRST_ROUND) expect(championCount).toBe(0);
          expect(championCount).toBeLessThanOrEqual(1);
          elites += eliteCount;
          champions += championCount;
        }
      }
    }
    expect(elites).toBeGreaterThan(0);
    expect(champions).toBeGreaterThan(0);
  });

  it('raises elite odds from Territory 1 to Territory 2', () => {
    const share = (round: number): number => {
      let elites = 0;
      let enemies = 0;
      for (let seed = 0; seed < 60; seed++) {
        const summary = summarisePlan(planRound(round, 'Keldrath', new Rng(seed + 500)));
        elites += summary.elites;
        enemies += summary.enemies;
      }
      return elites / enemies;
    };
    expect(share(6)).toBeGreaterThan(0.01);
    expect(share(9)).toBeGreaterThan(share(6));
  });

  it('adds formations from Round 5, flanking from Round 12 and three-way assaults from Round 15', () => {
    const formations = (round: number): Set<string | undefined> => {
      const found = new Set<string | undefined>();
      for (let seed = 0; seed < 20; seed++) {
        for (const entry of planRound(round, 'Keldrath', new Rng(seed + 900))) found.add(entry.formation);
      }
      return found;
    };
    expect([...formations(3)]).toEqual([undefined]);
    expect(formations(6).has('line')).toBe(true);
    expect(formations(6).has('pincer')).toBe(false);
    expect(formations(12).has('pincer')).toBe(true);
    expect(formations(16).has('ring')).toBe(true);
  });

  it('follows a fixed curve: the plan ignores player power', () => {
    // planRound takes the round, the kingdom, the seed and the territory event. Nothing about the player enters.
    expect(planRound.length).toBe(4);
  });
});
