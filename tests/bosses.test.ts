import { describe, expect, it } from 'vitest';
import { ARENA_BY_KINGDOM } from '../src/data/arenas';
import { BOSSES, BOSS_BY_KINGDOM, BOSS_LIST, BOSS_RULES } from '../src/data/bosses';
import type { BossId } from '../src/data/bosses';
import { CHARACTERS } from '../src/data/characters';
import { componentByName } from '../src/data/components';
import { KINGDOMS, KINGDOM_NAMES } from '../src/data/kingdoms';
import { MINI_BOSSES, MINI_BOSS_BY_KINGDOM, MINI_BOSS_LIST, miniBossAttacks } from '../src/data/miniBosses';
import type { KingdomName } from '../src/data/palette';
import { RELICS, RELIC_LIST, relicsOf } from '../src/data/relics';
import { tierValue } from '../src/data/tiers';
import { WEAPONS } from '../src/data/weapons';
import { createArchive } from '../src/sim/archive';
import { openShop, recipeCost } from '../src/sim/economy';
import { resolveLoadout } from '../src/sim/loadout';
import { applyFindings, emptyFindings } from '../src/sim/research';
import {
  bossPlanForRound,
  createRun,
  createWorldForRound,
  finishRound,
  resolvePlayerStats,
  takeRelic,
} from '../src/sim/run';
import type { RunState } from '../src/sim/run';
import { bossHealth, insideTelegraph, mainBoss } from '../src/sim/world/bosses';
import type { BossBody, BossPlan, BossTelegraph } from '../src/sim/world/bosses';
import { killEnemy } from '../src/sim/world/damage';
import { harmEnemy } from '../src/sim/world/hazards';
import { collectAll } from '../src/sim/world/loot';
import type { World } from '../src/sim/world/world';
import { BASE_STATS, FOOTMAN, arm, dummyAt, makeWorld, stepSeconds } from './helpers';

function run(seed = 3): RunState {
  const archive = createArchive();
  archive.campaigns = 2;
  return createRun(seed, CHARACTERS.inventor, WEAPONS.crossbow, archive);
}

function bossWorld(kingdom: KingdomName, plan: BossPlan, round = 7, invincible = true): World {
  return makeWorld({ arena: ARENA_BY_KINGDOM[kingdom], round, localRound: 7, bosses: plan, invincible, armed: false });
}

function plan(kingdom: KingdomName, escort: KingdomName = kingdom, borrowed: BossId[] = []): BossPlan {
  return { kind: 'boss', boss: BOSS_BY_KINGDOM[kingdom].id, escort: MINI_BOSS_BY_KINGDOM[escort].id, borrowed };
}

function body(world: World, role: BossBody['role']): BossBody {
  const found = world.bosses.find((entry) => entry.role === role);
  if (!found) throw new Error(`No ${role}`);
  return found;
}

describe('boss data (GDD 5.6, 10.3 to 10.5)', () => {
  it('gives each kingdom one boss with three phases and one mini-boss with two', () => {
    expect(BOSS_LIST).toHaveLength(5);
    expect(MINI_BOSS_LIST).toHaveLength(5);
    for (const kingdom of KINGDOM_NAMES) {
      expect(BOSS_BY_KINGDOM[kingdom].name).toBe(KINGDOMS[kingdom].boss);
      expect(MINI_BOSS_BY_KINGDOM[kingdom].name).toBe(KINGDOMS[kingdom].miniBoss);
      expect(BOSS_BY_KINGDOM[kingdom].phases).toHaveLength(3);
      expect(MINI_BOSS_BY_KINGDOM[kingdom].phases).toHaveLength(2);
      const boss = BOSS_BY_KINGDOM[kingdom];
      // The signature attack is in the rotation, so Convergence can borrow it.
      expect(boss.phases.some((phase) => phase.attacks.includes(boss.signature.id))).toBe(true);
      expect(miniBossAttacks(MINI_BOSS_BY_KINGDOM[kingdom]).length).toBeGreaterThan(1);
      expect(boss.body.radius).toBe(56);
      expect(MINI_BOSS_BY_KINGDOM[kingdom].body.radius).toBe(36);
    }
    expect(BOSSES['iron-regent'].signature.name).toBe('Royal Decree');
    expect(BOSSES['the-unmaking'].signature.name).toBe('Null Field');
  });

  it('sets boss health from CLAUDE.md: 4000 and 1200 in Territory 1, times 2 and 3.5, escorts at 70 per cent', () => {
    expect([0, 1, 2].map((t) => bossHealth('boss', t))).toEqual([3200, 6400, 11200]);
    expect([0, 1, 2].map((t) => bossHealth('mini', t))).toEqual([1200, 2400, 4200]);
    expect(bossHealth('escort', 0)).toBeCloseTo(840);
  });
});

