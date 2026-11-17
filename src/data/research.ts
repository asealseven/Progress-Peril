// The research web (GDD 8.11 to 8.13): 120 nodes. 18 per discipline across four
// rings, plus 30 cross-discipline nodes, 10 of them hidden.
// `effect` keeps the GDD wording for the node card. `effects` holds the typed
// descriptors src/sim/research.ts applies (CLAUDE.md rule 5).

import type { DamageType } from './damageTypes';
import type { Material } from './economy';
import type { KingdomName } from './palette';
import type { StatusEffect } from './statusEffects';
import type { Tag } from './tags';
import type { Tier } from './tiers';
import type { Delivery, Discipline, WeaponFamily } from './weapons';

export const DISCIPLINES: readonly Discipline[] = ['Chemistry', 'Physics', 'Mathematics', 'Engineering', 'Biology'];

export type Ring = 'Centre' | 'Inner' | 'Middle' | 'Outer' | 'Cross' | 'Hidden';

/** Research Points and materials per ring (GDD 8.11). Cross and hidden nodes take the amount from each linked discipline. */
export const RESEARCH_COSTS: Readonly<Record<Ring, { readonly points: number; readonly materials: number }>> = {
  Centre: { points: 15, materials: 0 },
  Inner: { points: 35, materials: 1 },
  Middle: { points: 70, materials: 3 },
  Outer: { points: 140, materials: 6 },
  Cross: { points: 110, materials: 3 },
  Hidden: { points: 110, materials: 3 },
};

export const DISCIPLINE_MATERIAL: Readonly<Record<Discipline, Material>> = {
  Chemistry: 'Reagents',
  Physics: 'Crystals',
  Biology: 'Specimens',
  Engineering: 'Scrap',
  Mathematics: 'Crystals',
};

/** Mastery points per node researched (GDD 8.13). Cross and hidden nodes give the amount to each linked discipline. */
export const MASTERY_POINTS: Readonly<Record<Ring, number>> = {
  Centre: 1,
  Inner: 2,
  Middle: 3,
  Outer: 5,
  Cross: 2,
  Hidden: 2,
};

export const MASTERY_RANKS = [
  { name: 'Novice', points: 0 },
  { name: 'Practitioner', points: 13 },
  { name: 'Expert', points: 60 },
  { name: 'Master', points: 140 },
  { name: 'Grandmaster', points: 280 },
] as const;
export type MasteryRank = (typeof MASTERY_RANKS)[number]['name'];

/** Research Points per defeated enemy (GDD 8.5). */
export const RESEARCH_REWARDS = { normal: 1, elite: 8, champion: 25, miniBoss: 20, boss: 50, escort: 20 } as const;

/** Captured research after a territory: the beaten kingdom's disciplines (GDD 5.8). */
export const KINGDOM_DISCIPLINES: Readonly<Record<KingdomName, readonly Discipline[]>> = {
  Keldrath: ['Engineering'],
  Merovant: ['Engineering'],
  Myrathis: ['Chemistry', 'Biology'],
  Orthelyn: ['Physics', 'Mathematics'],
  Nymora: ['Biology'],
};

/** Numbers with no GDD value. NOTES.md records each choice. Milestone 12 tunes them. */
export const RESEARCH_RULES = {
  /** Reallocation refunds this share of Research Points and materials, rounded down (GDD 8.10). */
  refundShare: 0.75,
  /** Efficient Research: Research Point costs down 10 per cent. */
  efficientShare: 0.9,
  /** Compound Interest: share of unspent gold per round, and the most gold gained. */
  interestShare: 0.05,
  interestCap: 25,
  /** "Lasts longer" on a status. */
  longerStatus: 'Medium',
  /** Neurotoxins: speed of a Poisoned enemy. */
  poisonSlowFactor: 0.8,
  /** Gravity Studies: pixels an area effect pulls each enemy toward its centre. */
  gravityPull: 14,
  /** Ballistic Pendulum: Stunned build-up when knockback meets a wall. */
  wallStun: 'Medium',
  /** Trigonometry: share of a full lead for Arcing shots. */
  slightLead: 0.5,
  /** Infinite Series: damage kept per chain generation, up from 75 per cent. */
  slowFalloff: 0.85,
  /** "A small amount of health" for Symbiosis and Medical Alchemy. */
  smallHeal: 1,
  /** Spontaneous Combustion: reach of the spread to one adjacent enemy. */
  burnSpreadRange: 70,
  /** Build-up from Probability Storm, Living Battery, Fungal Machinery, Bioelectricity and Explosive Ordnance. */
  grantedBuild: 'Low',
  /** Mutagenics: the most steps one stat of one component gains. High sits three steps above Minimal. */
  mutationCap: 3,
  /** Hidden conditions (GDD 8.12). */
  steamBursts: 50,
  criticalBurst: 10,
  criticalBurstSeconds: 1,
  lowHealthShare: 0.1,
} as const;

