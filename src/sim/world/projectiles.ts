// Projectile behaviours (GDD 7.16). Milestone 1 holds Straight.

import { COMBAT } from '../../data/tiers';
import { hitEnemy } from './damage';
import { sweepCircle } from './movement';
import { acquireTarget } from './targeting';
import type { Enemy, WeaponState } from './types';
import type { World } from './world';

const scratch: number[] = [];

/** Counts down weapon cooldowns and fires at targets in range. */
export function updateWeapons(world: World, dt: number): void {
  for (let index = 0; index < world.weapons.length; index++) {
    const weapon = world.weapons[index];
    if (!weapon) continue;
    weapon.cooldown = Math.max(0, weapon.cooldown - dt);
    if (weapon.cooldown > 0) continue;
    const target = acquireTarget(world, weapon);
    if (!target) continue;
    fireStraight(world, weapon, index, target);
    weapon.cooldown = 1 / weapon.stats.attacksPerSecond;
  }
}

function fireStraight(world: World, weapon: WeaponState, weaponIndex: number, target: Enemy): void {
  const player = world.player;
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const dirX = length > 1e-6 ? dx / length : 1;
  const dirY = length > 1e-6 ? dy / length : 0;
  weapon.aimX = dirX;
  weapon.aimY = dirY;

  const projectile = world.projectiles.acquire();
  if (!projectile) return;
  projectile.x = player.x;
  projectile.y = player.y;
  projectile.dx = dirX;
  projectile.dy = dirY;
  projectile.speed = COMBAT.projectileSpeed;
  projectile.radius = COMBAT.projectileRadius;
  projectile.distanceLeft = weapon.stats.range;
  projectile.weaponIndex = weaponIndex;
  world.stats.shotsFired++;
  world.emit({ type: 'shot', weaponIndex, x: player.x, y: player.y });
}

/**
 * Moves Straight projectiles. A projectile travels in a line to maximum range
 * and stops at the first enemy, obstacle or wall (GDD 7.16).
 */
export function updateProjectiles(world: World, dt: number): void {
  const arena = world.arena;
  for (const projectile of world.projectiles.items) {
    if (!projectile.active) continue;
    const travel = Math.min(projectile.speed * dt, projectile.distanceLeft);

    // Earliest obstacle contact along this step.
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

    // Earliest enemy contact along this step. Ties go to the lower slot.
    let hit: Enemy | undefined;
    let hitAt = -1;
    const midX = projectile.x + projectile.dx * travel * 0.5;
    const midY = projectile.y + projectile.dy * travel * 0.5;
    const reach = travel * 0.5 + projectile.radius + world.maxEnemyRadius;
    for (const slot of world.grid.query(midX, midY, reach, scratch)) {
      const enemy = world.enemies.items[slot];
      if (!enemy || !enemy.active) continue;
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
      const weapon = world.weapons[projectile.weaponIndex];
      if (weapon) hitEnemy(world, hit, weapon);
      world.projectiles.release(projectile);
      continue;
    }

    if (blockedAt >= 0) {
      world.emit({
        type: 'projectileBlocked',
        x: projectile.x + projectile.dx * blockedAt,
        y: projectile.y + projectile.dy * blockedAt,
      });
      world.projectiles.release(projectile);
      continue;
    }

    projectile.x += projectile.dx * travel;
    projectile.y += projectile.dy * travel;
    projectile.distanceLeft -= travel;

    const outside =
      projectile.x < 0 || projectile.y < 0 || projectile.x > arena.width || projectile.y > arena.height;
    if (outside) {
      world.emit({ type: 'projectileBlocked', x: projectile.x, y: projectile.y });
      world.projectiles.release(projectile);
    } else if (projectile.distanceLeft <= 1e-6) {
      world.projectiles.release(projectile);
    }
  }
}
