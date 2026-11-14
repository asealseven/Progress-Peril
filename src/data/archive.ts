// The Grand Archive (GDD 3.8, 8.13, 11.1 to 11.14): Archive Point rewards,
// node discoveries, permanent upgrades, the revival, challenges and the
// mastery rank rewards. Numbers come from GDD.md. Gaps are in ARCHIVE_RULES.

import type { Ring } from './research';
import type { Discipline } from './weapons';

/** Archive Points per activity (GDD 11.3). */
export const AP_REWARDS = {
  round: 2,
  miniBoss: 10,
  boss: 20,
  /** First research of a technology in any run (NOTES.md). */
  technology: 3,
  hiddenTechnology: 8,
  campaign: 25,
  finalBoss: 40,
  escort: 0,
} as const;

/** Discovery cost and condition per ring (GDD 11.10). Centre nodes start known. Hidden nodes cost nothing. */
export const DISCOVERY: Readonly<Partial<Record<Ring, { readonly points: number; readonly condition: 'none' | 'practitioner' | 'expert' | 'requirements' }>>> = {
  Inner: { points: 20, condition: 'none' },
  Middle: { points: 40, condition: 'practitioner' },
  Outer: { points: 80, condition: 'expert' },
  Cross: { points: 60, condition: 'requirements' },
};

export type UpgradeId =
  | 'starting-gold'
  | 'starting-research'
  | 'max-health'
  | 'research-efficiency'
  | 'material-collection'
  | 'shop-rerolls'
  | 'revival';

export interface PermanentUpgrade {
  readonly id: UpgradeId;
  readonly name: string;
  /** Archive Points for each step, in order (GDD 11.11). */
  readonly costs: readonly number[];
  /** The bonus of one step. */
  readonly perStep: number;
  readonly unit: 'gold' | 'points' | 'percent' | 'count';
}

export const PERMANENT_UPGRADES: Readonly<Record<UpgradeId, PermanentUpgrade>> = {
  'starting-gold': { id: 'starting-gold', name: 'Starting gold', costs: [30, 60, 90], perStep: 10, unit: 'gold' },
  'starting-research': { id: 'starting-research', name: 'Starting Research Points', costs: [30, 60, 90], perStep: 5, unit: 'points' },
  'max-health': { id: 'max-health', name: 'Maximum health', costs: [40, 60, 80, 100, 120], perStep: 0.01, unit: 'percent' },
  'research-efficiency': { id: 'research-efficiency', name: 'Research efficiency', costs: [40, 60, 80, 100, 120], perStep: 0.01, unit: 'percent' },
  'material-collection': { id: 'material-collection', name: 'Material collection', costs: [40, 60, 80, 100, 120], perStep: 0.01, unit: 'percent' },
  'shop-rerolls': { id: 'shop-rerolls', name: 'Starting shop rerolls', costs: [150], perStep: 1, unit: 'count' },
  revival: { id: 'revival', name: 'Revival', costs: [250], perStep: 1, unit: 'count' },
};

export const UPGRADE_IDS = Object.keys(PERMANENT_UPGRADES) as UpgradeId[];

/** Respec refunds (GDD 11.8). */
export const RESPEC = { upgradeShare: 0.9, specialisationShare: 1 } as const;

export const SPECIALISATION_COST = 100;
/** Two equipped per campaign, three after Grandmaster in any discipline (GDD 11.12). */
export const SPECIALISATION_SLOTS = { base: 2, grandmaster: 3 } as const;

export type ChallengeId = 'first-invention' | 'mechanical-menace' | 'scientific-perfection' | 'against-all-odds';

export interface ChallengeDef {
  readonly id: ChallengeId;
  readonly name: string;
  readonly text: string;
  readonly band: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  /** Archive Points by band (GDD 11.13). Never scaled by Challenge Tiers. */
  readonly points: number;
  /** GDD 11.7 reward wording. */
  readonly reward: string;
  readonly target: number;
}

/** The challenges named in GDD 11.7, with bands from GDD 11.13. */
export const CHALLENGES: Readonly<Record<ChallengeId, ChallengeDef>> = {
  'first-invention': {
    id: 'first-invention',
    name: 'First Invention',
    text: 'Discover a cross-disciplinary technology.',
    band: 'Easy',
    points: 5,
    reward: 'Archive Points',
    target: 1,
  },
  'mechanical-menace': {
    id: 'mechanical-menace',
    name: 'Mechanical Menace',
    text: 'Defeat 500 mechanical enemies.',
    band: 'Medium',
    points: 10,
    reward: 'Clockwork weapon skin and Archive Points',
    target: 500,
  },
  'scientific-perfection': {
    id: 'scientific-perfection',
    name: 'Scientific Perfection',
    text: 'Discover five interdisciplinary technologies.',
    band: 'Hard',
    points: 15,
    reward: 'Archive decoration and Archive Points',
    target: 5,
  },
  'against-all-odds': {
    id: 'against-all-odds',
    name: 'Against All Odds',
    text: 'Defeat a boss with all three weapons at their base grade.',
    band: 'Extreme',
    points: 20,
    reward: 'Exclusive equipment and Archive Points',
    target: 1,
  },
};

export const CHALLENGE_IDS = Object.keys(CHALLENGES) as ChallengeId[];

/** What each mastery rank opens (GDD 8.13). */
export const MASTERY_OPENS = {
  Novice: 'Centre and inner rings',
  Practitioner: 'Middle-ring discovery in the Grand Archive',
  Expert: 'Outer-ring discovery. Experimental components of the discipline appear in shops',
  Master: 'A discipline mechanic: one rule change',
  Grandmaster: 'Discipline title, Archive decoration and one extra specialisation slot',
} as const;

/** The Master rank rule change per discipline (GDD 8.13). */
export const MASTER_MECHANICS: Readonly<Record<Discipline, string>> = {
  Chemistry: "Status reactions build one further status of the player's choice",
  Physics: 'Electric, Magnetic and Cold effects ignore Resistant elite modifiers',
  Biology: 'Organic enemies sometimes drop healing herbs on death',
  Engineering: 'Constructs keep half their health between rounds and start the next round deployed',
  Mathematics: 'Critical hits roll a second time for a chance at a double critical',
};

/** Grandmaster titles (GDD 8.13 names a title with no wording, so the title is the rank and discipline). */
export const GRANDMASTER_TITLE = (discipline: Discipline): string => `Grandmaster of ${discipline}`;

/** Numbers with no GDD value. NOTES.md records each choice. */
export const ARCHIVE_RULES = {
  /** The revival returns the player at this share of max health, invulnerable for this long (GDD 3.8). */
  revivalHealth: 0.5,
  revivalInvulnerable: 3,
  /** Biology Master: chance per Organic kill of a healing herb, and the herb's heal as a share of max health. */
  herbChance: 0.03,
  herbHeal: 0.05,
  /** Chemistry Master: share of a Normal meter the extra status builds on each reaction. */
  reactionBuild: 0.2,
  /** Engineering Master: constructs keep this share of health between rounds. */
  constructCarry: 0.5,
  /** Save profiles (GDD 15.13). */
  profiles: 3,
} as const;
