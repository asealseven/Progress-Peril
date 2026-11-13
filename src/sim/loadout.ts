// Weapon instances, component slot rules (GDD 7.12) and the resolution of a
// weapon with its components into the numbers the combat simulation uses.

import { SCRAP_RETURN, componentFitsFamily } from '../data/components';
import type { ComponentDef, Quality, SlotType } from '../data/components';
import { ECONOMY_RULES } from '../data/economy';
import type { UpgradeStat } from '../data/economy';
import type { DamageType } from '../data/damageTypes';
import { ELEMENTAL_TYPES } from '../data/damageTypes';
import type { Effect, StatKey } from '../data/effects';
import { STATUS_EFFECTS, STATUS_FOR_DAMAGE_TYPE } from '../data/statusEffects';
import type { StatusEffect } from '../data/statusEffects';
import type { Tag } from '../data/tags';
import type { Tier } from '../data/tiers';
import {
  ADAPTATION,
  COMBAT,
  KNOCKBACK_PIXELS,
  TIERS,
  stepTier,
  tierIndex,
  PLAYER_STAT_CAPS,
  STATUS_RULES,
  SYNERGY_RULES,
  WEAPON_RULES,
  tierValue,
} from '../data/tiers';
import type { Delivery, ProjectileBehaviour, TargetingRule, WeaponDef, WeaponZone } from '../data/weapons';
import { RESEARCH_RULES } from '../data/research';
import type { ResearchWhen } from '../data/research';
import { ModifierStack, stackArmour } from './modifiers';
import { NO_RESEARCH } from './research';
import type { ResolvedResearch } from './research';
import { evaluateSynergies } from './synergies';
import type { SynergyReport, SynergyWeapon } from './synergies';
import type { PlayerStats } from './world/types';

// --- Instances ---------------------------------------------------------------

export interface ComponentInstance {
  readonly def: ComponentDef;
  /** Default components arrive with the weapon and scrap for no materials (GDD 7.12). */
  readonly isDefault: boolean;
  /** Rounds completed with the component installed, for growth effects. */
  rounds: number;
  /** Stat steps grown by Mutagenics (GDD 8.12). */
  mutations?: Partial<Record<UpgradeStat, number>>;
}

/** 0 means no grade bought yet. Grades I to IV follow (GDD 7.22). */
export type WeaponGrade = 0 | 1 | 2 | 3 | 4;

export interface WeaponInstance {
  readonly def: WeaponDef;
  /** Each weapon appears at any quality. Quality changes stat steps and default components (GDD 7.17). */
  quality: Quality;
  /** Upgrade Grade I to IV (GDD 7.8). */
  grade: WeaponGrade;
  /** One stat step per grade bought, in a category chosen at purchase (GDD 7.22). */
  upgrades: UpgradeStat[];
  /** Stat steps from the weapon's quality, rolled when the weapon appears. */
  qualitySteps: UpgradeStat[];
  merges: number;
  /** Rounds completed with the weapon equipped. */
  rounds: number;
  readonly components: Partial<Record<SlotType, ComponentInstance>>;
}

/** Weapons a player carries (GDD 7.1). */
export const WEAPON_SLOTS = 3;

export function createWeapon(def: WeaponDef): WeaponInstance {
  return { def, quality: 'Common', grade: 0, upgrades: [], qualitySteps: [], merges: 0, rounds: 0, components: {} };
}

export function createComponent(def: ComponentDef, isDefault = false): ComponentInstance {
  return { def, isDefault, rounds: 0 };
}

/** A deep copy, for editing a loadout before the player confirms. */
export function cloneWeapon(weapon: WeaponInstance): WeaponInstance {
  const components: Partial<Record<SlotType, ComponentInstance>> = {};
  for (const [slot, component] of Object.entries(weapon.components) as Array<[SlotType, ComponentInstance]>) {
    components[slot] = { ...component, ...(component.mutations ? { mutations: { ...component.mutations } } : {}) };
  }
  return {
    def: weapon.def,
    quality: weapon.quality,
    grade: weapon.grade,
    upgrades: [...weapon.upgrades],
    qualitySteps: [...weapon.qualitySteps],
    merges: weapon.merges,
    rounds: weapon.rounds,
    components,
  };
}

// --- Slot rules (GDD 7.12) ---------------------------------------------------

/** The Auxiliary slot opens at upgrade Grade III or at the first merge, whichever comes first. */
export function auxiliaryOpen(weapon: WeaponInstance): boolean {
  return weapon.grade >= 3 || weapon.merges >= 1;
}

export type InstallProblem = 'wrong-family' | 'auxiliary-closed';

/** Checks the slot rules. Returns undefined when the component fits. */
export function installProblem(weapon: WeaponInstance, component: ComponentDef): InstallProblem | undefined {
  if (!componentFitsFamily(component, weapon.def.family)) return 'wrong-family';
  if (component.slot === 'Auxiliary' && !auxiliaryOpen(weapon)) return 'auxiliary-closed';
  return undefined;
}

