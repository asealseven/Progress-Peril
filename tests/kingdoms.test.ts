import { describe, expect, it } from 'vitest';
import { ARENAS, ARENA_BY_KINGDOM, arenaStage } from '../src/data/arenas';
import { CHARACTERS } from '../src/data/characters';
import { ENEMIES } from '../src/data/enemies';
import { EVENTS, EVENT_IDS, EVENT_RULES, SIGNATURE_EVENT } from '../src/data/events';
import type { EventId } from '../src/data/events';
import { HAZARDS, HAZARD_LIST, HAZARD_RULES } from '../src/data/hazards';
import { KINGDOMS, KINGDOM_NAMES } from '../src/data/kingdoms';
import type { KingdomName } from '../src/data/palette';
import { roundInTerritory, roundKind } from '../src/data/rounds';
import { STORY } from '../src/data/story';
import { scaledTierValue } from '../src/data/tiers';
import { WEAPONS } from '../src/data/weapons';
import { createArchive } from '../src/sim/archive';
import { planRound, summarisePlan } from '../src/sim/director';
import { Rng } from '../src/sim/rng';
import {
  createRun,
  createWorldForRound,
  eventForRound,
  finishRound,
  kingdomForRound,
  planEvent,
  revealKingdom,
  revealPending,
} from '../src/sim/run';
import type { RunState } from '../src/sim/run';
import { environmentFlags } from '../src/sim/world/environment';
import type { World } from '../src/sim/world/world';
import { dummyAt, makeWorld, stepSeconds } from './helpers';

/** A run past its first campaign, so the first kingdom is random. */
function laterRun(seed: number): RunState {
  const archive = createArchive();
  archive.campaigns = 3;
  return createRun(seed, CHARACTERS.inventor, WEAPONS.crossbow, archive);
}

/** Reveals all three kingdoms of a run, as the transitions do. */
function revealAll(run: RunState): KingdomName[] {
  for (const round of [1, 8, 15]) {
    run.round = round;
    revealKingdom(run);
  }
  return [...run.kingdoms];
}

describe('kingdom data (GDD 2.2, 2.3, 5.6)', () => {
  it('lists five kingdoms with lore, an arena and story text', () => {
    expect(KINGDOM_NAMES).toEqual(['Keldrath', 'Myrathis', 'Merovant', 'Orthelyn', 'Nymora']);
    for (const name of KINGDOM_NAMES) {
      const def = KINGDOMS[name];
      expect(def.focus).toHaveLength(6);
      expect(def.lore.length).toBeGreaterThan(40);
      expect(ARENA_BY_KINGDOM[name].kingdom).toBe(name);
      expect(STORY.reveal[name].length).toBeGreaterThan(20);
      expect(STORY.ending[name].length).toBeGreaterThan(20);
      expect(EVENTS[SIGNATURE_EVENT[name]].kingdom).toBe(name);
    }
  });
});

describe('territory selection (GDD 5.1, 5.2, 5.7)', () => {
  it('starts the first campaign ever in Keldrath, then picks at random', () => {
    const archive = createArchive();
    const first = createRun(1, CHARACTERS.inventor, WEAPONS.crossbow, archive);
    expect(first.firstCampaign).toBe(true);
    expect(revealKingdom(first)).toBe('Keldrath');
    const firsts = new Set<KingdomName>();
    for (let seed = 1; seed <= 60; seed++) {
      const run = createRun(seed, CHARACTERS.inventor, WEAPONS.crossbow, archive);
      expect(run.firstCampaign).toBe(false);
      firsts.add(revealKingdom(run));
    }
    expect(firsts.size).toBe(5);
  });

  it('visits three different kingdoms, and any kingdom can be last', () => {
    const finals = new Set<KingdomName>();
    for (let seed = 1; seed <= 80; seed++) {
      const kingdoms = revealAll(laterRun(seed));
      expect(kingdoms).toHaveLength(3);
      expect(new Set(kingdoms).size).toBe(3);
      finals.add(kingdoms[2]!);
    }
    expect(finals.size).toBe(5);
  });

  it('keeps the next kingdom hidden until the reveal (GDD 5.2, 5.8)', () => {
    const run = laterRun(7);
    expect(revealPending(run)).toBe(true);
    revealKingdom(run);
    expect(revealPending(run)).toBe(false);
    run.round = 8;
    expect(revealPending(run)).toBe(true);
    expect(run.kingdoms[1]).toBeUndefined();
    // Until the reveal, a lookup gives the last kingdom known.
    expect(kingdomForRound(run)).toBe(run.kingdoms[0]);
  });

  it('gives the same kingdoms for the same seed', () => {
    expect(revealAll(laterRun(42))).toEqual(revealAll(laterRun(42)));
  });
});

