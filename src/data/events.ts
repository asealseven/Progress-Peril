// Territory events (GDD 5.4, 5.11). Exactly one event per territory. The event
// replaces the faction mix for one round (GDD 5.6) and pays extra gold.

import type { EnemyId } from './enemies';
import type { KingdomName } from './palette';

export type EventId =
  | 'royal-muster'
  | 'containment-failure'
  | 'production-restart'
  | 'rift-storm'
  | 'biological-bloom'
  | 'military-invasion'
  | 'outlaw-ambush';

export interface EventDef {
  readonly id: EventId;
  readonly name: string;
  /** The kingdom of a signature event. Undefined for events in any kingdom. */
  readonly kingdom?: KingdomName;
  /** GDD 5.11 effect wording. */
  readonly effect: string;
  /**
   * Enemies the event sends. Undefined keeps the faction mix. Event enemies
   * skip the round gates, since the event names them (NOTES.md).
   */
  readonly roster?: readonly EnemyId[];
  /** How event groups enter the arena. */
  readonly formation?: 'line' | 'ring';
  /** Enemies leading the first group. */
  readonly leader?: EnemyId;
}

export const EVENTS: Readonly<Record<EventId, EventDef>> = {
  'royal-muster': {
    id: 'royal-muster',
    name: 'Royal Muster',
    kingdom: 'Keldrath',
    effect: 'Lines of Forgeguard Knights march across the arena in formation behind Bastion shields.',
    roster: ['forgeguard-knight', 'royal-bastion'],
    formation: 'line',
  },
  'containment-failure': {
    id: 'containment-failure',
    name: 'Containment Failure',
    kingdom: 'Myrathis',
    effect: 'Vats release Vat Chimeras and Chemical Crawlers.',
    roster: ['vat-chimera', 'chemical-crawler'],
  },
  'production-restart': {
    id: 'production-restart',
    name: 'Production Restart',
    kingdom: 'Merovant',
    effect: 'Factory doors open. Clockwork Crawlers and Gear Lancers pour in from every wall.',
    roster: ['clockwork-crawler', 'gear-lancer'],
    formation: 'ring',
  },
  'rift-storm': {
    id: 'rift-storm',
    name: 'Rift Storm',
    kingdom: 'Orthelyn',
    effect: 'Rifts open across the plaza. Anomalies and Static Motes come through. Gravity wells move every few seconds.',
    roster: ['anomaly', 'static-mote'],
  },
  'biological-bloom': {
    id: 'biological-bloom',
    name: 'Biological Bloom',
    kingdom: 'Nymora',
    effect: 'Fungal growth spreads across the arena. Thornlings sprout from every patch.',
  },
  'military-invasion': {
    id: 'military-invasion',
    name: 'Military Invasion',
    effect: 'Another kingdom sends reinforcements: a random home faction joins for the round.',
  },
  'outlaw-ambush': {
    id: 'outlaw-ambush',
    name: 'Outlaw Ambush',
    effect: 'Outlaws attack with traps and improvised weapons, led by a Mercenary Captain.',
    roster: ['highwayman', 'rogue-inventor', 'mercenary-captain'],
    leader: 'mercenary-captain',
  },
};

export const EVENT_IDS = Object.keys(EVENTS) as EventId[];

export const EVENT_RULES = {
  /** Rounds within the territory that host the event (GDD 5.11). */
  rounds: [2, 3, 5, 6],
  /** Signature event, Military Invasion, Outlaw Ambush (GDD 5.11). */
  odds: { signature: 0.6, invasion: 0.2, ambush: 0.2 },
  goldBonus: 0.25,
  /** Military Invasion: the invading faction takes the guest and incursion shares. */
  invasionShare: 0.35,
} as const;

export const SIGNATURE_EVENT: Readonly<Record<KingdomName, EventId>> = {
  Keldrath: 'royal-muster',
  Myrathis: 'containment-failure',
  Merovant: 'production-restart',
  Orthelyn: 'rift-storm',
  Nymora: 'biological-bloom',
};
