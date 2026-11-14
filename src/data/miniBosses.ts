// Mini-bosses (GDD 10.5): one per kingdom, two phases changing at 50 per cent
// health, fought on the fourth round and as escorts on boss rounds (GDD 10.6).

import type { BossAttackId, PhaseDef } from './bosses';
import type { DamageType } from './damageTypes';
import type { EnemyDef } from './enemies';
import type { KingdomName } from './palette';
import { PLACEHOLDER_RADIUS } from './tiers';

export type MiniBossId = 'forge-marshal' | 'mad-alchemist' | 'siege-spider' | 'tesla-warden' | 'thornback-matriarch';

export interface MiniBossDef {
  readonly id: MiniBossId;
  readonly name: string;
  readonly kingdom: KingdomName;
  /** GDD 10.5 attack wording. */
  readonly attacks: string;
  readonly counter: string;
  readonly phases: readonly [PhaseDef, PhaseDef];
  readonly body: EnemyDef;
}

const radius = PLACEHOLDER_RADIUS.miniBoss;

function body(
  id: MiniBossId,
  name: string,
  faction: EnemyDef['faction'],
  properties: readonly string[],
  weakTo: readonly DamageType[],
  resists: readonly DamageType[],
  damageType: DamageType,
  armour: EnemyDef['armour'],
  speed: EnemyDef['speed'],
): EnemyDef {
  return {
    id,
    name,
    faction,
    role: 'Bruiser',
    roles: ['Bruiser'],
    health: 'High',
    damage: 'Medium',
    speed,
    range: 'Minimal',
    armour,
    threat: 'Extreme',
    properties,
    weakTo,
    resists,
    damageType,
    behaviour: name,
    radius,
    personality: 'Aggressive',
    attack: 'melee',
    traits: [],
  };
}

export const MINI_BOSSES: Readonly<Record<MiniBossId, MiniBossDef>> = {
  'forge-marshal': {
    id: 'forge-marshal',
    name: 'Forge Marshal',
    kingdom: 'Keldrath',
    attacks: 'Flaming halberd sweeps. Plants a war banner raising ally damage. Second phase sets the halberd alight for wider sweeps',
    counter: 'Destroy the banner first',
    phases: [
      { name: 'Halberd', text: 'Flaming halberd sweeps. Plants a war banner raising ally damage.', attacks: ['halberd-sweep', 'war-banner', 'halberd-sweep'] },
      { name: 'Alight', text: 'Sets the halberd alight for wider sweeps.', attacks: ['halberd-sweep', 'war-banner', 'halberd-sweep'] },
    ],
    body: body('forge-marshal', 'Forge Marshal', 'Kingdom Armies', ['Human', 'Metallic', 'Armoured', 'Heavy'], ['Corrosive'], ['Fire'], 'Fire', 'Medium', 'Low'),
  },
  'mad-alchemist': {
    id: 'mad-alchemist',
    name: 'Mad Alchemist',
    kingdom: 'Myrathis',
    attacks: 'Throws random flasks of fire, acid or poison. Second phase drinks a potion and mutates',
    counter: 'Range. Kill vat-born adds early',
    phases: [
      { name: 'Flasks', text: 'Throws random flasks of fire, acid or poison.', attacks: ['flask-throw', 'flask-throw', 'shatter-vat'] },
      { name: 'Mutated', text: 'Drinks a potion and mutates.', attacks: ['flask-throw', 'shatter-vat', 'flask-throw'] },
    ],
    body: body('mad-alchemist', 'Mad Alchemist', 'Failed Experiments', ['Human', 'Organic'], [], ['Toxic'], 'Fire', 'Low', 'Medium'),
  },
  'siege-spider': {
    id: 'siege-spider',
    name: 'Siege Spider',
    kingdom: 'Merovant',
    attacks: 'Walking cannon. Lays mines and climbs walls to bombard. Second phase drops to the floor and charges',
    counter: 'Electric. Clear mines with Area damage',
    phases: [
      { name: 'Walking cannon', text: 'Lays mines and climbs walls to bombard.', attacks: ['cannon-shot', 'lay-mines', 'wall-climb', 'cannon-shot'] },
      { name: 'Grounded', text: 'Drops to the floor and charges.', attacks: ['spider-charge', 'cannon-shot', 'lay-mines'] },
    ],
    body: body('siege-spider', 'Siege Spider', 'Clockwork Legions', ['Artificial', 'Mechanical', 'Metallic'], ['Electric'], ['Piercing'], 'Impact', 'High', 'Low'),
  },
  'tesla-warden': {
    id: 'tesla-warden',
    name: 'Tesla Warden',
    kingdom: 'Orthelyn',
    attacks: 'Places pylons and chains lightning between them. Second phase overloads the rods',
    counter: 'Destroy pylons. Avoid standing between pylons',
    phases: [
      { name: 'Pylons', text: 'Places pylons and chains lightning between them.', attacks: ['place-pylon', 'pylon-chain', 'pylon-chain'] },
      { name: 'Overload', text: 'Overloads the rods.', attacks: ['rod-overload', 'pylon-chain', 'place-pylon'] },
    ],
    body: body('tesla-warden', 'Tesla Warden', 'Unknown', ['Anomalous', 'Electric', 'Conductive'], ['Impact'], ['Electric'], 'Electric', 'Medium', 'Low'),
  },
  'thornback-matriarch': {
    id: 'thornback-matriarch',
    name: 'Thornback Matriarch',
    kingdom: 'Nymora',
    attacks: 'Charges through hedges and calls Thornlings. Second phase raises a thorn shell',
    counter: 'Attack the rear. Fire on the shell',
    phases: [
      { name: 'Charging', text: 'Charges through hedges and calls Thornlings.', attacks: ['hedge-charge', 'call-thornlings', 'hedge-charge'] },
      { name: 'Thorn shell', text: 'Raises a thorn shell.', attacks: ['hedge-charge', 'call-thornlings'] },
    ],
    body: body('thornback-matriarch', 'Thornback Matriarch', 'Wilds', ['Beast', 'Organic', 'Armoured'], ['Fire'], [], 'Slashing', 'Medium', 'Medium'),
  },
};

export const MINI_BOSS_LIST: readonly MiniBossDef[] = Object.values(MINI_BOSSES);

export const MINI_BOSS_BY_KINGDOM: Readonly<Record<KingdomName, MiniBossDef>> = {
  Keldrath: MINI_BOSSES['forge-marshal'],
  Myrathis: MINI_BOSSES['mad-alchemist'],
  Merovant: MINI_BOSSES['siege-spider'],
  Orthelyn: MINI_BOSSES['tesla-warden'],
  Nymora: MINI_BOSSES['thornback-matriarch'],
};

/** Attacks a mini-boss knows, for tests and the Codex. */
export function miniBossAttacks(def: MiniBossDef): BossAttackId[] {
  return [...new Set(def.phases.flatMap((phase) => phase.attacks))];
}
