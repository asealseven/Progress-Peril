// Applies damage to enemies and to the player, with on-hit and on-kill effects.

import type { DamageType } from '../../data/damageTypes';
import { COMBAT, WEAPON_RULES } from '../../data/tiers';
import type { DamagePart } from '../loadout';
import { computeDamage, effectiveArmour, resolvePlayerHit } from '../modifiers';
import { clampToArena, pushOutOfObstacles } from './movement';
import { spawnFragments } from './projectiles';
import type { Enemy, WeaponState } from './types';
import type { World } from './world';
import { addZone } from './zones';

const HIT_FLASH_SECONDS = 0.1;
const scratch: number[] = [];
const blastTargets: Enemy[] = [];

export interface HitOptions {
  /** Share of weapon damage. Default 1. */
  readonly scale?: number;
  /** Primary hits roll criticals and run on-hit effects. Default true. */
  readonly primary?: boolean;
  /** Replaces the weapon's damage types, keeping the total. */
  readonly forcedType?: DamageType;
  /** Explicit damage, replacing the weapon's parts. */
  readonly parts?: readonly DamagePart[];
  /** Direction of the hit, for knockback. */
  readonly dirX?: number;
  readonly dirY?: number;
  /** Chain generation of the hit (GDD 7.20). 0 for direct hits. */
  readonly generation?: number;
  /** The hit is part of a blast, so hits never explode again. */
  readonly fromBlast?: boolean;
}

/** Moves an enemy by a push, respecting walls and obstacles. */
function push(world: World, enemy: Enemy, dx: number, dy: number): void {
  enemy.x += dx;
  enemy.y += dy;
  pushOutOfObstacles(enemy, world.arena);
  clampToArena(enemy, world.arena);
}

/**
 * A weapon hit on an enemy, following the damage order in GDD 7.14.
 * Returns true when the enemy dies.
 */
export function hitEnemy(world: World, enemy: Enemy, weaponIndex: number, options: HitOptions = {}): boolean {
  const weapon = world.weapons[weaponIndex];
  if (!weapon || !enemy.active) return false;
  const resolved = weapon.resolved;
  const scale = options.scale ?? 1;
  const primary = options.primary ?? true;
  const generation = options.generation ?? 0;

  const critical = primary && world.rng.chance(resolved.criticalChance);
  const criticalMultiplier = critical ? resolved.criticalDamage : 1;
  const parts: readonly DamagePart[] =
    options.parts ??
    (options.forcedType ? [{ type: options.forcedType, amount: resolved.damage }] : resolved.damageParts);

  let amount = 0;
  for (const part of parts) {
    amount += computeDamage({
      base: part.amount * scale,
      criticalMultiplier,
      armour: effectiveArmour(enemy.armour, part.type),
    });
  }
  const mainType = parts[0]?.type ?? 'Impact';

  const dealt = Math.min(amount, enemy.health);
  enemy.health -= amount;
  enemy.hitFlash = HIT_FLASH_SECONDS;
  world.stats.damageDealt += dealt;
  weapon.damageDealt += dealt;
  if (critical) world.stats.criticalHits++;
  world.emit({ type: 'enemyHit', x: enemy.x, y: enemy.y, amount, critical, damageType: mainType });

  if (enemy.health <= 0) {
    killEnemy(world, enemy, weaponIndex, generation);
    return true;
  }

  if (primary) runHitEffects(world, enemy, weapon, weaponIndex, options);
  return false;
}

function runHitEffects(
  world: World,
  enemy: Enemy,
  weapon: WeaponState,
  weaponIndex: number,
  options: HitOptions,
): void {
  const resolved = weapon.resolved;
  const triggers = resolved.triggers;

  if (resolved.knockback > 0 && options.dirX !== undefined && options.dirY !== undefined) {
    push(world, enemy, options.dirX * resolved.knockback, options.dirY * resolved.knockback);
  }

  if (triggers.slowOnHit) {
    enemy.slowTimer = WEAPON_RULES.slowSeconds;
    enemy.slowFactor = Math.min(enemy.slowFactor, WEAPON_RULES.slowFactor);
  }

  if (triggers.grappleOnHit && weapon.grappleReady) {
    weapon.grappleReady = false;
    const dx = world.player.x - enemy.x;
    const dy = world.player.y - enemy.y;
    const distance = Math.hypot(dx, dy);
    const room = Math.max(0, distance - enemy.radius - world.player.radius);
    const pull = Math.min(WEAPON_RULES.grappleDistance, room);
    if (distance > 1e-6 && pull > 0) push(world, enemy, (dx / distance) * pull, (dy / distance) * pull);
  }

  if (triggers.pullOnHit) pullSmallEnemies(world, enemy.x, enemy.y, enemy);

  if (triggers.arcOnHit) {
    const next = nearestOther(world, enemy.x, enemy.y, WEAPON_RULES.chainRange, [enemy.id]);
    if (next) {
      world.emit({ type: 'chain', points: [enemy.x, enemy.y, next.x, next.y], damageType: 'Electric' });
      hitEnemy(world, next, weaponIndex, {
        scale: WEAPON_RULES.arcOnHitDamageShare,
        primary: false,
        forcedType: 'Electric',
        generation: 1,
      });
    }
  }

  if (triggers.explodeOnHit && !options.fromBlast) {
    explode(world, enemy.x, enemy.y, WEAPON_RULES.explodeOnHitRadius, weaponIndex, {
      scale: WEAPON_RULES.explodeOnHitDamageShare,
      primary: false,
      explosive: true,
      skipId: enemy.id,
    });
  }
}

