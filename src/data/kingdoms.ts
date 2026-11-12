// Kingdom rosters (GDD 5.6). Milestone 4 holds the faction mix per kingdom.
// Milestone 7 adds arenas, hazards, events, selection and transitions.

import type { EnemyId } from './enemies';
import type { FactionName, KingdomName } from './palette';

export interface KingdomDef {
  readonly name: KingdomName;
  readonly homeFaction: FactionName;
  readonly guestFaction: FactionName;
  readonly signatureEnemy: EnemyId;
  /**
   * Faction of the incursions in Territory 3 and endless mode. Unknown, except
   * in Orthelyn, where Unknown is the home faction (GDD 5.6).
   */
  readonly incursionFaction: FactionName;
}

export const KINGDOMS: Readonly<Record<KingdomName, KingdomDef>> = {
  Keldrath: {
    name: 'Keldrath',
    homeFaction: 'Kingdom Armies',
    guestFaction: 'Outlaws',
    signatureEnemy: 'forgeguard-knight',
    incursionFaction: 'Unknown',
  },
  Myrathis: {
    name: 'Myrathis',
    homeFaction: 'Failed Experiments',
    guestFaction: 'Outlaws',
    signatureEnemy: 'vat-chimera',
    incursionFaction: 'Unknown',
  },
  Merovant: {
    name: 'Merovant',
    homeFaction: 'Clockwork Legions',
    guestFaction: 'Kingdom Armies',
    signatureEnemy: 'gear-lancer',
    incursionFaction: 'Unknown',
  },
  Orthelyn: {
    name: 'Orthelyn',
    homeFaction: 'Unknown',
    guestFaction: 'Clockwork Legions',
    signatureEnemy: 'static-mote',
    incursionFaction: 'Outlaws',
  },
  Nymora: {
    name: 'Nymora',
    homeFaction: 'Wilds',
    guestFaction: 'Failed Experiments',
    signatureEnemy: 'thornling',
    incursionFaction: 'Unknown',
  },
};

export const KINGDOM_NAMES = Object.keys(KINGDOMS) as KingdomName[];

/** Share of the threat budget per faction slot (GDD 5.6). */
export const FACTION_MIX = { home: 0.65, guest: 0.25, incursion: 0.1 } as const;

/**
 * Rosters for the three territories until Milestone 7 adds kingdom selection.
 * These three cover all six factions (NOTES.md, GDD 5.7).
 */
export const DEFAULT_KINGDOM_ORDER: readonly KingdomName[] = ['Keldrath', 'Orthelyn', 'Nymora'];