export function canInstall(weapon: WeaponInstance, component: ComponentDef): boolean {
  return installProblem(weapon, component) === undefined;
}

/**
 * Installs a component in its slot. Each component fits one slot type.
 * Returns the component removed from the slot, which becomes scrap (GDD 7.9).
 */
export function installComponent(
  weapon: WeaponInstance,
  component: ComponentDef,
  isDefault = false,
): ComponentInstance | undefined {
  const problem = installProblem(weapon, component);
  if (problem) throw new Error(`${component.name} does not fit ${weapon.def.name}: ${problem}`);
  const removed = weapon.components[component.slot];
  weapon.components[component.slot] = createComponent(component, isDefault);
  return removed;
}

export function removeComponent(weapon: WeaponInstance, slot: SlotType): ComponentInstance | undefined {
  const removed = weapon.components[slot];
  delete weapon.components[slot];
  return removed;
}

/** Materials a removed component returns (GDD 7.9). */
export function scrapValue(component: ComponentInstance): number {
  return component.isDefault ? 0 : SCRAP_RETURN[component.def.quality];
}

/** Installed components in slot order. A closed Auxiliary slot holds nothing. */
export function installedComponents(weapon: WeaponInstance): ComponentInstance[] {
  const order: SlotType[] = ['Structure', 'Mechanism', 'Payload', 'Auxiliary'];
  const result: ComponentInstance[] = [];
  for (const slot of order) {
    const component = weapon.components[slot];
    if (!component) continue;
    if (slot === 'Auxiliary' && !auxiliaryOpen(weapon)) continue;
    result.push(component);
  }
  return result;
}

/** Intrinsic tags, plus every tag from installed components, plus granted tags (GDD 7.5, 7.12). */
export function weaponTags(weapon: WeaponInstance): Tag[] {
  const tags = new Set<Tag>(weapon.def.tags);
  for (const component of installedComponents(weapon)) {
    for (const tag of component.def.tags) tags.add(tag);
    for (const effect of component.def.effects) {
      if (effect.kind === 'grantTag' && isActive(effect)) tags.add(effect.tag);
    }
  }
  return [...tags];
}

// --- Resolution --------------------------------------------------------------

/** The milestone the build has reached. Effects marked for a later milestone stay inactive. */
export const CURRENT_MILESTONE = 6;

export function isActive(effect: Effect): boolean {
  return (effect.activeFrom ?? 0) <= CURRENT_MILESTONE;
}

export interface DamagePart {
  readonly type: DamageType;
  readonly amount: number;
}

export interface WeaponTriggers {
  readonly explodeOnHit: boolean;
  readonly arcOnHit: boolean;
  readonly pullOnHit: boolean;
  readonly slowOnHit: boolean;
  readonly grappleOnHit: boolean;
  readonly explodeOnKill: boolean;
  readonly healOnKill: boolean;
  readonly attackSpeedStackOnKill: boolean;
  readonly fragmentsOnExplosion: boolean;
  /** Every Nth attack fires extra projectiles. 0 means never. */
  readonly extraProjectileEvery: number;
  readonly extraProjectiles: number;
  readonly ramp: boolean;
  readonly jam: boolean;
  readonly lightning: boolean;
  readonly smoke: boolean;
  readonly bayonet: boolean;
  /** Parasite Larvae: Infected enemies release a parasite on death. */
  readonly parasite: boolean;
  /** Specimen Jar: kills grant extra Specimens. */
  readonly specimenOnKill: boolean;
  /** Research Notebook: kills grant extra Research Points. */
  readonly researchOnKill: boolean;
}

/** Meter fill per hit for one status, as a share of a Normal enemy meter (GDD 9.14). */
export interface StatusBuild {
  readonly status: StatusEffect;
  readonly share: number;
}

export interface InactiveEffect {
  readonly component: string;
  readonly activeFrom: number;
}

/** A weapon with every installed component applied. */
export interface ResolvedWeapon {
  readonly def: WeaponDef;
  readonly tags: readonly Tag[];
  readonly delivery: Delivery;
  /** GDD 7.16 behaviours the weapon shows, for the build panel. */
  readonly behaviours: readonly ProjectileBehaviour[];
  readonly targeting: TargetingRule;
  /** Weapons with the Precise tag take Marked enemies first (GDD 7.15). */
  readonly markedFirst: boolean;
  /** Damage per hit by type, after static modifiers. */
  readonly damageParts: readonly DamagePart[];
  readonly damage: number;
  /** Attacks per second before component percentages. */
  readonly baseAttacksPerSecond: number;
  /** Summed component Attack Speed percentage. Runtime bonuses add here (same source type). */
  readonly attackSpeedBonus: number;
  /** Attacks per second with static modifiers. */
  readonly attacksPerSecond: number;
  /** Extra component Attack Speed while player health is below half. */
  readonly lowHealthAttackSpeed: number;
  readonly range: number;
  readonly area: number;
  readonly criticalChance: number;
  readonly criticalDamage: number;
  /** Push per hit, pixels. */
  readonly knockback: number;
  /** Projectile speed, pixels per second. */
  readonly projectileSpeed: number;
  /** Multiplier for melee arc width. */
  readonly arcWidth: number;
  readonly projectiles: number;
  readonly penetration: number;
  readonly bounces: number;
  readonly chainJumps: number;
  /** Total fan angle, degrees. */
  readonly spreadDegrees: number;
  /** Homing turn rate, radians per second. 0 means none. */
  readonly homing: number;
  /** Homing seeks only enemies with this property. */
  readonly homingProperty?: string;
  readonly blast: boolean;
  readonly zone?: WeaponZone;
  readonly killExplosion: boolean;
  readonly constructHealthFactor: number;
  readonly constructAttackSpeedFactor: number;
  readonly constructRepair: boolean;
  readonly triggers: WeaponTriggers;
  /** Components with effects waiting for a later milestone. */
  readonly inactive: readonly InactiveEffect[];