/** Magnetite Slugs: impacts pull small enemies toward the hit point (GDD 7.18). */
function pullSmallEnemies(world: World, x: number, y: number, except: Enemy): void {
  for (const slot of world.grid.query(x, y, WEAPON_RULES.pullRadius + world.maxEnemyRadius, scratch)) {
    const other = world.enemies.items[slot];
    if (!other || !other.active || other === except || other.radius > WEAPON_RULES.smallEnemyRadius) continue;
    const dx = x - other.x;
    const dy = y - other.y;
    const distance = Math.hypot(dx, dy);
    if (distance > WEAPON_RULES.pullRadius || distance < 1e-6) continue;
    const pull = Math.min(WEAPON_RULES.pullDistance, distance);
    push(world, other, (dx / distance) * pull, (dy / distance) * pull);
  }
}

/** Closest active enemy to a point inside a reach, skipping listed ids. Ties go to the lower slot. */
export function nearestOther(
  world: World,
  x: number,
  y: number,
  reach: number,
  skipIds: readonly number[],
  requiredProperty?: string,
): Enemy | undefined {
  let chosen: Enemy | undefined;
  let chosenDistance = Infinity;
  for (const slot of world.grid.query(x, y, reach + world.maxEnemyRadius, scratch)) {
    const other = world.enemies.items[slot];
    if (!other || !other.active || skipIds.includes(other.id)) continue;
    if (requiredProperty && !other.def.properties.includes(requiredProperty)) continue;
    const distance = Math.hypot(other.x - x, other.y - y) - other.radius;
    if (distance > reach) continue;
    if (distance < chosenDistance || (distance === chosenDistance && chosen && other.slot < chosen.slot)) {
      chosen = other;
      chosenDistance = distance;
    }
  }
  return chosen;
}

export interface ExplodeOptions {
  readonly scale?: number;
  /** Primary blasts come straight from the weapon's attack. */
  readonly primary?: boolean;
  /** Explosions from the Explosive delivery deal Impact and Fire (GDD 7.13). */
  readonly explosive?: boolean;
  readonly generation?: number;
  readonly skipId?: number;
  /** No explosion event, for attacks drawing their own shape. */
  readonly quiet?: boolean;
}

/** Hits every enemy inside a radius. Returns the number of enemies hit. */
export function explode(
  world: World,
  x: number,
  y: number,
  radius: number,
  weaponIndex: number,
  options: ExplodeOptions = {},
): number {
  const weapon = world.weapons[weaponIndex];
  if (!weapon) return 0;
  const resolved = weapon.resolved;
  const generation = options.generation ?? 0;
  const primary = options.primary ?? false;
  const scale = options.scale ?? 1;

  const parts: readonly DamagePart[] | undefined = options.explosive
    ? [
        { type: 'Impact', amount: resolved.damage / 2 },
        { type: 'Fire', amount: resolved.damage / 2 },
      ]
    : undefined;

  if (!options.quiet) {
    world.emit({
      type: 'explosion',
      x,
      y,
      radius,
      damageType: options.explosive ? 'Fire' : (resolved.damageParts[0]?.type ?? 'Impact'),
      generation,
    });
  }

  // Collect first: hits release enemies and change the grid's meaning.
  blastTargets.length = 0;
  for (const slot of world.grid.query(x, y, radius + world.maxEnemyRadius, scratch)) {
    const enemy = world.enemies.items[slot];
    if (!enemy || !enemy.active || enemy.id === options.skipId) continue;
    const reach = radius + enemy.radius;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    if (dx * dx + dy * dy > reach * reach) continue;
    // Each enemy takes damage from one chain generation at most within a short window (GDD 7.20).
    if (generation > 0) {
      if (enemy.chainGuard > 0) continue;
      enemy.chainGuard = WEAPON_RULES.chainGuardSeconds;
    }
    blastTargets.push(enemy);
  }
  const targets = blastTargets.slice().sort((a, b) => a.slot - b.slot);
  for (const enemy of targets) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const distance = Math.hypot(dx, dy) || 1;
    hitEnemy(world, enemy, weaponIndex, {
      scale,
      primary,
      parts,
      generation,
      fromBlast: true,
      dirX: dx / distance,
      dirY: dy / distance,
    });
  }

  if (primary && resolved.triggers.fragmentsOnExplosion) spawnFragments(world, x, y, weaponIndex);
  return targets.length;
}

