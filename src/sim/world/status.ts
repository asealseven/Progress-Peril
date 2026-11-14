// Status meters, status effects and status reactions (GDD 9.14).

import { hasModifier } from './traits';
import { ARCHIVE_RULES } from '../../data/archive';
import type { DamageType } from '../../data/damageTypes';
import {
  ARTIFICIAL_IMMUNE,
  ARTIFICIAL_REPLACEMENT,
  CHEMISTRY_STATUSES,
  STATUS_COUNT,
  STATUS_DEFS,
  STATUS_EFFECTS,
  STATUS_INDEX,
} from '../../data/statusEffects';
import type { Reaction, StatusEffect } from '../../data/statusEffects';
import { RESEARCH_RULES } from '../../data/research';
import {
  DAMAGE_STEP,
  ENEMY_RULES,
  REACTION_RULES,
  STATUS_RULES,
  SYNERGY_RULES,
  WEAPON_RULES,
  tierValue,
} from '../../data/tiers';
import { hasSynergy } from '../loadout';
import { computeDamage, effectiveArmour } from '../modifiers';
import { killEnemy, nearestOther } from './damage';
import { noteDamage } from './enemies';
import { hasTrait, isJuggernaut } from './traits';
import type { Enemy } from './types';
import type { World } from './world';
import { addZone } from './zones';

const I = STATUS_INDEX;
const scratch: number[] = [];

/** Absorbs rounding in step-sized countdowns. */
const TICK_TOLERANCE = 1e-9;

/** Bit flags for passive reactions already announced on an enemy. */
const FLAG_GALVANIC = 1;
const FLAG_SEPTIC = 2;

export function createStatusArrays(): number[] {
  return Array.from({ length: STATUS_COUNT }, () => 0);
}

export function resetStatuses(enemy: Enemy): void {
  for (let index = 0; index < STATUS_COUNT; index++) {
    enemy.statusMeter[index] = 0;
    enemy.statusActive[index] = 0;
    enemy.statusSource[index] = -1;
    enemy.statusTick[index] = 0;
    enemy.statusDamage[index] = 0;
    enemy.statusSince[index] = 0;
    enemy.statusGeneration[index] = 0;
  }
  enemy.meterScale = 1;
  enemy.stunGrowth = 1;
  enemy.fumesCooldown = 0;
  enemy.septicTimer = 0;
  enemy.trapped = 0;
  enemy.meleeMark = 0;
  enemy.reactionFlags = 0;
  enemy.marked = false;
}

/**
 * Clears every status effect and empties every meter, keeping the meter size.
 * Purifier champions do this every few seconds (GDD 9.13).
 */
export function clearStatuses(enemy: Enemy): void {
  for (let index = 0; index < STATUS_COUNT; index++) {
    enemy.statusMeter[index] = 0;
    enemy.statusActive[index] = 0;
    enemy.statusTick[index] = 0;
  }
  enemy.marked = false;
  enemy.reactionFlags = 0;
}

export function hasStatus(enemy: Enemy, status: StatusEffect): boolean {
  return (enemy.statusActive[I[status]] ?? 0) > 0;
}

/** True while a status stops the enemy: Frozen, Stunned or Short-circuited. */
export function isStopped(enemy: Enemy): boolean {
  return hasStatus(enemy, 'Frozen') || hasStatus(enemy, 'Stunned') || hasStatus(enemy, 'Short-circuited');
}

export function isArtificial(enemy: Enemy): boolean {
  return enemy.def.properties.includes('Artificial');
}

/** Meter size for one status on one enemy, in Normal meters. */
export function meterSize(enemy: Enemy, status: StatusEffect): number {
  return enemy.meterScale * (status === 'Stunned' ? enemy.stunGrowth : 1);
}

export function endStatus(enemy: Enemy, status: StatusEffect): void {
  enemy.statusActive[I[status]] = 0;
  if (status === 'Marked') enemy.marked = false;
}

