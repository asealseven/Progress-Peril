import { describe, expect, it } from 'vitest';
import { PERFORMANCE_LIMITS } from '../src/data/tiers';
import { WEAPON_LIST } from '../src/data/weapons';
import { auraRadius, orbitRadius } from '../src/sim/world/attacks';
import type { WorldEvent } from '../src/sim/world/types';
import { OPEN_ARENA, arm, footmanAt, makeWorld, stepSeconds } from './helpers';

type EventOf<T extends WorldEvent['type']> = Extract<WorldEvent, { type: T }>;

function eventsOf<T extends WorldEvent['type']>(events: readonly WorldEvent[], type: T): EventOf<T>[] {
  return events.filter((event): event is EventOf<T> => event.type === type);
}

describe('every weapon in the catalogue', () => {
  it.each(WEAPON_LIST.map((weapon) => [weapon.name]))('%s damages approaching enemies', (name) => {
    const world = makeWorld({ weapons: [arm(name)], invincible: true });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      footmanAt(world, Math.cos(angle) * 200, Math.sin(angle) * 200, false);
    }
    // The player walks in a circle, so enemies cross the player's path.
    for (let step = 0; step < 15 * 60; step++) {
      world.step({ moveX: Math.cos(step / 60), moveY: Math.sin(step / 60) });
    }
    expect(world.stats.damageDealt).toBeGreaterThan(0);
    expect(world.weapons[0]!.damageDealt).toBeCloseTo(world.stats.damageDealt, 6);
  });
});

describe('melee shapes', () => {
  it('sweeps the Forged Longsword across enemies in front, not behind', () => {
    const world = makeWorld({ weapons: [arm('Forged Longsword')], invincible: true, noCriticals: true });
    const front = footmanAt(world, 80, 0);
    const side = footmanAt(world, 70, 40);
    const behind = footmanAt(world, -100, 0);
    stepSeconds(world, 0.5);
    expect(front.health).toBeLessThan(front.maxHealth);
    expect(side.health).toBeLessThan(side.maxHealth);
    expect(behind.health).toBe(behind.maxHealth);
    expect(eventsOf(world.events, 'sweep')).toHaveLength(1);
  });

  it('slams the War Hammer onto a group', () => {
    const world = makeWorld({ weapons: [arm('War Hammer')], invincible: true, noCriticals: true });
    const target = footmanAt(world, 90, 0);
    const neighbour = footmanAt(world, 130, 20);
    stepSeconds(world, 0.5);
    // Damage 20, Impact, Armour 25 per cent.
    expect(target.health).toBeCloseTo(35 - 15, 6);
    expect(neighbour.health).toBeCloseTo(35 - 15, 6);
    expect(eventsOf(world.events, 'slam')).toHaveLength(1);
  });

  it('thrusts the Pike through every enemy along a line', () => {
    const world = makeWorld({ weapons: [arm('Pike')], invincible: true, noCriticals: true });
    const line = [60, 110, 160, 210].map((x) => footmanAt(world, x, 0));
    const off = footmanAt(world, 120, 90);
    stepSeconds(world, 0.5);
    // Damage 12, Piercing: Armour 25 drops to 10 per cent.
    for (const enemy of line) expect(enemy.health).toBeCloseTo(35 - 10.8, 6);
    expect(off.health).toBe(off.maxHealth);
  });

  it('circles the Gear Flail head around the player', () => {
    const world = makeWorld({ weapons: [arm('Gear Flail')], invincible: true });
    const radius = orbitRadius(world.weapons[0]!.resolved);
    const onPath = footmanAt(world, 0, -radius);
    const far = footmanAt(world, 300, 0);
    stepSeconds(world, 3);
    expect(onPath.health).toBeLessThan(onPath.maxHealth);
    expect(far.health).toBe(far.maxHealth);
  });
});