/** Removes a defeated enemy and runs on-kill effects for the weapon credited with the kill. */
export function killEnemy(world: World, enemy: Enemy, weaponIndex = -1, generation = 0): void {
  if (!enemy.active) return;
  const x = enemy.x;
  const y = enemy.y;
  world.stats.kills++;
  world.emit({ type: 'enemyKilled', x, y, enemyId: enemy.def.id });
  world.enemies.release(enemy);

  const weapon = world.weapons[weaponIndex];
  if (!weapon) return;
  weapon.kills++;
  const resolved = weapon.resolved;
  const triggers = resolved.triggers;

  if (triggers.healOnKill) {
    const player = world.player;
    if (player.health > 0 && player.health < player.stats.maxHealth) {
      player.health = Math.min(player.stats.maxHealth, player.health + WEAPON_RULES.healOnKill);
      world.emit({ type: 'playerHealed', amount: WEAPON_RULES.healOnKill });
    }
  }

  if (triggers.attackSpeedStackOnKill) {
    weapon.killStacks++;
    weapon.killStackTimer = WEAPON_RULES.killStackSeconds;
  }

  // Kill explosions join the chain queue and resolve on a later step (GDD 7.20).
  if (generation < WEAPON_RULES.chainDepthLimit) {
    if (resolved.killExplosion) {
      world.queueExplosion({
        x,
        y,
        radius: Math.max(WEAPON_RULES.explodeOnKillRadius, resolved.area * WEAPON_RULES.killExplosionAreaShare),
        weaponIndex,
        damageScale: WEAPON_RULES.killExplosionDamageShare,
        generation: generation + 1,
        explosive: false,
      });
    }
    if (triggers.explodeOnKill) {
      world.queueExplosion({
        x,
        y,
        radius: WEAPON_RULES.explodeOnKillRadius,
        weaponIndex,
        damageScale: WEAPON_RULES.explodeOnKillDamageShare,
        generation: generation + 1,
        explosive: true,
      });
    }
  }
}

/**
 * An enemy hit on the player (GDD 3.7): Evasion check, Armour, adaptation,
 * health loss. A hit taken starts the invulnerability window and builds adaptation.
 * Returns true when the hit landed.
 */
export function hitPlayer(world: World, damage: number, damageType: DamageType): boolean {
  const player = world.player;
  if (player.invulnerable > 0 || player.health <= 0) return false;

  const result = resolvePlayerHit({
    damage,
    evasion: player.stats.evasion,
    evasionRoll: world.rng.next(),
    armour: player.stats.armour,
    adaptation: player.adaptation[damageType] ?? 0,
  });

  if (result.evaded) {
    world.stats.hitsEvaded++;
    world.emit({ type: 'playerEvaded' });
    return false;
  }

  const taken = world.invincible ? 0 : result.damage;
  player.health = Math.max(0, player.health - taken);
  player.invulnerable = COMBAT.playerInvulnerability;
  player.adaptation[damageType] = Math.min(
    player.stats.adaptationCap,
    (player.adaptation[damageType] ?? 0) + player.stats.adaptationPerHit,
  );
  world.stats.hitsTaken++;
  world.stats.damageTaken += taken;
  world.emit({ type: 'playerHit', amount: taken, damageType });

  // Smoke Canister: on taking damage, releases smoke (GDD 7.18).
  for (let index = 0; index < world.weapons.length; index++) {
    const weapon = world.weapons[index];
    if (!weapon || !weapon.resolved.triggers.smoke || weapon.smokeTimer > 0) continue;
    weapon.smokeTimer = WEAPON_RULES.smokeCooldown;
    addZone(world, 'smoke', player.x, player.y, WEAPON_RULES.smokeRadius, WEAPON_RULES.smokeSeconds, index);
  }
  return true;
}
