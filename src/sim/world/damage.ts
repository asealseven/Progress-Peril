// Applies damage to enemies and to the player.

import type { DamageType } from '../../data/damageTypes';
import { COMBAT } from '../../data/tiers';
import { computeDamage, effectiveArmour, resolvePlayerHit } from '../modifiers';
import type { Enemy, WeaponState } from './types';
import type { World } from './world';

const HIT_FLASH_SECONDS = 0.1;

/** A weapon hit on an enemy, following the damage order in GDD 7.14. */
export function hitEnemy(world: World, enemy: Enemy, weapon: WeaponState): void {
  const critical = world.rng.chance(weapon.stats.criticalChance);
  const damageType = weapon.def.damageType;
  const amount = computeDamage({
    base: weapon.stats.damage,
    criticalMultiplier: critical ? weapon.stats.criticalDamage : 1,
    armour: effectiveArmour(enemy.armour, damageType),
  });

  const dealt = Math.min(amount, enemy.health);
  enemy.health -= amount;
  enemy.hitFlash = HIT_FLASH_SECONDS;
  world.stats.damageDealt += dealt;
  if (critical) world.stats.criticalHits++;
  world.emit({ type: 'enemyHit', x: enemy.x, y: enemy.y, amount, critical, damageType });

  if (enemy.health <= 0) killEnemy(world, enemy);
}

export function killEnemy(world: World, enemy: Enemy): void {
  if (!enemy.active) return;
  world.stats.kills++;
  world.emit({ type: 'enemyKilled', x: enemy.x, y: enemy.y, enemyId: enemy.def.id });
  world.enemies.release(enemy);
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
  return true;
}
