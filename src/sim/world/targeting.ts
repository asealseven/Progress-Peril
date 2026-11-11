// Targeting rules (GDD 7.15). Milestone 1 holds Nearest. Milestone 2 adds the rest.

import type { Enemy, WeaponState } from './types';
import type { World } from './world';

const scratch: number[] = [];

/** Weapons engage when the target's near edge sits inside weapon Range. */
function inRange(world: World, enemy: Enemy, range: number): boolean {
  const dx = enemy.x - world.player.x;
  const dy = enemy.y - world.player.y;
  const reach = range + enemy.radius;
  return dx * dx + dy * dy <= reach * reach;
}

/** Closest enemy in range, or undefined. Ties go to the lower slot. */
export function nearestEnemy(world: World, range: number): Enemy | undefined {
  const player = world.player;
  const candidates = world.grid.query(player.x, player.y, range + world.maxEnemyRadius, scratch);
  let best: Enemy | undefined;
  let bestDistance = Infinity;
  for (const slot of candidates) {
    const enemy = world.enemies.items[slot];
    if (!enemy || !enemy.active || !inRange(world, enemy, range)) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy) - enemy.radius;
    if (distance < bestDistance || (distance === bestDistance && best && enemy.slot < best.slot)) {
      best = enemy;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * The weapon's target. A weapon holds a target until the target dies or
 * leaves range, to stop rapid switching (GDD 7.15).
 */
export function acquireTarget(world: World, weapon: WeaponState): Enemy | undefined {
  if (weapon.targetSlot >= 0) {
    const held = world.enemies.items[weapon.targetSlot];
    if (held && held.active && held.id === weapon.targetId && inRange(world, held, weapon.stats.range)) {
      return held;
    }
  }
  const target = nearestEnemy(world, weapon.stats.range);
  weapon.targetSlot = target ? target.slot : -1;
  weapon.targetId = target ? target.id : -1;
  return target;
}
