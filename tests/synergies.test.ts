import { describe, expect, it } from 'vitest';
import { RESEARCH_SYNERGY_IDS, SYNERGY_LIST } from '../src/data/synergies';
import { resolveLoadout } from '../src/sim/loadout';
import type { WeaponInstance } from '../src/sim/loadout';
import { blastRadius } from '../src/sim/world/attacks';
import { hitEnemy, hitPlayer } from '../src/sim/world/damage';
import { hasStatus, triggerStatus } from '../src/sim/world/status';
import type { Enemy, WorldEvent } from '../src/sim/world/types';
import type { World } from '../src/sim/world/world';
import {
  BASE_STATS,
  IDLE,
  PLAIN_ENEMY,
  arm,
  dummyAt,
  footmanAt,
  holdFire,
  makeWorld,
  stepSeconds,
} from './helpers';

const lost = (enemy: Enemy): number => enemy.maxHealth - enemy.health;

function report(weapons: WeaponInstance[], research: readonly string[] = []) {
  return resolveLoadout(weapons, BASE_STATS, { researchSynergies: research }).report;
}

function activeNames(weapons: WeaponInstance[], research: readonly string[] = []): string[] {
  return report(weapons, research).active.map((entry) => entry.def.name);
}

function explosions(world: World) {
  return world.events.filter((event): event is Extract<WorldEvent, { type: 'explosion' }> => event.type === 'explosion');
}

/** A world for driving hits by hand: weapons hold fire and never roll critical hits. */
function quiet(weapons: WeaponInstance[], research: readonly string[] | 'all' = []): World {
  const world = makeWorld({ weapons, invincible: true, noCriticals: true, research });
  holdFire(world);
  return world;
}

describe('synergy database (GDD 7.19)', () => {
  it('holds 23 synergies: 8 internal, 8 cross-weapon and 7 research', () => {
    expect(SYNERGY_LIST).toHaveLength(23);
    expect(SYNERGY_LIST.filter((entry) => entry.type === 'Internal')).toHaveLength(8);
    expect(SYNERGY_LIST.filter((entry) => entry.type === 'Cross-weapon')).toHaveLength(8);
    expect(SYNERGY_LIST.filter((entry) => entry.type === 'Research')).toHaveLength(7);
    expect(new Set(SYNERGY_LIST.map((entry) => entry.name)).size).toBe(23);
    expect(RESEARCH_SYNERGY_IDS).toHaveLength(7);
  });
});