/** Weakness, resistance and immunity for a damage type (GDD 9.11), plus Overheated (GDD 9.14). */
export function typeMultiplier(enemy: Enemy, type: DamageType, world?: World): number {
  const def = enemy.def;
  if (def.immune?.includes(type)) return 0;
  let multiplier = 1;
  if (def.weakTo.includes(type)) multiplier *= DAMAGE_STEP.weak;
  if (def.resists.includes(type)) multiplier *= DAMAGE_STEP.resist;
  // Resistant elites, the Anomaly's shifting resistance and Reactive Plating (GDD 9.11 to 9.13).
  // Physics Master: Electric and Cold ignore the Resistant elite modifier (GDD 8.13).
  const ignoreResistant =
    world !== undefined && (type === 'Electric' || type === 'Cold') && world.master('Physics') && hasModifier(enemy, 'resistant');
  if (enemy.resistType === type && !ignoreResistant) multiplier *= DAMAGE_STEP.resist;
  if (enemy.plateType === type) multiplier *= DAMAGE_STEP.resist;
  if ((type === 'Electric' || type === 'Cold') && hasStatus(enemy, 'Overheated')) {
    multiplier *= 1 + tierValue('modifierSize', STATUS_RULES.overheated.extraDamage);
  }
  // Boss phases: added weaknesses, invulnerable transitions, decoys and exposed cores (GDD 10.4).
  if (enemy.extraWeak.includes(type)) multiplier *= DAMAGE_STEP.weak;
  return multiplier * enemy.takenFactor;
}

/** Target Armour after Corroded and Piercing (GDD 7.14 step 6). */
export function enemyArmour(enemy: Enemy, type: DamageType, world?: World): number {
  // Thermite: Fire damage ignores Armour.
  if (type === 'Fire' && world && world.rule('fireIgnoresArmour') > 0) return 0;
  let corroded = 0;
  if (hasStatus(enemy, 'Corroded')) {
    corroded = enemy.def.properties.includes('Metallic')
      ? STATUS_RULES.corroded.metallicSteps
      : STATUS_RULES.corroded.armourSteps;
    // Concentrated Acids: one extra step.
    corroded += world?.rule('corrodedExtraStep') ?? 0;
  }
  return effectiveArmour(enemy.armour, type, corroded);
}

/** Damage taken up from research: Universal Solvent on Corroded enemies, Absolute Zero on Frozen ones. */
export function vulnerability(world: World, enemy: Enemy, frozen = hasStatus(enemy, 'Frozen')): number {
  let factor = 1;
  if (world.rule('corrodedVulnerable') > 0 && hasStatus(enemy, 'Corroded')) factor += tierValue('modifierSize', 'Low');
  if (world.rule('frozenVulnerable') > 0 && frozen) factor += tierValue('modifierSize', 'Medium');
  return factor;
}

/** Damage from a status tick or a reaction: no critical roll, no on-hit effects. Returns true on a kill. */
export function statusHit(
  world: World,
  enemy: Enemy,
  weaponIndex: number,
  amount: number,
  type: DamageType,
  ignoresArmour = false,
): boolean {
  if (!enemy.active || amount <= 0) return false;
  const dealt = computeDamage({
    base: amount * vulnerability(world, enemy),
    typeMultiplier: typeMultiplier(enemy, type, world),
    armour: ignoresArmour ? 0 : enemyArmour(enemy, type, world),
  });
  if (dealt <= 0) return false;
  const applied = Math.min(dealt, enemy.health);
  enemy.health -= dealt;
  world.stats.damageDealt += applied;
  const weapon = world.weapons[weaponIndex];
  if (weapon) weapon.damageDealt += applied;
  noteDamage(world, enemy, dealt, type);
  world.emit({ type: 'enemyHit', x: enemy.x, y: enemy.y, amount: dealt, critical: false, damageType: type });
  if (enemy.health <= 0) {
    world.lastHitType = type;
    killEnemy(world, enemy, weaponIndex, 0);
    return true;
  }
  return false;
}