describe('projectile behaviours (GDD 7.16)', () => {
  it('Straight: stops at the first enemy', () => {
    const world = makeWorld({ weapons: [arm('Crossbow')], invincible: true });
    const first = footmanAt(world, 150, 0);
    const second = footmanAt(world, 220, 0);
    stepSeconds(world, 1);
    expect(first.health).toBeLessThan(first.maxHealth);
    expect(second.health).toBe(second.maxHealth);
  });

  it('Straight: the Knife Bandolier throws a fan of three knives', () => {
    const world = makeWorld({ weapons: [arm('Knife Bandolier')], invincible: true });
    footmanAt(world, 200, 0);
    stepSeconds(world, 0.45);
    expect(world.stats.shotsFired).toBe(1);
    expect(world.projectiles.activeCount).toBe(3);
    const angles = world.projectiles.items.map((p) => Math.round((Math.atan2(p.dy, p.dx) * 180) / Math.PI));
    expect(angles.sort((a, b) => a - b)).toEqual([-12, 0, 12]);
  });

  it('Piercing: the Ballista bolt passes through a full line', () => {
    const world = makeWorld({ weapons: [arm('Ballista')], invincible: true });
    const line = [120, 190, 260, 330, 400].map((x) => footmanAt(world, x, 0));
    stepSeconds(world, 1.3);
    expect(world.stats.shotsFired).toBe(1);
    for (const enemy of line) expect(enemy.health).toBeLessThan(enemy.maxHealth);
  });

  it('Piercing: the Electromagnetic Repeater passes through two enemies', () => {
    const world = makeWorld({ weapons: [arm('Electromagnetic Repeater')], invincible: true });
    const line = [100, 150, 200, 250].map((x) => {
      const enemy = footmanAt(world, x, 0);
      enemy.health = enemy.maxHealth = 1000;
      return enemy;
    });
    stepSeconds(world, 0.8);
    expect(world.stats.shotsFired).toBe(1);
    expect(line.map((enemy) => enemy.health < 1000)).toEqual([true, true, true, false]);
  });

  it('Arcing: the Longbow passes over a pillar the Crossbow hits', () => {
    const arena = { ...OPEN_ARENA, obstacles: [{ kind: 'pillar' as const, x: 1300, y: 800, radius: 38 }] };
    const bow = makeWorld({ arena, weapons: [arm('Longbow')], invincible: true });
    const behind = footmanAt(bow, 200, 0);
    stepSeconds(bow, 2);
    expect(behind.health).toBeLessThan(behind.maxHealth);

    const crossbow = makeWorld({ arena, weapons: [arm('Crossbow')], invincible: true });
    const safe = footmanAt(crossbow, 200, 0);
    stepSeconds(crossbow, 2);
    expect(safe.health).toBe(safe.maxHealth);
  });

  it('Arcing: a single-target arrow follows a moving target, and a blast lands on a fixed point', () => {
    const bow = makeWorld({ weapons: [arm('Longbow')], invincible: true });
    const runner = footmanAt(bow, 300, 0);
    stepSeconds(bow, 0.45);
    runner.y += 120;
    stepSeconds(bow, 0.8);
    expect(runner.health).toBeLessThan(runner.maxHealth);

    const mortar = makeWorld({ weapons: [arm('Mortar')], invincible: true });
    const dodger = footmanAt(mortar, 300, 0);
    stepSeconds(mortar, 0.45);
    dodger.y += 220;
    stepSeconds(mortar, 1);
    expect(dodger.health).toBe(dodger.maxHealth);
  });

  it('Arcing: the Mortar targets the densest group and blasts an area', () => {
    const world = makeWorld({ weapons: [arm('Mortar')], invincible: true });
    const loner = footmanAt(world, -150, 0);
    const group = [
      footmanAt(world, 300, 0),
      footmanAt(world, 330, 20),
      footmanAt(world, 310, -30),
      footmanAt(world, 340, -10),
    ];
    stepSeconds(world, 1.6);
    expect(world.stats.shotsFired).toBe(1);
    expect(loner.health).toBe(loner.maxHealth);
    for (const enemy of group) expect(enemy.health).toBeLessThan(enemy.maxHealth);
    expect(eventsOf(world.events, 'explosion')).toHaveLength(1);
  });

  it('Ricochet: Sawblade Launcher blades bounce between enemies', () => {
    const world = makeWorld({ weapons: [arm('Sawblade Launcher')], invincible: true });
    const enemies = [footmanAt(world, 150, 0), footmanAt(world, 200, 100), footmanAt(world, 120, 160), footmanAt(world, 30, 150)];
    for (const enemy of enemies) enemy.health = enemy.maxHealth = 1000;
    stepSeconds(world, 1.2);
    expect(world.stats.shotsFired).toBe(1);
    // One blade, three bounces: four enemies hit.
    expect(enemies.filter((enemy) => enemy.health < 1000)).toHaveLength(4);
  });

  it('Homing: the Magnetised Core curves bolts toward Metallic enemies', () => {
    const run = (...parts: string[]): number => {
      const world = makeWorld({ weapons: [arm('Crossbow', ...parts)], invincible: true });
      const target = footmanAt(world, 300, 0);
      stepSeconds(world, 0.45);
      // The target steps aside after the shot.
      target.y += 70;
      stepSeconds(world, 0.6);
      return target.health;
    };
    expect(run()).toBe(35);
    expect(run('Magnetised Core')).toBeLessThan(35);
  });

  it('Chain: the Tesla Rod arcs across several enemies with falling damage', () => {
    const world = makeWorld({ weapons: [arm('Tesla Rod')], invincible: true, noCriticals: true });
    const enemies = [150, 250, 350, 450, 550].map((x) => footmanAt(world, x, 0));
    stepSeconds(world, 0.45);
    // Damage 7, Electric, Armour 25 per cent, against a weakness to Electric, then 75 per cent per jump.
    const first = 7 * 0.75 * 1.7;
    const lost = enemies.map((enemy) => enemy.maxHealth - enemy.health);
    expect(lost[0]).toBeCloseTo(first, 6);
    expect(lost[1]).toBeCloseTo(first * 0.75, 6);
    expect(lost[2]).toBeCloseTo(first * 0.75 ** 2, 6);
    expect(lost[3]).toBeCloseTo(first * 0.75 ** 3, 6);
    expect(lost[4]).toBe(0);
    expect(eventsOf(world.events, 'chain')[0]!.points).toHaveLength(10);
  });

  it('Beam: Burning Mirror damage rises while the beam holds one target', () => {
    const world = makeWorld({ weapons: [arm('Burning Mirror')], invincible: true, noCriticals: true });
    const target = footmanAt(world, 200, 0);
    target.health = target.maxHealth = 1000;
    stepSeconds(world, 2);
    const hits = eventsOf(world.events, 'enemyHit').map((event) => event.amount);
    expect(hits.length).toBeGreaterThanOrEqual(4);
    expect(hits[0]).toBeCloseTo(7 * 0.75, 6);
    expect(hits[1]).toBeCloseTo(7 * 0.75 * 1.1, 6);
    expect(hits[3]).toBeGreaterThan(hits[2]!);
    expect(world.weapons[0]!.beamActive).toBe(true);
  });

  it('Cone: the Acid Sprayer hits enemies inside a short fan', () => {
    const world = makeWorld({ weapons: [arm('Acid Sprayer')], invincible: true });
    const front = footmanAt(world, 90, 0);
    const edge = footmanAt(world, 85, 30);
    const behind = footmanAt(world, -90, 0);
    stepSeconds(world, 0.45);
    expect(front.health).toBeLessThan(front.maxHealth);
    expect(edge.health).toBeLessThan(edge.maxHealth);
    expect(behind.health).toBe(behind.maxHealth);
    expect(eventsOf(world.events, 'cone')).toHaveLength(1);
  });

  it('Aura: the Spore Censer hits everything around the player', () => {
    const world = makeWorld({ weapons: [arm('Spore Censer')], invincible: true });
    const radius = auraRadius(world.weapons[0]!.resolved);
    const inside = [footmanAt(world, radius - 20, 0), footmanAt(world, -radius + 20, 0), footmanAt(world, 0, 60)];
    const outside = footmanAt(world, radius + 80, 0);
    stepSeconds(world, 1);
    for (const enemy of inside) expect(enemy.health).toBeLessThan(enemy.maxHealth);
    expect(outside.health).toBe(outside.maxHealth);
  });
});

