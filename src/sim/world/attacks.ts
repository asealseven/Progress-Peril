// Weapon attacks: one function per delivery (GDD 7.16, 7.17), plus the
// component extras tied to attacking.

import { COMBAT, WEAPON_RULES, tierValue } from '../../data/tiers';
import type { ResolvedWeapon } from '../loadout';
import { explode, hitEnemy, nearestOther } from './damage';
import { fireArcing, fireStraight } from './projectiles';
import { acquireTarget, enemiesInRange } from './targeting';
import type { Enemy, WeaponState } from './types';
import type { World } from './world';

const scratch: number[] = [];
const shapeTargets: Enemy[] = [];
const DEGREES = Math.PI / 180;

/** Attacks per second right now, with the runtime Attack Speed bonuses (same source type: they add). */
export function currentAttackSpeed(world: World, weapon: WeaponState): number {
  const resolved = weapon.resolved;
  let bonus = resolved.attackSpeedBonus;
  const player = world.player;
  if (resolved.lowHealthAttackSpeed !== 0 && player.health < player.stats.maxHealth / 2) {
    bonus += resolved.lowHealthAttackSpeed;
  }
  if (resolved.triggers.ramp) {
    const step = tierValue('modifierSize', WEAPON_RULES.rampStepSize);
    bonus += Math.min(tierValue('modifierSize', WEAPON_RULES.rampCap), step * weapon.rampStacks);
  }
  if (weapon.killStacks > 0) {
    const step = tierValue('modifierSize', WEAPON_RULES.killStackSize);
    bonus += Math.min(tierValue('modifierSize', WEAPON_RULES.killStackCap), step * weapon.killStacks);
  }
  const staticFactor = Math.max(0.2, 1 + resolved.attackSpeedBonus);
  const otherSources = resolved.attacksPerSecond / (resolved.baseAttacksPerSecond * staticFactor);
  return resolved.baseAttacksPerSecond * Math.max(0.2, 1 + bonus) * otherSources;
}

/** Share of the weapon's tier damage its modifiers add up to. Scales fixed-damage extras. */
function damageFactor(resolved: ResolvedWeapon): number {
  return resolved.damage / tierValue('weaponDamage', resolved.def.damage);
}

// --- Shapes ------------------------------------------------------------------

export function sweepArc(resolved: ResolvedWeapon): number {
  const degrees = (WEAPON_RULES.sweepArcBase + resolved.area * WEAPON_RULES.sweepArcPerArea) * resolved.arcWidth;
  return Math.min(360, degrees) * DEGREES;
}

export function coneArc(resolved: ResolvedWeapon): number {
  const degrees = WEAPON_RULES.coneArcBase + resolved.area * WEAPON_RULES.coneArcPerArea;
  return Math.min(360, degrees) * DEGREES;
}

export function thrustHalfWidth(resolved: ResolvedWeapon): number {
  return (WEAPON_RULES.thrustHalfWidthBase + resolved.area * WEAPON_RULES.thrustHalfWidthPerArea) * resolved.arcWidth;
}

export function auraRadius(resolved: ResolvedWeapon): number {
  return resolved.range * WEAPON_RULES.auraRangeShare + resolved.area;
}

export function orbitRadius(resolved: ResolvedWeapon): number {
  return Math.min(WEAPON_RULES.orbitRadiusMax, resolved.range * WEAPON_RULES.orbitRangeShare);
}

export function orbitHeadRadius(resolved: ResolvedWeapon): number {
  return WEAPON_RULES.orbitHeadBase + resolved.area * WEAPON_RULES.orbitHeadPerArea;
}

export function projectileRadius(resolved: ResolvedWeapon): number {
  if (resolved.blast) return COMBAT.projectileRadius + 2;
  return COMBAT.projectileRadius + resolved.area * WEAPON_RULES.projectileRadiusPerArea;
}

function blastRadius(resolved: ResolvedWeapon): number {
  return resolved.blast ? Math.max(resolved.area, WEAPON_RULES.singleTargetReach) : 0;
}