function durationFor(world: World, enemy: Enemy, weaponIndex: number, status: StatusEffect, base: number): number {
  const resolved = world.weapons[weaponIndex]?.resolved;
  const weaponFactor = resolved ? resolved.statusDuration * (resolved.statusDurationFor[status] ?? 1) : 1;
  // The Unstable resists through shorter status durations (GDD 9.11).
  const enemyFactor = hasTrait(enemy, 'short-statuses') ? ENEMY_RULES.shortStatusFactor : 1;
  return base * weaponFactor * world.player.stats.statusPotency * enemyFactor;
}

const BASE_SECONDS: Readonly<Record<StatusEffect, number>> = {
  Burning: STATUS_RULES.burning.seconds,
  Poisoned: STATUS_RULES.poisoned.seconds,
  Corroded: STATUS_RULES.corroded.seconds,
  Electrified: STATUS_RULES.electrified.seconds,
  Frozen: STATUS_RULES.frozen.seconds,
  Bleeding: STATUS_RULES.bleeding.seconds,
  Stunned: STATUS_RULES.stunned.seconds,
  Infected: STATUS_RULES.infected.seconds,
  Marked: STATUS_RULES.marked.seconds,
  Overheated: STATUS_RULES.overheated.seconds,
  'Short-circuited': STATUS_RULES.shortCircuited.seconds,
};

const DAMAGE_SHARE: Readonly<Partial<Record<StatusEffect, number>>> = {
  Burning: STATUS_RULES.burning.damageShare,
  Poisoned: STATUS_RULES.poisoned.damageShare,
  Electrified: STATUS_RULES.electrified.damageShare,
  Bleeding: STATUS_RULES.bleeding.damageShare,
  Infected: STATUS_RULES.infected.damageShare,
};

/** The status an enemy receives from a build-up, or undefined for an immune enemy. */
export function statusFor(enemy: Enemy, status: StatusEffect): StatusEffect | undefined {
  const sourceType = STATUS_DEFS[status].sourceType;
  if (sourceType && enemy.def.immune?.includes(sourceType)) return undefined;
  let actual: StatusEffect = status;
  if (isArtificial(enemy)) {
    if (ARTIFICIAL_IMMUNE.includes(status)) return undefined;
    actual = ARTIFICIAL_REPLACEMENT[status] ?? status;
  }
  // Hardened elites ignore one status. Juggernauts ignore Stun (GDD 9.12, 9.13).
  if (enemy.hardened === status || enemy.hardened === actual) return undefined;
  if (isJuggernaut(enemy) && (actual === 'Stunned' || actual === 'Short-circuited')) return undefined;
  return actual;
}

let masterBuilding = false;

function announce(world: World, reaction: Reaction, enemy: Enemy): void {
  world.emit({ type: 'reaction', reaction, x: enemy.x, y: enemy.y });
  world.findings.reactions.add(reaction);
  // Chemistry Master: each reaction builds one further status of the player's choice (GDD 8.13).
  if (world.master('Chemistry') && !masterBuilding && enemy.active) {
    masterBuilding = true;
    buildStatus(world, enemy, -1, world.perks.masterStatus, ARCHIVE_RULES.reactionBuild);
    masterBuilding = false;
  }
}

/** Damage multiplier for reactions from synergies: Thermal Shock and Catalytic Mix (GDD 7.19). */
export function reactionScale(world: World, reaction: Reaction): number {
  // Reaction Theory: status reaction damage up, Low.
  let bonus = tierValue('modifierSize', 'Low') * world.rule('reactionDamage');
  if (world.synergies.has('catalytic-mix')) bonus += tierValue('modifierSize', 'Medium');
  // Catalyst Stone: status reaction damage up, High (GDD 5.12).
  bonus += tierValue('modifierSize', 'High') * world.relic('reactionDamage');
  if (world.synergies.has('thermal-shock') && (reaction === 'Shatter' || reaction === 'Steam Burst')) {
    bonus += tierValue('modifierSize', 'High');
  }
  return 1 + bonus;
}

/**
 * Starts a status at full strength for its duration (GDD 9.14). A second
 * trigger refreshes the duration. `status` is the effect after the
 * Artificial swap.
 */