  // --- Status effects (GDD 9.14) ---
  /** Statuses the weapon's hits build. */
  readonly statusBuilds: readonly StatusBuild[];
  /** Multiplier for the duration of statuses this weapon triggers. */
  readonly statusDuration: number;
  /** Extra duration multiplier for single statuses. */
  readonly statusDurationFor: Readonly<Partial<Record<StatusEffect, number>>>;
  /** Summed component Damage percentage, so per-hit component bonuses add to the same source. */
  readonly componentDamageBonus: number;
  /** Resonance Fork: bonus damage against enemies with one of these statuses. */
  readonly bonusAgainst: readonly StatusEffect[];
  readonly bonusAgainstAmount: number;

  // --- Synergies (GDD 7.19) ---
  /** Ids of the active synergies this weapon takes part in. */
  readonly synergies: readonly string[];
  /** Conductive Strike: extra jumps for Electric chains. */
  readonly extraChainJumps: number;
  /** Pressure Burst: multiplier for explosion radius. */
  readonly explosionArea: number;
  /** Ballistic Tables: Arcing shots lead moving targets. */
  readonly leadTargets: boolean;
  /** Share of a full lead: 1, or less for a slight lead (Trigonometry). */
  readonly leadShare: number;
  /** Masterwork Forging and Mutagenics steps show in the build panel. */
  readonly researchDamageBonus: number;
  /** Chain depth limit for this weapon's chain reactions (GDD 7.20). */
  readonly chainDepthLimit: number;
  /** Clockwork Precision: constructs roll critical hits with player Critical Chance. */
  readonly constructsCrit: boolean;
  /** Bioengineering: constructs regenerate. */
  readonly constructRegen: boolean;
}

/** True when the weapon takes part in the active synergy. */
export function hasSynergy(weapon: ResolvedWeapon, id: string): boolean {
  return weapon.synergies.includes(id);
}

/** Statuses a weapon builds with its components, before synergies (GDD 9.14, NOTES.md). */
export function weaponStatusBuilds(weapon: WeaponInstance): { builds: StatusBuild[]; payload: StatusEffect[] } {
  const shares = new Map<StatusEffect, number>();
  const payload: StatusEffect[] = [];
  const add = (status: StatusEffect, share: number): void => {
    shares.set(status, (shares.get(status) ?? 0) + share);
  };
  const intrinsic = tierValue('statusBuildUp', STATUS_RULES.intrinsicBuild);

  // Elemental weapons build their type's status. Added damage types count too.
  const types = [...weapon.def.damageTypes];
  for (const component of installedComponents(weapon)) {
    for (const effect of component.def.effects) {
      if (effect.kind === 'addDamage' && isActive(effect)) types.push(effect.damageType);
    }
  }
  for (const type of new Set(types)) {
    const status = STATUS_FOR_DAMAGE_TYPE[type];
    if (status && ELEMENTAL_TYPES.includes(type)) add(status, intrinsic);
  }
  // Weapons whose GDD 7.17 text names a status.
  if (weapon.def.builds) add(weapon.def.builds, intrinsic);

  for (const component of installedComponents(weapon)) {
    for (const effect of component.def.effects) {
      if (effect.kind !== 'statusBuild' || !isActive(effect)) continue;
      const status = STATUS_EFFECTS.find((name) => name === effect.status);
      if (!status) continue;
      add(status, tierValue('statusBuildUp', effect.tier));
      if (component.def.slot === 'Payload' && !payload.includes(status)) payload.push(status);
    }
  }
  return { builds: [...shares].map(([status, share]) => ({ status, share })), payload };
}

/** True when a Grand Calculus Engine sits in an open slot. */
function hasWildcard(weapon: WeaponInstance): boolean {
  return installedComponents(weapon).some((component) =>
    component.def.effects.some((effect) => effect.kind === 'extraSynergyTag' && isActive(effect)),
  );
}

