// Applies damage to enemies and to the player, with on-hit and on-kill
// effects, status build-up and status reactions.

import { DAMAGE_TYPES } from '../../data/damageTypes';
import type { DamageType } from '../../data/damageTypes';
import { STATUS_INDEX } from '../../data/statusEffects';
import { RESEARCH_RULES } from '../../data/research';
import {
  COMBAT,
  DAMAGE_STEP,
  ENEMY_RULES,
  REACTION_RULES,
  SYNERGY_RULES,
  WEAPON_RULES,
  tierValue,
} from '../../data/tiers';
import type { DamagePart } from '../loadout';
import { hasSynergy } from '../loadout';
import { computeDamage, resolvePlayerHit } from '../modifiers';
import type { PercentBonus } from '../modifiers';
import { enemyDied, noteDamage, splitEnemy } from './enemies';
import { burnSeeds } from './hazards';
import { dropLoot } from './loot';
import { clampToArena, pushOutOfObstacles } from './movement';
import { spawnFragments, spawnParasite } from './projectiles';
import {
  applyStatusBuilds,
  enemyArmour,
  hasStatus,
  hitTypes,
  reactToHit,
  reactionScale,
  spreadInfection,
  buildStatus,
  statusHit,
  triggerStatus,
  typeMultiplier,
  vulnerability,
} from './status';
import { hasModifier, hasTrait, isJuggernaut } from './traits';
import type { Enemy, WeaponState } from './types';
import type { World } from './world';
import { addZone } from './zones';

const HIT_FLASH_SECONDS = 0.1;
const scratch: number[] = [];
const blastTargets: Enemy[] = [];

export interface HitOptions {
  /** Share of weapon damage. Default 1. */
  readonly scale?: number;
  /** Primary hits roll criticals, build statuses and run on-hit effects. Default true. */
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
  /** The hit comes from a turret, companion or trap. Constructs roll criticals only with Clockwork Precision. */
  readonly fromConstruct?: boolean;
}

/** Moves an enemy by a push, respecting walls and obstacles. Returns the distance moved. */
function push(world: World, enemy: Enemy, dx: number, dy: number): number {
  // Juggernaut champions ignore knockback (GDD 9.13).
  if (isJuggernaut(enemy)) return 0;
  const startX = enemy.x;
  const startY = enemy.y;
  enemy.x += dx;
  enemy.y += dy;
  pushOutOfObstacles(enemy, world.arena);
  clampToArena(enemy, world.arena);
  return Math.hypot(enemy.x - startX, enemy.y - startY);
}

/** True when another enemy overlaps this one. */
function touchesEnemy(world: World, enemy: Enemy): boolean {
  for (const slot of world.grid.query(enemy.x, enemy.y, enemy.radius + world.maxEnemyRadius, scratch)) {
    const other = world.enemies.items[slot];
    if (!other || !other.active || other === enemy) continue;
    const reach = enemy.radius + other.radius;
    const dx = other.x - enemy.x;
    const dy = other.y - enemy.y;
    if (dx * dx + dy * dy < reach * reach) return true;
  }
  return false;
}

/**
 * Extra weakness and resistance decided per hit (GDD 9.11): the Ironback
 * Beetle's shell by hit direction and the Iron Sentinel's weakness to Magnetic effects.
 */
