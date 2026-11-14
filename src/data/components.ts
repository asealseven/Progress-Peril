// The launch set of 60 components, 15 per slot type (GDD 7.18).
// `effect` keeps the GDD wording for tooltips. `effects` holds the typed
// descriptors the modifier system applies (CLAUDE.md rule 5).

import type { Effect } from './effects';
import type { Tag } from './tags';
import type { Tier } from './tiers';
import type { WeaponFamily } from './weapons';

export const SLOT_TYPES = ['Structure', 'Mechanism', 'Payload', 'Auxiliary'] as const;
export type SlotType = (typeof SLOT_TYPES)[number];

/** Qualities from GDD 7.7, lowest first. */
export const QUALITIES = ['Common', 'Uncommon', 'Rare', 'Experimental', 'Extraordinary'] as const;
export type Quality = (typeof QUALITIES)[number];

/** Scrap return per quality (GDD 7.9). Default components scrap for nothing. */
export const SCRAP_RETURN: Readonly<Record<Quality, number>> = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Experimental: 4,
  Extraordinary: 5,
};

export interface ComponentDef {
  readonly id: string;
  readonly name: string;
  readonly slot: SlotType;
  readonly tags: readonly Tag[];
  /** Effect wording from GDD 7.18. */
  readonly effect: string;
  /** Weapon families accepting the component. 'All' means every family. */
  readonly fits: 'All' | readonly WeaponFamily[];
  /** The lowest quality at which the component appears. */
  readonly quality: Quality;
  readonly effects: readonly Effect[];
}

type Fits = ComponentDef['fits'];

function up(stat: Extract<Effect, { kind: 'stat' }>['stat'], tier: Tier): Effect {
  return { kind: 'stat', stat, direction: 'up', tier };
}

function down(stat: Extract<Effect, { kind: 'stat' }>['stat'], tier: Tier): Effect {
  return { kind: 'stat', stat, direction: 'down', tier };
}

function builds(status: string, tier: Tier): Effect {
  return { kind: 'statusBuild', status, tier };
}

function component(
  slot: SlotType,
  name: string,
  tags: readonly Tag[],
  effect: string,
  fits: Fits,
  quality: Quality,
  effects: readonly Effect[],
): ComponentDef {
  const id = name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return { id, name, slot, tags, effect, fits, quality, effects };
}