/** What the synergy rules read from a weapon. */
export function synergyProfile(weapon: WeaponInstance): SynergyWeapon {
  const status = weaponStatusBuilds(weapon);
  return {
    tags: weaponTags(weapon),
    family: weapon.def.family,
    statuses: status.builds.map((build) => build.status),
    payloadStatuses: status.payload,
    wildcard: hasWildcard(weapon),
  };
}

type WeaponStat = StatKey;

/** Stat steps a weapon holds from grades and quality (GDD 7.17, 7.22). */
export function upgradeSteps(weapon: WeaponInstance, stat: UpgradeStat): number {
  let steps = 0;
  for (const entry of weapon.upgrades) if (entry === stat) steps++;
  for (const entry of weapon.qualitySteps) if (entry === stat) steps++;
  return steps;
}

/**
 * A weapon tier value after whole steps. Past Extreme each step multiplies by
 * the ratio of the last two tiers of the row (NOTES.md, GDD 7.22).
 */
export function steppedWeaponValue(
  stat: 'weaponDamage' | 'weaponAttackSpeed' | 'weaponRange' | 'weaponArea' | 'criticalChance',
  tier: Tier,
  steps: number,
): number {
  const target = tierIndex(tier) + steps;
  const top = TIERS.length - 1;
  if (target <= top) return tierValue(stat, stepTier(tier, steps));
  const extreme = tierValue(stat, 'Extreme');
  return extreme * (extreme / tierValue(stat, 'High')) ** (target - top);
}

/** A Critical Chance after whole steps: the next tier value above the current chance, then 15 points per step. */
function steppedCritical(chance: number, steps: number): number {
  let value = chance;
  for (let i = 0; i < steps; i++) {
    const next = TIERS.map((tier) => tierValue('criticalChance', tier)).find((entry) => entry > value + 1e-9);
    value = next ?? value + 0.15;
  }
  return value;
}

function tierSize(effect: Extract<Effect, { kind: 'stat' }>): number {
  return tierValue('modifierSize', effect.tier) * (effect.direction === 'up' ? 1 : -1);
}

/**
 * Applies every installed component and every active synergy to a weapon (CLAUDE.md rule 5).
 * `synergies` lists the ids of the active synergies the weapon takes part in.
 */
