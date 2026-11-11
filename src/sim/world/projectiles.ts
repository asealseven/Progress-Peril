// Travelling projectiles (GDD 7.16): Straight, Arcing, Piercing, Ricochet and Homing.

import type { DamageType } from '../../data/damageTypes';
import { COMBAT, WEAPON_RULES } from '../../data/tiers';
import { explode, hitEnemy, nearestOther } from './damage';
import { sweepCircle } from './movement';
import type { Enemy, Projectile } from './types';
import type { World } from './world';
import { addZone } from './zones';

const scratch: number[] = [];

export function createProjectile(slot: number): Projectile {
  return {
    active: false,
    slot,
    kind: 'straight',
    x: 0,
    y: 0,
    dx: 1,
    dy: 0,
    speed: 0,
    radius: 0,
    distanceLeft: 0,
    weaponIndex: 0,
    damageScale: 1,
    primary: true,
    forcedType: undefined,
    pierceLeft: 0,
    bouncesLeft: 0,
    hitIds: [],
    homing: 0,
    blastRadius: 0,
    startX: 0,
    startY: 0,
    targetX: 0,
    targetY: 0,
    flight: 0,
    elapsed: 0,
    trackSlot: -1,
    trackId: -1,
    born: 0,
  };
}

/** Takes a projectile from the pool. At the limit the oldest projectile ends (GDD 7.21). */
function acquire(world: World): Projectile | undefined {
  let projectile = world.projectiles.acquire();
  if (!projectile) {
    let oldest: Projectile | undefined;
    for (const candidate of world.projectiles.items) {
      if (candidate.active && (!oldest || candidate.born < oldest.born)) oldest = candidate;
    }
    if (oldest) world.projectiles.release(oldest);
    projectile = world.projectiles.acquire();
  }
  if (projectile) {
    projectile.hitIds.length = 0;
    projectile.born = world.steps;
    projectile.elapsed = 0;
    projectile.forcedType = undefined;
    projectile.trackSlot = -1;
    projectile.trackId = -1;
  }
  return projectile;
}

export interface StraightShot {
  readonly x: number;
  readonly y: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly weaponIndex: number;
  readonly speed: number;
  readonly range: number;
  readonly radius: number;
  readonly damageScale?: number;
  readonly primary?: boolean;
  readonly forcedType?: DamageType;
  readonly pierce?: number;
  readonly bounces?: number;
  readonly homing?: number;
  readonly blastRadius?: number;
}

export function fireStraight(world: World, shot: StraightShot): Projectile | undefined {
  const projectile = acquire(world);
  if (!projectile) return undefined;
  projectile.kind = 'straight';
  projectile.x = shot.x;
  projectile.y = shot.y;
  projectile.dx = shot.dirX;
  projectile.dy = shot.dirY;
  projectile.speed = shot.speed;
  projectile.radius = shot.radius;
  projectile.distanceLeft = shot.range;
  projectile.weaponIndex = shot.weaponIndex;
  projectile.damageScale = shot.damageScale ?? 1;
  projectile.primary = shot.primary ?? true;
  projectile.forcedType = shot.forcedType;
  projectile.pierceLeft = shot.pierce ?? 0;
  projectile.bouncesLeft = shot.bounces ?? 0;
  projectile.homing = shot.homing ?? 0;
  projectile.blastRadius = shot.blastRadius ?? 0;
  return projectile;
}

export interface ArcingShot {
  readonly x: number;
  readonly y: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly weaponIndex: number;
  readonly speed: number;
  readonly blastRadius: number;
  /** A single-target shot follows this enemy to the landing. */
  readonly track?: Enemy;
}

/** An Arcing projectile lands at a target point and passes over walls and shields (GDD 7.16). */
export function fireArcing(world: World, shot: ArcingShot): Projectile | undefined {
  const projectile = acquire(world);
  if (!projectile) return undefined;
  const arena = world.arena;
  const targetX = Math.min(arena.width, Math.max(0, shot.targetX));
  const targetY = Math.min(arena.height, Math.max(0, shot.targetY));
  const distance = Math.hypot(targetX - shot.x, targetY - shot.y);
  projectile.kind = 'arcing';
  projectile.x = shot.x;
  projectile.y = shot.y;
  projectile.startX = shot.x;
  projectile.startY = shot.y;
  projectile.targetX = targetX;
  projectile.targetY = targetY;
  projectile.dx = distance > 1e-6 ? (targetX - shot.x) / distance : 1;
  projectile.dy = distance > 1e-6 ? (targetY - shot.y) / distance : 0;
  projectile.speed = shot.speed;
  projectile.flight = Math.max(WEAPON_RULES.arcingMinFlight, distance / Math.max(1, shot.speed));
  projectile.radius = COMBAT.projectileRadius + 2;
  projectile.distanceLeft = distance;
  projectile.weaponIndex = shot.weaponIndex;
  projectile.damageScale = 1;
  projectile.primary = true;
  projectile.pierceLeft = 0;
  projectile.bouncesLeft = 0;
  projectile.homing = 0;
  projectile.blastRadius = shot.blastRadius;
  if (shot.track && shot.blastRadius <= 0) {
    projectile.trackSlot = shot.track.slot;
    projectile.trackId = shot.track.id;
  }
  return projectile;
}