describe('round plans (GDD 4.10, 10.6)', () => {
  it('puts the mini-boss on Round 4 and the boss with an escort on Round 7', () => {
    const r = run();
    r.kingdoms = ['Merovant', 'Nymora', 'Orthelyn'];
    expect(bossPlanForRound(r, 3)).toBeUndefined();
    expect(bossPlanForRound(r, 4)).toEqual({ kind: 'mini', mini: 'siege-spider' });
    // Territory 1: the kingdom's own mini-boss escorts.
    expect(bossPlanForRound(r, 7)).toEqual({ kind: 'boss', boss: 'grand-automaton', escort: 'siege-spider', borrowed: [] });
    // Later: the mini-boss of the previous territory.
    expect(bossPlanForRound(r, 14)).toEqual({ kind: 'boss', boss: 'spore-sovereign', escort: 'siege-spider', borrowed: [] });
    // Round 21: Convergence borrows the two bosses beaten earlier.
    expect(bossPlanForRound(r, 21)).toEqual({
      kind: 'boss',
      boss: 'the-unmaking',
      escort: 'thornback-matriarch',
      borrowed: ['grand-automaton', 'spore-sovereign'],
    });
  });
});

describe('boss fights', () => {
  it('sends the boss and the escort in from the start of the round', () => {
    const world = bossWorld('Keldrath', plan('Keldrath'));
    expect(world.bosses).toHaveLength(0);
    stepSeconds(world, BOSS_RULES.entrySeconds + 0.1);
    const boss = body(world, 'boss');
    const escort = body(world, 'escort');
    expect(boss.enemy.maxHealth).toBe(3200);
    expect(escort.enemy.maxHealth).toBeCloseTo(840);
    expect(escort.name).toBe('Forge Marshal');
    // Bosses resist statuses through larger meters (GDD 9.14).
    expect(boss.enemy.meterScale).toBe(5);
    // Two engineers repair the Regent.
    let engineers = 0;
    for (const enemy of world.enemies.items) if (enemy.active && enemy.def.id === 'mechanist') engineers++;
    expect(engineers).toBe(2);
  });

  it('changes phase at 70 and 30 per cent with a short invulnerable transition', () => {
    const world = bossWorld('Myrathis', plan('Myrathis'));
    stepSeconds(world, BOSS_RULES.entrySeconds + 0.1);
    const boss = body(world, 'boss');
    boss.enemy.health = boss.enemy.maxHealth * 0.69;
    stepSeconds(world, 0.05);
    expect(boss.phase).toBe(2);
    expect(boss.enemy.takenFactor).toBe(0);
    const before = boss.enemy.health;
    harmEnemy(world, boss.enemy, 500, 'Fire');
    expect(boss.enemy.health).toBe(before);
    stepSeconds(world, BOSS_RULES.transitionSeconds + 0.1);
    expect(boss.enemy.takenFactor).toBe(1);
    boss.enemy.health = boss.enemy.maxHealth * 0.29;
    stepSeconds(world, 0.05);
    expect(boss.phase).toBe(3);
    // Mini-bosses change at 50 per cent.
    const escort = body(world, 'escort');
    escort.enemy.health = escort.enemy.maxHealth * 0.49;
    stepSeconds(world, 0.05);
    expect(escort.phase).toBe(2);
  });

  it('telegraphs every attack before it lands, then hits the player inside the shape only', () => {
    const world = bossWorld('Keldrath', plan('Keldrath'), 7, false);
    stepSeconds(world, BOSS_RULES.entrySeconds + 0.1);
    let seen: BossTelegraph | undefined;
    for (let step = 0; step < 60 * 10 && !seen; step++) {
      world.step({ moveX: 0, moveY: 0 });
      seen = world.bossTelegraphs[0];
    }
    expect(seen).toBeDefined();
    expect(seen!.duration).toBeGreaterThanOrEqual(BOSS_RULES.telegraphSeconds);
    const circle = { shape: 'circle', x: 0, y: 0, radius: 50 } as BossTelegraph;
    expect(insideTelegraph(circle, 40, 0, 12)).toBe(true);
    expect(insideTelegraph(circle, 80, 0, 12)).toBe(false);
    const cone = { shape: 'cone', x: 0, y: 0, radius: 200, angle: 0, arc: Math.PI / 2 } as BossTelegraph;
    expect(insideTelegraph(cone, 150, 10, 12)).toBe(true);
    expect(insideTelegraph(cone, -150, 0, 12)).toBe(false);
    const line = { shape: 'line', x: 0, y: 0, x2: 300, y2: 0, width: 40 } as BossTelegraph;
    expect(insideTelegraph(line, 150, 25, 12)).toBe(true);
    expect(insideTelegraph(line, 150, 60, 12)).toBe(false);
  });

  it('ends the round when the boss falls: other enemies flee, the boss pays its rewards', () => {
    const world = bossWorld('Nymora', plan('Nymora'));
    stepSeconds(world, BOSS_RULES.entrySeconds + 0.1);
    dummyAt(world, 300, 300);
    const boss = body(world, 'boss');
    killEnemy(world, boss.enemy, -1, 0);
    world.step({ moveX: 0, moveY: 0 });
    expect(world.phase).toBe('cleared');
    expect(world.enemies.activeCount).toBe(0);
    expect(world.loot.gold).toBeGreaterThanOrEqual(40);
    expect(world.loot.research).toBeGreaterThanOrEqual(50);
    expect(world.loot.materials.Specimens).toBeGreaterThanOrEqual(8);
  });

  it('pays mini-boss rewards, and escorts give materials and Research Points only (GDD 4.10, 14.1)', () => {
    const mini = makeWorld({ arena: ARENA_BY_KINGDOM.Keldrath, round: 4, localRound: 4, bosses: { kind: 'mini', mini: 'forge-marshal' }, invincible: true, armed: false });
    stepSeconds(mini, BOSS_RULES.entrySeconds + 0.1);
    killEnemy(mini, body(mini, 'mini').enemy, -1, 0);
    collectAll(mini);
    expect(mini.loot.gold).toBe(20);
    expect(mini.loot.research).toBe(20);
    expect(mini.loot.materials.Scrap).toBe(4);

    const world = bossWorld('Keldrath', plan('Keldrath'));
    stepSeconds(world, BOSS_RULES.entrySeconds + 0.1);
    killEnemy(world, body(world, 'escort').enemy, -1, 0);
    collectAll(world);
    expect(world.loot.gold).toBe(0);
    expect(world.loot.research).toBe(20);
    expect(world.loot.materials.Scrap).toBe(4);
    expect(world.phase).toBe('running');
  });

  it('starts Convergence at 30 per cent with the borrowed attacks in their own colours (GDD 10.6)', () => {
    const world = bossWorld('Orthelyn', plan('Orthelyn', 'Keldrath', ['iron-regent', 'abomination']), 21);
    stepSeconds(world, BOSS_RULES.entrySeconds + 0.1);
    const boss = body(world, 'boss');
    expect(boss.borrowed.map((entry) => entry.attack)).toEqual(['royal-decree', 'mutagenic-spew']);
    expect(boss.convergence).toBe(false);
    boss.enemy.health = boss.enemy.maxHealth * 0.29;
    stepSeconds(world, 0.05);
    expect(boss.phase).toBe(3);
    expect(boss.convergence).toBe(true);
    const kingdoms = new Set<string>();
    for (let step = 0; step < 60 * 40; step++) {
      world.step({ moveX: 0, moveY: 0 });
      for (const t of world.bossTelegraphs) if (t.style.kind === 'borrowed') kingdoms.add(t.style.kingdom);
    }
    expect([...kingdoms].sort()).toEqual(['Keldrath', 'Myrathis']);
  });

  it('splits The Unmaking into three: only the real body takes damage', () => {
    const world = bossWorld('Orthelyn', plan('Orthelyn'));
    stepSeconds(world, BOSS_RULES.entrySeconds + 0.1);
    const boss = body(world, 'boss');
    boss.enemy.health = boss.enemy.maxHealth * 0.6;
    stepSeconds(world, 2);
    boss.enemy.health = boss.enemy.maxHealth * 0.29;
    stepSeconds(world, 2);
    const copies = world.bosses.filter((entry) => entry.partId === 'unmaking-copy');
    expect(copies).toHaveLength(2);
    const copy = copies[0]!.enemy;
    const health = copy.health;
    harmEnemy(world, copy, 300, 'Impact');
    expect(copy.health).toBe(health);
  });

  it('gives the Grand Automaton two arm turrets: with both destroyed, no Gatling Sweep', () => {
    const world = bossWorld('Merovant', plan('Merovant'), 14);
    stepSeconds(world, BOSS_RULES.entrySeconds + 0.1);
    const arms = world.bosses.filter((entry) => entry.partId === 'automaton-arm');
    expect(arms).toHaveLength(2);
    for (const entry of arms) killEnemy(world, entry.enemy, -1, 0);
    let sweeps = 0;
    for (let step = 0; step < 60 * 20; step++) {
      world.step({ moveX: 0, moveY: 0 });
      if (body(world, 'boss').sweep) sweeps++;
    }
    expect(sweeps).toBe(0);
  });

  it('switches synergies and Auxiliary components off inside a Null Field', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Telescopic Sight')], research: 'all' });
    world.nullTimer = 2;
    world.step({ moveX: 0, moveY: 0 });
    expect(world.synergies.size).toBe(0);
    expect(world.weapons[0]!.resolved).toBe(world.weapons[0]!.nulled);
    stepSeconds(world, 2.1);
    expect(world.weapons[0]!.resolved).toBe(world.weapons[0]!.full);
  });

  it('lets every boss be beaten, phase by phase (Milestone 8)', { timeout: 120000 }, () => {
    for (const kingdom of KINGDOM_NAMES) {
      const world = bossWorld(kingdom, plan(kingdom), 21);
      stepSeconds(world, BOSS_RULES.entrySeconds + 0.1);
      const boss = body(world, 'boss');
      const phases = new Set<number>();
      let seconds = 0;
      while (world.phase === 'running' && seconds < 600) {
        // Steady damage of mixed types, as a varied build deals.
        for (const type of ['Fire', 'Impact', 'Electric'] as const) {
          if (boss.enemy.active && boss.enemy.boss === boss) harmEnemy(world, boss.enemy, 220, type);
        }
        phases.add(boss.phase);
        stepSeconds(world, 0.5);
        seconds += 0.5;
      }
      expect(world.bossFallen, kingdom).toBe(true);
      expect(world.phase, kingdom).toBe('cleared');
      expect([...phases].sort(), kingdom).toEqual([1, 2, 3]);
    }
  });
});

