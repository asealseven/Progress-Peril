// Enemy shots, enemy area effects, enemy blasts and damage to constructs.
// Everything here hurts the player's side. Blasts from Volatile Specimens and
// Static Motes hurt other enemies too (GDD 9.11).

import type { ArenaDef } from '../../data/arenas';
import type { DamageType } from '../../data/damageTypes';
import type { EnemyDef } from '../../data/enemies';
import { ENEMY_RULES } from '../../data/tiers';
import { computeDamage } from '../modifiers';
import { hitPlayer, killEnemy } from './damage';
import { noteDamage, spawnEnemy } from './enemies';
import { sweepCircle } from './movement';
import { enemyArmour, typeMultiplier } from './status';
import type { Construct, Enemy, EnemyShot, Hazard, HazardKind, PendingBlast } from './types';
import type { World } from './world';

const scratch: number[] = [];
const HIT_FLASH_SECONDS = 0.1;
/** Seeds check for fire this often, seconds. */
const SEED_CHECK_SECONDS = 0.25;

export function createEnemyShot(slot: number): EnemyShot {
  return { active: false, slot, x: 0, y: 0, dx: 1, dy: 0, speed: 0, radius: 0, damage: 0, damageType: 'Piercing', distanceLeft: 0 };
}

export function createHazard(slot: number): Hazard {
  return {
    active: false,
    slot,
    kind: 'acid',
    x: 0,
    y: 0,
    radius: 0,
    timeLeft: 0,
    duration: 0,
    tick: 0,
    damage: 0,
    damageType: 'Corrosive',
    arming: 0,
    sprout: undefined,
    born: 0,
  };
}

/** True when no obstacle blocks the straight line between two points. */
export function lineOfSight(arena: ArenaDef, x1: number, y1: number, x2: number, y2: number, margin = 0): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return true;
  for (const obstacle of arena.obstacles) {
    if (obstacle.low) continue;
    if (sweepCircle(x1, y1, dx / length, dy / length, length, obstacle.x, obstacle.y, obstacle.radius + margin) >= 0) {
      return false;
    }
  }
  return true;
}

// --- Enemy shots -----------------------------------------------------------------

export function fireEnemyShot(
  world: World,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  damage: number,
  damageType: DamageType,
  range: number,
): EnemyShot | undefined {
  const shot = world.enemyShots.acquire();
  if (!shot) return undefined;
  shot.x = x;
  shot.y = y;
  shot.dx = dirX;
  shot.dy = dirY;
  shot.speed = ENEMY_RULES.shotSpeed;
  shot.radius = ENEMY_RULES.shotRadius;
  shot.damage = damage;
  shot.damageType = damageType;
  shot.distanceLeft = range;
  return shot;
}

export function updateEnemyShots(world: World, dt: number): void {
  const player = world.player;
  for (const shot of world.enemyShots.items) {
    if (!shot.active) continue;
    const travel = Math.min(shot.speed * dt, shot.distanceLeft);

    let blockedAt = -1;
    let blocker: (typeof world.arena.obstacles)[number] | undefined;
    for (const obstacle of world.arena.obstacles) {
      if (obstacle.low) continue;
      const contact = sweepCircle(shot.x, shot.y, shot.dx, shot.dy, travel, obstacle.x, obstacle.y, obstacle.radius + shot.radius);
      if (contact >= 0 && (blockedAt < 0 || contact < blockedAt)) {
        blockedAt = contact;
        blocker = obstacle;
      }
    }
    const hitAt =
      player.health > 0
        ? sweepCircle(shot.x, shot.y, shot.dx, shot.dy, travel, player.x, player.y, player.radius + shot.radius)
        : -1;

    if (hitAt >= 0 && (blockedAt < 0 || hitAt <= blockedAt)) {
      hitPlayer(world, shot.damage, shot.damageType);
      world.enemyShots.release(shot);
      continue;
    }
    if (blockedAt >= 0) {
      // Enemy shots break volatile vats too (GDD 5.9).
      if (blocker) world.environment.breakVat(world, blocker);
      world.emit({ type: 'projectileBlocked', x: shot.x + shot.dx * blockedAt, y: shot.y + shot.dy * blockedAt });
      world.enemyShots.release(shot);
      continue;
    }
    shot.x += shot.dx * travel;
    shot.y += shot.dy * travel;
    shot.distanceLeft -= travel;
    const arena = world.arena;
    if (shot.distanceLeft <= 1e-6 || shot.x < 0 || shot.y < 0 || shot.x > arena.width || shot.y > arena.height) {
      world.enemyShots.release(shot);
    }
  }
}

// --- Constructs ------------------------------------------------------------------

/** Damages a turret or companion. A construct at zero Health breaks. */
export function damageConstruct(world: World, construct: Construct, amount: number): void {
  if (!construct.active || amount <= 0) return;
  construct.health -= amount;
  if (construct.health <= 0) {
    world.emit({ type: 'constructDestroyed', x: construct.x, y: construct.y });
    world.constructs.release(construct);
  }
}