describe('synergy activation', () => {
  it('needs the tags of an internal synergy on one weapon', () => {
    // Electric on one weapon and Metallic on another: no Conductive Strike.
    expect(activeNames([arm('Tesla Rod'), arm('Crossbow', 'Tempered Steel Frame')])).not.toContain('Conductive Strike');
    expect(activeNames([arm('Tesla Rod', 'Tempered Steel Frame')])).toContain('Conductive Strike');
  });

  it('needs the tags of a cross-weapon synergy on two different weapons', () => {
    expect(activeNames([arm('Acid Sprayer'), arm('Tesla Rod')])).toContain('Galvanic Corrosion');
    // One weapon carrying both tags is not enough.
    expect(activeNames([arm('Acid Sprayer', 'Leyden Jar Cell')])).not.toContain('Galvanic Corrosion');
    expect(activeNames([arm('Spore Censer')])).not.toContain('Fungal Network');
    expect(activeNames([arm('Spore Censer'), arm('Living Arsenal')])).toContain('Fungal Network');
  });

  it('keeps research synergies locked until a research node opens them', () => {
    const weapons = [arm('Electromagnetic Repeater')];
    const locked = report(weapons);
    expect(locked.active.map((entry) => entry.def.name)).not.toContain('Electromagnetic Launchers');
    expect(locked.locked.map((entry) => entry.name)).toEqual(['Electromagnetic Launchers']);
    expect(activeNames(weapons, ['electromagnetic-launchers'])).toContain('Electromagnetic Launchers');
  });

  it('lists each synergy once, with every weapon taking part', () => {
    const result = report([arm('Field Cannon'), arm('Mortar', 'Reinforced Barrel'), arm('Crossbow')]);
    const burst = result.active.filter((entry) => entry.def.name === 'Pressure Burst');
    expect(burst).toHaveLength(1);
    expect(burst[0]!.weapons).toEqual([0, 1]);
  });

  it('flags near misses with the missing tag', () => {
    const texts = report([arm('Tesla Rod')]).nearMisses.map((miss) => miss.text);
    expect(texts).toContain('one Metallic tag from Conductive Strike');
    expect(texts).toContain('one Corrosive weapon from Galvanic Corrosion');
    const two = report([arm('Firebomb Satchel'), arm('Acid Sprayer')]).nearMisses.map((miss) => miss.text);
    expect(two).toContain('one status payload from Catalytic Mix');
  });

  it('lets the Grand Calculus Engine count as one extra matching tag', () => {
    expect(activeNames([arm('Tesla Rod')])).not.toContain('Conductive Strike');
    expect(activeNames([arm('Tesla Rod', 'Grand Calculus Engine')])).toContain('Conductive Strike');
    // One missing tag only: the engine never supplies two.
    expect(activeNames([arm('Crossbow', 'Grand Calculus Engine')])).not.toContain('Conductive Strike');
  });

  it('marks the weapons taking part, for the HUD glow', () => {
    const loadout = resolveLoadout([arm('Acid Sprayer'), arm('Tesla Rod'), arm('Crossbow')], BASE_STATS);
    expect(loadout.weapons[0]!.synergies).toContain('galvanic-corrosion');
    expect(loadout.weapons[1]!.synergies).toContain('galvanic-corrosion');
    expect(loadout.weapons[2]!.synergies).toEqual([]);
  });
});