/** Named rules for effects no stat descriptor fits. src/sim reads them by id. */
export type ResearchRule =
  | 'reactionDamage'
  | 'fumesSize'
  | 'explosionArea'
  | 'corrodedExtraStep'
  | 'poisonSlows'
  | 'chainDepth'
  | 'fireIgnoresArmour'
  | 'corrodedVulnerable'
  | 'magneticHoming'
  | 'shatterDamage'
  | 'wallStun'
  | 'extraChainJump'
  | 'frozenVulnerable'
  | 'areaPull'
  | 'specimenYield'
  | 'criticalVsOrganic'
  | 'poisonDamage'
  | 'adaptationGain'
  | 'infectedExtraSpread'
  | 'companionRegen'
  | 'adaptationCap'
  | 'regenBelowHalf'
  | 'mutagenics'
  | 'constructKillHeal'
  | 'constructLimit'
  | 'masterworkForging'
  | 'arcingLead'
  | 'freeReroll'
  | 'criticalExtendsMarked'
  | 'compoundInterest'
  | 'leadTargets'
  | 'synergyDamage'
  | 'efficientResearch'
  | 'chaosTheory'
  | 'slowChainFalloff'
  | 'perfectInformation'
  | 'galvanicExtraArc'
  | 'poisonKillHeal'
  | 'fasterToxicMeters'
  | 'constructsHighestThreat'
  | 'siegeBurning'
  | 'criticalDoubleBuild'
  | 'criticalVsBleeding'
  | 'organicElectrified'
  | 'burningSpreads'
  | 'capacitorDouble'
  | 'companionsElectrify'
  | 'ironLung'
  | 'criticalsElectrify'
  | 'constructsInfect'
  | 'bossFirstCritical'
  | 'ignoreSuppression'
  | 'philosophersEngine';

/** Limits a weapon stat effect to matching weapons. */
export type ResearchWhen =
  | { readonly damageType: DamageType }
  | { readonly anyDamageType: readonly DamageType[] }
  | { readonly tag: Tag }
  | { readonly family: WeaponFamily }
  | { readonly delivery: Delivery };

export type ResearchEffect =
  /** Weapons and components the node opens in shops and recipes (GDD 8.10). */
  | { readonly kind: 'opens'; readonly items: readonly string[] }
  /** An Extraordinary component appears in free milestone shops (GDD 6.6). */
  | { readonly kind: 'milestoneStock'; readonly item: string }
  /** A research synergy (GDD 7.19). */
  | { readonly kind: 'synergy'; readonly id: string }
  | {
      readonly kind: 'weaponStat';
      readonly stat: 'damage' | 'attackSpeed' | 'range' | 'area' | 'criticalChance' | 'criticalDamage' | 'knockback' | 'projectileSpeed' | 'statusBuildUp';
      readonly tier: Tier;
      readonly when?: ResearchWhen;
    }
  | {
      readonly kind: 'playerStat';
      readonly stat: 'pickupRadius' | 'regeneration' | 'armour' | 'moveSpeed' | 'evasion' | 'researchYield' | 'fortune';
      readonly tier: Tier;
    }
  | { readonly kind: 'statusDuration'; readonly status: StatusEffect; readonly tier: Tier }
  | { readonly kind: 'rule'; readonly rule: ResearchRule; readonly inactiveUntil?: number };

export interface ResearchNodeDef {
  readonly id: string;
  readonly name: string;
  readonly ring: Ring;
  readonly disciplines: readonly Discipline[];
  /** Names of the nodes researched first. AND logic (GDD 8.10). */
  readonly requires: readonly string[];
  /** Effect wording from GDD 8.12. */
  readonly effect: string;
  /** Hidden nodes: the condition from GDD 8.12 and the cryptic note shown after a near miss. */
  readonly condition?: string;
  readonly hint?: string;
  readonly effects: readonly ResearchEffect[];
}