/** Hits every enemy inside an arc in front of the player. */
function hitArc(world: World, weaponIndex: number, angle: number, arc: number, range: number): void {
  const player = world.player;
  shapeTargets.length = 0;
  for (const enemy of enemiesInRange(world, player.x, player.y, range, [])) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);
    let difference = Math.abs(Math.atan2(dy, dx) - angle);
    if (difference > Math.PI) difference = Math.PI * 2 - difference;
    // The enemy's own width counts toward the arc.
    const allowance = distance > enemy.radius ? Math.asin(enemy.radius / distance) : Math.PI;
    if (difference <= arc / 2 + allowance) shapeTargets.push(enemy);
  }
  for (const enemy of shapeTargets.slice()) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy) || 1;
    hitEnemy(world, enemy, weaponIndex, { dirX: dx / distance, dirY: dy / distance });
  }
}

/** Hits every enemy along a line from the player. */
function hitLine(world: World, weaponIndex: number, dirX: number, dirY: number, length: number, halfWidth: number): void {
  const player = world.player;
  const midX = player.x + dirX * length * 0.5;
  const midY = player.y + dirY * length * 0.5;
  shapeTargets.length = 0;
  for (const slot of world.grid.query(midX, midY, length * 0.5 + halfWidth + world.maxEnemyRadius, scratch)) {
    const enemy = world.enemies.items[slot];
    if (!enemy || !enemy.active) continue;
    const ex = enemy.x - player.x;
    const ey = enemy.y - player.y;
    const along = Math.max(0, Math.min(length, ex * dirX + ey * dirY));
    const offX = ex - dirX * along;
    const offY = ey - dirY * along;
    const reach = halfWidth + enemy.radius;
    if (offX * offX + offY * offY <= reach * reach) shapeTargets.push(enemy);
  }
  shapeTargets.sort((a, b) => a.slot - b.slot);
  for (const enemy of shapeTargets.slice()) hitEnemy(world, enemy, weaponIndex, { dirX, dirY });
}

/** Lightning from a start point through a first enemy, then on to nearby enemies (GDD 7.16 Chain). */
function chainLightning(
  world: World,
  weaponIndex: number,
  startX: number,
  startY: number,
  first: Enemy,
  jumps: number,
  firstOptions: Parameters<typeof hitEnemy>[3],
  jumpScale: number,
): void {
  const points = [startX, startY, first.x, first.y];
  const hitIds = [first.id];
  let lastX = first.x;
  let lastY = first.y;
  hitEnemy(world, first, weaponIndex, firstOptions);
  for (let jump = 1; jump <= jumps; jump++) {
    const next = nearestOther(world, lastX, lastY, WEAPON_RULES.chainRange, hitIds);
    if (!next) break;
    hitIds.push(next.id);
    lastX = next.x;
    lastY = next.y;
    points.push(lastX, lastY);
    // Damage falls by a set share with each generation (GDD 7.20).
    hitEnemy(world, next, weaponIndex, {
      ...firstOptions,
      scale: jumpScale * WEAPON_RULES.chainFalloff ** jump,
      primary: false,
      generation: jump,
    });
  }
  world.emit({ type: 'chain', points, damageType: 'Electric' });
}

// --- Attacks -----------------------------------------------------------------