export function resolveWeapon(
  weapon: WeaponInstance,
  player: PlayerStats,
  synergies: readonly string[] = [],
  research: ResolvedResearch = NO_RESEARCH,
  activeSynergies = 0,
): ResolvedWeapon {
  const def = weapon.def;
  const components = installedComponents(weapon);
  const stack = new ModifierStack<WeaponStat>();
  const tags = weaponTags(weapon);
  const primaryType = def.damageTypes[0] ?? 'Impact';

  let delivery: Delivery = def.delivery;
  let targeting: TargetingRule = def.targeting;
  let projectiles = def.projectiles ?? 1;
  let penetration = def.penetration ?? 0;
  let bounces = def.bounces ?? 0;
  let spreadFactor = 1;
  let homing = 0;
  let homingProperty: string | undefined;
  let criticalChanceBonus = 0;
  let criticalDamageBonus = 0;
  let knockback = 0;
  let knockbackFactor = 1;
  const mutationSteps: Partial<Record<UpgradeStat, number>> = {};
  let lowHealthAttackSpeed = 0;
  let constructRepair = false;
  let chainDepthLimit: number = WEAPON_RULES.chainDepthLimit;
  let bonusAgainst: StatusEffect[] = [];
  const statusDurationFor: Partial<Record<StatusEffect, number>> = {};
  const typeDamage = new Map<DamageType, number>();
  const addedDamage: Array<{ type: DamageType; share: number }> = [];
  const inactive: InactiveEffect[] = [];
  const triggers = {
    explodeOnHit: false,
    arcOnHit: false,
    pullOnHit: false,
    slowOnHit: false,
    grappleOnHit: false,
    explodeOnKill: false,
    healOnKill: false,
    attackSpeedStackOnKill: false,
    fragmentsOnExplosion: false,
    extraProjectileEvery: 0,
    extraProjectiles: 0,
    ramp: false,
    jam: false,
    lightning: false,
    smoke: false,
    bayonet: false,
    parasite: false,
    specimenOnKill: false,
    researchOnKill: false,
  };

  for (const component of components) {
    for (const effect of component.def.effects) {
      if (!isActive(effect)) {
        if (!inactive.some((entry) => entry.component === component.def.name)) {
          inactive.push({ component: component.def.name, activeFrom: effect.activeFrom ?? 0 });
        }
        continue;
      }
      switch (effect.kind) {
        case 'stat': {
          const size = tierSize(effect);
          if (effect.stat === 'criticalChance') {
            // Chance stats add the tier's own value (NOTES.md, GDD 7.18).
            const applies = !effect.when || (effect.when.kind === 'damageType' && effect.when.damageType === primaryType);
            if (applies) {
              criticalChanceBonus += tierValue('criticalChance', effect.tier) * (effect.direction === 'up' ? 1 : -1);
            }
          } else if (effect.stat === 'criticalDamage') {
            criticalDamageBonus += size;
          } else if (effect.stat === 'knockback') {
            knockback += KNOCKBACK_PIXELS[effect.tier] * (effect.direction === 'up' ? 1 : -1);
          } else if (effect.stat === 'playerArmour') {
            // Applied to the player in resolveLoadout.
          } else if (effect.when?.kind === 'status') {
            const status = STATUS_EFFECTS.find((name) => name === (effect.when as { status: string }).status);
            if (status && effect.stat === 'statusDuration') {
              statusDurationFor[status] = (statusDurationFor[status] ?? 1) + size;
            }
          } else if (effect.when?.kind === 'damageType') {
            if (effect.stat === 'damage') {
              typeDamage.set(effect.when.damageType, (typeDamage.get(effect.when.damageType) ?? 0) + size);
            }
          } else if (effect.when?.kind === 'playerBelowHalfHealth') {
            if (effect.stat === 'attackSpeed') lowHealthAttackSpeed += size;
          } else {
            stack.addPercent(effect.stat, 'components', size);
          }
          break;
        }
        case 'count':
          if (effect.stat === 'projectiles') projectiles += effect.amount;
          else if (effect.stat === 'penetration') penetration += effect.amount;
          else bounces += effect.amount;
          break;
        case 'addDamage':
          addedDamage.push({ type: effect.damageType, share: tierValue('modifierSize', effect.tier) });
          break;
        case 'targeting':
          targeting = effect.rule;
          break;
        case 'convert':
          delivery = effect.delivery;
          break;
        case 'homing': {
          const rate = effect.strength === 'strong' ? WEAPON_RULES.homingStrong : WEAPON_RULES.homingSlight;
          if (rate > homing) {
            homing = rate;
            homingProperty = effect.onlyProperty;
          }
          break;
        }
        case 'spread':
          spreadFactor *= WEAPON_RULES.spreadDownFactor;
          break;
        case 'onHit':
          if (effect.action === 'explode') triggers.explodeOnHit = true;
          else if (effect.action === 'arc') triggers.arcOnHit = true;
          else if (effect.action === 'pull') triggers.pullOnHit = true;
          else if (effect.action === 'slow') triggers.slowOnHit = true;
          else triggers.grappleOnHit = true;
          break;
        case 'onKill':
          if (effect.action === 'explode') triggers.explodeOnKill = true;
          else if (effect.action === 'heal') triggers.healOnKill = true;
          else triggers.attackSpeedStackOnKill = true;
          break;
        case 'onExplosion':
          triggers.fragmentsOnExplosion = true;
          break;
        case 'everyNthAttack':
          triggers.extraProjectileEvery = effect.every;
          triggers.extraProjectiles += effect.extraProjectiles;
          break;
        case 'ramp':
          triggers.ramp = true;
          break;
        case 'growth': {
          const step = tierValue('modifierSize', effect.perRound);
          const cap = tierValue('modifierSize', effect.cap);
          stack.addPercent(effect.stat, 'components', Math.min(cap, step * component.rounds));
          break;
        }
        case 'jam':
          triggers.jam = true;
          break;
        case 'interval':
          triggers.lightning = true;
          break;
        case 'onDamageTaken':
          triggers.smoke = true;
          break;
        case 'secondaryAttack':
          triggers.bayonet = true;
          break;
        case 'constructRepair':
          constructRepair = true;
          break;
        case 'parasiteOnDeath':
          triggers.parasite = true;
          break;
        case 'resourceOnKill':
          if (effect.resource === 'Specimens') triggers.specimenOnKill = true;
          else triggers.researchOnKill = true;
          break;
        case 'bonusAgainstStatus':
          bonusAgainst = STATUS_EFFECTS.filter((name) => effect.statuses.includes(name));
          break;
        case 'extraSynergyTag':
          // The Grand Calculus Engine also raises the chain depth limit (GDD 7.20).
          chainDepthLimit += SYNERGY_RULES.calculusChainDepth;
          break;
        default:
          // Tag grants are read by weaponTags. Later-milestone kinds never reach here.
          break;
      }
    }
  }

  // Mutagenics: stat steps grown on Organic components (GDD 8.12).
  for (const component of components) {
    for (const [stat, steps] of Object.entries(component.mutations ?? {}) as Array<[UpgradeStat, number]>) {
      mutationSteps[stat] = (mutationSteps[stat] ?? 0) + steps;
    }
  }

  // Research nodes (GDD 8.12). Bonuses share the research source, so they add.
  const ruleCount = (name: Parameters<ResolvedResearch['rules']['get']>[0]): number => research.rules.get(name) ?? 0;
  const weaponTypes = new Set<DamageType>([...def.damageTypes, ...addedDamage.map((entry) => entry.type)]);
  const researchApplies = (when: ResearchWhen | undefined): boolean => {
    if (!when) return true;
    if ('damageType' in when) return weaponTypes.has(when.damageType);
    if ('anyDamageType' in when) return when.anyDamageType.some((type) => weaponTypes.has(type));
    if ('tag' in when) return tags.includes(when.tag);
    if ('family' in when) return def.family === when.family;
    return delivery === when.delivery;
  };
  const researchTypeDamage = new Map<DamageType, number>();
  let researchBuild = 0;
  for (const effect of research.weaponStats) {
    if (!researchApplies(effect.when)) continue;
    const size = tierValue('modifierSize', effect.tier);
    if (effect.stat === 'criticalChance') criticalChanceBonus += tierValue('criticalChance', effect.tier);
    else if (effect.stat === 'criticalDamage') criticalDamageBonus += size;
    else if (effect.stat === 'knockback') {
      // Research raises knockback a weapon has. Weapons with none stay still.
      knockbackFactor += size;
    } else if (effect.stat === 'statusBuildUp') researchBuild += size;
    else if (effect.stat === 'damage' && effect.when && 'damageType' in effect.when) {
      // Typed bonuses raise the matching share of the damage.
      const type = effect.when.damageType;
      researchTypeDamage.set(type, (researchTypeDamage.get(type) ?? 0) + size);
    } else stack.addPercent(effect.stat, 'research', size);
  }
  for (const effect of research.statusDurations) {
    statusDurationFor[effect.status] = (statusDurationFor[effect.status] ?? 1) + tierValue('modifierSize', effect.tier);
  }
  // Combinatorics: each active synergy grants Damage up, Minimal.
  if (ruleCount('synergyDamage') > 0 && activeSynergies > 0) {
    stack.addPercent('damage', 'research', tierValue('modifierSize', 'Minimal') * activeSynergies);
  }
  chainDepthLimit += ruleCount('chainDepth');
  // Magnetic Fields: Magnetic projectiles home slightly.
  if (ruleCount('magneticHoming') > 0 && tags.includes('Magnetic') && homing === 0) homing = WEAPON_RULES.homingSlight;

  // The Living Arsenal adapts each round (GDD 7.17): a weapon-level Damage bonus.
  if (def.id === 'living-arsenal') {
    const step = tierValue('modifierSize', WEAPON_RULES.adaptPerRound);
    const cap = tierValue('modifierSize', WEAPON_RULES.adaptCap);
    stack.addPercent('damage', 'weapon', Math.min(cap, step * weapon.rounds));
  }

  // Each merge improves base statistics (GDD 7.10).
  if (weapon.merges > 0) {
    stack.addPercent('damage', 'weapon', tierValue('modifierSize', ECONOMY_RULES.mergeDamage) * weapon.merges);
  }

  // Synergies with fixed effects on the weapon's numbers (GDD 7.19).
  const active = (id: string): boolean => synergies.includes(id);
  if (active('rail-shot')) penetration += 2;
  if (active('electromagnetic-launchers')) {
    penetration += SYNERGY_RULES.launcherPenetration;
    stack.addPercent('range', 'synergies', tierValue('modifierSize', 'Medium'));
  }
  const arcingWeapon = tags.includes('Arcing');
  if (active('ballistic-tables') && arcingWeapon) {
    stack.addPercent('area', 'synergies', tierValue('modifierSize', 'Low'));
  }
  if (active('bioengineering')) {
    const step = tierValue('modifierSize', SYNERGY_RULES.bioGrowthPerRound);
    const cap = tierValue('modifierSize', SYNERGY_RULES.bioGrowthCap);
    stack.addPercent('damage', 'synergies', Math.min(cap, step * weapon.rounds));
  }

  // Whole stat steps: grades, quality, Mutagenics, and Masterwork Forging's extra Grade IV step.
  const masterwork = ruleCount('masterworkForging') > 0 && weapon.grade >= 4 ? weapon.upgrades[3] : undefined;
  const steps = (stat: UpgradeStat): number =>
    upgradeSteps(weapon, stat) + (mutationSteps[stat] ?? 0) + (masterwork === stat ? 1 : 0);

  // Damage (GDD 7.14 steps 1 to 3). Two damage types split the damage evenly.
  // Grades and quality move the base tier by whole steps (GDD 7.22).
  const baseDamage = steppedWeaponValue('weaponDamage', def.damage, steps('damage'));
  const share = 1 / def.damageTypes.length;
  const damageParts: DamagePart[] = def.damageTypes.map((type) => ({
    type,
    amount: stack.resolve('damage', baseDamage * share, {
      components: typeDamage.get(type) ?? 0,
      research: researchTypeDamage.get(type) ?? 0,
    }),
  }));
  for (const added of addedDamage) {
    const amount =
      stack.resolve('damage', baseDamage, {
        components: typeDamage.get(added.type) ?? 0,
        research: researchTypeDamage.get(added.type) ?? 0,
      }) * added.share;
    damageParts.push({ type: added.type, amount });
  }
  const damage = damageParts.reduce((sum, part) => sum + part.amount, 0);

  const baseAttacksPerSecond = steppedWeaponValue(
    'weaponAttackSpeed',
    def.attackSpeed,
    steps('attackSpeed'),
  );
  const buildFactor = ECONOMY_RULES.statusStepFactor ** steps('statusBuildUp') * (1 + researchBuild);
  // Pharmacology: Poisoned and Infected meters fill faster.
  const toxicFactor = ruleCount('fasterToxicMeters') > 0 ? 1 + tierValue('modifierSize', 'Medium') : 1;
  const statusBuilds = weaponStatusBuilds(weapon).builds.map((build) => ({
    status: build.status,
    share: Math.min(
      1,
      build.share * buildFactor * (build.status === 'Poisoned' || build.status === 'Infected' ? toxicFactor : 1),
    ),
  }));
  const grant = (status: StatusEffect): void => {
    if (statusBuilds.some((build) => build.status === status)) return;
    statusBuilds.push({ status, share: tierValue('statusBuildUp', RESEARCH_RULES.grantedBuild) });
  };
  // Bioelectricity: Organic weapons build Electrified.
  if (ruleCount('organicElectrified') > 0 && tags.includes('Organic')) grant('Electrified');
  // Explosive Ordnance: Siege explosions build Burning.
  if (ruleCount('siegeBurning') > 0 && def.family === 'Siege' && (def.blast || tags.includes('Explosive'))) grant('Burning');
  // Living Battery and Fungal Machinery: companions and constructs build statuses on hit.
  if (ruleCount('companionsElectrify') > 0 && delivery === 'companion') grant('Electrified');
  if (ruleCount('constructsInfect') > 0 && (delivery === 'turret' || delivery === 'companion' || delivery === 'trap')) {
    grant('Infected');
  }
  const leadAll = ruleCount('leadTargets') > 0;
  const leadArcing = (active('ballistic-tables') || ruleCount('arcingLead') > 0) && arcingWeapon;
  const attackSpeedBonus = stack.percentFor('attackSpeed', 'components');

  // Conversions change which numbers matter.
  const behaviours = new Set<ProjectileBehaviour>(def.behaviours);
  if (delivery !== def.delivery) {
    behaviours.clear();
    behaviours.add(delivery === 'cone' ? 'Cone' : 'Orbit');
  }
  const firesProjectiles = delivery === 'straight' || delivery === 'arcing' || delivery === 'turret';
  if (firesProjectiles && delivery !== 'arcing') {
    if (penetration > 0) behaviours.add('Piercing');
    if (bounces > 0) behaviours.add('Ricochet');
    if (homing > 0) behaviours.add('Homing');
  }
  if (triggers.arcOnHit || triggers.lightning) behaviours.add('Chain');

  const baseSpread =
    def.spreadDegrees ?? (projectiles > 1 ? WEAPON_RULES.extraProjectileSpread * (projectiles - 1) : 0);
  const extraSpread =
    def.spreadDegrees !== undefined && projectiles > (def.projectiles ?? 1)
      ? WEAPON_RULES.extraProjectileSpread * (projectiles - (def.projectiles ?? 1))
      : 0;

  return {
    def,
    tags,
    delivery,
    behaviours: [...behaviours],
    targeting,
    markedFirst: tags.includes('Precise'),
    damageParts,
    damage,
    baseAttacksPerSecond,
    attackSpeedBonus,
    attacksPerSecond: stack.resolve('attackSpeed', baseAttacksPerSecond),
    lowHealthAttackSpeed,
    range: stack.resolve('range', steppedWeaponValue('weaponRange', def.range, steps('range'))),
    area: stack.resolve('area', steppedWeaponValue('weaponArea', def.area, steps('area'))),
    criticalChance: Math.min(
      1,
      Math.max(
        0,
        steppedCritical(
          def.criticalChance ? tierValue('criticalChance', def.criticalChance) : player.criticalChance,
          steps('criticalChance'),
        ) + criticalChanceBonus,
      ),
    ),
    criticalDamage: Math.max(1, player.criticalDamage + criticalDamageBonus),
    knockback: Math.max(0, knockback * knockbackFactor),
    projectileSpeed: stack.resolve('projectileSpeed', COMBAT.projectileSpeed * (def.projectileSpeedFactor ?? 1)),
    arcWidth: stack.factor('arcWidth'),
    projectiles: Math.max(1, projectiles),
    penetration: Math.max(0, penetration),
    bounces: Math.max(0, bounces),
    chainJumps: def.chainJumps ?? 0,
    spreadDegrees: (baseSpread + extraSpread) * spreadFactor,
    homing,
    homingProperty,
    blast: delivery === def.delivery ? (def.blast ?? false) : false,
    zone: delivery === def.delivery ? def.zone : undefined,
    killExplosion: def.killExplosion ?? false,
    constructHealthFactor: stack.factor('constructHealth'),
    constructAttackSpeedFactor: stack.factor('constructAttackSpeed'),
    constructRepair,
    triggers,
    inactive,
    statusBuilds,
    statusDuration: stack.factor('statusDuration'),
    statusDurationFor,
    componentDamageBonus: stack.percentFor('damage', 'components'),
    bonusAgainst,
    bonusAgainstAmount: tierValue('modifierSize', SYNERGY_RULES.resonanceBonus),
    synergies,
    extraChainJumps: (active('conductive-strike') ? 1 : 0) + ruleCount('extraChainJump'),
    explosionArea:
      (active('pressure-burst') ? 1 + tierValue('modifierSize', 'Medium') : 1) *
      (1 + tierValue('modifierSize', 'Low') * ruleCount('explosionArea')),
    leadTargets: leadAll || leadArcing,
    leadShare:
      leadAll || (active('ballistic-tables') && arcingWeapon) ? 1 : leadArcing ? RESEARCH_RULES.slightLead : 0,
    researchDamageBonus: stack.percentFor('damage', 'research'),
    chainDepthLimit,
    constructsCrit: active('clockwork-precision'),
    constructRegen: active('bioengineering') || (ruleCount('companionRegen') > 0 && delivery === 'companion'),
  };
}