/** Area hits damage every construct inside (NOTES.md, GDD 9.13). */
export function damageConstructsIn(world: World, x: number, y: number, radius: number, amount: number): void {
  for (const construct of world.constructs.items) {
    if (!construct.active) continue;
    const reach = radius + construct.radius;
    const dx = construct.x - x;
    const dy = construct.y - y;
    if (dx * dx + dy * dy <= reach * reach) damageConstruct(world, construct, amount);
  }
}

// --- Enemy blasts ----------------------------------------------------------------

/** Damage to an enemy from another enemy: no weapon credit, no critical roll. Returns true on a kill. */
export function harmEnemy(world: World, enemy: Enemy, amount: number, damageType: DamageType): boolean {
  if (!enemy.active || amount <= 0) return false;
  const dealt = computeDamage({
    base: amount,
    typeMultiplier: typeMultiplier(enemy, damageType, world),
    armour: enemyArmour(enemy, damageType, world),
  });
  if (dealt <= 0) return false;
  enemy.health -= dealt;
  enemy.hitFlash = HIT_FLASH_SECONDS;
  noteDamage(world, enemy, dealt, damageType);
  world.emit({ type: 'enemyHit', x: enemy.x, y: enemy.y, amount: dealt, critical: false, damageType });
  if (enemy.health <= 0) {
    world.lastHitType = damageType;
    killEnemy(world, enemy, -1, 0);
    return true;
  }
  return false;
}

/** Resolves an enemy blast: the player, every construct and, for some blasts, other enemies. */
export function enemyBlast(world: World, blast: PendingBlast): void {
  const { x, y, radius } = blast;
  world.emit({ type: 'enemyBlast', x, y, radius, damageType: blast.damageType });
  world.environment.breakVatsIn(world, x, y, radius);
  if (blast.damageType === 'Fire') world.environment.burnFungus(x, y, radius);

  const player = world.player;
  const reach = radius + player.radius;
  const dx = player.x - x;
  const dy = player.y - y;
  if (dx * dx + dy * dy <= reach * reach) hitPlayer(world, blast.damage, blast.damageType);

  damageConstructsIn(world, x, y, radius, blast.damage);

  if (!blast.hurtsEnemies) return;
  const targets: Enemy[] = [];
  for (const slot of world.grid.query(x, y, radius + world.maxEnemyRadius, scratch)) {
    const enemy = world.enemies.items[slot];
    if (!enemy || !enemy.active) continue;
    const enemyReach = radius + enemy.radius;
    const ex = enemy.x - x;
    const ey = enemy.y - y;
    if (ex * ex + ey * ey <= enemyReach * enemyReach) targets.push(enemy);
  }
  targets.sort((a, b) => a.slot - b.slot);
  for (const enemy of targets) harmEnemy(world, enemy, blast.damage * ENEMY_RULES.allyBlastFactor, blast.damageType);
}

// --- Hazards ---------------------------------------------------------------------

export interface HazardOptions {
  readonly damage?: number;
  readonly damageType?: DamageType;
  readonly arming?: number;
  readonly sprout?: EnemyDef;
}

/** Adds an enemy area effect. At the limit the oldest effect of the same kind goes. */
export function addHazard(
  world: World,
  kind: HazardKind,
  x: number,
  y: number,
  radius: number,
  seconds: number,
  options: HazardOptions = {},
): Hazard | undefined {
  let hazard = world.hazards.acquire();
  if (!hazard) {
    let oldest: Hazard | undefined;
    let oldestAny: Hazard | undefined;
    for (const candidate of world.hazards.items) {
      if (!candidate.active || candidate.kind === 'seed' || candidate.kind === 'shockwave') continue;
      if (!oldestAny || candidate.born < oldestAny.born) oldestAny = candidate;
      if (candidate.kind === kind && (!oldest || candidate.born < oldest.born)) oldest = candidate;
    }
    const drop = oldest ?? oldestAny;
    if (!drop) return undefined;
    world.hazards.release(drop);
    hazard = world.hazards.acquire();
  }
  if (!hazard) return undefined;
  hazard.kind = kind;
  hazard.x = x;
  hazard.y = y;
  hazard.radius = radius;
  hazard.timeLeft = seconds;
  hazard.duration = seconds;
  hazard.tick = kind === 'seed' ? SEED_CHECK_SECONDS : 0;
  hazard.damage = options.damage ?? 0;
  hazard.damageType = options.damageType ?? 'Corrosive';
  hazard.arming = options.arming ?? 0;
  hazard.sprout = options.sprout;
  hazard.born = world.steps;
  if (kind === 'seed') world.seedCount++;
  return hazard;
}

/** Fire destroys Thornling seeds inside a radius (GDD 9.11). */
export function burnSeeds(world: World, x: number, y: number, radius: number): void {
  if (world.seedCount === 0) return;
  for (const hazard of world.hazards.items) {
    if (!hazard.active || hazard.kind !== 'seed') continue;
    const reach = radius + hazard.radius;
    const dx = hazard.x - x;
    const dy = hazard.y - y;
    if (dx * dx + dy * dy <= reach * reach) world.hazards.release(hazard);
  }
}

