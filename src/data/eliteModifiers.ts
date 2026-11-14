// Elite modifiers (GDD 9.12). Names, effects and counters come from GDD.md.
// Each modifier has a marker colour, so players read the modifier on sight.

export const ELITE_MODIFIER_IDS = [
  'armoured',
  'swift',
  'volatile',
  'regenerating',
  'shielded',
  'commanding',
  'splitting',
  'resistant',
  'hardened',
  'magnetised',
  'infectious',
  'vampiric',
] as const;

export type EliteModifierId = (typeof ELITE_MODIFIER_IDS)[number];

export interface EliteModifierDef {
  readonly id: EliteModifierId;
  readonly name: string;
  /** Effect wording from GDD 9.12. */
  readonly effect: string;
  /** Counter wording from GDD 9.12. */
  readonly counter: string;
  /** Marker colour. */
  readonly colour: string;
}

export const ELITE_MODIFIERS: Readonly<Record<EliteModifierId, EliteModifierDef>> = {
  armoured: {
    id: 'armoured',
    name: 'Armoured',
    effect: 'Armour up two steps',
    counter: 'Corrosive, Impact',
    colour: '#6B635A',
  },
  swift: {
    id: 'swift',
    name: 'Swift',
    effect: 'Speed and attack speed up one step',
    counter: 'Cold, Stun, traps',
    colour: '#7FD3E6',
  },
  volatile: {
    id: 'volatile',
    name: 'Volatile',
    effect: 'Explodes on death',
    counter: 'Range, knockback',
    colour: '#E07A2A',
  },
  regenerating: {
    id: 'regenerating',
    name: 'Regenerating',
    effect: 'Heals over time',
    counter: 'Fire, Corrosive, burst damage',
    colour: '#4FA34A',
  },
  shielded: {
    id: 'shielded',
    name: 'Shielded',
    effect: 'Frontal shield blocks projectiles',
    counter: 'Arcing shots, flanking, Electric',
    colour: '#9DB4C8',
  },
  commanding: {
    id: 'commanding',
    name: 'Commanding',
    effect: 'Nearby allies gain Damage up, Low',
    counter: 'Focus fire, Marked',
    colour: '#C8902A',
  },
  splitting: {
    id: 'splitting',
    name: 'Splitting',
    effect: 'Splits into two smaller copies on death',
    counter: 'Area damage',
    colour: '#9C86C9',
  },
  resistant: {
    id: 'resistant',
    name: 'Resistant',
    effect: 'Resists one damage type, shown by an icon',
    counter: 'A second damage type',
    colour: '#D9DCE0',
  },
  hardened: {
    id: 'hardened',
    name: 'Hardened',
    effect: 'Immune to one status effect',
    counter: 'Mixed payloads',
    colour: '#8C6A36',
  },
  magnetised: {
    id: 'magnetised',
    name: 'Magnetised',
    effect: 'Pulls Metallic projectiles off course',
    counter: 'Non-metallic weapons, melee',
    colour: '#F1DC5A',
  },
  infectious: {
    id: 'infectious',
    name: 'Infectious',
    effect: 'Leaves a toxic pool on death',
    counter: 'Movement, Range',
    colour: '#B5D334',
  },
  vampiric: {
    id: 'vampiric',
    name: 'Vampiric',
    effect: 'Heals on each hit against the player',
    counter: 'Armour, Evasion',
    colour: '#B3262E',
  },
};

/** Modifiers an elite carries by territory index. Endless mode uses three (GDD 9.12). */
export const ELITE_MODIFIER_COUNT = [1, 2, 2] as const;
export const ELITE_MODIFIER_COUNT_ENDLESS = 3;