describe('territory events (GDD 5.11)', () => {
  it('plans exactly one event per territory in Rounds 2, 3, 5 or 6', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const run = laterRun(seed);
      revealAll(run);
      run.events.forEach((event, territory) => {
        expect(event).toBeDefined();
        const local = roundInTerritory(event!.round);
        expect([...EVENT_RULES.rounds]).toContain(local);
        expect(roundKind(event!.round)).toBe('encounter');
        expect(Math.floor((event!.round - 1) / 7)).toBe(territory);
      });
      let count = 0;
      for (let round = 1; round <= 21; round++) if (eventForRound(run, round)) count++;
      expect(count).toBe(3);
    }
  });

  it('rolls the signature event 60 per cent, Military Invasion 20 and Outlaw Ambush 20', () => {
    const counts = { signature: 0, invasion: 0, ambush: 0 };
    const total = 3000;
    for (let index = 0; index < total; index++) {
      const event = planEvent('Myrathis', 0, new Rng(index + 1));
      if (event.id === 'containment-failure') counts.signature++;
      else if (event.id === 'military-invasion') counts.invasion++;
      else counts.ambush++;
    }
    expect(counts.signature / total).toBeCloseTo(0.6, 1);
    expect(counts.invasion / total).toBeCloseTo(0.2, 1);
    expect(counts.ambush / total).toBeCloseTo(0.2, 1);
  });

  it('sends a home faction from another kingdom on a Military Invasion', () => {
    for (let index = 0; index < 200; index++) {
      const event = planEvent('Merovant', 1, new Rng(index + 1));
      if (event.id !== 'military-invasion') continue;
      expect(event.invader).toBeDefined();
      expect(['Clockwork Legions', 'Kingdom Armies']).not.toContain(event.invader);
      const factions = summarisePlan(planRound(event.round, 'Merovant', new Rng(index), event)).byFaction;
      expect(factions[event.invader!] ?? 0).toBeGreaterThan(0);
    }
  });

  it('replaces the faction mix with the event roster', () => {
    const muster = planRound(6, 'Keldrath', new Rng(3), { id: 'royal-muster' });
    const ids = new Set(muster.flatMap((entry) => [entry.enemy.id, ...(entry.with ?? []).map((member) => member.enemy.id)]));
    expect([...ids].sort()).toEqual(['forgeguard-knight', 'royal-bastion']);
    // Lines march in formation.
    expect(muster.some((entry) => entry.formation === 'line')).toBe(true);

    const ambush = planRound(3, 'Nymora', new Rng(5), { id: 'outlaw-ambush' });
    const factions = summarisePlan(ambush).byFaction;
    expect(Object.keys(factions)).toEqual(['Outlaws']);
    const captains = ambush.flatMap((entry) => [entry, ...(entry.with ?? [])]).filter((member) => member.enemy === ENEMIES['mercenary-captain']);
    expect(captains.length).toBeGreaterThan(0);

    for (const id of EVENT_IDS) {
      const roster = EVENTS[id].roster;
      if (!roster) continue;
      const plan = planRound(2, EVENTS[id].kingdom ?? 'Keldrath', new Rng(9), { id });
      for (const entry of plan) expect(roster).toContain(entry.enemy.id);
    }
  });

  it('pays 25 per cent extra gold in an event round', () => {
    const run = laterRun(11);
    revealKingdom(run);
    const event = run.events[0]!;
    run.round = event.round;
    const world = createWorldForRound(run);
    world.loot.gold = 40;
    world.gold = run.gold + 40;
    world.phase = 'cleared';
    const result = finishRound(run, world);
    expect(result.event).toBe(event.id);
    expect(result.eventGold).toBe(10);
    expect(run.gold).toBe(50);
  });
});