/** Shrapnel Shells: explosions throw fragments in all directions (GDD 7.18). */
export function spawnFragments(world: World, x: number, y: number, weaponIndex: number): void {
  const count = WEAPON_RULES.fragmentCount;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    fireStraight(world, {
      x,
      y,
      dirX: Math.cos(angle),
      dirY: Math.sin(angle),
      weaponIndex,
      speed: COMBAT.projectileSpeed,
      range: WEAPON_RULES.fragmentRange,
      radius: 3,
      damageScale: WEAPON_RULES.fragmentDamageShare,
      primary: false,
      forcedType: 'Impact',
    });
  }
}

/** Turns a homing projectile toward its quarry. */
function steer(world: World, projectile: Projectile, dt: number): void {
  const weapon = world.weapons[projectile.weaponIndex];
  if (!weapon) return;
  const quarry = nearestOther(
    world,
    projectile.x + projectile.dx * 60,
    projectile.y + projectile.dy * 60,
    WEAPON_RULES.homingSeekRange,
    projectile.hitIds,
    weapon.resolved.homingProperty,
  );
  if (!quarry) return;
  const desired = Math.atan2(quarry.y - projectile.y, quarry.x - projectile.x);
  const current = Math.atan2(projectile.dy, projectile.dx);
  let difference = desired - current;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  const turn = Math.max(-projectile.homing * dt, Math.min(projectile.homing * dt, difference));
  projectile.dx = Math.cos(current + turn);
  projectile.dy = Math.sin(current + turn);
}

function landArcing(world: World, projectile: Projectile): void {
  const weapon = world.weapons[projectile.weaponIndex];
  const x = projectile.targetX;
  const y = projectile.targetY;
  if (projectile.blastRadius > 0) {
    explode(world, x, y, projectile.blastRadius, projectile.weaponIndex, { primary: true });
  } else {
    // Area Minimal means a single target: the enemy nearest the landing point.
    const enemy = nearestOther(world, x, y, WEAPON_RULES.singleTargetReach, projectile.hitIds);
    if (enemy) {
      hitEnemy(world, enemy, projectile.weaponIndex, { dirX: projectile.dx, dirY: projectile.dy });
    } else {
      world.emit({ type: 'projectileBlocked', x, y });
    }
  }
  const zone = weapon?.resolved.zone;
  if (weapon && zone) {
    addZone(world, zone.kind, x, y, Math.max(weapon.resolved.area, 30), zone.seconds, projectile.weaponIndex);
  }
  world.projectiles.release(projectile);
}