export function triggerStatus(
  world: World,
  enemy: Enemy,
  weaponIndex: number,
  status: StatusEffect,
  generation = 0,
  spread = true,
): void {
  const index = I[status];
  const base = BASE_SECONDS[status];
  enemy.statusActive[index] = durationFor(world, enemy, weaponIndex, status, base);
  enemy.statusSource[index] = weaponIndex;
  enemy.statusGeneration[index] = generation;

  const share = DAMAGE_SHARE[status];
  if (share !== undefined) {
    const weaponDamage = world.weapons[weaponIndex]?.resolved.damage ?? 0;
    const ticks = base / STATUS_RULES.tickSeconds;
    // Venomology: Poisoned damage up, Low.
    const venom = status === 'Poisoned' ? 1 + tierValue('modifierSize', 'Low') * world.rule('poisonDamage') : 1;
    enemy.statusDamage[index] = (weaponDamage * share * world.player.stats.statusPotency * venom) / ticks;
    if ((enemy.statusTick[index] ?? 0) <= 0) enemy.statusTick[index] = STATUS_RULES.tickSeconds;
  }

  if (status === 'Stunned') enemy.stunGrowth *= STATUS_RULES.stunned.meterGrowth;
  if (status === 'Marked') enemy.marked = true;
  world.emit({ type: 'status', status, x: enemy.x, y: enemy.y });

  // Toxic Fumes: Burning and Poisoned together release a poison cloud around the target.
  if ((status === 'Burning' || status === 'Poisoned') && hasStatus(enemy, 'Burning') && hasStatus(enemy, 'Poisoned')) {
    if (enemy.fumesCooldown <= 0) {
      enemy.fumesCooldown = REACTION_RULES.fumesCooldown;
      announce(world, 'Toxic Fumes', enemy);
      // Fume Chemistry: cloud size up, Medium.
      const size = 1 + tierValue('modifierSize', 'Medium') * world.rule('fumesSize');
      addZone(world, 'fumes', enemy.x, enemy.y, REACTION_RULES.fumesRadius * size, REACTION_RULES.fumesSeconds, weaponIndex);
    }
  }

  // Spontaneous Combustion: each Burning trigger spreads Burning to one adjacent enemy.
  if (status === 'Burning' && spread && world.rule('burningSpreads') > 0) {
    const other = nearestWithout(world, enemy.x, enemy.y, RESEARCH_RULES.burnSpreadRange, 'Burning', enemy);
    if (other) {
      world.emit({ type: 'chain', points: [enemy.x, enemy.y, other.x, other.y], damageType: 'Fire' });
      triggerStatus(world, other, weaponIndex, 'Burning', generation, false);
    }
  }
}

/**
 * Fills a status meter by a share of a Normal meter. A full meter triggers
 * the effect, then the meter empties. Returns true when the effect triggered.
 */
export function buildStatus(
  world: World,
  enemy: Enemy,
  weaponIndex: number,
  status: StatusEffect,
  share: number,
): boolean {
  if (!enemy.active) return false;
  const actual = statusFor(enemy, status);
  if (!actual) return false;
  const index = I[actual];

  // Each Cold hit slows, before the meter fills (GDD 9.14).
  if (actual === 'Frozen' && !isJuggernaut(enemy)) {
    enemy.slowTimer = Math.max(enemy.slowTimer, STATUS_RULES.frozen.hitSlowSeconds);
    enemy.slowFactor = Math.min(enemy.slowFactor, STATUS_RULES.frozen.hitSlowFactor);
  }

  enemy.statusSince[index] = 0;
  // Toxicologist: Poisoned and Corroded meters fill faster (GDD 11.12).
  const fill = 1 + (world.perks.statusFill.get(actual) ?? 0);
  enemy.statusMeter[index] = (enemy.statusMeter[index] ?? 0) + share * world.player.stats.statusPotency * fill;
  if ((enemy.statusMeter[index] ?? 0) < meterSize(enemy, actual) - 1e-9) return false;
  enemy.statusMeter[index] = 0;
  triggerStatus(world, enemy, weaponIndex, actual);
  return true;
}

