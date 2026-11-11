// Enemy spawning and behaviour. Milestone 1 holds one behaviour: chase the
// player and strike in melee. Milestone 4 moves decisions to src/sim/ai.ts.

import type { EnemyDef } from '../../data/enemies';
import { COMBAT, THREAT_COST, tierValue } from '../../data/tiers';
import { hitPlayer } from './damage';
import { clampToArena, insideObstacle, pushOutOfObstacles } from './movement';
import type { Enemy } from './types';
import type { World } from './world';

const scratch: number[] = [];
const SPAWN_TRIES = 24;

export function createEnemy(slot: number, def: EnemyDef): Enemy {
  return {
    active: false,
    slot,
    id: -1,
    def,
    x: 0,
    y: 0,
    radius: def.radius,
    health: 0,
    maxHealth: 0,
    armour: 0,
    damage: 0,
    speed: 0,
    range: 0,
    action: 'chase',
    actionTimer: 0,
    hitFlash: 0,
    faceX: 0,
    faceY: 1,
    threat: 0,
    slowTimer: 0,
    slowFactor: 1,
    confused: 0,
    marked: false,
    chainGuard: 0,
  };
}

/** Puts one enemy into the arena. Returns undefined when the pool is full. */
export function spawnEnemy(world: World, def: EnemyDef, x: number, y: number): Enemy | undefined {
  const enemy = world.enemies.acquire();
  if (!enemy) return undefined;
  enemy.id = world.nextEnemyId++;
  enemy.def = def;
  enemy.radius = def.radius;
  enemy.maxHealth = tierValue('enemyHealth', def.health);
  enemy.health = enemy.maxHealth;
  enemy.armour = tierValue('armour', def.armour);
  enemy.damage = tierValue('enemyDamage', def.damage);
  enemy.speed = tierValue('enemySpeed', def.speed);
  enemy.range = tierValue('enemyRange', def.range);
  enemy.threat = THREAT_COST[def.threat];
  enemy.action = 'chase';
  enemy.actionTimer = 0;
  enemy.hitFlash = 0;
  enemy.slowTimer = 0;
  enemy.slowFactor = 1;
  enemy.confused = 0;
  enemy.marked = false;
  enemy.chainGuard = 0;
  enemy.x = x;
  enemy.y = y;
  clampToArena(enemy, world.arena);
  pushOutOfObstacles(enemy, world.arena);
  world.maxEnemyRadius = Math.max(world.maxEnemyRadius, enemy.radius);
  world.emit({ type: 'enemySpawned', x: enemy.x, y: enemy.y });
  return enemy;
}

/**
 * Picks a spawn point outside the camera view (GDD 4.11): a random arena
 * point far from the player. The distance limit relaxes when the arena has
 * no point far enough.
 */
export function pickSpawnPoint(world: World, margin: number): { x: number; y: number } {
  const { arena, player, rng } = world;
  let minimum = COMBAT.spawnMinDistance;
  for (let attempt = 0; attempt < SPAWN_TRIES; attempt++) {
    const x = rng.range(margin, arena.width - margin);
    const y = rng.range(margin, arena.height - margin);
    const dx = x - player.x;
    const dy = y - player.y;
    if (dx * dx + dy * dy >= minimum * minimum && !insideObstacle(x, y, margin, arena)) {
      return { x, y };
    }
    if (attempt % 6 === 5) minimum *= 0.8;
  }
  // Fallback: the corner farthest from the player.
  return {
    x: player.x < arena.width / 2 ? arena.width - margin : margin,
    y: player.y < arena.height / 2 ? arena.height - margin : margin,
  };
}

/** Spawns a group around one point. */
export function spawnGroup(world: World, def: EnemyDef, count: number): void {
  const anchor = pickSpawnPoint(world, def.radius + 8);
  for (let i = 0; i < count; i++) {
    const angle = world.rng.range(0, Math.PI * 2);
    const distance = count === 1 ? 0 : world.rng.range(0, COMBAT.spawnGroupSpread);
    spawnEnemy(world, def, anchor.x + Math.cos(angle) * distance, anchor.y + Math.sin(angle) * distance);
  }
}

export function updateEnemies(world: World, dt: number): void {
  const player = world.player;
  const enemies = world.enemies.items;

  for (const enemy of enemies) {
    if (!enemy.active) continue;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.chainGuard = Math.max(0, enemy.chainGuard - dt);
    enemy.confused = Math.max(0, enemy.confused - dt);
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
      if (enemy.slowTimer <= 0) enemy.slowFactor = 1;
    }
    // An enemy with no target stands still and starts no attack (Smoke Canister, GDD 7.18).
    const lost = enemy.confused > 0;

    let dx = player.x - enemy.x;
    let dy = player.y - enemy.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 1e-6) {
      enemy.faceX = dx / distance;
      enemy.faceY = dy / distance;
    }

    if (enemy.action === 'chase' && !lost) {
      const speed = enemy.speed * (enemy.slowTimer > 0 ? enemy.slowFactor : 1);
      const step = Math.min(speed * dt, Math.max(0, distance - enemy.radius - player.radius));
      enemy.x += enemy.faceX * step;
      enemy.y += enemy.faceY * step;
    }

    // Keep enemies from stacking on each other. Uses the grid of the last step.
    for (const slot of world.grid.query(enemy.x, enemy.y, enemy.radius + world.maxEnemyRadius, scratch)) {
      if (slot === enemy.slot) continue;
      const other = enemies[slot];
      if (!other || !other.active) continue;
      const ox = enemy.x - other.x;
      const oy = enemy.y - other.y;
      const minimum = enemy.radius + other.radius;
      const gapSq = ox * ox + oy * oy;
      if (gapSq >= minimum * minimum) continue;
      const gap = Math.sqrt(gapSq);
      if (gap < 1e-6) {
        // Same point: split along a fixed axis by slot order.
        enemy.x += enemy.slot < other.slot ? -0.5 : 0.5;
        continue;
      }
      const push = ((minimum - gap) * 0.5) / gap;
      enemy.x += ox * push;
      enemy.y += oy * push;
    }

    // Enemies never overlap the player.
    dx = enemy.x - player.x;
    dy = enemy.y - player.y;
    distance = Math.sqrt(dx * dx + dy * dy);
    const minimum = enemy.radius + player.radius;
    if (distance < minimum && distance > 1e-6) {
      enemy.x = player.x + (dx / distance) * minimum;
      enemy.y = player.y + (dy / distance) * minimum;
      distance = minimum;
    }

    pushOutOfObstacles(enemy, world.arena);
    clampToArena(enemy, world.arena);

    dx = enemy.x - player.x;
    dy = enemy.y - player.y;
    const edgeGap = Math.sqrt(dx * dx + dy * dy) - enemy.radius - player.radius;

    if (enemy.action === 'chase') {
      if (!lost && edgeGap <= enemy.range && player.health > 0) {
        enemy.action = 'windup';
        enemy.actionTimer = COMBAT.enemyMeleeWindup;
      }
    } else if (enemy.action === 'windup') {
      enemy.actionTimer -= dt;
      if (enemy.actionTimer <= 0) {
        // The strike lands when the player is still in range (GDD 15.3).
        if (edgeGap <= enemy.range) hitPlayer(world, enemy.damage, enemy.def.damageType);
        enemy.action = 'recover';
        enemy.actionTimer = COMBAT.enemyMeleeRecover;
      }
    } else {
      enemy.actionTimer -= dt;
      if (enemy.actionTimer <= 0) enemy.action = 'chase';
    }
  }
}