function updateStraight(world: World, projectile: Projectile, dt: number): void {
  const arena = world.arena;
  if (projectile.homing > 0) steer(world, projectile, dt);
  const travel = Math.min(projectile.speed * dt, projectile.distanceLeft);

  // Arena obstacles block Straight projectiles (GDD 7.16).
  let blockedAt = -1;
  for (const obstacle of arena.obstacles) {
    const contact = sweepCircle(
      projectile.x,
      projectile.y,
      projectile.dx,
      projectile.dy,
      travel,
      obstacle.x,
      obstacle.y,
      obstacle.radius + projectile.radius,
    );
    if (contact >= 0 && (blockedAt < 0 || contact < blockedAt)) blockedAt = contact;
  }

  // Earliest contact with an enemy not hit before. Ties go to the lower slot.
  let hit: Enemy | undefined;
  let hitAt = -1;
  const midX = projectile.x + projectile.dx * travel * 0.5;
  const midY = projectile.y + projectile.dy * travel * 0.5;
  const reach = travel * 0.5 + projectile.radius + world.maxEnemyRadius;
  for (const slot of world.grid.query(midX, midY, reach, scratch)) {
    const enemy = world.enemies.items[slot];
    if (!enemy || !enemy.active || projectile.hitIds.includes(enemy.id)) continue;
    const contact = sweepCircle(
      projectile.x,
      projectile.y,
      projectile.dx,
      projectile.dy,
      travel,
      enemy.x,
      enemy.y,
      enemy.radius + projectile.radius,
    );
    if (contact < 0) continue;
    if (hitAt < 0 || contact < hitAt || (contact === hitAt && hit && enemy.slot < hit.slot)) {
      hit = enemy;
      hitAt = contact;
    }
  }

  if (hit && (blockedAt < 0 || hitAt <= blockedAt)) {
    projectile.x += projectile.dx * hitAt;
    projectile.y += projectile.dy * hitAt;
    projectile.distanceLeft -= hitAt;

    if (projectile.blastRadius > 0) {
      explode(world, projectile.x, projectile.y, projectile.blastRadius, projectile.weaponIndex, {
        scale: projectile.damageScale,
        primary: projectile.primary,
      });
      world.projectiles.release(projectile);
      return;
    }

    const hitX = hit.x;
    const hitY = hit.y;
    projectile.hitIds.push(hit.id);
    hitEnemy(world, hit, projectile.weaponIndex, {
      scale: projectile.damageScale,
      primary: projectile.primary,
      forcedType: projectile.forcedType,
      dirX: projectile.dx,
      dirY: projectile.dy,
    });

    // Ricochet: bounce to a new enemy within a short distance.
    if (projectile.bouncesLeft > 0) {
      const next = nearestOther(world, hitX, hitY, WEAPON_RULES.ricochetRange, projectile.hitIds);
      if (next) {
        const dx = next.x - projectile.x;
        const dy = next.y - projectile.y;
        const distance = Math.hypot(dx, dy) || 1;
        projectile.dx = dx / distance;
        projectile.dy = dy / distance;
        projectile.bouncesLeft--;
        projectile.distanceLeft = Math.max(projectile.distanceLeft, distance + 20);
        return;
      }
    }
    // Piercing: pass through a set number of enemies.
    if (projectile.pierceLeft > 0) {
      projectile.pierceLeft--;
      if (projectile.distanceLeft > 1e-6) return;
    }
    world.projectiles.release(projectile);
    return;
  }

  if (blockedAt >= 0) {
    const x = projectile.x + projectile.dx * blockedAt;
    const y = projectile.y + projectile.dy * blockedAt;
    if (projectile.blastRadius > 0) {
      explode(world, x, y, projectile.blastRadius, projectile.weaponIndex, {
        scale: projectile.damageScale,
        primary: projectile.primary,
      });
    } else {
      world.emit({ type: 'projectileBlocked', x, y });
    }
    world.projectiles.release(projectile);
    return;
  }

  projectile.x += projectile.dx * travel;
  projectile.y += projectile.dy * travel;
  projectile.distanceLeft -= travel;

  const outside = projectile.x < 0 || projectile.y < 0 || projectile.x > arena.width || projectile.y > arena.height;
  if (outside || projectile.distanceLeft <= 1e-6) {
    if (projectile.blastRadius > 0) {
      // Blast shots burst where they end, even with no contact.
      explode(world, projectile.x, projectile.y, projectile.blastRadius, projectile.weaponIndex, {
        scale: projectile.damageScale,
        primary: projectile.primary,
      });
    } else if (outside) {
      world.emit({ type: 'projectileBlocked', x: projectile.x, y: projectile.y });
    }
    world.projectiles.release(projectile);
  }
}

export function updateProjectiles(world: World, dt: number): void {
  for (const projectile of world.projectiles.items) {
    if (!projectile.active) continue;
    if (projectile.kind === 'arcing') {
      // Area Minimal means a single target: the shot follows its target to the landing (NOTES.md).
      if (projectile.trackSlot >= 0) {
        const tracked = world.enemies.items[projectile.trackSlot];
        if (tracked && tracked.active && tracked.id === projectile.trackId) {
          projectile.targetX = tracked.x;
          projectile.targetY = tracked.y;
        } else {
          projectile.trackSlot = -1;
        }
      }
      projectile.elapsed += dt;
      const progress = Math.min(1, projectile.elapsed / projectile.flight);
      projectile.x = projectile.startX + (projectile.targetX - projectile.startX) * progress;
      projectile.y = projectile.startY + (projectile.targetY - projectile.startY) * progress;
      if (progress >= 1) landArcing(world, projectile);
    } else {
      updateStraight(world, projectile, dt);
    }
  }
}
