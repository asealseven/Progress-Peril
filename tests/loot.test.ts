import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { QUALITIES } from '../src/data/components';
import { FACTION_MATERIALS, GOLD_DROPS, MATERIALS } from '../src/data/economy';
import { ENEMY_LIST } from '../src/data/enemies';
import { PERFORMANCE_LIMITS } from '../src/data/tiers';
import { WEAPONS } from '../src/data/weapons';
import { createRun, createWorldForRound, finishRound } from '../src/sim/run';
import { killEnemy } from '../src/sim/world/damage';
import { rollDroppedComponent } from '../src/sim/world/loot';
import { Rng } from '../src/sim/rng';
import type { World } from '../src/sim/world/world';
import { IDLE, arm, enemyAt, makeWorld, stepSeconds } from './helpers';

function quiet(options: Parameters<typeof makeWorld>[0] = {}): World {
  return makeWorld({ armed: false, invincible: true, ...options });
}

function pickups(world: World, kind?: string) {
  return world.pickups.items.filter((pickup) => pickup.active && (!kind || pickup.kind === kind));
}

function materialTotal(world: World): number {
  return MATERIALS.reduce((sum, material) => sum + world.loot.materials[material], 0);
}

describe('gold drops (GDD 14.1)', () => {
  it('drops 1 gold for a normal enemy, 4 for an elite and 12 for a champion', () => {
    for (const [rank, gold] of [
      ['normal', GOLD_DROPS.normal],
      ['elite', GOLD_DROPS.elite],
      ['champion', GOLD_DROPS.champion],
    ] as const) {
      const world = quiet();
      killEnemy(world, enemyAt(world, 'Royal Footman', 600, 0, { rank, modifiers: [] }));
      const found = pickups(world, 'gold');
      expect(found).toHaveLength(1);
      expect(found[0]!.amount).toBe(gold);
      expect(world.gold).toBe(0);
    }
  });

  it('collects gold through Pickup Radius', () => {
    const world = quiet();
    const radius = world.player.stats.pickupRadius;
    killEnemy(world, enemyAt(world, 'Royal Footman', radius + 150, 0));
    stepSeconds(world, 1);
    expect(world.gold).toBe(0);
    expect(pickups(world)).toHaveLength(1);
    // Walk into range: the pickup flies to the player.
    world.player.x += 160;
    stepSeconds(world, 1);
    expect(world.gold).toBe(1);
    expect(world.loot.gold).toBe(1);
    expect(pickups(world)).toHaveLength(0);
  });

  it('sends uncollected gold to the player when the round ends', () => {
    const world = quiet({ spawns: [] });
    const footman = enemyAt(world, 'Royal Footman', 900, 0);
    world.step(IDLE);
    killEnemy(world, footman);
    expect(world.gold).toBe(0);
    world.step(IDLE);
    expect(world.phase).toBe('cleared');
    expect(world.gold).toBe(1);
    expect(pickups(world)).toHaveLength(0);
  });

  it('piles gold from enemies falling close together', () => {
    const world = quiet();
    for (let i = 0; i < 6; i++) killEnemy(world, enemyAt(world, 'Static Mote', 700, 0));
    const gold = pickups(world, 'gold');
    expect(gold).toHaveLength(1);
    expect(gold[0]!.amount).toBe(6);
  });

  it('pays drops straight to the player at the pickup limit', () => {
    const world = quiet();
    const limit = PERFORMANCE_LIMITS.pc.pickups;
    for (let i = 0; i < limit + 20; i++) {
      killEnemy(world, enemyAt(world, 'Royal Footman', 300 + (i % 40) * 30, -700 + Math.floor(i / 40) * 40));
    }
    expect(world.pickups.activeCount).toBeLessThanOrEqual(limit);
    const onGround = pickups(world, 'gold').reduce((sum, pickup) => sum + pickup.amount, 0);
    expect(world.gold + onGround).toBe(limit + 20);
  });

  it('lets a Highwayman steal collected gold', () => {
    const world = quiet({ gold: 0 });
    killEnemy(world, enemyAt(world, 'Royal Footman', 20, 0, { rank: 'champion', modifiers: [] }));
    stepSeconds(world, 0.5);
    expect(world.gold).toBe(12);
    enemyAt(world, 'Highwayman', 140, 0);
    for (let step = 0; step < 300 && world.stats.hitsTaken === 0; step++) world.step(IDLE);
    expect(world.gold).toBe(7);
  });
});