/** One attack against a target. Returns false when the weapon jams. */
function attack(world: World, weapon: WeaponState, weaponIndex: number, target: Enemy): boolean {
  const resolved = weapon.resolved;
  const player = world.player;

  // Prototype Overclock: the weapon jams briefly at random (GDD 7.18).
  if (resolved.triggers.jam && world.rng.chance(WEAPON_RULES.jamChance)) {
    weapon.jamTimer = WEAPON_RULES.jamSeconds;
    world.emit({ type: 'jam', weaponIndex });
    return false;
  }

  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = Math.hypot(dx, dy);
  const dirX = distance > 1e-6 ? dx / distance : weapon.aimX;
  const dirY = distance > 1e-6 ? dy / distance : weapon.aimY;
  const angle = Math.atan2(dirY, dirX);
  weapon.aimX = dirX;
  weapon.aimY = dirY;
  weapon.attackCount++;
  weapon.sinceAttack = 0;
  weapon.grappleReady = true;
  if (resolved.triggers.ramp) weapon.rampStacks++;
  world.stats.shotsFired++;
  world.emit({ type: 'shot', weaponIndex, x: player.x, y: player.y });

  const mainType = resolved.damageParts[0]?.type ?? 'Impact';
  const every = resolved.triggers.extraProjectileEvery;
  const count = resolved.projectiles + (every > 0 && weapon.attackCount % every === 0 ? resolved.triggers.extraProjectiles : 0);

  switch (resolved.delivery) {
    case 'straight': {
      const extra = count - resolved.projectiles;
      const spread = (resolved.spreadDegrees + extra * WEAPON_RULES.extraProjectileSpread) * DEGREES;
      for (let shot = 0; shot < count; shot++) {
        const offset = count > 1 ? spread * (shot / (count - 1) - 0.5) : 0;
        fireStraight(world, {
          x: player.x,
          y: player.y,
          dirX: Math.cos(angle + offset),
          dirY: Math.sin(angle + offset),
          weaponIndex,
          speed: resolved.projectileSpeed,
          range: resolved.range,
          radius: projectileRadius(resolved),
          pierce: resolved.penetration,
          bounces: resolved.bounces,
          homing: resolved.homing,
          blastRadius: blastRadius(resolved),
        });
      }
      break;
    }
    case 'arcing': {
      for (let shot = 0; shot < count; shot++) {
        // The first projectile lands on the target. Extra ones scatter around the point.
        const scatterAngle = angle + (shot / Math.max(1, count - 1)) * Math.PI * 2;
        const scatter = shot === 0 ? 0 : WEAPON_RULES.arcingScatter;
        fireArcing(world, {
          x: player.x,
          y: player.y,
          targetX: target.x + Math.cos(scatterAngle) * scatter,
          targetY: target.y + Math.sin(scatterAngle) * scatter,
          weaponIndex,
          speed: WEAPON_RULES.arcingSpeed * (resolved.projectileSpeed / COMBAT.projectileSpeed),
          blastRadius: blastRadius(resolved),
          track: shot === 0 ? target : undefined,
        });
      }
      break;
    }
    case 'sweep': {
      const arc = sweepArc(resolved);
      world.emit({ type: 'sweep', x: player.x, y: player.y, angle, arc, radius: resolved.range, damageType: mainType });
      hitArc(world, weaponIndex, angle, arc, resolved.range);
      break;
    }
    case 'cone': {
      const arc = coneArc(resolved);
      world.emit({ type: 'cone', x: player.x, y: player.y, angle, arc, radius: resolved.range, damageType: mainType });
      hitArc(world, weaponIndex, angle, arc, resolved.range);
      break;
    }
    case 'slam': {
      const reach = Math.min(resolved.range, distance);
      const x = player.x + dirX * reach;
      const y = player.y + dirY * reach;
      const radius = Math.max(resolved.area, WEAPON_RULES.singleTargetReach) * resolved.arcWidth;
      world.emit({ type: 'slam', x, y, radius, damageType: mainType });
      explode(world, x, y, radius, weaponIndex, { primary: true, quiet: true });
      break;
    }
    case 'thrust': {
      const halfWidth = thrustHalfWidth(resolved);
      world.emit({
        type: 'thrust',
        x1: player.x,
        y1: player.y,
        x2: player.x + dirX * resolved.range,
        y2: player.y + dirY * resolved.range,
        halfWidth,
        damageType: mainType,
      });
      hitLine(world, weaponIndex, dirX, dirY, resolved.range, halfWidth);
      break;
    }
    case 'chain':
      chainLightning(world, weaponIndex, player.x, player.y, target, resolved.chainJumps, { dirX, dirY }, 1);
      break;
    default:
      break;
  }
  return true;
}