/** Builds every status a weapon's hit carries. */
export function applyStatusBuilds(world: World, enemy: Enemy, weaponIndex: number, scale = 1): void {
  const resolved = world.weapons[weaponIndex]?.resolved;
  if (!resolved) return;
  for (const build of resolved.statusBuilds) {
    if (!enemy.active) return;
    buildStatus(world, enemy, weaponIndex, build.status, build.share * scale);
  }
}

/** Damage types a hit counts as: its damage parts, plus the source types of the statuses the hit builds. */
export function hitTypes(world: World, weaponIndex: number, partTypes: readonly DamageType[], primary: boolean): DamageType[] {
  const types = [...partTypes];
  if (primary) {
    for (const build of world.weapons[weaponIndex]?.resolved.statusBuilds ?? []) {
      const source = STATUS_DEFS[build.status].sourceType;
      if (source && !types.includes(source)) types.push(source);
    }
  }
  return types;
}

export interface HitReactions {
  /** Bonus on the whole hit (GDD 7.14 step 7). 1 means double damage. */
  bonus: number;
  /** Extra bonus on Electric damage only. */
  electricBonus: number;
  /** Added to the critical multiplier for this hit. */
  criticalBonus: number;
  steamBurst: boolean;
  shortCircuit: boolean;
  /** Extra enemies a Galvanic Surge arcs to. */
  galvanicArcs: number;
  /** The target stood under a Galvanic Surge for this hit. */
  galvanic: boolean;
}

/** Works out the reactions a hit sets off, and ends the statuses they consume. */
export function reactToHit(world: World, enemy: Enemy, types: readonly DamageType[], critical: boolean): HitReactions {
  const result: HitReactions = {
    bonus: 0,
    electricBonus: 0,
    criticalBonus: 0,
    steamBurst: false,
    shortCircuit: false,
    galvanicArcs: 0,
    galvanic: false,
  };
  const frozen = hasStatus(enemy, 'Frozen');

  // Shatter: Impact hit on a Frozen enemy. Burst damage. Ends Frozen.
  if (frozen && types.includes('Impact')) {
    // Cryogenics: Shatter damage up, Medium.
    const cryo = 1 + tierValue('modifierSize', 'Medium') * world.rule('shatterDamage');
    result.bonus += REACTION_RULES.shatterBonus * reactionScale(world, 'Shatter') * cryo;
    endStatus(enemy, 'Frozen');
    announce(world, 'Shatter', enemy);
  } else if ((frozen && types.includes('Fire')) || (hasStatus(enemy, 'Burning') && types.includes('Cold'))) {
    // Steam Burst: Fire hit on a Frozen enemy, or Cold hit on a Burning enemy. Ends both effects.
    result.steamBurst = true;
    world.findings.steamBursts++;
    endStatus(enemy, 'Frozen');
    endStatus(enemy, 'Burning');
    announce(world, 'Steam Burst', enemy);
  }

  if (types.includes('Electric')) {
    // Short Circuit: Electric hit on an Overheated enemy. Stun plus burst damage.
    if (hasStatus(enemy, 'Overheated') && !hasStatus(enemy, 'Stunned')) {
      result.bonus += REACTION_RULES.shortCircuitBonus * reactionScale(world, 'Short Circuit');
      result.shortCircuit = true;
      announce(world, 'Short Circuit', enemy);
    }
    // Galvanic Surge: Electrified and Corroded together. Electric damage up against the target.
    if (hasStatus(enemy, 'Electrified') && hasStatus(enemy, 'Corroded')) {
      const doubled = world.synergies.has('galvanic-corrosion');
      result.electricBonus +=
        tierValue('modifierSize', REACTION_RULES.galvanicBonus) * reactionScale(world, 'Galvanic Surge') * (doubled ? 2 : 1);
      // Galvanic Chemistry: the surge arcs to one extra enemy.
      result.galvanicArcs = (doubled ? 1 : 0) + world.rule('galvanicExtraArc');
      result.galvanic = true;
      if (enemy.rank === 'elite') world.findings.galvanicElite = true;
    }
  }

  // Calculated Strike: critical hit on a Marked enemy. Critical Damage up for the hit, then Marked ends.
  if (critical && hasStatus(enemy, 'Marked')) {
    result.criticalBonus +=
      tierValue('modifierSize', REACTION_RULES.calculatedStrikeBonus) * reactionScale(world, 'Calculated Strike');
    // Risk Analysis: the critical hit extends Marked in place of ending the effect.
    if (world.rule('criticalExtendsMarked') > 0) {
      enemy.statusActive[I.Marked] = Math.max(enemy.statusActive[I.Marked] ?? 0, BASE_SECONDS.Marked);
    } else endStatus(enemy, 'Marked');
    announce(world, 'Calculated Strike', enemy);
  }
  return result;
}