describe('Absolute Precision (GDD 8.12)', () => {
  it('records a mini-boss beaten without damage taken, and a hint after a failed attempt', () => {
    const world = makeWorld({ arena: ARENA_BY_KINGDOM.Nymora, round: 4, localRound: 4, bosses: { kind: 'mini', mini: 'thornback-matriarch' }, armed: false });
    stepSeconds(world, BOSS_RULES.entrySeconds + 0.1);
    killEnemy(world, body(world, 'mini').enemy, -1, 0);
    expect(world.findings.miniBossFlawless).toBe(true);
    const r = run();
    expect(applyFindings(r, world.findings, { survived: true, healthShare: 1, weapons: [] })).toContain('Absolute Precision');

    const hinted = run();
    applyFindings(hinted, { ...emptyFindings(), miniBossKilled: true }, { survived: true, healthShare: 1, weapons: [] });
    expect(hinted.archive.hints.has('absolute-precision')).toBe(true);
  });
});

describe('Kingdom Relics (GDD 5.12)', () => {
  it('lists three relics per kingdom', () => {
    expect(RELIC_LIST).toHaveLength(15);
    for (const kingdom of KINGDOM_NAMES) expect(relicsOf(kingdom)).toHaveLength(3);
  });

  it('offers the beaten kingdom relics after a territory boss, and not after the final boss', () => {
    const r = run();
    r.kingdoms = ['Keldrath'];
    r.round = 7;
    const world = createWorldForRound(r);
    world.phase = 'cleared';
    finishRound(r, world);
    expect(r.relicChoices).toEqual(['regents-crown', 'crucible-heart', 'royal-writ']);
    expect(takeRelic(r, 'abomination-gland')).toBe(false);
    expect(takeRelic(r, 'royal-writ')).toBe(true);
    expect(r.relics).toEqual(['royal-writ']);
    expect(r.relicChoices).toEqual([]);
  });

  it('raises stats by steps and by modifier sizes', () => {
    const base = resolvePlayerStats(CHARACTERS.inventor);
    const crown = resolvePlayerStats(CHARACTERS.inventor, ['regents-crown', 'heartwood-seed', 'probability-lens', 'automaton-core']);
    expect(crown.armour).toBe(tierValue('armour', 'High'));
    expect(crown.regeneration).toBe(tierValue('regeneration', 'Medium'));
    expect(crown.fortune).toBeCloseTo(0.4);
    expect(crown.constructStrength).toBeCloseTo(1.4);
    expect(base.constructStrength).toBe(1);
    // The Mutagen Flask's step for the round.
    expect(resolvePlayerStats(CHARACTERS.inventor, [], 'moveSpeed').moveSpeed).toBe(tierValue('playerMoveSpeed', 'High'));

    const crossbow = [arm('Crossbow')];
    const plain = resolveLoadout(crossbow, BASE_STATS).weapons[0]!;
    const geared = resolveLoadout(crossbow, BASE_STATS, { relics: ['gearwork-heart', 'probability-lens'] }).weapons[0]!;
    expect(geared.attacksPerSecond).toBeCloseTo(plain.attacksPerSecond * (1 + tierValue('modifierSize', 'Medium')));
    expect(geared.criticalChance).toBeGreaterThan(plain.criticalChance);
    const anchor = resolveLoadout(crossbow, BASE_STATS, { relics: ['gravity-anchor', 'abomination-gland'] });
    expect(anchor.playerStats.pickupRadius).toBeCloseTo(BASE_STATS.pickupRadius * (1 + tierValue('modifierSize', 'Extreme')));
    expect(anchor.playerStats.adaptationCap).toBeGreaterThan(BASE_STATS.adaptationCap);
  });

  it('lowers shop prices and halves recipe gold', () => {
    const def = componentByName('Damascus Alloy')!;
    expect(recipeCost(def, ['assembly-blueprints'])!.gold).toBe(Math.round(recipeCost(def)!.gold / 2));
    const r = run();
    r.relics = ['royal-writ'];
    r.round = 2;
    r.gold = 1000;
    r.freeVisit = true;
    const plain = run();
    plain.round = 2;
    plain.gold = 1000;
    plain.freeVisit = true;
    // Same seed, same stock: the Writ takes 15 per cent off each price.
    openShop(r, 'blacksmith');
    openShop(plain, 'blacksmith');
    let compared = 0;
    r.shops.blacksmith.stock.forEach((item, index) => {
      const other = plain.shops.blacksmith.stock[index];
      if (!item || !other) return;
      expect(item.price).toBe(Math.round(other.price * 0.85));
      compared++;
    });
    expect(compared).toBeGreaterThan(0);
  });

  it('gives each weapon a random extra tag every round with the Shard of the Unmaking', () => {
    const r = run();
    r.relics = ['shard-of-the-unmaking', 'mutagen-flask'];
    createWorldForRound(r);
    expect(r.flaskStat).toBeDefined();
    expect(r.weapons[0]!.roundTags).toBeUndefined();
    // The tag lives on the round's copy, not on the owned weapon.
    const plain = run();
    const world = createWorldForRound(plain);
    const shard = createWorldForRound(r);
    expect(shard.weapons[0]!.full.tags.length).toBe(world.weapons[0]!.full.tags.length + 1);
  });

  it('runs relic rules in combat: Catalyst Stone, Gravity Anchor and Bloom Crown', () => {
    const r = run();
    r.relics = ['catalyst-stone', 'gravity-anchor', 'bloom-crown', 'sovereign-spore'];
    const world = createWorldForRound(r);
    expect(world.relic('reactionDamage')).toBe(1);
    expect(world.relic('infectedSpread')).toBe(2);
    const enemy = dummyAt(world, 60, 0, FOOTMAN, 1000);
    enemy.speed = 100;
    world.step({ moveX: 0, moveY: 0 });
    expect(enemy.slowFactor).toBeLessThan(1);
    let blooms = 0;
    for (let index = 0; index < 200; index++) {
      const victim = dummyAt(world, 200, 0);
      killEnemy(world, victim, -1, 0);
    }
    blooms = world.environment.zones.filter((zone) => zone.hazard === 'healing-bloom').length;
    expect(blooms).toBeGreaterThan(0);
    expect(RELICS['bloom-crown'].kingdom).toBe('Nymora');
  });
});

describe('the end of the campaign', () => {
  it('completes the run after the final boss', () => {
    const r = run();
    r.kingdoms = ['Keldrath', 'Myrathis', 'Nymora'];
    r.round = 21;
    const world = createWorldForRound(r);
    world.phase = 'cleared';
    finishRound(r, world);
    expect(r.status).toBe('complete');
    expect(r.relicChoices).toEqual([]);
    expect(mainBoss(world)).toBeUndefined();
    expect(MINI_BOSSES['forge-marshal'].kingdom).toBe('Keldrath');
  });
});
