// Constructs: turrets, companions and trap laying (GDD 7.17).
// Constructs use their own targeting rule and ignore manual focus (GDD 7.15).

import { SYNERGY_RULES, WEAPON_RULES } from '../../data/tiers';
import { blastRadius, currentAttackSpeed, projectileRadius } from './attacks';
import { explode, hitEnemy } from './damage';
import { clampToArena, pushOutOfObstacles } from './movement';
import { fireStraight } from './projectiles';
import { enemiesInRange, inRange, selectTarget } from './targeting';
import type { Construct, ConstructKind, Enemy, WeaponState } from './types';
import type { World } from './world';
import { placeTrap } from './zones';

const TURRET_RADIUS = 12;
const HEEL_DISTANCE = 44;
const DEGREES = Math.PI / 180;
const pool: Enemy[] = [];

export function createConstruct(slot: number): Construct {
  return {
    active: false,
    slot,
    id: -1,
    kind: 'turret',
    weaponIndex: 0,
    x: 0,
    y: 0,
    radius: TURRET_RADIUS,
    health: 0,
    maxHealth: 0,
    cooldown: 0,
    targetSlot: -1,
    targetId: -1,
    faceX: 0,
    faceY: -1,
    born: 0,
  };
}

/** Adds a construct. At the limit the new construct replaces the oldest (GDD 7.21). */
function spawnConstruct(
  world: World,
  kind: ConstructKind,
  weaponIndex: number,
  x: number,
  y: number,
  health: number,
): Construct | undefined {
  let construct = world.constructs.acquire();
  if (!construct) {
    let oldest: Construct | undefined;
    for (const candidate of world.constructs.items) {
      if (candidate.active && candidate.kind === 'turret' && (!oldest || candidate.born < oldest.born)) {
        oldest = candidate;
      }
    }
    if (!oldest) return undefined;
    world.constructs.release(oldest);
    construct = world.constructs.acquire();
  }
  if (!construct) return undefined;
  construct.id = world.nextConstructId++;
  construct.kind = kind;
  construct.weaponIndex = weaponIndex;
  construct.x = x;
  construct.y = y;
  construct.radius = kind === 'turret' ? TURRET_RADIUS : WEAPON_RULES.companionRadius;
  construct.maxHealth = health;
  construct.health = health;
  construct.cooldown = 0.2;
  construct.targetSlot = -1;
  construct.targetId = -1;
  construct.born = world.steps;
  pushOutOfObstacles(construct, world.arena);
  clampToArena(construct, world.arena);
  return construct;
}

/** Turret weapons deploy turrets near the player up to a limit (GDD 7.17). */
function deployTurrets(world: World, weapon: WeaponState, weaponIndex: number, dt: number): void {
  weapon.deployTimer -= dt;
  if (weapon.deployTimer > 0) return;
  const player = world.player;
  let own = 0;
  let oldest: Construct | undefined;
  for (const construct of world.constructs.items) {
    if (!construct.active || construct.kind !== 'turret' || construct.weaponIndex !== weaponIndex) continue;
    own++;
    if (!oldest || construct.born < oldest.born) oldest = construct;
  }
  if (own >= WEAPON_RULES.turretLimit) {
    // At the limit, a turret left far behind moves up to the player.
    if (!oldest || Math.hypot(oldest.x - player.x, oldest.y - player.y) < WEAPON_RULES.turretReplaceDistance) return;
    world.constructs.release(oldest);
  }
  const health = WEAPON_RULES.turretHealth * weapon.resolved.constructHealthFactor;
  spawnConstruct(world, 'turret', weaponIndex, player.x - weapon.aimX * 30, player.y - weapon.aimY * 30, health);
  weapon.deployTimer = WEAPON_RULES.turretDeploySeconds;
}

/** Companion weapons keep one companion beside the player. */
function ensureCompanion(world: World, weapon: WeaponState, weaponIndex: number): void {
  for (const construct of world.constructs.items) {
    if (construct.active && construct.weaponIndex === weaponIndex && construct.kind !== 'turret') return;
  }
  const kind: ConstructKind = weapon.resolved.tags.includes('Organic') ? 'creature' : 'hound';
  const health = WEAPON_RULES.companionHealth * weapon.resolved.constructHealthFactor;
  spawnConstruct(world, kind, weaponIndex, world.player.x - HEEL_DISTANCE, world.player.y, health);
}

/**
 * Trap weapons place snap traps along the player path (GDD 7.17): one trap per
 * attack interval, with no trap of the weapon closer than the trap spacing.
 */
function layTraps(world: World, weapon: WeaponState, weaponIndex: number, interval: number): void {
  if (weapon.cooldown > 0) return;
  const player = world.player;
  for (const trap of world.traps.items) {
    if (!trap.active || trap.weaponIndex !== weaponIndex) continue;
    if (Math.hypot(player.x - trap.x, player.y - trap.y) < WEAPON_RULES.trapSpacing) return;
  }
  placeTrap(world, player.x, player.y, weaponIndex);
  weapon.attackCount++;
  weapon.cooldown = interval;
}