describe('blasts, zones and chain explosions', () => {
  it('the Field Cannon blast splits Impact and Fire damage', () => {
    const world = makeWorld({ weapons: [arm('Field Cannon')], invincible: true, noCriticals: true });
    const target = footmanAt(world, 200, 0);
    const neighbour = footmanAt(world, 250, 40);
    for (const enemy of [target, neighbour]) enemy.health = enemy.maxHealth = 1000;
    stepSeconds(world, 1);
    // 17.5 Impact and 17.5 Fire, each against Armour 25 per cent.
    expect(1000 - target.health).toBeCloseTo(35 * 0.75, 6);
    expect(1000 - neighbour.health).toBeCloseTo(35 * 0.75, 6);
  });

  it('the Firebomb Satchel leaves a burning pool', () => {
    const world = makeWorld({ weapons: [arm('Firebomb Satchel')], invincible: true, noCriticals: true });
    const target = footmanAt(world, 150, 0);
    target.health = target.maxHealth = 1000;
    stepSeconds(world, 1.2);
    expect(world.zones.items.filter((zone) => zone.active && zone.kind === 'burning')).toHaveLength(1);
    const afterBlast = target.health;
    stepSeconds(world, 0.4);
    // The pool keeps burning between flasks.
    expect(target.health).toBeLessThan(afterBlast);
    expect(world.stats.shotsFired).toBe(1);
  });

  it('Siege Catapult rubble slows enemies', () => {
    const world = makeWorld({ weapons: [arm('Siege Catapult')], invincible: true });
    const target = footmanAt(world, 250, 0);
    target.health = target.maxHealth = 1000;
    stepSeconds(world, 1.5);
    expect(world.zones.items.some((zone) => zone.active && zone.kind === 'rubble')).toBe(true);
    expect(target.slowTimer).toBeGreaterThan(0);
    expect(target.slowFactor).toBeCloseTo(0.6, 10);
  });

  it('Alchemical Chain-Reactor kills set off chain explosions', () => {
    const world = makeWorld({ weapons: [arm('Alchemical Chain-Reactor')], invincible: true, noCriticals: true });
    // The flask lands on the first enemy. The second sits at the edge of the
    // blast and dies. The third stands outside the blast, inside the chain explosion.
    const target = footmanAt(world, 180, 0);
    target.health = target.maxHealth = 1000;
    const fragile = footmanAt(world, 260, 0);
    fragile.health = 1;
    const bystander = footmanAt(world, 320, 0);
    stepSeconds(world, 1.2);
    expect(fragile.active).toBe(false);
    // Damage 12 Fire, 60 per cent, Armour 25 per cent.
    expect(bystander.maxHealth - bystander.health).toBeCloseTo(12 * 0.6 * 0.75, 6);
    const generations = eventsOf(world.events, 'explosion').map((event) => event.generation);
    expect(generations).toEqual([0, 1]);
  });
});