/** Orbit: heads circle the player and hit enemies they touch (GDD 7.16). */
function updateOrbit(world: World, weapon: WeaponState, weaponIndex: number, attacksPerSecond: number, dt: number): void {
  const resolved = weapon.resolved;
  const player = world.player;
  const turns = Math.min(
    WEAPON_RULES.orbitTurnsMax,
    Math.max(WEAPON_RULES.orbitTurnsMin, attacksPerSecond * WEAPON_RULES.orbitTurnsPerAttack),
  );
  weapon.orbitAngle = (weapon.orbitAngle + Math.PI * 2 * turns * dt) % (Math.PI * 2);
  const radius = orbitRadius(resolved);
  const head = orbitHeadRadius(resolved);
  const waitSteps = Math.max(1, Math.round(COMBAT.stepsPerSecond / attacksPerSecond));

  for (let index = 0; index < resolved.projectiles; index++) {
    const angle = weapon.orbitAngle + (index / resolved.projectiles) * Math.PI * 2;
    const x = player.x + Math.cos(angle) * radius;
    const y = player.y + Math.sin(angle) * radius;
    shapeTargets.length = 0;
    for (const slot of world.grid.query(x, y, head + world.maxEnemyRadius, scratch)) {
      const enemy = world.enemies.items[slot];
      if (!enemy || !enemy.active) continue;
      const reach = head + enemy.radius;
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      if (dx * dx + dy * dy <= reach * reach) shapeTargets.push(enemy);
    }
    for (const enemy of shapeTargets.slice()) {
      // Each enemy takes one hit per attack interval.
      if ((weapon.contactReady.get(enemy.id) ?? 0) > world.steps) continue;
      weapon.contactReady.set(enemy.id, world.steps + waitSteps);
      hitEnemy(world, enemy, weaponIndex, { dirX: -Math.sin(angle), dirY: Math.cos(angle) });
    }
  }

  if (weapon.contactReady.size > 256) {
    for (const [id, ready] of weapon.contactReady) {
      if (ready <= world.steps) weapon.contactReady.delete(id);
    }
  }
}

/** Aura: a persistent zone around the player hits everything inside once per attack interval. */
function pulseAura(world: World, weapon: WeaponState, weaponIndex: number): void {
  const player = world.player;
  const targets = enemiesInRange(world, player.x, player.y, auraRadius(weapon.resolved), []);
  if (targets.length === 0) return;
  weapon.attackCount++;
  weapon.sinceAttack = 0;
  for (const enemy of targets) hitEnemy(world, enemy, weaponIndex);
}

/** Beam: a continuous line with damage per tick, rising while the beam holds one target. */
function tickBeam(world: World, weapon: WeaponState, weaponIndex: number): void {
  const player = world.player;
  const target = acquireTarget(world, weapon, player.x, player.y, true);
  if (!target) {
    weapon.beamActive = false;
    weapon.beamTicks = 0;
    weapon.beamTargetId = -1;
    return;
  }
  if (target.id === weapon.beamTargetId) weapon.beamTicks++;
  else {
    weapon.beamTicks = 0;
    weapon.beamTargetId = target.id;
  }
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const distance = Math.hypot(dx, dy) || 1;
  weapon.aimX = dx / distance;
  weapon.aimY = dy / distance;
  weapon.beamActive = true;
  weapon.beamX = target.x;
  weapon.beamY = target.y;
  weapon.attackCount++;
  weapon.sinceAttack = 0;
  const ramp = Math.min(WEAPON_RULES.beamRampCap, WEAPON_RULES.beamRampPerTick * weapon.beamTicks);
  hitEnemy(world, target, weaponIndex, { scale: 1 + ramp, dirX: weapon.aimX, dirY: weapon.aimY });
}

/** Keeps the drawn beam on its target between ticks. */
function trackBeam(world: World, weapon: WeaponState): void {
  if (!weapon.beamActive) return;
  const target = world.enemies.items[weapon.targetSlot];
  if (!target || !target.active || target.id !== weapon.beamTargetId) {
    weapon.beamActive = false;
    return;
  }
  weapon.beamX = target.x;
  weapon.beamY = target.y;
}