describe('material and component drops (GDD 14.2)', () => {
  it('gives a normal enemy a 6 per cent chance of 1 material', () => {
    const world = quiet({ seed: 99 });
    const kills = 3000;
    for (let i = 0; i < kills; i++) {
      killEnemy(world, enemyAt(world, 'Royal Footman', 10, 0));
      if (i % 50 === 0) world.step(IDLE);
    }
    stepSeconds(world, 1);
    expect(materialTotal(world) / kills).toBeGreaterThan(0.045);
    expect(materialTotal(world) / kills).toBeLessThan(0.075);
    expect(world.loot.components).toHaveLength(0);
  });

  it('gives an elite 1 material, plus a 25 per cent chance of a second, and a 5 per cent component chance', () => {
    const world = quiet({ seed: 5 });
    const kills = 1200;
    for (let i = 0; i < kills; i++) {
      killEnemy(world, enemyAt(world, 'Royal Footman', 10, 0, { rank: 'elite', modifiers: [] }));
      if (i % 50 === 0) world.step(IDLE);
    }
    stepSeconds(world, 1);
    const perKill = materialTotal(world) / kills;
    expect(perKill).toBeGreaterThan(1.18);
    expect(perKill).toBeLessThan(1.32);
    expect(world.loot.components.length / kills).toBeGreaterThan(0.03);
    expect(world.loot.components.length / kills).toBeLessThan(0.075);
    expect(world.loot.gold).toBe(kills * 4);
  });

  it('gives a champion 3 materials and one Rare or better component', () => {
    const world = quiet({ round: 15 });
    killEnemy(world, enemyAt(world, 'Hunting Hound', 10, 0, { rank: 'champion', modifiers: [] }));
    stepSeconds(world, 1);
    expect(world.loot.materials.Specimens).toBe(3);
    expect(world.loot.components).toHaveLength(1);
    expect(QUALITIES.indexOf(world.loot.components[0]!.quality)).toBeGreaterThanOrEqual(2);
    expect(world.loot.gold).toBe(12);
  });

  it('never drops an Extraordinary component', () => {
    const rng = new Rng(3);
    for (let i = 0; i < 2000; i++) {
      expect(rollDroppedComponent(2, rng)?.quality).not.toBe('Extraordinary');
      expect(QUALITIES.indexOf(rollDroppedComponent(2, rng, 2)!.quality)).toBeGreaterThanOrEqual(2);
    }
  });

  it('drops the material types of the faction', () => {
    expect(FACTION_MATERIALS['Kingdom Armies']).toEqual(['Scrap']);
    expect(FACTION_MATERIALS['Clockwork Legions']).toEqual(['Scrap', 'Crystals']);
    expect(FACTION_MATERIALS['Failed Experiments']).toEqual(['Reagents', 'Specimens']);
    expect(FACTION_MATERIALS.Wilds).toEqual(['Specimens']);
    expect(FACTION_MATERIALS.Outlaws).toEqual(['Scrap', 'Reagents']);
    expect(FACTION_MATERIALS.Unknown).toEqual(['Crystals']);
    for (const def of ENEMY_LIST) {
      const world = quiet({ seed: 8 });
      for (let i = 0; i < 12; i++) killEnemy(world, enemyAt(world, def, 10, 0, { rank: 'elite', modifiers: [] }));
      stepSeconds(world, 2);
      for (const material of MATERIALS) {
        if (!FACTION_MATERIALS[def.faction].includes(material)) expect(world.loot.materials[material]).toBe(0);
      }
      expect(materialTotal(world)).toBeGreaterThanOrEqual(12);
    }
  });

  it('drops nothing from split copies and sprouted Thornlings', () => {
    const world = quiet();
    const copy = enemyAt(world, 'Royal Footman', 600, 0);
    copy.noLegacy = true;
    killEnemy(world, copy);
    expect(pickups(world)).toHaveLength(0);
  });

  it('Specimen Jar: kills with this weapon grant extra Specimens', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Specimen Jar'), arm('Pike')], invincible: true, seed: 21 });
    expect(world.weapons[0]!.resolved.triggers.specimenOnKill).toBe(true);
    expect(world.weapons[0]!.resolved.inactive).toEqual([]);
    const kills = 2000;
    for (let i = 0; i < kills; i++) {
      // Royal Footmen drop Scrap alone, so every Specimen comes from the jar.
      killEnemy(world, enemyAt(world, 'Royal Footman', 900, 0), i % 2);
    }
    for (const weapon of world.weapons) weapon.cooldown = 1e9;
    const jar = pickups(world, 'material').filter((pickup) => pickup.material === 'Specimens').length;
    expect(jar / (kills / 2)).toBeGreaterThan(0.07);
    expect(jar / (kills / 2)).toBeLessThan(0.13);
  });
});

describe('round rewards', () => {
  it('moves the loot of a round into the run and the ledger', () => {
    const run = createRun(11, CHARACTERS.inventor, WEAPONS['war-hammer']);
    const world = createWorldForRound(run);
    world.invincible = true;
    world.loot.materials.Scrap = 3;
    while (world.phase === 'running') {
      // Walk at the nearest enemy.
      let dx = 0;
      let dy = 0;
      let nearest = Infinity;
      for (const enemy of world.enemies.items) {
        if (!enemy.active) continue;
        const distance = Math.hypot(enemy.x - world.player.x, enemy.y - world.player.y);
        if (distance < nearest) {
          nearest = distance;
          dx = (enemy.x - world.player.x) / distance;
          dy = (enemy.y - world.player.y) / distance;
        }
      }
      world.step({ moveX: dx, moveY: dy });
    }
    const result = finishRound(run, world);
    expect(result.gold).toBe(20);
    expect(run.gold).toBe(20);
    expect(run.materials.Scrap).toBeGreaterThanOrEqual(3);
    expect(run.ledger).toHaveLength(1);
    expect(run.ledger[0]).toMatchObject({ round: 1, kills: 20, goldEarned: 20, goldSpent: 0 });
    // Preparation follows: every door is shut and no free visit waits after an ordinary round.
    expect(run.freeVisit).toBe(false);
    expect(run.round).toBe(2);
  });

  it('grants a free shop visit after mini-boss and boss rounds', () => {
    for (const [round, free] of [
      [3, false],
      [4, true],
      [7, true],
      [11, true],
      [12, false],
    ] as const) {
      const run = createRun(3, CHARACTERS.inventor, WEAPONS.crossbow);
      run.round = round;
      const world = createWorldForRound(run);
      world.phase = 'cleared';
      finishRound(run, world);
      expect(run.freeVisit).toBe(free);
    }
  });
});