describe('constructs', () => {
  it('the Clockwork Turret deploys turrets up to a limit, and turrets shoot', () => {
    const world = makeWorld({ weapons: [arm('Clockwork Turret')], invincible: true });
    const target = footmanAt(world, 180, 0);
    target.health = target.maxHealth = 1000;
    stepSeconds(world, 1);
    expect(world.constructs.activeCount).toBe(1);
    stepSeconds(world, 12);
    expect(world.constructs.activeCount).toBe(2);
    expect(target.health).toBeLessThan(1000);
  });

  it('a turret left far behind moves up to the player', () => {
    const world = makeWorld({ weapons: [arm('Clockwork Turret')], invincible: true });
    stepSeconds(world, 6);
    expect(world.constructs.activeCount).toBe(2);
    stepSeconds(world, 5, { moveX: 1, moveY: 0 });
    // The player stops. Both turrets catch up, one per deployment.
    stepSeconds(world, 9);
    const distances = world.constructs.items
      .filter((construct) => construct.active)
      .map((construct) => Math.hypot(construct.x - world.player.x, construct.y - world.player.y));
    expect(distances).toHaveLength(2);
    for (const distance of distances) expect(distance).toBeLessThan(450);
  });

  it('the Clockwork Hound chases and bites enemies near the player', () => {
    const world = makeWorld({ weapons: [arm('Clockwork Hound')], invincible: true });
    const near = footmanAt(world, 150, 0);
    const far = footmanAt(world, 600, 0);
    // Royal Footmen resist Slashing, so the hound needs seven bites.
    stepSeconds(world, 10);
    expect(world.constructs.activeCount).toBe(1);
    expect(world.constructs.items[0]!.kind).toBe('hound');
    expect(near.active).toBe(false);
    expect(far.health).toBe(far.maxHealth);
  });

  it('the Living Arsenal creature bursts toxins around itself', () => {
    const world = makeWorld({ weapons: [arm('Living Arsenal')], invincible: true });
    const pair = [footmanAt(world, 100, 0), footmanAt(world, 130, 15)];
    stepSeconds(world, 2);
    expect(world.constructs.items[0]!.kind).toBe('creature');
    for (const enemy of pair) expect(enemy.health).toBeLessThan(enemy.maxHealth);
  });

  it('the Spring Trap Layer places traps along the player path, and traps snap', () => {
    const world = makeWorld({ weapons: [arm('Spring Trap Layer')], invincible: true, noCriticals: true });
    stepSeconds(world, 5, { moveX: 1, moveY: 0 });
    const traps = world.traps.items.filter((trap) => trap.active);
    expect(traps.length).toBeGreaterThanOrEqual(3);
    expect(traps.length).toBeLessThanOrEqual(6);

    const walker = footmanAt(world, -400, 0, false);
    stepSeconds(world, 6);
    // Damage 20 Slashing against Armour 25 per cent.
    expect(walker.maxHealth - walker.health).toBeGreaterThanOrEqual(15 - 1e-6);
    expect(eventsOf(world.events, 'trapSnap').length).toBeGreaterThanOrEqual(1);
  });
});