function playerInside(world: World, hazard: Hazard, radius = hazard.radius): boolean {
  const player = world.player;
  if (player.health <= 0) return false;
  const reach = radius + player.radius;
  const dx = player.x - hazard.x;
  const dy = player.y - hazard.y;
  return dx * dx + dy * dy <= reach * reach;
}

function updateShockwave(world: World, hazard: Hazard, dt: number): void {
  const before = hazard.radius;
  hazard.radius += ENEMY_RULES.shockwaveSpeed * dt;
  const width = ENEMY_RULES.shockwaveWidth;
  const player = world.player;
  const distance = Math.hypot(player.x - hazard.x, player.y - hazard.y);
  // The ring hits a body once, as its front passes. Pillars and the crucible give cover.
  if (distance > before - width && distance <= hazard.radius && player.health > 0) {
    if (lineOfSight(world.arena, hazard.x, hazard.y, player.x, player.y)) {
      hitPlayer(world, hazard.damage, hazard.damageType);
    }
  }
  for (const construct of world.constructs.items) {
    if (!construct.active) continue;
    const gap = Math.hypot(construct.x - hazard.x, construct.y - hazard.y);
    if (gap > before && gap <= hazard.radius && lineOfSight(world.arena, hazard.x, hazard.y, construct.x, construct.y)) {
      damageConstruct(world, construct, hazard.damage);
    }
  }
}

export function updateHazards(world: World, dt: number): void {
  let seeds = 0;
  for (const hazard of world.hazards.items) {
    if (!hazard.active) continue;
    hazard.timeLeft -= dt;

    switch (hazard.kind) {
      case 'acid':
      case 'toxic':
      case 'burning': {
        hazard.tick -= dt;
        if (hazard.tick <= 0) {
          hazard.tick = ENEMY_RULES.hazardTick;
          if (playerInside(world, hazard)) hitPlayer(world, hazard.damage, hazard.damageType);
          damageConstructsIn(world, hazard.x, hazard.y, hazard.radius, hazard.damage);
        }
        break;
      }
      case 'spores': {
        // Slowing spore clouds (GDD 9.11).
        if (playerInside(world, hazard)) {
          const player = world.player;
          player.slowFactor = Math.min(player.slowTimer > 0 ? player.slowFactor : 1, ENEMY_RULES.sporeSlow);
          player.slowTimer = Math.max(player.slowTimer, 0.2);
        }
        break;
      }
      case 'pod': {
        if (hazard.timeLeft <= 0) {
          // The pod bursts into a spore cloud.
          hazard.kind = 'spores';
          hazard.radius = ENEMY_RULES.sporeCloudRadius;
          hazard.timeLeft = ENEMY_RULES.sporeCloudSeconds;
          hazard.duration = ENEMY_RULES.sporeCloudSeconds;
          world.emit({ type: 'enemyBlast', x: hazard.x, y: hazard.y, radius: hazard.radius, damageType: 'Biological' });
        }
        continue;
      }
      case 'mine': {
        if (hazard.arming > 0) {
          hazard.arming -= dt;
        } else if (playerInside(world, hazard, ENEMY_RULES.mineTriggerRadius)) {
          world.hazards.release(hazard);
          enemyBlast(world, {
            x: hazard.x,
            y: hazard.y,
            radius: ENEMY_RULES.mineBlastRadius,
            damage: hazard.damage,
            damageType: hazard.damageType,
            hurtsEnemies: false,
          });
          continue;
        }
        break;
      }
      case 'seed': {
        seeds++;
        hazard.tick -= dt;
        if (hazard.tick <= 0) {
          hazard.tick = SEED_CHECK_SECONDS;
          // A seed inside a burning pool burns (GDD 9.11).
          let burned = false;
          for (const zone of world.zones.items) {
            if (!zone.active || zone.kind !== 'burning') continue;
            if (Math.hypot(zone.x - hazard.x, zone.y - hazard.y) <= zone.radius + hazard.radius) {
              burned = true;
              break;
            }
          }
          if (burned) {
            world.hazards.release(hazard);
            seeds--;
            continue;
          }
        }
        if (hazard.timeLeft <= 0) {
          const def = hazard.sprout;
          world.hazards.release(hazard);
          seeds--;
          if (def && world.enemies.activeCount < world.activeLimit) {
            const sprout = spawnEnemy(world, def, hazard.x, hazard.y);
            // A sprouted Thornling leaves no seed, so a round always ends.
            if (sprout) sprout.noLegacy = true;
          }
          continue;
        }
        break;
      }
      case 'shockwave':
        updateShockwave(world, hazard, dt);
        break;
    }

    if (hazard.timeLeft <= 0) world.hazards.release(hazard);
  }
  world.seedCount = seeds;
}