/** Nearest active enemy to a point without the status. Ties go to the lower slot. */
function nearestWithout(world: World, x: number, y: number, reach: number, status: StatusEffect, except: Enemy): Enemy | undefined {
  let chosen: Enemy | undefined;
  let chosenDistance = Infinity;
  for (const slot of world.grid.query(x, y, reach + world.maxEnemyRadius, scratch)) {
    const other = world.enemies.items[slot];
    if (!other || !other.active || other === except || hasStatus(other, status)) continue;
    if (!statusFor(other, status)) continue;
    const distance = Math.hypot(other.x - x, other.y - y);
    if (distance > reach) continue;
    if (distance < chosenDistance || (distance === chosenDistance && chosen && other.slot < chosen.slot)) {
      chosen = other;
      chosenDistance = distance;
    }
  }
  return chosen;
}

/**
 * Spreads an infection from a point to nearby enemies. Infection spread is a
 * chain reaction (GDD 7.20): each spread raises the generation, up to the
 * depth limit of the source weapon. Returns the number of new hosts.
 */
export function spreadInfection(
  world: World,
  from: Enemy,
  weaponIndex: number,
  generation: number,
  count: number,
): number {
  const limit = world.weapons[weaponIndex]?.resolved.chainDepthLimit ?? WEAPON_RULES.chainDepthLimit;
  if (generation + 1 > limit) return 0;
  let spread = 0;
  for (let i = 0; i < count; i++) {
    const host = nearestWithout(world, from.x, from.y, STATUS_RULES.infected.spreadRange, 'Infected', from);
    if (!host) break;
    world.emit({ type: 'chain', points: [from.x, from.y, host.x, host.y], damageType: 'Biological' });
    triggerStatus(world, host, weaponIndex, 'Infected', generation + 1);
    spread++;
  }
  return spread;
}