describe('arenas (GDD 5.3, 5.9)', () => {
  it('has one 2400 by 1600 arena per kingdom with the GDD round table', () => {
    expect(Object.keys(ARENAS)).toHaveLength(5);
    for (const arena of Object.values(ARENAS)) {
      expect(arena.width).toBe(2400);
      expect(arena.height).toBe(1600);
      for (let round = 1; round <= 7; round++) expect(arenaStage(arena, round)).toBeDefined();
      for (const obstacle of arena.obstacles) {
        expect(obstacle.x - obstacle.radius).toBeGreaterThan(0);
        expect(obstacle.y - obstacle.radius).toBeGreaterThan(0);
        expect(obstacle.x + obstacle.radius).toBeLessThan(arena.width);
        expect(obstacle.y + obstacle.radius).toBeLessThan(arena.height);
      }
    }
  });

  it('turns arena changes on round by round and keeps them for the territory', () => {
    const on = (kingdom: KingdomName, round: number) => environmentFlags(kingdom, round);
    expect(on('Keldrath', 2).channels).toBe(false);
    expect(on('Keldrath', 3).channels).toBe(true);
    expect(on('Keldrath', 4).channels).toBe(true);
    expect(on('Keldrath', 5).slag).toBe(true);
    expect(on('Keldrath', 7).ingots).toBe(true);
    expect(on('Myrathis', 3).puddles).toBe(true);
    expect(on('Myrathis', 4).volatileVats).toBe(false);
    expect(on('Myrathis', 5).volatileVats).toBe(true);
    expect(on('Myrathis', 7).acid).toBe(true);
    expect(on('Merovant', 2).beltsRun).toBe(false);
    expect(on('Merovant', 3).beltsRun).toBe(true);
    expect(on('Merovant', 5).presses && on('Merovant', 5).beltsReverse).toBe(true);
    expect(on('Orthelyn', 3).lightning).toBe(true);
    expect(on('Orthelyn', 5).gravity && on('Orthelyn', 5).orrery).toBe(true);
    expect(on('Orthelyn', 7).erase).toBe(true);
    expect(on('Nymora', 3).vines).toBe(true);
    expect(on('Nymora', 5).thorns && on('Nymora', 5).blooms).toBe(true);
    expect(on('Nymora', 7).fungal).toBe(true);
    // Events add their own hazards.
    expect(environmentFlags('Orthelyn', 2, 'rift-storm').movingWells).toBe(true);
    expect(environmentFlags('Nymora', 2, 'biological-bloom').fungal).toBe(true);
  });
});

/** A world in a kingdom's arena at a round within the territory. */
function arenaWorld(kingdom: KingdomName, localRound: number, round = localRound, event?: EventId): World {
  return makeWorld({ arena: ARENA_BY_KINGDOM[kingdom], localRound, round, armed: false, ...(event ? { event } : {}) });
}