function updateTurret(world: World, construct: Construct, weapon: WeaponState, interval: number, dt: number): void {
  const resolved = weapon.resolved;
  construct.cooldown -= dt;
  if (construct.cooldown > 0) return;

  let target: Enemy | undefined = world.enemies.items[construct.targetSlot];
  if (!target || !target.active || target.id !== construct.targetId || !inRange(construct.x, construct.y, target, resolved.range)) {
    target = selectTarget(world, {
      x: construct.x,
      y: construct.y,
      range: resolved.range,
      rule: 'Nearest',
      // Kill Zone: constructs focus trapped enemies (GDD 7.19).
      prefer: world.synergies.has('kill-zone') ? (enemy) => enemy.trapped > 0 : undefined,
    });
    construct.targetSlot = target ? target.slot : -1;
    construct.targetId = target ? target.id : -1;
  }
  if (!target) return;

  const dx = target.x - construct.x;
  const dy = target.y - construct.y;
  const distance = Math.hypot(dx, dy) || 1;
  construct.faceX = dx / distance;
  construct.faceY = dy / distance;
  const angle = Math.atan2(dy, dx);
  const count = resolved.projectiles;
  const spread = resolved.spreadDegrees * DEGREES;
  for (let shot = 0; shot < count; shot++) {
    const offset = count > 1 ? spread * (shot / (count - 1) - 0.5) : 0;
    fireStraight(world, {
      x: construct.x,
      y: construct.y,
      dirX: Math.cos(angle + offset),
      dirY: Math.sin(angle + offset),
      weaponIndex: construct.weaponIndex,
      speed: resolved.projectileSpeed,
      range: resolved.range,
      radius: projectileRadius(resolved),
      pierce: resolved.penetration,
      bounces: resolved.bounces,
      homing: resolved.homing,
      fromConstruct: true,
    });
  }
  weapon.attackCount++;
  world.stats.shotsFired++;
  world.emit({ type: 'shot', weaponIndex: construct.weaponIndex, x: construct.x, y: construct.y });
  construct.cooldown = interval;
}

function updateCompanion(world: World, construct: Construct, weapon: WeaponState, interval: number, dt: number): void {
  const resolved = weapon.resolved;
  const player = world.player;
  construct.cooldown = Math.max(0, construct.cooldown - dt);
  const leash = resolved.range + WEAPON_RULES.companionLeashExtra;

  // The companion chases enemies near the player (GDD 7.17).
  let target: Enemy | undefined = world.enemies.items[construct.targetSlot];
  if (!target || !target.active || target.id !== construct.targetId || !inRange(player.x, player.y, target, leash)) {
    target = undefined;
    let nearest = Infinity;
    const near = enemiesInRange(world, player.x, player.y, leash, pool);
    // Kill Zone: constructs focus trapped enemies (GDD 7.19).
    const trappedOnly = world.synergies.has('kill-zone') && near.some((enemy) => enemy.trapped > 0);
    for (const enemy of near) {
      if (trappedOnly && enemy.trapped <= 0) continue;
      const distance = Math.hypot(enemy.x - construct.x, enemy.y - construct.y);
      if (distance < nearest) {
        nearest = distance;
        target = enemy;
      }
    }
    construct.targetSlot = target ? target.slot : -1;
    construct.targetId = target ? target.id : -1;
  }

  const goalX = target ? target.x : player.x - HEEL_DISTANCE;
  const goalY = target ? target.y : player.y;
  const stop = target ? construct.radius + target.radius + 2 : 6;
  const dx = goalX - construct.x;
  const dy = goalY - construct.y;
  const distance = Math.hypot(dx, dy);
  if (distance > 1e-6) {
    construct.faceX = dx / distance;
    construct.faceY = dy / distance;
  }
  if (distance > stop) {
    const step = Math.min(WEAPON_RULES.companionSpeed * dt, distance - stop);
    construct.x += construct.faceX * step;
    construct.y += construct.faceY * step;
    pushOutOfObstacles(construct, world.arena);
    clampToArena(construct, world.arena);
  }

  if (!target || construct.cooldown > 0) return;
  const gap = Math.hypot(target.x - construct.x, target.y - construct.y) - construct.radius - target.radius;
  if (gap > 6) return;
  weapon.attackCount++;
  construct.cooldown = interval;
  if (resolved.blast) {
    explode(world, construct.x, construct.y, blastRadius(resolved), construct.weaponIndex, {
      primary: true,
      fromConstruct: true,
    });
  } else {
    hitEnemy(world, target, construct.weaponIndex, {
      dirX: construct.faceX,
      dirY: construct.faceY,
      fromConstruct: true,
    });
  }
}

export function updateConstructs(world: World, dt: number): void {
  for (let index = 0; index < world.weapons.length; index++) {
    const weapon = world.weapons[index];
    if (!weapon || weapon.jamTimer > 0) continue;
    const delivery = weapon.resolved.delivery;
    if (delivery === 'turret') deployTurrets(world, weapon, index, dt);
    else if (delivery === 'companion') ensureCompanion(world, weapon, index);
    else if (delivery === 'trap') layTraps(world, weapon, index, 1 / currentAttackSpeed(world, weapon));
  }

  for (const construct of world.constructs.items) {
    if (!construct.active) continue;
    const weapon = world.weapons[construct.weaponIndex];
    if (!weapon) {
      world.constructs.release(construct);
      continue;
    }
    const resolved = weapon.resolved;
    // Repair Kit Housing repairs constructs. Bioengineering makes them regenerate (GDD 7.19).
    const repair =
      (resolved.constructRepair ? WEAPON_RULES.constructRepairPerSecond : 0) +
      (resolved.constructRegen ? SYNERGY_RULES.bioRegenPerSecond : 0);
    if (repair > 0 && construct.health < construct.maxHealth) {
      construct.health = Math.min(construct.maxHealth, construct.health + construct.maxHealth * repair * dt);
    }
    if (weapon.jamTimer > 0) continue;
    const interval = 1 / (currentAttackSpeed(world, weapon) * resolved.constructAttackSpeedFactor);
    if (construct.kind === 'turret') updateTurret(world, construct, weapon, interval, dt);
    else updateCompanion(world, construct, weapon, interval, dt);
  }
}