/** Ticks every meter and active effect on every enemy. */
export function updateStatuses(world: World, dt: number): void {
  const tickSeconds = STATUS_RULES.tickSeconds;
  for (const enemy of world.enemies.items) {
    if (!enemy.active) continue;
    enemy.fumesCooldown = Math.max(0, enemy.fumesCooldown - dt);
    enemy.trapped = Math.max(0, enemy.trapped - dt);
    enemy.meleeMark = Math.max(0, enemy.meleeMark - dt);
    const moving = enemy.vx !== 0 || enemy.vy !== 0;

    for (let index = 0; index < STATUS_COUNT && enemy.active; index++) {
      const status = STATUS_EFFECTS[index];
      if (!status) continue;

      // Meters drain slowly when the enemy receives no build-up (GDD 9.14).
      enemy.statusSince[index] = (enemy.statusSince[index] ?? 0) + dt;
      const meter = enemy.statusMeter[index] ?? 0;
      if (meter > 0 && (enemy.statusSince[index] ?? 0) > STATUS_RULES.drainDelay) {
        enemy.statusMeter[index] = Math.max(0, meter - meterSize(enemy, status) * 0.1 * dt);
      }

      const active = enemy.statusActive[index] ?? 0;
      if (active <= 0) continue;

      // Neurotoxins: Poisoned enemies also slow down.
      if (status === 'Poisoned' && world.rule('poisonSlows') > 0 && !isJuggernaut(enemy)) {
        enemy.slowTimer = Math.max(enemy.slowTimer, 0.2);
        enemy.slowFactor = Math.min(enemy.slowFactor, RESEARCH_RULES.poisonSlowFactor);
      }

      // Damage ticks come first, so the tick due at the last moment still lands.
      const damage = enemy.statusDamage[index] ?? 0;
      const type = STATUS_DEFS[status].damageType;
      if (type && damage > 0) {
        const source = enemy.statusSource[index] ?? -1;
        // Bleeding ticks faster while the target moves. Envenomed Edge speeds Poisoned on Bleeding enemies.
        let rate = 1;
        if (status === 'Bleeding' && moving) rate = STATUS_RULES.bleeding.movingRate;
        if (status === 'Poisoned' && hasStatus(enemy, 'Bleeding')) {
          const resolved = world.weapons[source]?.resolved;
          if (resolved && hasSynergy(resolved, 'envenomed-edge')) rate = SYNERGY_RULES.envenomedTickRate;
        }
        enemy.statusTick[index] = (enemy.statusTick[index] ?? 0) - dt * rate;
        if ((enemy.statusTick[index] ?? 0) <= TICK_TOLERANCE) {
          enemy.statusTick[index] = (enemy.statusTick[index] ?? 0) + tickSeconds;
          // Electrified: damage over time with a chance to arc.
          if (status === 'Electrified' && world.rng.chance(STATUS_RULES.electrified.arcChance)) {
            const other = nearestOther(world, enemy.x, enemy.y, WEAPON_RULES.chainRange, [enemy.id]);
            if (other) {
              world.emit({ type: 'chain', points: [enemy.x, enemy.y, other.x, other.y], damageType: 'Electric' });
              statusHit(world, other, source, damage, 'Electric');
            }
          }
          if (statusHit(world, enemy, source, damage, type, status === 'Poisoned')) break;
        }
      }

      enemy.statusActive[index] = Math.max(0, active - dt);
      if ((enemy.statusActive[index] ?? 0) <= TICK_TOLERANCE) endStatus(enemy, status);
    }
    if (!enemy.active) continue;

    // Galvanic Surge shows once while Electrified and Corroded overlap.
    const galvanic = hasStatus(enemy, 'Electrified') && hasStatus(enemy, 'Corroded');
    if (galvanic && !(enemy.reactionFlags & FLAG_GALVANIC)) announce(world, 'Galvanic Surge', enemy);
    enemy.reactionFlags = galvanic ? enemy.reactionFlags | FLAG_GALVANIC : enemy.reactionFlags & ~FLAG_GALVANIC;

    // Septic Wound: Bleeding and Infected together. Infection spreads faster, with no need for a death.
    const septic = hasStatus(enemy, 'Bleeding') && hasStatus(enemy, 'Infected');
    if (septic) {
      if (!(enemy.reactionFlags & FLAG_SEPTIC)) {
        announce(world, 'Septic Wound', enemy);
        enemy.septicTimer = REACTION_RULES.septicSpreadSeconds;
      }
      enemy.septicTimer -= dt;
      if (enemy.septicTimer <= 0) {
        enemy.septicTimer = REACTION_RULES.septicSpreadSeconds;
        const infected = I.Infected;
        spreadInfection(world, enemy, enemy.statusSource[infected] ?? -1, enemy.statusGeneration[infected] ?? 0, 1);
      }
    }
    enemy.reactionFlags = septic ? enemy.reactionFlags | FLAG_SEPTIC : enemy.reactionFlags & ~FLAG_SEPTIC;
  }
}

/** Statuses a Chemical Ballistics trail carries: the weapon's Chemistry payload statuses. */
export function trailStatuses(world: World, weaponIndex: number): StatusEffect[] {
  const resolved = world.weapons[weaponIndex]?.resolved;
  if (!resolved) return [];
  return resolved.statusBuilds.map((build) => build.status).filter((status) => CHEMISTRY_STATUSES.includes(status));
}
