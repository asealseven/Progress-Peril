// Lingering area effects (burning pools, rubble, smoke) and snap traps.

import { REACTION_RULES, SYNERGY_RULES, WEAPON_RULES, tierValue } from '../../data/tiers';
import { explode, hitEnemy } from './damage';
import { buildStatus, reactionScale, statusHit, trailStatuses } from './status';
import type { Trap, Zone, ZoneKind } from './types';
import type { World } from './world';

const scratch: number[] = [];

export function createZone(slot: number): Zone {
  return { active: false, slot, kind: 'burning', weaponIndex: 0, x: 0, y: 0, radius: 0, timeLeft: 0, duration: 0, tick: 0 };
}

export function createTrap(slot: number): Trap {
  return { active: false, slot, weaponIndex: 0, x: 0, y: 0, arming: 0, born: 0 };
}

/**
 * Adds an area effect. At the limit the new effect merges into the nearest
 * matching effect, which refreshes its duration (GDD 7.21).
 */
export function addZone(
  world: World,
  kind: ZoneKind,
  x: number,
  y: number,
  radius: number,
  seconds: number,
  weaponIndex: number,
): Zone | undefined {
  const zone = world.zones.acquire();
  if (!zone) {
    let nearest: Zone | undefined;
    let nearestDistance = Infinity;
    for (const candidate of world.zones.items) {
      if (!candidate.active || candidate.kind !== kind) continue;
      const distance = Math.hypot(candidate.x - x, candidate.y - y);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
    if (nearest) {
      nearest.timeLeft = Math.max(nearest.timeLeft, seconds);
      nearest.radius = Math.max(nearest.radius, radius);
    }
    return nearest;
  }
  zone.kind = kind;
  zone.x = x;
  zone.y = y;
  zone.radius = radius;
  zone.timeLeft = seconds;
  zone.duration = seconds;
  zone.tick = 0;
  zone.weaponIndex = weaponIndex;
  return zone;
}

export function updateZones(world: World, dt: number): void {
  const tickSeconds = 1 / WEAPON_RULES.burningPoolTicksPerSecond;
  for (const zone of world.zones.items) {
    if (!zone.active) continue;
    zone.timeLeft -= dt;
    if (zone.timeLeft <= 0) {
      world.zones.release(zone);
      continue;
    }

    // Burning pools, toxic fumes and status trails act on a tick.
    let pulse = false;
    if (zone.kind === 'burning' || zone.kind === 'fumes' || zone.kind === 'trail') {
      zone.tick -= dt;
      if (zone.tick <= 0) {
        zone.tick += tickSeconds;
        pulse = true;
      }
    }
    const weaponDamage = world.weapons[zone.weaponIndex]?.resolved.damage ?? 0;

    for (const slot of world.grid.query(zone.x, zone.y, zone.radius + world.maxEnemyRadius, scratch).slice()) {
      const enemy = world.enemies.items[slot];
      if (!enemy || !enemy.active) continue;
      const reach = zone.radius + enemy.radius;
      const dx = enemy.x - zone.x;
      const dy = enemy.y - zone.y;
      if (dx * dx + dy * dy > reach * reach) continue;
      if (zone.kind === 'rubble') {
        // Rubble slows enemies while they stand on it (GDD 7.17).
        enemy.slowTimer = Math.max(enemy.slowTimer, 0.2);
        enemy.slowFactor = Math.min(enemy.slowFactor, WEAPON_RULES.rubbleSlow);
      } else if (zone.kind === 'smoke') {
        // Enemies inside smoke lose their target briefly (GDD 7.18).
        enemy.confused = Math.max(enemy.confused, 0.3);
      } else if (!pulse) {
        continue;
      } else if (zone.kind === 'burning') {
        hitEnemy(world, enemy, zone.weaponIndex, { scale: WEAPON_RULES.burningPoolDamageShare, primary: false });
      } else if (zone.kind === 'fumes') {
        // Toxic Fumes: a poison cloud. Toxic damage ignores Armour, as Poisoned does (GDD 9.14).
        const amount = weaponDamage * REACTION_RULES.fumesDamageShare * reactionScale(world, 'Toxic Fumes');
        statusHit(world, enemy, zone.weaponIndex, amount, 'Toxic', true);
      } else {
        // Chemical Ballistics: the trail carries the payload status.
        for (const status of trailStatuses(world, zone.weaponIndex)) {
          buildStatus(world, enemy, zone.weaponIndex, status, tierValue('statusBuildUp', SYNERGY_RULES.trailBuild));
        }
      }
    }
  }
}

/** Places a snap trap. Past the per-weapon limit the oldest trap of the weapon goes. */
export function placeTrap(world: World, x: number, y: number, weaponIndex: number): void {
  let own = 0;
  let oldestOwn: Trap | undefined;
  let oldestAny: Trap | undefined;
  for (const trap of world.traps.items) {
    if (!trap.active) continue;
    if (!oldestAny || trap.born < oldestAny.born) oldestAny = trap;
    if (trap.weaponIndex !== weaponIndex) continue;
    own++;
    if (!oldestOwn || trap.born < oldestOwn.born) oldestOwn = trap;
  }
  if (own >= WEAPON_RULES.trapLimit && oldestOwn) world.traps.release(oldestOwn);

  let trap = world.traps.acquire();
  if (!trap && oldestAny) {
    world.traps.release(oldestAny);
    trap = world.traps.acquire();
  }
  if (!trap) return;
  trap.x = x;
  trap.y = y;
  trap.weaponIndex = weaponIndex;
  trap.arming = WEAPON_RULES.trapArmSeconds;
  trap.born = world.steps;
}

export function updateTraps(world: World, dt: number): void {
  for (const trap of world.traps.items) {
    if (!trap.active) continue;
    if (trap.arming > 0) {
      trap.arming -= dt;
      continue;
    }
    let sprung = false;
    for (const slot of world.grid.query(trap.x, trap.y, WEAPON_RULES.trapTriggerRadius + world.maxEnemyRadius, scratch)) {
      const enemy = world.enemies.items[slot];
      if (!enemy || !enemy.active) continue;
      const reach = WEAPON_RULES.trapTriggerRadius + enemy.radius;
      const dx = enemy.x - trap.x;
      const dy = enemy.y - trap.y;
      if (dx * dx + dy * dy <= reach * reach) {
        sprung = true;
        break;
      }
    }
    if (!sprung) continue;
    const weapon = world.weapons[trap.weaponIndex];
    const radius = Math.max(weapon?.resolved.area ?? 0, WEAPON_RULES.singleTargetReach);
    world.emit({ type: 'trapSnap', x: trap.x, y: trap.y, radius });
    world.traps.release(trap);
    explode(world, trap.x, trap.y, radius * (weapon?.resolved.explosionArea ?? 1), trap.weaponIndex, {
      primary: true,
      quiet: true,
      fromConstruct: true,
    });
  }
}