function idOf(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const opens = (...items: string[]): ResearchEffect => ({ kind: 'opens', items });
const stock = (item: string): ResearchEffect => ({ kind: 'milestoneStock', item });
const synergy = (id: string): ResearchEffect => ({ kind: 'synergy', id });
const rule = (name: ResearchRule, inactiveUntil?: number): ResearchEffect =>
  inactiveUntil === undefined ? { kind: 'rule', rule: name } : { kind: 'rule', rule: name, inactiveUntil };
const weapon = (
  stat: Extract<ResearchEffect, { kind: 'weaponStat' }>['stat'],
  tier: Tier,
  when?: ResearchWhen,
): ResearchEffect => (when ? { kind: 'weaponStat', stat, tier, when } : { kind: 'weaponStat', stat, tier });
const player = (stat: Extract<ResearchEffect, { kind: 'playerStat' }>['stat'], tier: Tier): ResearchEffect => ({
  kind: 'playerStat',
  stat,
  tier,
});
const longer = (status: StatusEffect): ResearchEffect => ({ kind: 'statusDuration', status, tier: RESEARCH_RULES.longerStatus });
const typed = (damageType: DamageType): ResearchEffect => weapon('damage', 'Low', { damageType });

type Row = readonly [name: string, ring: Ring, requires: readonly string[], effect: string, effects: readonly ResearchEffect[]];

function discipline(name: Discipline, rows: readonly Row[]): ResearchNodeDef[] {
  return rows.map(([node, ring, requires, effect, effects]) => ({
    id: idOf(node),
    name: node,
    ring,
    disciplines: [name],
    requires,
    effect,
    effects,
  }));
}

const CHEMISTRY = discipline('Chemistry', [
  ['Applied Combustion', 'Centre', [], 'Fire damage up, Low. Opens Heat Sink Housing', [typed('Fire'), opens('Heat Sink Housing')]],
  ['Basic Toxicology', 'Centre', [], 'Toxic damage up, Low', [typed('Toxic')]],
  ['Reaction Theory', 'Centre', [], 'Status reaction damage up, Low', [rule('reactionDamage')]],
  ['Blackpowder', 'Inner', ['Applied Combustion'], 'Opens Field Cannon and Blackpowder Charge', [opens('Field Cannon', 'Blackpowder Charge')]],
  ['Volatile Compounds', 'Inner', ['Applied Combustion'], 'Opens Firebomb Satchel and Glass Reaction Vessel', [opens('Firebomb Satchel', 'Glass Reaction Vessel')]],
  ['Corrosive Acids', 'Inner', ['Basic Toxicology'], 'Opens Acid Vial. Corrosive damage up, Low', [opens('Acid Vial'), typed('Corrosive')]],
  ['Fume Chemistry', 'Inner', ['Basic Toxicology'], 'Opens Smoke Canister. Toxic Fumes cloud size up, Medium', [opens('Smoke Canister'), rule('fumesSize')]],
  ['Catalysis', 'Inner', ['Reaction Theory'], 'Opens Reagent Recycler. Status Build-up up, Low', [opens('Reagent Recycler'), weapon('statusBuildUp', 'Low')]],
  ['Incendiary Engineering', 'Middle', ['Blackpowder'], 'Burning lasts longer. Explosion Area up, Low', [longer('Burning'), rule('explosionArea')]],
  ['Shaped Charges', 'Middle', ['Blackpowder'], 'Opens Mortar and Shrapnel Shells', [opens('Mortar', 'Shrapnel Shells')]],
  ['Concentrated Acids', 'Middle', ['Corrosive Acids'], 'Opens Acid Sprayer and Spray Nozzle. Corroded lowers Armour one extra step', [opens('Acid Sprayer', 'Spray Nozzle'), rule('corrodedExtraStep')]],
  ['Volatile Catalysts', 'Middle', ['Volatile Compounds', 'Catalysis'], 'Opens Volatile Catalyst', [opens('Volatile Catalyst')]],
  ['Neurotoxins', 'Middle', ['Fume Chemistry'], 'Poisoned enemies also slow down', [rule('poisonSlows')]],
  ['Chain Kinetics', 'Middle', ['Catalysis'], 'Chain reaction depth limit plus one', [rule('chainDepth')]],
  ['Unstable Formulae', 'Outer', ['Volatile Catalysts'], 'Opens Prototype Overclock', [opens('Prototype Overclock')]],
  ['Thermite', 'Outer', ['Incendiary Engineering'], 'Fire damage ignores Armour', [rule('fireIgnoresArmour')]],
  ['Universal Solvent', 'Outer', ['Concentrated Acids'], 'Corroded enemies take Damage up, Low, from every source', [rule('corrodedVulnerable')]],
  ["Philosopher's Reagent", 'Outer', ['Neurotoxins', 'Chain Kinetics'], "Philosopher's Reagent appears in free milestone shops", [stock("Philosopher's Reagent")]],
]);

const PHYSICS = discipline('Physics', [
  ['Static Electricity', 'Centre', [], 'Electric damage up, Low. Opens Copper Coil Housing', [typed('Electric'), opens('Copper Coil Housing')]],
  ['Lodestone Studies', 'Centre', [], 'Pickup Radius up, Low', [player('pickupRadius', 'Low')]],
  ['Classical Mechanics', 'Centre', [], 'Knockback up, Low. Faster projectiles', [weapon('knockback', 'Low'), weapon('projectileSpeed', 'Medium')]],
  ['Leyden Jars', 'Inner', ['Static Electricity'], 'Opens Leyden Jar Cell', [opens('Leyden Jar Cell')]],
  ['Magnetic Fields', 'Inner', ['Lodestone Studies'], 'Magnetic projectiles home slightly. Pickup Radius up, Low', [rule('magneticHoming'), player('pickupRadius', 'Low')]],
  ['Gyroscopes', 'Inner', ['Classical Mechanics'], 'Opens Gyroscopic Stabiliser', [opens('Gyroscopic Stabiliser')]],
  ['Leverage', 'Inner', ['Classical Mechanics'], 'Opens Siege Catapult', [opens('Siege Catapult')]],
  ['Thermodynamics', 'Inner', ['Classical Mechanics'], 'Opens Frost Salts. Cold damage up, Low', [opens('Frost Salts'), typed('Cold')]],
  ['Galvanism', 'Middle', ['Leyden Jars'], 'Opens Tesla Rod and Tesla Capacitor', [opens('Tesla Rod', 'Tesla Capacitor')]],
  ['Lodestone Cores', 'Middle', ['Magnetic Fields'], 'Opens Magnetised Core and Magnetite Slugs', [opens('Magnetised Core', 'Magnetite Slugs')]],
  ['Resonance', 'Middle', ['Leyden Jars', 'Thermodynamics'], 'Opens Resonance Fork', [opens('Resonance Fork')]],
  ['Cryogenics', 'Middle', ['Thermodynamics'], 'Frozen lasts longer. Shatter damage up, Medium', [longer('Frozen'), rule('shatterDamage')]],
  ['Optics', 'Middle', ['Gyroscopes'], 'Range up, Low. Beam damage up, Low', [weapon('range', 'Low'), weapon('damage', 'Low', { delivery: 'beam' })]],
  ['Ballistic Pendulum', 'Middle', ['Leverage'], 'Arcing Area up, Low. Knockback into walls builds Stunned', [weapon('area', 'Low', { tag: 'Arcing' }), rule('wallStun')]],
  ['Electromagnetism', 'Outer', ['Galvanism', 'Lodestone Cores'], 'Opens Electromagnetic Accelerator. Electric chains jump to one extra enemy', [opens('Electromagnetic Accelerator'), rule('extraChainJump')]],
  ['Absolute Zero', 'Outer', ['Cryogenics'], 'Frozen enemies take Damage up, Medium', [rule('frozenVulnerable')]],
  ['Perpetual Motion', 'Outer', ['Ballistic Pendulum', 'Gyroscopes'], 'Perpetual Motion Engine appears in free milestone shops', [stock('Perpetual Motion Engine')]],
  ['Gravity Studies', 'Outer', ['Lodestone Cores'], 'Area effects pull enemies toward the centre', [rule('areaPull')]],
]);

const BIOLOGY = discipline('Biology', [
  ['Field Medicine', 'Centre', [], 'Regeneration up, Low', [player('regeneration', 'Low')]],
  ['Natural History', 'Centre', [], 'Opens Specimen Jar. Specimen yield up, Low', [opens('Specimen Jar'), rule('specimenYield')]],
  ['Microbiology', 'Centre', [], 'Biological damage up, Low', [typed('Biological')]],
  ['Anatomy', 'Inner', ['Field Medicine'], 'Critical Damage up, Low, against Organic enemies. Bleeding lasts longer', [rule('criticalVsOrganic'), longer('Bleeding')]],
  ['Chitin Studies', 'Inner', ['Natural History'], 'Opens Chitin Plating', [opens('Chitin Plating')]],
  ['Fungal Cultures', 'Inner', ['Microbiology'], 'Opens Spore Censer and Spore Culture', [opens('Spore Censer', 'Spore Culture')]],
  ['Venomology', 'Inner', ['Natural History'], 'Poisoned damage up, Low', [rule('poisonDamage')]],
  ['Immunology', 'Inner', ['Field Medicine'], 'Damage adaptation gain up, Medium', [rule('adaptationGain')]],
  ['Herbal Remedies', 'Middle', ['Anatomy'], 'Opens Healing Poultice Chamber', [opens('Healing Poultice Chamber')]],
  ['Living Materials', 'Middle', ['Chitin Studies'], 'Opens Living Wood Frame', [opens('Living Wood Frame')]],
  ['Nervous Systems', 'Middle', ['Anatomy'], 'Opens Nerve Fibre Trigger', [opens('Nerve Fibre Trigger')]],
  ['Contagion', 'Middle', ['Fungal Cultures'], 'Infected spreads to one extra enemy on death', [rule('infectedExtraSpread')]],
  ['Selective Breeding', 'Middle', ['Natural History'], 'Companions gain Regeneration', [rule('companionRegen')]],
  ['Antitoxins', 'Middle', ['Immunology'], 'Damage adaptation cap up one step', [rule('adaptationCap')]],
  ['Parasitology', 'Outer', ['Contagion'], 'Opens Parasite Larvae', [opens('Parasite Larvae')]],
  ['Regeneration', 'Outer', ['Herbal Remedies', 'Antitoxins'], 'Regeneration doubles below half health', [rule('regenBelowHalf')]],
  ['Mutagenics', 'Outer', ['Living Materials', 'Nervous Systems'], 'Each round, one Organic component gains a random stat step, up to High', [rule('mutagenics')]],
  ['Symbiosis', 'Outer', ['Selective Breeding'], 'Companion and construct kills restore a small amount of health', [rule('constructKillHeal')]],
]);

const ENGINEERING = discipline('Engineering', [
  ['Metalworking', 'Centre', [], 'Damage up, Low, for Metallic weapons', [weapon('damage', 'Low', { tag: 'Metallic' })]],
  ['Machinery', 'Centre', [], 'Attack Speed up, Low, for Mechanical weapons', [weapon('attackSpeed', 'Low', { tag: 'Mechanical' })]],
  ['Ballistics', 'Centre', [], 'Range up, Low, for Projectile weapons', [weapon('range', 'Low', { tag: 'Projectile' })]],
  ['Forging', 'Inner', ['Metalworking'], 'Opens Counterweight Assembly and Damascus Alloy', [opens('Counterweight Assembly', 'Damascus Alloy')]],
  ['Repeating Mechanisms', 'Inner', ['Machinery'], 'Opens Repeating Crossbow and Ratchet Repeater', [opens('Repeating Crossbow', 'Ratchet Repeater')]],
  ['Clockwork', 'Inner', ['Machinery'], 'Opens Gear Flail, Clockwork Chassis and Self-Winding Escapement', [opens('Gear Flail', 'Clockwork Chassis', 'Self-Winding Escapement')]],
  ['Spring Traps', 'Inner', ['Machinery'], 'Opens Spring Trap Layer', [opens('Spring Trap Layer')]],
  ['Ammunition Design', 'Inner', ['Ballistics'], 'Opens Multishot Rack and Ricochet Deflector', [opens('Multishot Rack', 'Ricochet Deflector')]],
  ['Automata', 'Middle', ['Clockwork'], 'Opens Clockwork Turret and Repair Kit Housing', [opens('Clockwork Turret', 'Repair Kit Housing')]],
  ['Siege Engineering', 'Middle', ['Ballistics', 'Forging'], 'Opens Ballista. Siege damage up, Low', [opens('Ballista'), weapon('damage', 'Low', { family: 'Siege' })]],
  ['Sawmill Engineering', 'Middle', ['Repeating Mechanisms'], 'Opens Sawblade Launcher', [opens('Sawblade Launcher')]],
  ['Gear Trains', 'Middle', ['Clockwork'], 'Opens Gear Train Accelerator and Feedback Loop Gear', [opens('Gear Train Accelerator', 'Feedback Loop Gear')]],
  ['Rope and Pulley', 'Middle', ['Spring Traps'], 'Opens Grappling Line. Trap damage up, Low', [opens('Grappling Line'), weapon('damage', 'Low', { delivery: 'trap' })]],
  ['Fortification', 'Middle', ['Forging'], 'Player Armour up, Low', [player('armour', 'Low')]],
  ['Clockwork Companions', 'Outer', ['Automata'], 'Opens Clockwork Hound. Active construct limit plus one', [opens('Clockwork Hound'), rule('constructLimit')]],
  ['Orbital Mechanisms', 'Outer', ['Gear Trains'], 'Opens Orbit Mount', [opens('Orbit Mount')]],
  ['Masterwork Forging', 'Outer', ['Fortification', 'Siege Engineering'], 'Weapon Grade IV grants one extra stat step', [rule('masterworkForging')]],
  ['Meteoric Metallurgy', 'Outer', ['Fortification'], 'Meteoric Iron Frame appears in free milestone shops', [stock('Meteoric Iron Frame')]],
]);

const MATHEMATICS = discipline('Mathematics', [
  ['Probability', 'Centre', [], 'Critical Chance up, Low', [weapon('criticalChance', 'Low')]],
  ['Geometry', 'Centre', [], 'Area up, Low', [weapon('area', 'Low')]],
  ['Bookkeeping', 'Centre', [], 'Research Yield up, Low', [player('researchYield', 'Low')]],
  ['Statistics', 'Inner', ['Probability'], 'Opens Marking Chalk. Marked lasts longer', [opens('Marking Chalk'), longer('Marked')]],
  ['Trigonometry', 'Inner', ['Geometry'], 'Opens Targeting Lens. Arcing projectiles lead targets slightly', [opens('Targeting Lens'), rule('arcingLead')]],
  ['Optimisation', 'Inner', ['Bookkeeping'], 'The first reroll in each shop visit is free', [rule('freeReroll')]],
  ['Expected Value', 'Inner', ['Probability'], 'Fortune up, Low', [player('fortune', 'Low')]],
  ['Precision Measurement', 'Inner', ['Geometry'], 'Critical Damage up, Low', [weapon('criticalDamage', 'Low')]],
  ['Precision Grinding', 'Middle', ['Precision Measurement'], 'Opens Precision-Ground Frame', [opens('Precision-Ground Frame')]],
  ['Risk Analysis', 'Middle', ['Statistics', 'Expected Value'], 'Critical hits on Marked enemies extend Marked', [rule('criticalExtendsMarked')]],
  ['Compound Interest', 'Middle', ['Optimisation'], 'Gain 5 per cent of unspent gold at the end of each round, up to 25 gold', [rule('compoundInterest')]],
  ['Calculus of Motion', 'Middle', ['Trigonometry'], 'All projectiles lead moving targets', [rule('leadTargets')]],
  ['Combinatorics', 'Middle', ['Statistics'], 'Each active synergy grants Damage up, Minimal', [rule('synergyDamage')]],
  ['Efficient Research', 'Middle', ['Bookkeeping', 'Optimisation'], 'Research Point costs down 10 per cent', [rule('efficientResearch')]],
  ['Chaos Theory', 'Outer', ['Risk Analysis'], 'Random effects roll twice and keep the better result', [rule('chaosTheory')]],
  ['Infinite Series', 'Outer', ['Combinatorics', 'Calculus of Motion'], 'Chain reaction damage falls more slowly per generation', [rule('slowChainFalloff')]],
  ['Grand Calculus', 'Outer', ['Combinatorics'], 'Grand Calculus Engine appears in free milestone shops', [stock('Grand Calculus Engine')]],
  ['Perfect Information', 'Outer', ['Efficient Research', 'Compound Interest'], 'Free milestone visits preview the stock of all three shops', [rule('perfectInformation')]],
]);

type CrossRow = readonly [name: string, disciplines: readonly Discipline[], requires: readonly string[], effect: string, effects: readonly ResearchEffect[]];

const CROSS: readonly ResearchNodeDef[] = (
  [
    ['Chemical Ballistics', ['Chemistry', 'Engineering'], ['Blackpowder', 'Ammunition Design'], 'Research synergy (Section 7.19)', [synergy('chemical-ballistics')]],
    ['Electromagnetic Launchers', ['Physics', 'Engineering'], ['Lodestone Cores', 'Ammunition Design'], 'Research synergy. Opens Electromagnetic Repeater', [synergy('electromagnetic-launchers'), opens('Electromagnetic Repeater')]],
    ['Bioengineering', ['Biology', 'Engineering'], ['Living Materials', 'Automata'], 'Research synergy. Opens Living Arsenal', [synergy('bioengineering'), opens('Living Arsenal')]],
    ['Conductive Toxins', ['Chemistry', 'Physics', 'Biology'], ['Fume Chemistry', 'Leyden Jars', 'Venomology'], 'Research synergy', [synergy('conductive-toxins')]],
    ['Recursive Artillery', ['Engineering', 'Mathematics', 'Chemistry'], ['Siege Engineering', 'Combinatorics', 'Shaped Charges'], 'Research synergy', [synergy('recursive-artillery')]],
    ['Kinetic Probability', ['Physics', 'Mathematics'], ['Ballistic Pendulum', 'Expected Value'], 'Research synergy', [synergy('kinetic-probability')]],
    ['Adaptive Armour', ['Biology', 'Engineering'], ['Antitoxins', 'Fortification'], 'Research synergy', [synergy('adaptive-armour')]],
    ['Volatile Arithmetic', ['Chemistry', 'Mathematics'], ['Volatile Catalysts', 'Statistics'], 'Opens Alchemical Chain-Reactor', [opens('Alchemical Chain-Reactor')]],
    ['Focused Optics', ['Physics', 'Mathematics'], ['Optics', 'Trigonometry'], 'Opens Burning Mirror', [opens('Burning Mirror')]],
    ['Galvanic Chemistry', ['Chemistry', 'Physics'], ['Corrosive Acids', 'Leyden Jars'], 'Galvanic Surge reactions arc to one extra enemy', [rule('galvanicExtraArc')]],
    ['Thermal Engineering', ['Physics', 'Engineering'], ['Thermodynamics', 'Forging'], 'Fire and Cold weapons gain Attack Speed up, Low', [weapon('attackSpeed', 'Low', { anyDamageType: ['Fire', 'Cold'] })]],
    ['Medical Alchemy', ['Chemistry', 'Biology'], ['Catalysis', 'Herbal Remedies'], 'Killing a Poisoned enemy restores a small amount of health', [rule('poisonKillHeal')]],
    ['Pharmacology', ['Chemistry', 'Biology'], ['Venomology', 'Fume Chemistry'], 'Poisoned and Infected meters fill faster', [rule('fasterToxicMeters')]],
    ['Clockwork Logic', ['Engineering', 'Mathematics'], ['Automata', 'Statistics'], 'Constructs use the Highest threat targeting rule', [rule('constructsHighestThreat')]],
    ['Siege Mathematics', ['Engineering', 'Mathematics'], ['Siege Engineering', 'Calculus of Motion'], 'Siege weapons gain Critical Chance up, Medium', [weapon('criticalChance', 'Medium', { family: 'Siege' })]],
    ['Explosive Ordnance', ['Chemistry', 'Engineering'], ['Shaped Charges', 'Siege Engineering'], 'Siege explosions build Burning', [rule('siegeBurning')]],
    ['Statistical Toxicology', ['Chemistry', 'Mathematics'], ['Neurotoxins', 'Expected Value'], 'Critical hits double Status Build-up', [rule('criticalDoubleBuild')]],
    ['Field Surgery', ['Biology', 'Mathematics'], ['Anatomy', 'Statistics'], 'Critical Damage up, Medium, against Bleeding enemies', [rule('criticalVsBleeding')]],
    ['Biomechanics', ['Biology', 'Physics'], ['Nervous Systems', 'Gyroscopes'], 'Move Speed up, Low. Evasion up, Low', [player('moveSpeed', 'Low'), player('evasion', 'Low')]],
    ['Bioelectricity', ['Biology', 'Physics'], ['Nervous Systems', 'Galvanism'], 'Organic weapons build Electrified', [rule('organicElectrified')]],
  ] as readonly CrossRow[]
).map(([name, disciplines, requires, effect, effects]) => ({
  id: idOf(name),
  name,
  ring: 'Cross' as const,
  disciplines,
  requires,
  effect,
  effects,
}));

type HiddenRow = readonly [name: string, disciplines: readonly Discipline[], condition: string, effect: string, hint: string, effects: readonly ResearchEffect[]];

const HIDDEN: readonly ResearchNodeDef[] = (
  [
    ['Spontaneous Combustion', ['Chemistry', 'Physics'], 'Trigger 50 Steam Burst reactions in one run', 'Each Burning trigger spreads Burning to one adjacent enemy', 'Steam keeps rising where frost meets flame. Keep count.', [rule('burningSpreads')]],
    ['Lightning in a Bottle', ['Physics', 'Chemistry'], 'Kill an elite with a Galvanic Surge reaction', 'Tesla Capacitor discharges twice as often', 'An elite stood crackling and corroded, and walked away.', [rule('capacitorDouble')]],
    ['Living Battery', ['Biology', 'Physics'], 'Win a round with Living Arsenal and Tesla Rod equipped', 'Companions build Electrified on hit', 'One half of a pairing: a living weapon, a rod of lightning.', [rule('companionsElectrify')]],
    ['Perpetual Reaction', ['Chemistry', 'Mathematics'], 'Reach the chain reaction depth limit', 'Chain reaction depth limit plus one', 'The chain ran long, then stopped short of its limit.', [rule('chainDepth')]],
    ['Iron Lung', ['Biology', 'Engineering'], 'Finish a round below a tenth of max health', 'Damage adaptation also applies to every other damage type at half strength', 'A round ended on a thin thread of health. Thinner still teaches more.', [rule('ironLung')]],
    ['Probability Storm', ['Mathematics', 'Physics'], 'Land 10 critical hits within one second', 'Critical hits build Electrified', 'Five critical hits inside one second. The air hummed.', [rule('criticalsElectrify')]],
    ['Fungal Machinery', ['Biology', 'Engineering'], 'Defeat a Spore Mother with a construct', 'Constructs build Infected', 'A Spore Mother fell, with no machine near to study the spores.', [rule('constructsInfect')]],
    ['Absolute Precision', ['Mathematics', 'Engineering'], 'Defeat a mini-boss without taking damage', 'The first hit in each boss phase is a critical hit', 'A mini-boss fell, and left a mark on the victor.', [rule('bossFirstCritical', 8)]],
    ['Anomalous Physics', ['Physics', 'Mathematics'], 'Defeat The Unstable while Auxiliary components are suppressed', 'Auxiliary components ignore suppression', 'The Unstable fell from a safe distance. Closer holds the answer.', [rule('ignoreSuppression')]],
    ['The Philosopher\'s Engine', ['Chemistry', 'Physics', 'Mathematics', 'Engineering', 'Biology'], 'Reach Expert mastery in all five disciplines', 'Each campaign starts with one random middle-ring node from the Archive already researched', 'One discipline stands at Expert. Four more remain.', [rule('philosophersEngine', 9)]],
  ] as readonly HiddenRow[]
).map(([name, disciplines, condition, effect, hint, effects]) => ({
  id: idOf(name),
  name,
  ring: 'Hidden' as const,
  disciplines,
  requires: [],
  effect,
  condition,
  hint,
  effects,
}));

export const RESEARCH_NODES: readonly ResearchNodeDef[] = [
  ...CHEMISTRY,
  ...PHYSICS,
  ...BIOLOGY,
  ...ENGINEERING,
  ...MATHEMATICS,
  ...CROSS,
  ...HIDDEN,
];

const BY_ID = new Map(RESEARCH_NODES.map((node) => [node.id, node]));
const BY_NAME = new Map(RESEARCH_NODES.map((node) => [node.name, node]));

export function researchNode(id: string): ResearchNodeDef | undefined {
  return BY_ID.get(id);
}

export function researchNodeByName(name: string): ResearchNodeDef | undefined {
  return BY_NAME.get(name);
}

/** Starting knowledge in the Grand Archive (GDD 11.10): every centre node plus two inner nodes per discipline. */
export const STARTING_KNOWLEDGE: readonly string[] = [
  ...RESEARCH_NODES.filter((node) => node.ring === 'Centre').map((node) => node.name),
  'Blackpowder',
  'Volatile Compounds',
  'Leyden Jars',
  'Magnetic Fields',
  'Anatomy',
  'Chitin Studies',
  'Forging',
  'Repeating Mechanisms',
  'Statistics',
  'Trigonometry',
];

/** The node opening each weapon and component, by item name. */
export const OPENED_BY: ReadonlyMap<string, ResearchNodeDef> = (() => {
  const map = new Map<string, ResearchNodeDef>();
  for (const node of RESEARCH_NODES) {
    for (const effect of node.effects) {
      if (effect.kind === 'opens') for (const item of effect.items) map.set(item, node);
      else if (effect.kind === 'milestoneStock') map.set(effect.item, node);
    }
  }
  return map;
})();