describe('internal synergies', () => {
  it('Conductive Strike: Electric chains jump to one extra enemy', () => {
    const run = (...parts: string[]): number => {
      const world = quiet([arm('Tesla Rod', ...parts)]);
      const row = [150, 250, 350, 450, 550, 650].map((x) => dummyAt(world, x, 0));
      world.weapons[0]!.cooldown = 0;
      stepSeconds(world, 0.1);
      return row.filter((enemy) => lost(enemy) > 0).length;
    };
    expect(run()).toBe(4);
    expect(run('Tempered Steel Frame')).toBe(5);
  });

  it('Pressure Burst: Explosion Area up, Medium', () => {
    const cannon = makeWorld({ weapons: [arm('Field Cannon')] }).weapons[0]!.resolved;
    expect(cannon.synergies).toContain('pressure-burst');
    expect(blastRadius(cannon)).toBeCloseTo(85 * 1.2, 10);
    const mortar = makeWorld({ weapons: [arm('Mortar')] }).weapons[0]!.resolved;
    expect(blastRadius(mortar)).toBe(85);
  });

  it('Envenomed Edge: Poisoned damage ticks faster on Bleeding enemies', () => {
    const world = quiet([arm('Forged Longsword', 'Venom Reservoir')]);
    expect(world.weapons[0]!.resolved.synergies).toContain('envenomed-edge');
    const bleeding = dummyAt(world, 300, 0);
    const plain = dummyAt(world, 300, 300);
    triggerStatus(world, bleeding, 0, 'Poisoned');
    triggerStatus(world, plain, 0, 'Poisoned');
    triggerStatus(world, bleeding, -1, 'Bleeding');
    stepSeconds(world, 2.1);
    // Damage 12: Poisoned deals 1.2 per tick. Four ticks on the plain enemy, eight on the Bleeding one.
    expect(lost(plain)).toBeCloseTo(5 * 1.2, 6);
    expect(lost(bleeding)).toBeCloseTo(10 * 1.2, 6);
  });

  it('Flashpoint: Burning enemies explode on death', () => {
    const world = quiet([arm('Firebomb Satchel')]);
    expect(world.weapons[0]!.resolved.synergies).toContain('flashpoint');
    const victim = dummyAt(world, 200, 0, PLAIN_ENEMY, 5);
    const neighbour = dummyAt(world, 236, 0);
    triggerStatus(world, victim, 0, 'Burning');
    hitEnemy(world, victim, 0, { primary: false });
    expect(victim.active).toBe(false);
    stepSeconds(world, 0.1);
    expect(explosions(world).map((event) => event.generation)).toEqual([1]);
    // Half of 12, as Impact and Fire.
    expect(lost(neighbour)).toBeCloseTo(7.5, 6);
  });

  it('Rail Shot: Penetration plus two', () => {
    const loadout = makeWorld({ weapons: [arm('Crossbow', 'Magnetised Core', 'Piercing Rail')] });
    expect(loadout.weapons[0]!.resolved.synergies).toContain('rail-shot');
    expect(loadout.weapons[0]!.resolved.penetration).toBe(3);
  });

  it('Clockwork Precision: constructs inherit player Critical Chance', () => {
    const criticals = (...parts: string[]): number => {
      const world = makeWorld({
        weapons: [arm('Clockwork Turret', ...parts)],
        invincible: true,
        playerStats: { criticalChance: 0.5 },
      });
      dummyAt(world, 150, 0);
      stepSeconds(world, 30);
      return world.stats.criticalHits;
    };
    // Constructs roll no critical hits by default.
    expect(criticals()).toBe(0);
    expect(criticals('Marking Chalk')).toBeGreaterThan(20);
  });

  it('Overgrowth: Infected spreads to two enemies on death instead of one', () => {
    const spreads = (weapon: string): number => {
      const world = quiet([arm(weapon)]);
      const host = dummyAt(world, 200, 0, PLAIN_ENEMY, 0.3);
      const others = [dummyAt(world, 260, 0), dummyAt(world, 200, 60), dummyAt(world, 140, 0)];
      triggerStatus(world, host, 0, 'Infected');
      stepSeconds(world, 0.7);
      return others.filter((enemy) => hasStatus(enemy, 'Infected')).length;
    };
    expect(spreads('Spore Censer')).toBe(1);
    expect(spreads('Living Arsenal')).toBe(2);
  });

  it('Steady Hand: the first hit on each enemy is a critical hit', () => {
    const world = quiet([arm('Ballista', 'Targeting Lens')]);
    expect(world.weapons[0]!.resolved.synergies).toContain('steady-hand');
    const enemy = dummyAt(world, 200, 0);
    hitEnemy(world, enemy, 0);
    expect(lost(enemy)).toBeCloseTo(25 * 1.75, 10);
    hitEnemy(world, enemy, 0);
    expect(lost(enemy)).toBeCloseTo(25 * 1.75 + 25, 10);
    expect(world.stats.criticalHits).toBe(1);
  });
});