describe('manual focus (GDD 3.4)', () => {
  it('steers a weapon toward the focus point while held', () => {
    const world = makeWorld({ weapons: [arm('Crossbow')], invincible: true });
    const near = footmanAt(world, -100, 0);
    const far = footmanAt(world, 250, 0);
    const focus = { moveX: 0, moveY: 0, focusX: world.player.x + 400, focusY: world.player.y };
    stepSeconds(world, 1, focus);
    expect(far.health).toBeLessThan(far.maxHealth);
    expect(near.health).toBe(near.maxHealth);
    // Releasing the input returns the weapon to automatic targeting: the held
    // target first (GDD 7.15), then the nearest enemy.
    stepSeconds(world, 4);
    expect(far.active).toBe(false);
    expect(near.health).toBeLessThan(near.maxHealth);
  });

  it('leaves constructs on their own targeting rule', () => {
    const world = makeWorld({ weapons: [arm('Clockwork Turret')], invincible: true });
    const near = footmanAt(world, -120, 0);
    const far = footmanAt(world, 180, 0);
    for (const enemy of [near, far]) enemy.health = enemy.maxHealth = 1000;
    const focus = { moveX: 0, moveY: 0, focusX: world.player.x + 400, focusY: world.player.y };
    stepSeconds(world, 2, focus);
    expect(near.health).toBeLessThan(1000);
    expect(far.health).toBe(1000);
  });
});

describe('performance limits (GDD 7.21)', () => {
  it('ends the oldest projectile at the projectile limit', () => {
    const world = makeWorld({ weapons: [arm('Knife Bandolier', 'Multishot Rack')], invincible: true });
    const target = footmanAt(world, 220, 0);
    target.health = target.maxHealth = 1e9;
    stepSeconds(world, 20);
    expect(world.projectiles.activeCount).toBeLessThanOrEqual(PERFORMANCE_LIMITS.pc.projectiles);
    expect(world.projectiles.items.length).toBeLessThanOrEqual(PERFORMANCE_LIMITS.pc.projectiles);
  });

  it('merges new area effects into matching ones at the limit', () => {
    const world = makeWorld({ weapons: [arm('Firebomb Satchel', 'Perpetual Motion Engine')], invincible: true });
    const target = footmanAt(world, 150, 0);
    target.health = target.maxHealth = 1e9;
    stepSeconds(world, 30);
    expect(world.zones.activeCount).toBeLessThanOrEqual(PERFORMANCE_LIMITS.pc.areaEffects);
  });
});