describe('environmental hazards (GDD 5.10)', () => {
  it('lists 15 hazards with GDD wording', () => {
    expect(HAZARD_LIST).toHaveLength(15);
    for (const hazard of HAZARD_LIST) {
      expect(hazard.effect.length).toBeGreaterThan(5);
      expect(hazard.warning.length).toBeGreaterThan(5);
      if (hazard.damageType) expect(hazard.damage).toBeDefined();
    }
  });

  it('warns before a molten channel deals damage, then hits the player and enemies alike', () => {
    const world = arenaWorld('Keldrath', 3);
    const channel = world.arena.channels![0]!;
    world.player.x = channel.x + 100;
    world.player.y = channel.y + channel.height / 2;
    const enemy = dummyAt(world, 120, 0);
    stepSeconds(world, HAZARD_RULES.warningSeconds - 0.1);
    expect(world.player.health).toBe(world.player.stats.maxHealth);
    expect(enemy.health).toBe(enemy.maxHealth);
    stepSeconds(world, 0.7);
    expect(world.player.health).toBeLessThan(world.player.stats.maxHealth);
    expect(enemy.health).toBeLessThan(enemy.maxHealth);
  });

  it('scales hazard damage with territory, and champions resist one step', () => {
    const t1 = arenaWorld('Keldrath', 3, 3).environment;
    const t3 = arenaWorld('Keldrath', 3, 17).environment;
    expect(t1.damageOf('molten-channel')).toBe(scaledTierValue('enemyDamage', 'Medium', 0));
    expect(t3.damageOf('molten-channel')).toBe(scaledTierValue('enemyDamage', 'Medium', 2));
    expect(t3.damageOf('molten-channel', true)).toBe(scaledTierValue('enemyDamage', 'Medium', 1));
  });

  it('builds damage adaptation from hazard damage (GDD 3.7)', () => {
    const world = arenaWorld('Myrathis', 3);
    const puddle = world.arena.puddles![0]!;
    world.player.x = puddle.x;
    world.player.y = puddle.y;
    stepSeconds(world, 3);
    expect(world.player.adaptation.Toxic ?? 0).toBeGreaterThan(0);
  });

  it('bursts a volatile vat on any hit, and the blast reaches nearby vats', () => {
    const world = arenaWorld('Myrathis', 5);
    const vats = () => world.arena.obstacles.filter((obstacle) => obstacle.kind === 'vat').length;
    expect(vats()).toBe(12);
    const vat = world.arena.obstacles.find((obstacle) => obstacle.kind === 'vat')!;
    const enemy = dummyAt(world, vat.x - world.player.x + 70, vat.y - world.player.y);
    world.environment.breakVat(world, vat);
    stepSeconds(world, 0.1);
    expect(vats()).toBeLessThan(12);
    expect(enemy.health).toBeLessThan(enemy.maxHealth);
    // Rounds before 5 leave the vats whole.
    const calm = arenaWorld('Myrathis', 4);
    calm.environment.breakVat(calm, calm.arena.obstacles.find((obstacle) => obstacle.kind === 'vat')!);
    stepSeconds(calm, 0.1);
    expect(calm.arena.obstacles.filter((obstacle) => obstacle.kind === 'vat')).toHaveLength(12);
  });

  it('pushes anyone standing on a running belt', () => {
    const idle = arenaWorld('Merovant', 2);
    const running = arenaWorld('Merovant', 3);
    for (const world of [idle, running]) {
      const belt = world.arena.belts![0]!;
      world.player.x = 1200;
      world.player.y = belt.y + belt.height / 2;
    }
    const enemy = dummyAt(running, -300, 0);
    const startX = enemy.x;
    stepSeconds(idle, 1);
    stepSeconds(running, 1);
    expect(idle.player.x).toBe(1200);
    expect(running.player.x).toBeCloseTo(1200 + HAZARD_RULES.beltSpeed, 0);
    expect(enemy.x).toBeGreaterThan(startX + 50);
  });

  it('stamps press tiles, strikes lightning and drops ingots with damage to the player', () => {
    for (const [kingdom, round] of [
      ['Merovant', 5],
      ['Orthelyn', 3],
      ['Keldrath', 7],
    ] as const) {
      const world = arenaWorld(kingdom, round);
      let bursts = 0;
      for (let step = 0; step < 60 * 20; step++) {
        world.step({ moveX: 0, moveY: 0 });
        for (const event of world.events) if (event.type === 'hazardBurst') bursts++;
        world.events.length = 0;
      }
      expect(bursts, kingdom).toBeGreaterThan(2);
    }
  });

  it('pulls bodies toward a gravity well', () => {
    const world = arenaWorld('Orthelyn', 5);
    const well = world.environment.zones.find((zone) => zone.hazard === 'gravity-well')!;
    world.player.x = well.x + 150;
    world.player.y = well.y;
    stepSeconds(world, HAZARD_RULES.warningSeconds + 1);
    expect(world.player.x).toBeLessThan(well.x + 150);
  });

  it('erases the outer tiles in stages: enemies outside die, the player returns hurt', () => {
    const world = arenaWorld('Orthelyn', 7);
    const enemy = dummyAt(world, 100 - world.player.x, 100 - world.player.y);
    world.player.x = 100;
    world.player.y = 800;
    stepSeconds(world, HAZARD_RULES.eraseIntervalSeconds + 0.1);
    expect(world.environment.erased).toBe(1);
    expect(enemy.active).toBe(false);
    expect(world.player.x).toBeGreaterThanOrEqual(200);
    expect(world.player.health).toBeLessThan(world.player.stats.maxHealth);
    stepSeconds(world, HAZARD_RULES.eraseIntervalSeconds * 3);
    expect(world.environment.erased).toBe(HAZARD_RULES.eraseStages);
  });

  it('slows bodies in vines, heals everyone in a bloom and cuts on thorns', () => {
    const vines = arenaWorld('Nymora', 3);
    vines.player.x = 40;
    stepSeconds(vines, 0.2);
    expect(vines.player.slowFactor).toBe(HAZARD_RULES.vineSlow);

    const garden = arenaWorld('Nymora', 5);
    stepSeconds(garden, HAZARD_RULES.warningSeconds + 0.1);
    expect(garden.environment.thornsUp).toBe(true);
    const thorn = garden.environment.thorns[0]!;
    garden.player.x = thorn.x;
    garden.player.y = thorn.y - thorn.radius - garden.player.radius - 2;
    stepSeconds(garden, 1);
    expect(garden.player.health).toBeLessThan(garden.player.stats.maxHealth);

    const healed = arenaWorld('Nymora', 5);
    stepSeconds(healed, 3);
    const bloom = healed.environment.zones.find((zone) => zone.hazard === 'healing-bloom')!;
    healed.player.x = bloom.x;
    healed.player.y = bloom.y;
    healed.player.health = 50;
    const enemy = dummyAt(healed, 20, 0, undefined, 1000);
    enemy.health = 500;
    stepSeconds(healed, 2);
    expect(healed.player.health).toBeGreaterThan(50);
    expect(enemy.health).toBeGreaterThan(500);
  });

  it('spreads fungal growth, sprouts Thornlings in a Biological Bloom and burns away under fire', () => {
    const world = arenaWorld('Nymora', 2, 2, 'biological-bloom');
    stepSeconds(world, 7);
    const patches = world.environment.zones.filter((zone) => zone.hazard === 'fungal-growth');
    expect(patches.length).toBeGreaterThan(1);
    let thornlings = 0;
    for (const enemy of world.enemies.items) if (enemy.active && enemy.def.id === 'thornling') thornlings++;
    expect(thornlings).toBeGreaterThan(0);
    const patch = patches[0]!;
    world.environment.burnFungus(patch.x, patch.y, 10);
    expect(world.environment.zones).not.toContain(patch);
  });

  it('lowers player Armour in acid', () => {
    const world = arenaWorld('Myrathis', 7);
    stepSeconds(world, 2);
    const pool = world.environment.zones.find((zone) => zone.hazard === 'acid-pool')!;
    world.player.x = pool.x;
    world.player.y = pool.y;
    stepSeconds(world, HAZARD_RULES.warningSeconds);
    world.step({ moveX: 0, moveY: 0 });
    expect(world.environment.armourShare).toBe(HAZARD_RULES.acidArmourShare);
  });

  it('names each hazard in one kingdom', () => {
    for (const hazard of Object.values(HAZARDS)) expect(KINGDOM_NAMES).toContain(hazard.kingdom);
  });
});

describe('campaign through three kingdoms (Milestone 7)', () => {
  it('plays 21 rounds in three random arenas with one event each', { timeout: 300000 }, () => {
    const run = laterRun(5150);
    run.weapons[0]!.grade = 4;
    const seen: KingdomName[] = [];
    let events = 0;
    for (let round = 1; round <= 21 && run.status === 'active'; round++) {
      const world = createWorldForRound(run);
      world.invincible = true;
      if (!seen.includes(world.arena.kingdom)) seen.push(world.arena.kingdom);
      if (eventForRound(run)) events++;
      let steps = 0;
      while (world.phase === 'running' && steps < 60 * 400) {
        // The bot circles the arena centre.
        const angle = steps / 120;
        world.step({ moveX: Math.cos(angle), moveY: Math.sin(angle) });
        world.events.length = 0;
        steps++;
      }
      if (world.phase === 'running') world.phase = 'cleared';
      finishRound(run, world);
    }
    expect(run.status).toBe('complete');
    expect(seen).toHaveLength(3);
    expect(seen).toEqual(run.kingdoms);
    expect(events).toBe(3);
  });
});