describe('cross-weapon synergies', () => {
  it('Galvanic Corrosion: Galvanic Surge reactions deal double damage and arc to one nearby enemy', () => {
    const world = quiet([arm('Acid Sprayer'), arm('Tesla Rod')]);
    expect(world.synergies.has('galvanic-corrosion')).toBe(true);
    const target = dummyAt(world, 200, 0);
    const neighbour = dummyAt(world, 260, 0);
    triggerStatus(world, target, 1, 'Electrified');
    triggerStatus(world, target, 0, 'Corroded');
    hitEnemy(world, target, 1, { primary: false });
    // Electric damage up 35 per cent, doubled to 70 per cent.
    expect(lost(target)).toBeCloseTo(9 * 1.7, 10);
    // Half of the hit arcs to one nearby enemy.
    expect(lost(neighbour)).toBeCloseTo((9 * 1.7) / 2, 10);
  });

  it('Thermal Shock: Shatter and Steam Burst reactions deal Damage up, High', () => {
    // The Gear Flail deals Impact and builds no status, so Catalytic Mix stays off.
    const world = quiet([arm('Gear Flail'), arm('Firebomb Satchel'), arm('Crossbow', 'Frost Salts')]);
    expect(world.synergies.has('thermal-shock')).toBe(true);
    expect(world.synergies.has('catalytic-mix')).toBe(false);
    const frozen = dummyAt(world, 80, 0);
    triggerStatus(world, frozen, 2, 'Frozen');
    hitEnemy(world, frozen, 0);
    // Shatter adds 100 per cent, raised by 35 per cent.
    expect(lost(frozen)).toBeCloseTo(9 * (1 + 1.35), 10);
  });

  it('Fungal Network: damage to one Infected enemy spreads in part to other Infected enemies nearby', () => {
    const world = quiet([arm('Spore Censer'), arm('Living Arsenal'), arm('Crossbow')]);
    expect(world.synergies.has('fungal-network')).toBe(true);
    const target = dummyAt(world, 200, 0);
    const infected = dummyAt(world, 280, 0);
    const healthy = dummyAt(world, 200, 80);
    triggerStatus(world, target, -1, 'Infected');
    triggerStatus(world, infected, -1, 'Infected');
    hitEnemy(world, target, 2);
    expect(lost(target)).toBeCloseTo(25, 10);
    expect(lost(infected)).toBeCloseTo(6.25, 10);
    expect(lost(healthy)).toBe(0);
  });

  it('Kill Zone: constructs focus trapped enemies with Damage up, Medium', () => {
    const world = quiet([arm('Spring Trap Layer'), arm('Clockwork Hound')]);
    expect(world.synergies.has('kill-zone')).toBe(true);
    const trapped = dummyAt(world, 150, 0);
    const free = dummyAt(world, 150, 300);
    hitEnemy(world, trapped, 0, { fromConstruct: true });
    expect(trapped.trapped).toBeGreaterThan(0);
    const before = lost(trapped);
    hitEnemy(world, trapped, 1, { fromConstruct: true });
    hitEnemy(world, free, 1, { fromConstruct: true });
    expect(lost(free)).toBeCloseTo(15, 10);
    expect(lost(trapped) - before).toBeCloseTo(15 * 1.2, 10);
  });

  it('Kill Zone: constructs pick trapped enemies first', () => {
    const world = makeWorld({ weapons: [arm('Spring Trap Layer'), arm('Clockwork Turret')], invincible: true });
    world.weapons[0]!.cooldown = 1e9;
    const near = dummyAt(world, 80, 0);
    const trapped = dummyAt(world, -180, 0);
    trapped.trapped = 30;
    stepSeconds(world, 3);
    expect(lost(trapped)).toBeGreaterThan(0);
    expect(lost(near)).toBe(0);
  });

  it('Ballistic Tables: Arcing shots lead moving targets. Area up, Low', () => {
    const run = (weapons: WeaponInstance[]): { hit: boolean; area: number } => {
      const world = makeWorld({ weapons, invincible: true });
      const mortar = world.weapons[0]!;
      for (const weapon of world.weapons.slice(1)) weapon.cooldown = 1e9;
      // The target walks sideways across the field of fire.
      const runner = dummyAt(world, 420, -150);
      for (let step = 0; step < 150; step++) {
        runner.y += 3;
        world.step(IDLE);
      }
      return { hit: lost(runner) > 0, area: mortar.resolved.area };
    };
    const plain = run([arm('Mortar')]);
    expect(plain.hit).toBe(false);
    expect(plain.area).toBe(85);
    const led = run([arm('Mortar'), arm('Burning Mirror')]);
    expect(led.area).toBeCloseTo(93.5, 10);
    expect(led.hit).toBe(true);
  });

  it('Combined Arms: Siege weapons target enemies recently hit by melee, with Damage up, Low', () => {
    const world = makeWorld({ weapons: [arm('Pike'), arm('Ballista')], invincible: true, noCriticals: true });
    expect(world.synergies.has('combined-arms')).toBe(true);
    world.weapons[0]!.cooldown = 1e9;
    world.weapons[1]!.cooldown = 1e9;
    // The Ballista aims at the strongest enemy by default.
    const strong = dummyAt(world, 0, -250, PLAIN_ENEMY, 500);
    const poked = dummyAt(world, 0, 250, PLAIN_ENEMY, 100);
    hitEnemy(world, poked, 0);
    expect(poked.meleeMark).toBeGreaterThan(0);
    const before = lost(poked);
    world.weapons[1]!.cooldown = 0;
    stepSeconds(world, 0.8);
    expect(lost(strong)).toBe(0);
    expect(lost(poked) - before).toBeCloseTo(25 * 1.1, 6);
  });

  it('Magnetic Field: Pickup Radius up, High. Metallic enemies slow down near the player', () => {
    const weapons = () => [arm('Electromagnetic Repeater'), arm('Crossbow', 'Magnetised Core')];
    const loadout = resolveLoadout(weapons(), BASE_STATS);
    expect(loadout.synergies).toContain('magnetic-field');
    expect(loadout.playerStats.pickupRadius).toBeCloseTo(70 * 1.35, 10);

    const walked = (list: WeaponInstance[]): number => {
      const world = quiet(list);
      const footman = footmanAt(world, 190, 0, false);
      const start = footman.x;
      stepSeconds(world, 1);
      return start - footman.x;
    };
    expect(walked([arm('Crossbow')])).toBeCloseTo(100, 4);
    expect(walked(weapons())).toBeCloseTo(80, 4);
  });

  it('Catalytic Mix: three different statuses make status reactions deal Damage up, Medium', () => {
    const world = quiet([arm('War Hammer', 'Frost Salts'), arm('Firebomb Satchel'), arm('Acid Sprayer')]);
    expect(world.synergies.has('catalytic-mix')).toBe(true);
    const frozen = dummyAt(world, 80, 0);
    triggerStatus(world, frozen, 0, 'Frozen');
    hitEnemy(world, frozen, 0);
    // Shatter adds 100 per cent, raised by Catalytic Mix (20) and Thermal Shock (35): one source type, so they add.
    expect(world.synergies.has('thermal-shock')).toBe(true);
    expect(lost(frozen)).toBeCloseTo(25 * (1 + 1.55), 10);
  });
});

