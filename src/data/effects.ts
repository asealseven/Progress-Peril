// Effect descriptors (CLAUDE.md rule 5). Components use them now. Relics,
// research nodes, specialisations and synergies use them in later milestones.
// One modifier system in src/sim applies them.

import type { DamageType } from './damageTypes';
import type { Tag } from './tags';
import type { Tier } from './tiers';
import type { TargetingRule } from './weapons';

/**
 * Stats an "up" or "down" effect changes.
 * - Scaling stats change by the modifier size of the tier: damage, attackSpeed,
 *   range, area, knockback, projectileSpeed, arcWidth, statusDuration,
 *   constructHealth, constructAttackSpeed.
 * - criticalChance adds the tier's own Critical Chance value.
 * - criticalDamage adds the modifier size to the multiplier.
 * - playerArmour adds an Armour source at the tier's own value.
 */
export type StatKey =
  | 'damage'
  | 'attackSpeed'
  | 'range'
  | 'area'
  | 'knockback'
  | 'projectileSpeed'
  | 'arcWidth'
  | 'statusDuration'
  | 'constructHealth'
  | 'constructAttackSpeed'
  | 'criticalChance'
  | 'criticalDamage'
  | 'playerArmour';

/** A stat effect applies only while the condition holds. */
export type EffectCondition =
  | { readonly kind: 'damageType'; readonly damageType: DamageType }
  | { readonly kind: 'playerBelowHalfHealth' }
  /** Limits a status duration effect to one status. */
  | { readonly kind: 'status'; readonly status: string };

/** Milestone at which an effect starts working. Absent means active now. */
type Later = { readonly activeFrom?: number };

export type Effect = Later &
  (
    | {
        readonly kind: 'stat';
        readonly stat: StatKey;
        readonly direction: 'up' | 'down';
        readonly tier: Tier;
        readonly when?: EffectCondition;
      }
    /** Whole-number changes: Projectiles, Penetration, bounces. */
    | { readonly kind: 'count'; readonly stat: 'projectiles' | 'penetration' | 'bounces'; readonly amount: number }
    /** Extra damage of another type, as a share of weapon damage. */
    | { readonly kind: 'addDamage'; readonly damageType: DamageType; readonly tier: Tier }
    | { readonly kind: 'grantTag'; readonly tag: Tag }
    | { readonly kind: 'targeting'; readonly rule: TargetingRule }
    /** Changes how the weapon delivers its attack. */
    | { readonly kind: 'convert'; readonly delivery: 'cone' | 'orbit' }
    | { readonly kind: 'homing'; readonly strength: 'slight' | 'strong'; readonly onlyProperty?: string }
    | { readonly kind: 'spread'; readonly direction: 'down' }
    | { readonly kind: 'onHit'; readonly action: 'explode' | 'arc' | 'pull' | 'slow' | 'grapple' }
    | { readonly kind: 'onKill'; readonly action: 'explode' | 'heal' | 'attackSpeedStack' }
    | { readonly kind: 'onExplosion'; readonly action: 'fragments' }
    | { readonly kind: 'everyNthAttack'; readonly every: number; readonly extraProjectiles: number }
    /** Attack Speed climbs during constant attacks and resets after a pause. */
    | { readonly kind: 'ramp' }
    /** A stat grows after each round with the component installed. */
    | { readonly kind: 'growth'; readonly stat: 'damage'; readonly perRound: Tier; readonly cap: Tier }
    /** The weapon jams briefly at random. */
    | { readonly kind: 'jam' }
    | { readonly kind: 'interval'; readonly action: 'lightningChain' }
    | { readonly kind: 'onDamageTaken'; readonly action: 'smoke' }
    | { readonly kind: 'secondaryAttack'; readonly attack: 'bayonet' }
    | { readonly kind: 'constructRepair' }
    // --- Status effects and reactions (GDD 9.14) ------------------------------
    | { readonly kind: 'statusBuild'; readonly status: string; readonly tier: Tier }
    | { readonly kind: 'statusSpreadOnDeath'; readonly status: string }
    | { readonly kind: 'parasiteOnDeath' }
    | { readonly kind: 'bonusAgainstStatus'; readonly statuses: readonly string[] }
    | { readonly kind: 'extraSynergyTag' }
    // --- Economy: active from Milestone 5 ------------------------------------
    | { readonly kind: 'resourceOnKill'; readonly resource: 'Research Points' | 'Specimens'; readonly tier: Tier }
  );

export type EffectKind = Effect['kind'];