function hitMultiplier(
  world: World,
  enemy: Enemy,
  type: DamageType,
  magnetic: boolean,
  dirX: number | undefined,
  dirY: number | undefined,
): number {
  let multiplier = 1;
  if (magnetic && hasTrait(enemy, 'magnetic-weak') && !enemy.def.weakTo.includes(type)) multiplier *= DAMAGE_STEP.weak;
  if (hasTrait(enemy, 'shell')) {
    // The hit direction defaults to the line from the player to the enemy.
    let hx = dirX;
    let hy = dirY;
    if (hx === undefined || hy === undefined) {
      const dx = enemy.x - world.player.x;
      const dy = enemy.y - world.player.y;
      const length = Math.hypot(dx, dy) || 1;
      hx = dx / length;
      hy = dy / length;
    }
    // A hit travelling against the facing strikes the front. One travelling with the facing strikes the rear.
    const along = hx * enemy.faceX + hy * enemy.faceY;
    if (along <= -ENEMY_RULES.frontCos && type === 'Piercing') multiplier *= DAMAGE_STEP.resist;
    else if (along >= ENEMY_RULES.frontCos) multiplier *= DAMAGE_STEP.weak;
  }
  return multiplier;
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
  const parts: readonly DamagePart[] =
    options.parts ??
    (options.forcedType ? [{ type: options.forcedType, amount: resolved.damage }] : resolved.damageParts);
  const mainType = parts[0]?.type ?? 'Impact';
  const types = hitTypes(world, weaponIndex, parts.map((part) => part.type), primary);

  // Step 4. Critical roll. Marked raises Critical Chance against the target.
  let critical = false;
  if (primary) {
    const construct = options.fromConstruct === true;
    if (!construct || resolved.constructsCrit) {
      let chance = construct ? world.player.stats.criticalChance : resolved.criticalChance;
      if (hasStatus(enemy, 'Marked')) chance += tierValue('criticalChance', 'Medium');
      // Steady Hand: the first hit on each enemy is a critical hit.
      const first = hasSynergy(resolved, 'steady-hand') && !weapon.firstHits.has(enemy.id);
      critical = first || world.luck(chance);
    }
    weapon.firstHits.add(enemy.id);
  }

  // Step 7. Status reactions set off by this hit.
  const frozenBefore = hasStatus(enemy, 'Frozen');
  const poisonedBefore = hasStatus(enemy, 'Poisoned');
  const reactions = reactToHit(world, enemy, types, critical);
  // Anatomy and Field Surgery raise Critical Damage against matching targets.
  let criticalExtra = reactions.criticalBonus;
  if (critical) {
    if (world.rule('criticalVsOrganic') > 0 && enemy.def.properties.includes('Organic')) {
      criticalExtra += tierValue('modifierSize', 'Low');
    }
    if (world.rule('criticalVsBleeding') > 0 && hasStatus(enemy, 'Bleeding')) {
      criticalExtra += tierValue('modifierSize', 'Medium');
    }
  }
  const criticalMultiplier = critical ? resolved.criticalDamage + criticalExtra : 1;
  const wasElite = enemy.rank === 'elite';

  // Step 3 extras decided per hit. Component bonuses join the component sum. Synergies multiply.
  let componentFactor = 1;
  if (resolved.bonusAgainst.some((status) => hasStatus(enemy, status))) {
    const base = Math.max(0.2, 1 + resolved.componentDamageBonus);
    componentFactor = Math.max(0.2, 1 + resolved.componentDamageBonus + resolved.bonusAgainstAmount) / base;
  }
  const synergyBonuses: PercentBonus[] = [];
  const weak = vulnerability(world, enemy, frozenBefore);
  if (weak > 1) synergyBonuses.push({ source: 'research', amount: weak - 1 });
  const delivery = resolved.delivery;
  if (world.synergies.has('kill-zone') && (delivery === 'turret' || delivery === 'companion') && enemy.trapped > 0) {
    synergyBonuses.push({ source: 'synergies', amount: tierValue('modifierSize', 'Medium') });
  }
  if (world.synergies.has('combined-arms') && resolved.def.family === 'Siege' && enemy.meleeMark > 0) {
    synergyBonuses.push({ source: 'synergies', amount: tierValue('modifierSize', 'Low') });
  }

  let amount = 0;
  let electric = 0;
  const magnetic = resolved.tags.includes('Magnetic');
  const directional = magnetic || hasTrait(enemy, 'shell');
  for (const part of parts) {
    const dealt = computeDamage({
      base: part.amount * scale * componentFactor,
      percentBonuses: synergyBonuses,
      criticalMultiplier,
      typeMultiplier:
        typeMultiplier(enemy, part.type) *
        (directional ? hitMultiplier(world, enemy, part.type, magnetic, options.dirX, options.dirY) : 1),
      armour: enemyArmour(enemy, part.type, world),
      reactionBonus: reactions.bonus + (part.type === 'Electric' ? reactions.electricBonus : 0),
    });
    amount += dealt;
    if (part.type === 'Electric') electric += dealt;
  }

  const x = enemy.x;
  const y = enemy.y;
  const dealt = Math.min(amount, enemy.health);
  enemy.health -= amount;
  enemy.hitFlash = HIT_FLASH_SECONDS;
  world.stats.damageDealt += dealt;
  weapon.damageDealt += dealt;
  if (critical) {
    world.stats.criticalHits++;
    world.noteCritical();
  }
  if (generation > 0) world.noteChain(generation, resolved.chainDepthLimit);
  noteDamage(world, enemy, amount, mainType);
  world.lastHitType = mainType;
  world.emit({ type: 'enemyHit', x, y, amount, critical, damageType: mainType });

  // Kill Zone and Combined Arms read these marks.
  if (delivery === 'trap') enemy.trapped = SYNERGY_RULES.trappedSeconds;
  if (resolved.def.family === 'Melee') enemy.meleeMark = SYNERGY_RULES.meleeMarkSeconds;

  // Fungal Network: damage to one Infected enemy spreads in part to other Infected enemies nearby.
  if (primary && world.synergies.has('fungal-network') && hasStatus(enemy, 'Infected')) {
    const share = amount * SYNERGY_RULES.fungalShare;
    for (const other of enemiesNear(world, x, y, SYNERGY_RULES.fungalRange, enemy)) {
      if (hasStatus(other, 'Infected')) statusHit(world, other, weaponIndex, share, mainType, true);
    }
  }

  const killed = enemy.health <= 0;
  if (killed) {
    if (reactions.galvanic && wasElite) world.findings.galvanicEliteKill = true;
    killEnemy(world, enemy, weaponIndex, generation, {
      fromConstruct: options.fromConstruct === true || delivery === 'turret' || delivery === 'companion' || delivery === 'trap',
      poisoned: poisonedBefore,
    });
  }

  // Reaction follow-ups happen at the hit point, whether or not the target survived.
  if (reactions.steamBurst) {
    explode(world, x, y, REACTION_RULES.steamRadius, weaponIndex, {
      scale: REACTION_RULES.steamDamageShare * reactionScale(world, 'Steam Burst'),
      generation: 1,
      parts: [{ type: 'Fire', amount: resolved.damage }],
    });
  }
  if (reactions.galvanicArcs > 0 && electric > 0) {
    const arced = [enemy.id];
    for (let arc = 0; arc < reactions.galvanicArcs; arc++) {
      const next = nearestOther(world, x, y, WEAPON_RULES.chainRange, arced);
      if (!next) break;
      arced.push(next.id);
      world.emit({ type: 'chain', points: [x, y, next.x, next.y], damageType: 'Electric' });
      statusHit(world, next, weaponIndex, electric * REACTION_RULES.galvanicArcShare, 'Electric', true);
    }
  }
  if (killed) return true;

  if (reactions.shortCircuit) triggerStatus(world, enemy, weaponIndex, 'Stunned');
  if (primary) {
    // Statistical Toxicology: critical hits double Status Build-up.
    applyStatusBuilds(world, enemy, weaponIndex, critical && world.rule('criticalDoubleBuild') > 0 ? 2 : 1);
    // Probability Storm: critical hits build Electrified.
    if (critical && enemy.active && world.rule('criticalsElectrify') > 0) {
      buildStatus(world, enemy, weaponIndex, 'Electrified', tierValue('statusBuildUp', RESEARCH_RULES.grantedBuild));
    }
    if (enemy.active) runHitEffects(world, enemy, weapon, weaponIndex, options, amount, critical);
  }
  return !enemy.active;
}