describe('research synergies', () => {
  it('stay off without research', () => {
    const world = makeWorld({ weapons: [arm('Field Cannon')] });
    expect(world.synergies.has('recursive-artillery')).toBe(false);
  });

  it('Chemical Ballistics: projectiles leave a short trail carrying the payload status', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Incendiary Oil')], invincible: true, research: 'all' });
    expect(world.synergies.has('chemical-ballistics')).toBe(true);
    const target = dummyAt(world, 320, 0);
    // Beside the bolt's path, never hit by the bolt.
    const bystander = dummyAt(world, 140, 24);
    // The weapon holds the far target, so the bolt flies past the bystander.
    world.weapons[0]!.targetSlot = target.slot;
    world.weapons[0]!.targetId = target.id;
    stepSeconds(world, 1);
    expect(world.events.some((event) => event.type === 'shot')).toBe(true);
    expect(lost(bystander)).toBe(0);
    expect(bystander.statusMeter[0]).toBeGreaterThan(0);
  });

  it('Electromagnetic Launchers: projectiles gain Piercing and Range up, Medium', () => {
    const plain = makeWorld({ weapons: [arm('Electromagnetic Repeater')] }).weapons[0]!.resolved;
    const launched = makeWorld({ weapons: [arm('Electromagnetic Repeater')], research: 'all' }).weapons[0]!.resolved;
    expect(plain.penetration).toBe(2);
    expect(launched.penetration).toBe(3);
    expect(launched.range).toBeCloseTo(340 * 1.2, 10);
  });

  it('Bioengineering: constructs regenerate and grow stronger each round', () => {
    const weapon = arm('Clockwork Hound', 'Chitin Plating');
    weapon.rounds = 3;
    const world = makeWorld({ weapons: [weapon], invincible: true, research: 'all' });
    const resolved = world.weapons[0]!.resolved;
    expect(resolved.synergies).toContain('bioengineering');
    expect(resolved.damage).toBeCloseTo(15 * 1.15, 10);
    world.step(IDLE);
    const hound = world.constructs.items[0]!;
    hound.health = 30;
    stepSeconds(world, 5);
    expect(hound.health).toBeCloseTo(30 + 60 * 0.03 * 5, 4);
  });

  it('Conductive Toxins: Poisoned enemies conduct Electric chains', () => {
    const run = (poisoned: boolean): number => {
      const world = quiet([arm('Tesla Rod', 'Venom Reservoir')], 'all');
      expect(world.weapons[0]!.resolved.synergies).toContain('conductive-toxins');
      const row = [150, 250, 350, 450, 550, 650, 750].map((x) => dummyAt(world, x, 0));
      if (poisoned) for (const enemy of row) triggerStatus(world, enemy, 0, 'Poisoned');
      world.weapons[0]!.cooldown = 0;
      world.step(IDLE);
      return world.events.filter((event) => event.type === 'chain')[0] ? row.filter((enemy) => lost(enemy) > 0).length : 0;
    };
    // Three jumps reach four enemies. Through Poisoned enemies the chain runs on.
    expect(run(false)).toBe(4);
    expect(run(true)).toBe(7);
  });

  it('Recursive Artillery: each explosion triggers one smaller copy', () => {
    const world = makeWorld({ weapons: [arm('Field Cannon')], invincible: true, noCriticals: true, research: 'all' });
    const target = dummyAt(world, 200, 0);
    stepSeconds(world, 1);
    const blasts = explosions(world);
    expect(blasts.map((event) => event.generation)).toEqual([0, 1]);
    expect(blasts[1]!.radius).toBeCloseTo(blasts[0]!.radius * 0.6, 10);
    // 35 from the blast, then half of 35 from the copy, at chain falloff generation 1.
    expect(lost(target)).toBeCloseTo(44 + 22, 6);
  });

  it('Kinetic Probability: knockback into walls or enemies counts as a critical hit', () => {
    // Impact and Precise tags, with knockback. The Mortar has no Heavy tag, so Steady Hand stays off.
    const weapon = () => arm('Mortar', 'Precision-Ground Frame', 'Pneumatic Bellows', 'Shrapnel Shells');
    const run = (research: 'all' | []): { open: number; blocked: number; criticals: number } => {
      const world = quiet([weapon()], research);
      const open = dummyAt(world, 300, 0);
      const blocked = dummyAt(world, 300, 300);
      // A second enemy stands right behind the blocked one.
      dummyAt(world, 322, 300);
      hitEnemy(world, open, 0, { dirX: 1, dirY: 0 });
      hitEnemy(world, blocked, 0, { dirX: 1, dirY: 0 });
      return { open: lost(open), blocked: lost(blocked), criticals: world.stats.criticalHits };
    };
    const off = run([]);
    expect(off.blocked).toBeCloseTo(off.open, 10);
    const on = run('all');
    expect(on.open).toBeCloseTo(25, 10);
    // Critical Damage 1.75, plus 0.20 from the Precision-Ground Frame.
    expect(on.blocked).toBeCloseTo(25 * 1.95, 10);
    expect(on.criticals).toBe(1);
  });

  it('Adaptive Armour: damage adaptation gain and cap double', () => {
    const adapt = (research: 'all' | []): number[] => {
      const world = makeWorld({
        weapons: [arm('Crossbow', 'Chitin Plating')],
        playerStats: { evasion: 0, maxHealth: 100000 },
        research,
      });
      hitPlayer(world, 1, 'Slashing');
      const first = world.player.adaptation.Slashing ?? 0;
      for (let i = 0; i < 60; i++) {
        world.player.invulnerable = 0;
        hitPlayer(world, 1, 'Slashing');
      }
      return [first, world.player.adaptation.Slashing ?? 0];
    };
    expect(adapt([])[0]).toBeCloseTo(0.005, 10);
    expect(adapt([])[1]).toBeCloseTo(0.1, 10);
    expect(adapt('all')[0]).toBeCloseTo(0.01, 10);
    expect(adapt('all')[1]).toBeCloseTo(0.2, 10);
  });
});
