// Targeting rules (GDD 7.15) and manual focus (GDD 3.4).

import { WEAPON_RULES } from '../../data/tiers';
import type { TargetingRule } from '../../data/weapons';
import type { Enemy, WeaponState } from './types';
import type { World } from './world';

const scratch: number[] = [];
const neighbours: number[] = [];
const candidates: Enemy[] = [];

/** Weapons engage when the target's near edge sits inside Range. */
export function inRange(originX: number, originY: number, enemy: Enemy, range: number): boolean {
  const dx = enemy.x - originX;
  const dy = enemy.y - originY;
  const reach = range + enemy.radius;
  return dx * dx + dy * dy <= reach * reach;
}

function edgeDistance(originX: number, originY: number, enemy: Enemy): number {
  return Math.hypot(enemy.x - originX, enemy.y - originY) - enemy.radius;
}

/** Fills `out` with every active enemy in range, in slot order. */
export function enemiesInRange(world: World, originX: number, originY: number, range: number, out: Enemy[]): Enemy[] {
  out.length = 0;
  for (const slot of world.grid.query(originX, originY, range + world.maxEnemyRadius, scratch)) {
    const enemy = world.enemies.items[slot];
    if (enemy && enemy.active && inRange(originX, originY, enemy, range)) out.push(enemy);
  }
  out.sort((a, b) => a.slot - b.slot);
  return out;
}

/** Enemies inside a radius around a point. Used by the Clustered rule. */
function countNear(world: World, x: number, y: number, radius: number): number {
  let count = 0;
  for (const slot of world.grid.query(x, y, radius + world.maxEnemyRadius, neighbours)) {
    const enemy = world.enemies.items[slot];
    if (!enemy || !enemy.active) continue;
    const reach = radius + enemy.radius;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    if (dx * dx + dy * dy <= reach * reach) count++;
  }
  return count;
}

/** Picks the best candidate by score. Higher wins. Ties go to the nearer enemy, then the lower slot. */
function best(pool: readonly Enemy[], originX: number, originY: number, score: (enemy: Enemy) => number): Enemy | undefined {
  let chosen: Enemy | undefined;
  let chosenScore = -Infinity;
  let chosenDistance = Infinity;
  for (const enemy of pool) {
    const value = score(enemy);
    const distance = edgeDistance(originX, originY, enemy);
    if (value > chosenScore || (value === chosenScore && distance < chosenDistance)) {
      chosen = enemy;
      chosenScore = value;
      chosenDistance = distance;
    }
  }
  return chosen;
}

export interface TargetQuery {
  readonly x: number;
  readonly y: number;
  readonly range: number;
  readonly rule: TargetingRule;
  /** Marked enemies come before any other target. */
  readonly markedFirst?: boolean;
  /** Weapon Area, for the Clustered rule. */
  readonly area?: number;
  /** Enemies passing this test come before any other target: Kill Zone and Combined Arms (GDD 7.19). */
  readonly prefer?: (enemy: Enemy) => boolean;
}

/** Applies one targeting rule from GDD 7.15. */
export function selectTarget(world: World, query: TargetQuery): Enemy | undefined {
  let pool: readonly Enemy[] = enemiesInRange(world, query.x, query.y, query.range, candidates);
  if (pool.length === 0) return undefined;

  if (query.prefer) {
    const preferred = pool.filter(query.prefer);
    if (preferred.length > 0) pool = preferred;
  }

  if (query.markedFirst || query.rule === 'Marked first') {
    const marked = pool.filter((enemy) => enemy.marked);
    if (marked.length > 0) pool = marked;
  }

  switch (query.rule) {
    case 'Strongest':
      return best(pool, query.x, query.y, (enemy) => enemy.health);
    case 'Clustered': {
      const radius = Math.max(query.area ?? 0, WEAPON_RULES.clusterRadiusMin);
      return best(pool, query.x, query.y, (enemy) => countNear(world, enemy.x, enemy.y, radius));
    }
    case 'Highest threat':
      return best(pool, query.x, query.y, (enemy) => enemy.threat);
    case 'Random':
      return world.rng.pick(pool);
    case 'Nearest':
    case 'Marked first':
    default:
      return best(pool, query.x, query.y, () => 0);
  }
}

/** Manual focus: the enemy in range closest to the focus direction (GDD 3.4). */
export function focusTarget(
  world: World,
  originX: number,
  originY: number,
  range: number,
  focusX: number,
  focusY: number,
): Enemy | undefined {
  const pool = enemiesInRange(world, originX, originY, range, candidates);
  const fx = focusX - originX;
  const fy = focusY - originY;
  const length = Math.hypot(fx, fy);
  if (length < 1e-6) return best(pool, originX, originY, () => 0);
  return best(pool, originX, originY, (enemy) => {
    const ex = enemy.x - originX;
    const ey = enemy.y - originY;
    const distance = Math.hypot(ex, ey) || 1;
    // Cosine of the angle to the focus direction: 1 means dead on.
    return (ex * fx + ey * fy) / (distance * length);
  });
}

/**
 * The weapon's target. A weapon holds a target until the target dies or
 * leaves range, to stop rapid switching (GDD 7.15). Manual focus overrides
 * the rule while held.
 */
export function acquireTarget(
  world: World,
  weapon: WeaponState,
  originX: number,
  originY: number,
  allowFocus: boolean,
): Enemy | undefined {
  const resolved = weapon.resolved;
  let target: Enemy | undefined;

  if (allowFocus && world.focus) {
    target = focusTarget(world, originX, originY, resolved.range, world.focus.x, world.focus.y);
  } else {
    if (weapon.targetSlot >= 0) {
      const held = world.enemies.items[weapon.targetSlot];
      if (held && held.active && held.id === weapon.targetId && inRange(originX, originY, held, resolved.range)) {
        return held;
      }
    }
    target = selectTarget(world, {
      x: originX,
      y: originY,
      range: resolved.range,
      rule: resolved.targeting,
      markedFirst: resolved.markedFirst,
      area: resolved.area,
      // Combined Arms: Siege weapons target enemies recently hit by melee.
      prefer:
        world.synergies.has('combined-arms') && resolved.def.family === 'Siege'
          ? (enemy) => enemy.meleeMark > 0
          : undefined,
    });
  }

  weapon.targetSlot = target ? target.slot : -1;
  weapon.targetId = target ? target.id : -1;
  return target;
}