export interface ResolvedLoadout {
  readonly playerStats: PlayerStats;
  readonly weapons: ResolvedWeapon[];
  /** Active synergies, near misses and locked research synergies, for the build panel. */
  readonly report: SynergyReport;
  /** Ids of every active synergy. */
  readonly synergies: readonly string[];
}

export interface LoadoutOptions {
  /** Ids of research synergies opened by research nodes (Milestone 6). */
  readonly researchSynergies?: readonly string[];
  /** Researched nodes (GDD 8.12). Their research synergies join the list above. */
  readonly research?: ResolvedResearch;
}

/**
 * Resolves every weapon, the active synergies and the player-level effects of
 * components and synergies. Runs once per round, when the player presses Start.
 */
export function resolveLoadout(
  weapons: readonly WeaponInstance[],
  base: PlayerStats,
  options: LoadoutOptions = {},
): ResolvedLoadout {
  const research = options.research ?? NO_RESEARCH;
  const report = evaluateSynergies(weapons.map(synergyProfile), [
    ...(options.researchSynergies ?? []),
    ...research.synergies,
  ]);
  const synergies = report.active.map((entry) => entry.def.id);
  const forWeapon = (index: number): string[] =>
    report.active.filter((entry) => entry.weapons.includes(index)).map((entry) => entry.def.id);

  const armourSources = [base.armour];
  const rules = research.rules;
  const percent = { pickupRadius: 0, regeneration: 0, moveSpeed: 0 };
  let evasion = base.evasion;
  let researchYield = base.researchYield;
  let fortune = base.fortune;
  for (const effect of research.playerStats) {
    const size = tierValue('modifierSize', effect.tier);
    if (effect.stat === 'armour') armourSources.push(tierValue('armour', effect.tier));
    else if (effect.stat === 'evasion') evasion += tierValue('evasion', effect.tier);
    else if (effect.stat === 'researchYield') researchYield += size;
    else if (effect.stat === 'fortune') fortune += size;
    else percent[effect.stat] += size;
  }
  for (const weapon of weapons) {
    for (const component of installedComponents(weapon)) {
      for (const effect of component.def.effects) {
        if (effect.kind !== 'stat' || effect.stat !== 'playerArmour' || !isActive(effect)) continue;
        if (effect.direction === 'up') armourSources.push(tierValue('armour', effect.tier));
      }
    }
  }
  const armourCap = tierValue('armour', PLAYER_STAT_CAPS.armour);
  const adaptive = synergies.includes('adaptive-armour') ? SYNERGY_RULES.adaptiveFactor : 1;
  const playerStats: PlayerStats = {
    ...base,
    armour: Math.min(armourCap, stackArmour(armourSources)),
    // Magnetic Field: Pickup Radius up, High.
    pickupRadius:
      base.pickupRadius *
      (synergies.includes('magnetic-field') ? 1 + tierValue('modifierSize', 'High') : 1) *
      (1 + percent.pickupRadius),
    regeneration: base.regeneration * (1 + percent.regeneration),
    moveSpeed: base.moveSpeed * (1 + percent.moveSpeed),
    evasion: Math.min(Math.max(base.evasion, tierValue('evasion', PLAYER_STAT_CAPS.evasion)), evasion),
    researchYield,
    fortune,
    // Adaptive Armour: damage adaptation gain and cap double.
    // Immunology raises the gain. Antitoxins raises the cap one step.
    adaptationPerHit:
      base.adaptationPerHit * adaptive * (1 + tierValue('modifierSize', 'Medium') * (rules.get('adaptationGain') ?? 0)),
    adaptationCap: (base.adaptationCap + ADAPTATION.capStep * (rules.get('adaptationCap') ?? 0)) * adaptive,
  };
  return {
    playerStats,
    weapons: weapons.map((weapon, index) => resolveWeapon(weapon, playerStats, forWeapon(index), research, synergies.length)),
    report,
    synergies,
  };
}