/** Component extras tied to the weapon, not to its attacks. */
function runExtras(world: World, weapon: WeaponState, weaponIndex: number): void {
  const resolved = weapon.resolved;
  const player = world.player;

  // Tesla Capacitor: discharges a lightning chain every few seconds (GDD 7.18).
  if (resolved.triggers.lightning && weapon.lightningTimer <= 0) {
    const first = nearestOther(world, player.x, player.y, WEAPON_RULES.lightningRange, []);
    if (first) {
      weapon.lightningTimer = WEAPON_RULES.lightningSeconds;
      const amount = tierValue('weaponDamage', WEAPON_RULES.lightningDamage) * damageFactor(resolved);
      chainLightning(
        world,
        weaponIndex,
        player.x,
        player.y,
        first,
        WEAPON_RULES.lightningJumps,
        { primary: false, parts: [{ type: 'Electric', amount }] },
        1,
      );
    }
  }

  // Bayonet Mount: a short stab against adjacent enemies (GDD 7.18).
  if (resolved.triggers.bayonet && weapon.bayonetTimer <= 0) {
    const adjacent = nearestOther(world, player.x, player.y, player.radius + WEAPON_RULES.bayonetReach, []);
    if (adjacent) {
      weapon.bayonetTimer = WEAPON_RULES.bayonetSeconds;
      const dx = adjacent.x - player.x;
      const dy = adjacent.y - player.y;
      const distance = Math.hypot(dx, dy) || 1;
      const amount = tierValue('weaponDamage', WEAPON_RULES.bayonetDamage) * damageFactor(resolved);
      world.emit({
        type: 'thrust',
        x1: player.x,
        y1: player.y,
        x2: adjacent.x,
        y2: adjacent.y,
        halfWidth: 4,
        damageType: 'Piercing',
      });
      hitEnemy(world, adjacent, weaponIndex, {
        primary: false,
        parts: [{ type: 'Piercing', amount }],
        dirX: dx / distance,
        dirY: dy / distance,
      });
    }
  }
}

/** Counts down weapon timers and runs every weapon held by the player. */
export function updateWeapons(world: World, dt: number): void {
  const player = world.player;
  for (let index = 0; index < world.weapons.length; index++) {
    const weapon = world.weapons[index];
    if (!weapon) continue;
    const resolved = weapon.resolved;

    weapon.sinceAttack += dt;
    if (weapon.sinceAttack > WEAPON_RULES.rampResetSeconds) weapon.rampStacks = 0;
    if (weapon.killStackTimer > 0) {
      weapon.killStackTimer -= dt;
      if (weapon.killStackTimer <= 0) weapon.killStacks = 0;
    }
    weapon.lightningTimer = Math.max(0, weapon.lightningTimer - dt);
    weapon.bayonetTimer = Math.max(0, weapon.bayonetTimer - dt);
    weapon.smokeTimer = Math.max(0, weapon.smokeTimer - dt);
    weapon.cooldown = Math.max(0, weapon.cooldown - dt);

    if (weapon.jamTimer > 0) {
      weapon.jamTimer -= dt;
      weapon.beamActive = false;
      continue;
    }

    const attacksPerSecond = currentAttackSpeed(world, weapon);
    const interval = 1 / attacksPerSecond;

    switch (resolved.delivery) {
      case 'orbit':
        updateOrbit(world, weapon, index, attacksPerSecond, dt);
        break;
      case 'aura':
        if (weapon.cooldown <= 0) {
          pulseAura(world, weapon, index);
          weapon.cooldown = interval;
        }
        break;
      case 'beam':
        if (weapon.cooldown <= 0) {
          tickBeam(world, weapon, index);
          if (weapon.beamActive) weapon.cooldown = interval;
        } else {
          trackBeam(world, weapon);
        }
        break;
      case 'turret':
      case 'companion':
      case 'trap':
        // Constructs act in constructs.ts and ignore manual focus (GDD 3.4).
        break;
      default:
        if (weapon.cooldown <= 0) {
          const target = acquireTarget(world, weapon, player.x, player.y, true);
          if (target) {
            attack(world, weapon, index, target);
            weapon.cooldown = interval;
          }
        }
        break;
    }

    runExtras(world, weapon, index);
  }
}