/** Active enemies inside a radius around a point, except one. In slot order. */
function enemiesNear(world: World, x: number, y: number, radius: number, except: Enemy): Enemy[] {
  const found: Enemy[] = [];
  for (const slot of world.grid.query(x, y, radius + world.maxEnemyRadius, scratch)) {
    const other = world.enemies.items[slot];
    if (!other || !other.active || other === except) continue;
    if (Math.hypot(other.x - x, other.y - y) <= radius + other.radius) found.push(other);
  }
  return found.sort((a, b) => a.slot - b.slot);
}

function runHitEffects(
  world: World,
  enemy: Enemy,
  weapon: WeaponState,
  weaponIndex: number,
  options: HitOptions,
  amount: number,
  critical: boolean,
): void {
  const resolved = weapon.resolved;
  const triggers = resolved.triggers;

  if (resolved.knockback > 0 && options.dirX !== undefined && options.dirY !== undefined) {
    const moved = push(world, enemy, options.dirX * resolved.knockback, options.dirY * resolved.knockback);
    // Ballistic Pendulum: knockback into walls builds Stunned.
    if (world.rule('wallStun') > 0 && moved < resolved.knockback * 0.6 && !isJuggernaut(enemy)) {
      buildStatus(world, enemy, weaponIndex, 'Stunned', tierValue('statusBuildUp', RESEARCH_RULES.wallStun));
    }
    // Kinetic Probability: knockback into walls or enemies counts as a critical hit.
    if (!critical && hasSynergy(resolved, 'kinetic-probability')) {
      const blocked = moved < resolved.knockback * 0.6 || touchesEnemy(world, enemy);
      if (blocked) {
        world.stats.criticalHits++;
        const extra = amount * (resolved.criticalDamage - 1);
        if (statusHit(world, enemy, weaponIndex, extra, resolved.damageParts[0]?.type ?? 'Impact', true)) return;
      }
    }
  }

  if (triggers.slowOnHit && !isJuggernaut(enemy)) {
    enemy.slowTimer = Math.max(enemy.slowTimer, WEAPON_RULES.slowSeconds);
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
    // Leyden Jar Cell: arcs to one nearby enemy. Conductive Strike adds a jump.
    const hitIds = [enemy.id];
    const points = [enemy.x, enemy.y];
    let fromX = enemy.x;
    let fromY = enemy.y;
    for (let jump = 1; jump <= 1 + resolved.extraChainJumps; jump++) {
      const next = nearestOther(world, fromX, fromY, WEAPON_RULES.chainRange, hitIds);
      if (!next) break;
      hitIds.push(next.id);
      fromX = next.x;
      fromY = next.y;
      points.push(fromX, fromY);
      hitEnemy(world, next, weaponIndex, {
        scale: WEAPON_RULES.arcOnHitDamageShare * world.chainFalloff ** (jump - 1),
        primary: false,
        forcedType: 'Electric',
        generation: jump,
      });
    }
    if (points.length > 2) world.emit({ type: 'chain', points, damageType: 'Electric' });
  }

  if (triggers.explodeOnHit && !options.fromBlast && enemy.active) {
    explode(world, enemy.x, enemy.y, WEAPON_RULES.explodeOnHitRadius * resolved.explosionArea, weaponIndex, {
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
  /** Explicit damage, replacing the weapon's parts. */
  readonly parts?: readonly DamagePart[];
  readonly generation?: number;
  readonly skipId?: number;
  /** No explosion event, for attacks drawing their own shape. */
  readonly quiet?: boolean;
  readonly fromConstruct?: boolean;
  /** Recursive Artillery copies never copy again. */
  readonly isCopy?: boolean;
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
    : options.parts;

  if (!options.quiet) {
    world.emit({
      type: 'explosion',
      x,
      y,
      radius,
      damageType: options.explosive ? 'Fire' : (parts?.[0]?.type ?? resolved.damageParts[0]?.type ?? 'Impact'),
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
      fromConstruct: options.fromConstruct,
      dirX: dx / distance,
      dirY: dy / distance,
    });
  }

  // Gravity Studies: area effects pull enemies toward the centre.
  if (primary && world.rule('areaPull') > 0) {
    for (const enemy of targets) {
      if (!enemy.active) continue;
      const dx = x - enemy.x;
      const dy = y - enemy.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 1e-6) continue;
      const pull = Math.min(RESEARCH_RULES.gravityPull, distance);
      push(world, enemy, (dx / distance) * pull, (dy / distance) * pull);
    }
  }

  // Fire burns Thornling seeds (GDD 9.11).
  if (world.seedCount > 0) {
    const fire = options.explosive || (parts ?? resolved.damageParts).some((part) => part.type === 'Fire');
    if (fire) burnSeeds(world, x, y, radius);
  }

  if (primary) {
    if (resolved.triggers.fragmentsOnExplosion) spawnFragments(world, x, y, weaponIndex);
    // Recursive Artillery: each explosion triggers one smaller copy.
    if (hasSynergy(resolved, 'recursive-artillery') && !options.isCopy) {
      world.queueExplosion({
        x,
        y,
        radius: radius * SYNERGY_RULES.recursiveAreaShare,
        weaponIndex,
        damageScale: scale * SYNERGY_RULES.recursiveDamageShare,
        generation: generation + 1,
        explosive: false,
      });
    }
  }
  return targets.length;
}

/** Removes a defeated enemy and runs on-kill effects for the weapon credited with the kill. */
export function killEnemy(
  world: World,
  enemy: Enemy,
  weaponIndex = -1,
  generation = 0,
  how: { readonly fromConstruct?: boolean; readonly poisoned?: boolean } = {},
): void {
  if (!enemy.active) return;
  // Hidden node conditions (GDD 8.12).
  if (enemy.def.id === 'spore-mother') {
    world.findings.sporeMotherKilled = true;
    if (how.fromConstruct) world.findings.sporeMotherByConstruct = true;
  } else if (enemy.def.id === 'the-unstable') {
    world.findings.unstableKilled = true;
    if (world.suppressing) world.findings.unstableSuppressedKill = true;
  }
  const poisoned = how.poisoned ?? hasStatus(enemy, 'Poisoned');
  const x = enemy.x;
  const y = enemy.y;

  // Read the statuses before the slot returns to the pool.
  const infectedIndex = STATUS_INDEX.Infected;
  const burningIndex = STATUS_INDEX.Burning;
  const infected = hasStatus(enemy, 'Infected');
  const infectionSource = enemy.statusSource[infectedIndex] ?? -1;
  const infectionGeneration = enemy.statusGeneration[infectedIndex] ?? 0;
  const burning = hasStatus(enemy, 'Burning');
  const burnSource = enemy.statusSource[burningIndex] ?? -1;

  // Signature traits and elite modifiers leave their mark before the slot returns to the pool.
  const def = enemy.def;
  const squadId = enemy.squad;
  const maxHealth = enemy.maxHealth;
  const splits = hasModifier(enemy, 'splitting') && !enemy.noLegacy;
  enemyDied(world, enemy, burning || world.lastHitType === 'Fire');
  dropLoot(world, enemy, weaponIndex);

  world.stats.kills++;
  world.emit({ type: 'enemyKilled', x, y, enemyId: enemy.def.id });
  world.enemies.release(enemy);
  if (splits) splitEnemy(world, def, x, y, maxHealth, squadId);

  // Infected spreads to a nearby enemy on death (GDD 9.14). Overgrowth spreads to two.
  if (infected) {
    const source = world.weapons[infectionSource]?.resolved;
    // Contagion: Infected spreads to one extra enemy on death.
    const count =
      (source && hasSynergy(source, 'overgrowth') ? SYNERGY_RULES.overgrowthSpreads : 1) + world.rule('infectedExtraSpread');
    spreadInfection(world, enemy, infectionSource, infectionGeneration, count);
    // Parasite Larvae: Infected enemies release a parasite on death, which seeks a new host.
    if (source?.triggers.parasite) spawnParasite(world, x, y, infectionSource);
  }

  // Flashpoint: Burning enemies explode on death.
  const burner = world.weapons[burnSource]?.resolved;
  if (burning && burner && hasSynergy(burner, 'flashpoint') && generation < burner.chainDepthLimit) {
    world.queueExplosion({
      x,
      y,
      radius: SYNERGY_RULES.flashpointRadius * burner.explosionArea,
      weaponIndex: burnSource,
      damageScale: SYNERGY_RULES.flashpointDamageShare,
      generation: generation + 1,
      explosive: true,
    });
  }

  // Medical Alchemy: killing a Poisoned enemy restores a small amount of health.
  // Symbiosis: so do companion and construct kills.
  const heals =
    (poisoned && world.rule('poisonKillHeal') > 0 ? 1 : 0) + (how.fromConstruct && world.rule('constructKillHeal') > 0 ? 1 : 0);
  if (heals > 0 && world.player.health > 0 && world.player.health < world.player.stats.maxHealth) {
    const amount = RESEARCH_RULES.smallHeal * heals;
    world.player.health = Math.min(world.player.stats.maxHealth, world.player.health + amount);
    world.emit({ type: 'playerHealed', amount });
  }

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
  if (generation < resolved.chainDepthLimit) {
    if (resolved.killExplosion) {
      world.queueExplosion({
        x,
        y,
        radius:
          Math.max(WEAPON_RULES.explodeOnKillRadius, resolved.area * WEAPON_RULES.killExplosionAreaShare) *
          resolved.explosionArea,
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
        radius: WEAPON_RULES.explodeOnKillRadius * resolved.explosionArea,
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
    // Chaos Theory keeps the better of two Evasion rolls.
    evasionRoll: world.rule('chaosTheory') > 0 ? Math.min(world.rng.next(), world.rng.next()) : world.rng.next(),
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
  // Iron Lung: adaptation also applies to every other damage type at half strength.
  if (world.rule('ironLung') > 0) {
    for (const other of DAMAGE_TYPES) {
      if (other === damageType) continue;
      player.adaptation[other] = Math.min(
        player.stats.adaptationCap,
        (player.adaptation[other] ?? 0) + player.stats.adaptationPerHit / 2,
      );
    }
  }
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