export const COMPONENT_LIST: readonly ComponentDef[] = [
  // --- Structure -----------------------------------------------------------
  component('Structure', 'Tempered Steel Frame', ['Metallic'], 'Damage up, Low', 'All', 'Common', [up('damage', 'Low')]),
  component(
    'Structure',
    'Lightweight Frame',
    ['Light'],
    'Attack Speed up, Medium. Damage down, Low',
    'All',
    'Common',
    [up('attackSpeed', 'Medium'), down('damage', 'Low')],
  ),
  component(
    'Structure',
    'Hardwood Stock',
    ['Light'],
    'Attack Speed up, Low. Knockback up, Low',
    ['Ranged', 'Siege'],
    'Common',
    [up('attackSpeed', 'Low'), up('knockback', 'Low')],
  ),
  component(
    'Structure',
    'Reinforced Barrel',
    ['Metallic', 'Heavy'],
    'Range up, Medium. Faster projectiles',
    ['Ranged', 'Siege'],
    'Common',
    [up('range', 'Medium'), up('projectileSpeed', 'Medium')],
  ),
  component(
    'Structure',
    'Counterweight Assembly',
    ['Heavy'],
    'Damage up, Medium. Attack Speed down, Low',
    ['Melee', 'Siege'],
    'Uncommon',
    [up('damage', 'Medium'), down('attackSpeed', 'Low')],
  ),
  component(
    'Structure',
    'Damascus Alloy',
    ['Metallic', 'Blade'],
    'Critical Chance up, Medium, on Slashing hits',
    ['Melee'],
    'Uncommon',
    [
      {
        kind: 'stat',
        stat: 'criticalChance',
        direction: 'up',
        tier: 'Medium',
        when: { kind: 'damageType', damageType: 'Slashing' },
      },
    ],
  ),
  component('Structure', 'Copper Coil Housing', ['Conductive'], 'Adds Electric damage, Low', 'All', 'Uncommon', [
    { kind: 'addDamage', damageType: 'Electric', tier: 'Low' },
  ]),
  component(
    'Structure',
    'Glass Reaction Vessel',
    ['Volatile'],
    'Payload Area up, Medium',
    ['Alchemical', 'Siege'],
    'Uncommon',
    [up('area', 'Medium')],
  ),
  component('Structure', 'Chitin Plating', ['Organic', 'Armoured'], 'Player Armour up, Low', 'All', 'Uncommon', [
    up('playerArmour', 'Low'),
  ]),
  component('Structure', 'Clockwork Chassis', ['Mechanical'], 'Construct health up, Medium', ['Mechanical'], 'Uncommon', [
    up('constructHealth', 'Medium'),
  ]),
  component(
    'Structure',
    'Heat Sink Housing',
    ['Thermal'],
    'Fire damage up, Low. Burning lasts longer',
    'All',
    'Uncommon',
    [
      { kind: 'stat', stat: 'damage', direction: 'up', tier: 'Low', when: { kind: 'damageType', damageType: 'Fire' } },
      {
        kind: 'stat',
        stat: 'statusDuration',
        direction: 'up',
        tier: 'Medium',
        when: { kind: 'status', status: 'Burning' },
      },
    ],
  ),
  component(
    'Structure',
    'Magnetised Core',
    ['Magnetic', 'Metallic'],
    'Projectiles curve toward Metallic enemies',
    ['Ranged', 'Experimental'],
    'Rare',
    [{ kind: 'homing', strength: 'strong', onlyProperty: 'Metallic' }],
  ),
  component(
    'Structure',
    'Precision-Ground Frame',
    ['Precise'],
    'Critical Damage up, Medium',
    ['Ranged', 'Siege'],
    'Rare',
    [up('criticalDamage', 'Medium')],
  ),
  component(
    'Structure',
    'Living Wood Frame',
    ['Organic', 'Biological'],
    'Damage up one Minimal step after each round, capped at High',
    'All',
    'Rare',
    [{ kind: 'growth', stat: 'damage', perRound: 'Minimal', cap: 'High' }],
  ),
  component(
    'Structure',
    'Meteoric Iron Frame',
    ['Metallic', 'Anomalous'],
    'Damage up, High. Penetration plus one',
    'All',
    'Extraordinary',
    [up('damage', 'High'), { kind: 'count', stat: 'penetration', amount: 1 }],
  ),

  // --- Mechanism -----------------------------------------------------------
  component(
    'Mechanism',
    'Torsion Spring',
    ['Mechanical'],
    'Attack Speed up, Medium',
    ['Ranged', 'Siege', 'Mechanical'],
    'Common',
    [up('attackSpeed', 'Medium')],
  ),
  component('Mechanism', 'Piercing Rail', ['Piercing'], 'Penetration plus one', ['Ranged', 'Siege'], 'Common', [
    { kind: 'count', stat: 'penetration', amount: 1 },
  ]),
  component('Mechanism', 'Sweep Hinge', ['Mechanical'], 'Melee arc width up, Medium', ['Melee'], 'Common', [
    up('arcWidth', 'Medium'),
  ]),
  component(
    'Mechanism',
    'Pneumatic Bellows',
    ['Mechanical'],
    'Faster projectiles. Knockback up, Medium',
    ['Ranged', 'Siege'],
    'Common',
    [up('projectileSpeed', 'Medium'), up('knockback', 'Medium')],
  ),
  component(
    'Mechanism',
    'Ratchet Repeater',
    ['Mechanical'],
    'Every third attack fires one extra projectile',
    ['Ranged'],
    'Uncommon',
    [{ kind: 'everyNthAttack', every: 3, extraProjectiles: 1 }],
  ),
  component(
    'Mechanism',
    'Multishot Rack',
    ['Mechanical'],
    'Projectiles plus one. Damage per projectile down, Low',
    ['Ranged', 'Siege'],
    'Uncommon',
    [{ kind: 'count', stat: 'projectiles', amount: 1 }, down('damage', 'Low')],
  ),
  component(
    'Mechanism',
    'Ricochet Deflector',
    ['Ricochet'],
    'Projectiles bounce once to a nearby enemy',
    ['Ranged', 'Mechanical'],
    'Uncommon',
    [{ kind: 'count', stat: 'bounces', amount: 1 }],
  ),
  component(
    'Mechanism',
    'Spray Nozzle',
    ['Spray'],
    'Converts single shots into a cone. Area up, Range down',
    ['Alchemical'],
    'Uncommon',
    [{ kind: 'convert', delivery: 'cone' }, up('area', 'Medium'), down('range', 'Medium')],
  ),
  component(
    'Mechanism',
    'Targeting Lens',
    ['Precise'],
    'Targeting becomes Highest threat. Critical Chance up, Low',
    ['Ranged', 'Siege'],
    'Uncommon',
    [{ kind: 'targeting', rule: 'Highest threat' }, up('criticalChance', 'Low')],
  ),
  component(
    'Mechanism',
    'Self-Winding Escapement',
    ['Mechanical'],
    'Construct attack speed up, Medium',
    ['Mechanical'],
    'Uncommon',
    [up('constructAttackSpeed', 'Medium')],
  ),
  component(
    'Mechanism',
    'Gear Train Accelerator',
    ['Mechanical'],
    'Attack Speed climbs during constant attacks, resets after a pause',
    ['Ranged', 'Mechanical'],
    'Rare',
    [{ kind: 'ramp' }],
  ),
  component(
    'Mechanism',
    'Nerve Fibre Trigger',
    ['Biological', 'Organic'],
    'Attack Speed up, High, while player health is below half',
    'All',
    'Rare',
    [{ kind: 'stat', stat: 'attackSpeed', direction: 'up', tier: 'High', when: { kind: 'playerBelowHalfHealth' } }],
  ),
  component(
    'Mechanism',
    'Electromagnetic Accelerator',
    ['Magnetic', 'Electric'],
    'Projectile speed up, High. Damage up, Low. Adds the Electric tag',
    ['Ranged', 'Experimental'],
    'Experimental',
    [up('projectileSpeed', 'High'), up('damage', 'Low'), { kind: 'grantTag', tag: 'Electric' }],
  ),
  component(
    'Mechanism',
    'Orbit Mount',
    ['Orbit'],
    'The weapon orbits the player instead of attacking forward',
    ['Melee', 'Ranged'],
    'Experimental',
    [{ kind: 'convert', delivery: 'orbit' }],
  ),
  component(
    'Mechanism',
    'Perpetual Motion Engine',
    ['Mechanical', 'Anomalous'],
    'Attack Speed up, High, with no drawback',
    'All',
    'Extraordinary',
    [up('attackSpeed', 'High')],
  ),

  // --- Payload -------------------------------------------------------------
  component(
    'Payload',
    'Iron Bolts',
    ['Metallic', 'Piercing'],
    'Damage up, Low',
    ['Ranged', 'Siege', 'Mechanical'],
    'Common',
    [up('damage', 'Low')],
  ),
  component('Payload', 'Barbed Heads', ['Blade'], 'Builds Bleeding, Low', ['Ranged', 'Melee'], 'Common', [
    builds('Bleeding', 'Low'),
  ]),
  component('Payload', 'Incendiary Oil', ['Fire', 'Volatile'], 'Builds Burning, Medium', 'All', 'Common', [
    builds('Burning', 'Medium'),
  ]),
  component('Payload', 'Venom Reservoir', ['Toxic'], 'Builds Poisoned, Medium', 'All', 'Common', [
    builds('Poisoned', 'Medium'),
  ]),
  component(
    'Payload',
    'Blackpowder Charge',
    ['Explosive', 'Fire'],
    'Hits explode in a small area',
    ['Ranged', 'Siege'],
    'Uncommon',
    [{ kind: 'onHit', action: 'explode' }],
  ),
  component('Payload', 'Acid Vial', ['Corrosive'], 'Builds Corroded, Medium', 'All', 'Uncommon', [
    builds('Corroded', 'Medium'),
  ]),
  component('Payload', 'Frost Salts', ['Cold'], 'Builds Frozen, Medium. Each hit also slows', 'All', 'Uncommon', [
    builds('Frozen', 'Medium'),
    { kind: 'onHit', action: 'slow' },
  ]),
  component(
    'Payload',
    'Leyden Jar Cell',
    ['Electric', 'Conductive'],
    'Builds Electrified, Medium. Arcs to one nearby enemy',
    'All',
    'Uncommon',
    [builds('Electrified', 'Medium'), { kind: 'onHit', action: 'arc' }],
  ),
  component(
    'Payload',
    'Spore Culture',
    ['Biological', 'Fungal'],
    'Builds Infected, Medium. Infection spreads on death',
    'All',
    'Uncommon',
    [builds('Infected', 'Medium'), { kind: 'statusSpreadOnDeath', status: 'Infected' }],
  ),
  component('Payload', 'Marking Chalk', ['Precise'], 'Builds Marked, Medium', 'All', 'Uncommon', [
    builds('Marked', 'Medium'),
  ]),
  component(
    'Payload',
    'Shrapnel Shells',
    ['Impact', 'Explosive'],
    'Explosions throw fragments in all directions',
    ['Siege'],
    'Rare',
    [{ kind: 'onExplosion', action: 'fragments' }],
  ),
  component(
    'Payload',
    'Volatile Catalyst',
    ['Volatile', 'Chain'],
    'Kills cause a small explosion, eligible for chain reactions',
    ['Alchemical', 'Siege'],
    'Rare',
    [{ kind: 'onKill', action: 'explode' }],
  ),
  component(
    'Payload',
    'Magnetite Slugs',
    ['Magnetic', 'Metallic'],
    'Impacts pull small enemies toward the hit point',
    ['Ranged', 'Siege'],
    'Rare',
    [{ kind: 'onHit', action: 'pull' }],
  ),
  component(
    'Payload',
    'Parasite Larvae',
    ['Biological', 'Parasite'],
    'Infected enemies release a parasite on death, which seeks a new host',
    'All',
    'Experimental',
    [{ kind: 'parasiteOnDeath' }],
  ),
  component(
    'Payload',
    "Philosopher's Reagent",
    ['Volatile', 'Toxic', 'Corrosive', 'Fire'],
    'Builds Burning, Poisoned and Corroded together, High',
    'All',
    'Extraordinary',
    [builds('Burning', 'High'), builds('Poisoned', 'High'), builds('Corroded', 'High')],
  ),

  // --- Auxiliary -----------------------------------------------------------
  component(
    'Auxiliary',
    'Telescopic Sight',
    ['Precise'],
    'Range up, Medium. Critical Damage up, Low',
    ['Ranged', 'Siege'],
    'Common',
    [up('range', 'Medium'), up('criticalDamage', 'Low')],
  ),
  component('Auxiliary', 'Bayonet Mount', ['Blade'], 'Adds a short stab against adjacent enemies', ['Ranged'], 'Common', [
    { kind: 'secondaryAttack', attack: 'bayonet' },
  ]),
  component(
    'Auxiliary',
    'Research Notebook',
    ['Precise'],
    'Kills with this weapon grant extra Research Points, Low',
    'All',
    'Common',
    [{ kind: 'resourceOnKill', resource: 'Research Points', tier: 'Low', activeFrom: 6 }],
  ),
  component(
    'Auxiliary',
    'Specimen Jar',
    ['Biological'],
    'Kills with this weapon grant extra Specimens, Low',
    'All',
    'Uncommon',
    [{ kind: 'resourceOnKill', resource: 'Specimens', tier: 'Low', activeFrom: 5 }],
  ),
  component('Auxiliary', 'Reagent Recycler', ['Volatile'], 'Status duration up, Medium', 'All', 'Uncommon', [
    { kind: 'stat', stat: 'statusDuration', direction: 'up', tier: 'Medium' },
  ]),
  component(
    'Auxiliary',
    'Gyroscopic Stabiliser',
    ['Mechanical'],
    'Projectiles home slightly. Spread down',
    ['Ranged', 'Siege'],
    'Uncommon',
    [
      { kind: 'homing', strength: 'slight' },
      { kind: 'spread', direction: 'down' },
    ],
  ),
  component(
    'Auxiliary',
    'Smoke Canister',
    ['Volatile'],
    'On taking damage, releases smoke. Enemies inside lose their target briefly',
    'All',
    'Uncommon',
    [{ kind: 'onDamageTaken', action: 'smoke' }],
  ),
  component('Auxiliary', 'Repair Kit Housing', ['Mechanical'], 'Constructs repair over time', ['Mechanical'], 'Uncommon', [
    { kind: 'constructRepair' },
  ]),
  component(
    'Auxiliary',
    'Tesla Capacitor',
    ['Electric', 'Conductive'],
    'Discharges a lightning chain every few seconds',
    'All',
    'Rare',
    [{ kind: 'interval', action: 'lightningChain' }],
  ),
  component(
    'Auxiliary',
    'Grappling Line',
    ['Mechanical'],
    'Pulls the first enemy hit toward the player',
    ['Ranged', 'Melee'],
    'Rare',
    [{ kind: 'onHit', action: 'grapple' }],
  ),
  component(
    'Auxiliary',
    'Healing Poultice Chamber',
    ['Biological', 'Organic'],
    'Kills restore a small amount of health',
    'All',
    'Rare',
    [{ kind: 'onKill', action: 'heal' }],
  ),
  component(
    'Auxiliary',
    'Resonance Fork',
    ['Precise', 'Conductive'],
    'Bonus damage against Electrified and Frozen enemies',
    'All',
    'Rare',
    [{ kind: 'bonusAgainstStatus', statuses: ['Electrified', 'Frozen'] }],
  ),
  component(
    'Auxiliary',
    'Feedback Loop Gear',
    ['Mechanical', 'Precise'],
    'Each kill raises Attack Speed briefly. Stacks up to a cap',
    'All',
    'Rare',
    [{ kind: 'onKill', action: 'attackSpeedStack' }],
  ),
  component(
    'Auxiliary',
    'Prototype Overclock',
    ['Experimental', 'Volatile'],
    'Damage up, High. Attack Speed up, Medium. The weapon jams briefly at random',
    'All',
    'Experimental',
    [up('damage', 'High'), up('attackSpeed', 'Medium'), { kind: 'jam' }],
  ),
  component(
    'Auxiliary',
    'Grand Calculus Engine',
    ['Precise', 'Anomalous'],
    'Counts as one extra matching tag for every synergy on this weapon',
    'All',
    'Extraordinary',
    [{ kind: 'extraSynergyTag' }],
  ),
];

export const COMPONENTS: Readonly<Record<string, ComponentDef>> = Object.fromEntries(
  COMPONENT_LIST.map((entry) => [entry.id, entry]),
);

export function componentByName(name: string): ComponentDef | undefined {
  return COMPONENT_LIST.find((entry) => entry.name === name);
}

/** True when the component lists the family, or fits every family. */
export function componentFitsFamily(componentDef: ComponentDef, family: WeaponFamily): boolean {
  return componentDef.fits === 'All' || componentDef.fits.includes(family);
}
