// The five kingdoms (GDD 2.2, 2.3, 5.6): lore, rosters and the faction mix.
// Arenas live in arenas.ts, hazards in hazards.ts, events in events.ts.

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
  /** Full title (GDD 2.2). */
  readonly title: string;
  readonly government: string;
  readonly specialisation: string;
  readonly focus: readonly string[];
  readonly lore: string;
  readonly miniBoss: string;
  readonly boss: string;
}

export const KINGDOMS: Readonly<Record<KingdomName, KingdomDef>> = {
  Keldrath: {
    name: 'Keldrath',
    homeFaction: 'Kingdom Armies',
    guestFaction: 'Outlaws',
    signatureEnemy: 'forgeguard-knight',
    incursionFaction: 'Unknown',
    title: "The Crownlands of Keldrath",
    government: "Crownlands",
    specialisation: "Metallurgy and engineering",
    focus: ["Metalworking", "Armour and weapons", "Durability", "Penetration", "Heavy machinery", "Forging"],
    lore: "A crowned kingdom built on iron mines and foundries. The Iron Regent rules from the Great Foundry and arms every knight in forged plate.",
    miniBoss: "Forge Marshal",
    boss: "Iron Regent",
  },
  Myrathis: {
    name: 'Myrathis',
    homeFaction: 'Failed Experiments',
    guestFaction: 'Outlaws',
    signatureEnemy: 'vat-chimera',
    incursionFaction: 'Unknown',
    title: "The Principalities of Myrathis",
    government: "Principalities",
    specialisation: "Chemistry and experimental biology",
    focus: ["Explosives", "Poison", "Acids", "Chemical reactions", "Biological experiments", "Mutations"],
    lore: "A league of rival princes, each funding an alchemical court. Their laboratories trade in explosives, poisons and living experiments, and escapes are common.",
    miniBoss: "Mad Alchemist",
    boss: "Abomination",
  },
  Merovant: {
    name: 'Merovant',
    homeFaction: 'Clockwork Legions',
    guestFaction: 'Kingdom Armies',
    signatureEnemy: 'gear-lancer',
    incursionFaction: 'Unknown',
    title: "The Free Cities of Merovant",
    government: "Free Cities",
    specialisation: "Mechanics and automation",
    focus: ["Gears and mechanisms", "Automated weapons", "Turrets", "Mechanical companions", "Machinery", "Robotics"],
    lore: "Self-governing trade cities run by guilds of clockmakers. Their assembly yards build machines faster than any council votes on them.",
    miniBoss: "Siege Spider",
    boss: "Grand Automaton",
  },
  Orthelyn: {
    name: 'Orthelyn',
    homeFaction: 'Unknown',
    guestFaction: 'Clockwork Legions',
    signatureEnemy: 'static-mote',
    incursionFaction: 'Outlaws',
    title: "The Republic of Orthelyn",
    government: "Republic",
    specialisation: "Physics and mathematics",
    focus: ["Electricity", "Magnetism", "Heat", "Gravity", "Probability", "Advanced calculations"],
    lore: "A republic of scholars elected by examination. Their attempt to calculate the structure of reality tore a crack in the sky, and The Unmaking came through.",
    miniBoss: "Tesla Warden",
    boss: "The Unmaking",
  },
  Nymora: {
    name: 'Nymora',
    homeFaction: 'Wilds',
    guestFaction: 'Failed Experiments',
    signatureEnemy: 'thornling',
    incursionFaction: 'Unknown',
    title: "The Commonwealth of Nymora",
    government: "Commonwealth",
    specialisation: "Biology and natural sciences",
    focus: ["Medicine", "Regeneration", "Genetics", "Plants and fungi", "Parasites", "Organic technology"],
    lore: "A commonwealth of physicians, gardeners and breeders. Their gardens heal the sick and grow living tools, and their forests defend themselves.",
    miniBoss: "Thornback Matriarch",
    boss: "Spore Sovereign",
  },
};

export const KINGDOM_NAMES = Object.keys(KINGDOMS) as KingdomName[];

/** Share of the threat budget per faction slot (GDD 5.6). */
export const FACTION_MIX = { home: 0.65, guest: 0.25, incursion: 0.1 } as const;

/** The first campaign ever starts in Keldrath, where the Apprentice Trial runs (GDD 5.7). */
export const FIRST_CAMPAIGN_KINGDOM: KingdomName = 'Keldrath';
