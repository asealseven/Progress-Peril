// Asset manifest: key, file path and placeholder description (CLAUDE.md rule 8).
// Folders and file names follow ART_PROMPTS.md. A key is `<group>.<file name>`,
// and the group sets the folder inside public/assets/.
// src/render/images.ts loads the files that exist. Every other key draws its placeholder.

import { BOSS_LIST, BOSS_PARTS } from './bosses';
import type { BossId, BossPartId } from './bosses';
import { COMPONENT_LIST } from './components';
import { ENEMY_LIST } from './enemies';
import { KINGDOM_NAMES } from './kingdoms';
import { MINI_BOSS_LIST } from './miniBosses';
import type { MiniBossId } from './miniBosses';
import { RELIC_LIST } from './relics';
import { SHOP_IDS } from './shop';
import { WEAPON_LIST } from './weapons';

/** Folder inside public/assets/ for each key group (ART_PROMPTS.md). */
export const ASSET_FOLDERS = {
  player: 'sprites/player',
  enemy: 'sprites/enemies',
  miniboss: 'sprites/minibosses',
  boss: 'sprites/bosses',
  /** Boss parts sit beside their bosses. */
  part: 'sprites/bosses',
  construct: 'sprites/constructs',
  weapon: 'icons/weapons',
  component: 'icons/components',
  relic: 'icons/relics',
  shopkeeper: 'portraits/shopkeepers',
  arena: 'arenas',
  card: 'cards',
  hub: 'hub',
  app: 'icons/app',
} as const;

export type AssetGroup = keyof typeof ASSET_FOLDERS;

export interface AssetEntry {
  readonly key: string;
  /** File path inside the site root. Absent for shapes always drawn in code. */
  readonly path?: string;
  readonly placeholder: string;
}

/** Kebab-case file name for a GDD name: "Philosopher's Reagent" gives "philosophers-reagent". */
export function assetFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Manifest key for a group and a GDD name or file name. */
export function assetKey(group: AssetGroup, name: string): string {
  return `${group}.${assetFileName(name)}`;
}

/** File path for a group and a GDD name or file name. */
export function assetPath(group: AssetGroup, name: string): string {
  return `assets/${ASSET_FOLDERS[group]}/${assetFileName(name)}.png`;
}

function entry(group: AssetGroup, name: string, placeholder: string): AssetEntry {
  return { key: assetKey(group, name), path: assetPath(group, name), placeholder };
}

function group(entries: readonly AssetEntry[]): Record<string, AssetEntry> {
  return Object.fromEntries(entries.map((item) => [item.key, item]));
}

const ENEMY_ASSETS = group(
  ENEMY_LIST.map((enemy) => entry('enemy', enemy.name, `${enemy.faction} circle, ink outline, letter ${enemy.name.charAt(0)}, radius ${enemy.radius}`)),
);

/** Mini-boss images use the short name: forge-marshal.png (ART_PROMPTS.md). */
export function miniBossAssetKey(id: MiniBossId): string {
  return assetKey('miniboss', id);
}

/** One boss image per phase: iron-regent-phase-1.png (ART_PROMPTS.md, GDD 15.3). */
export function bossAssetKey(id: BossId, phase: number): string {
  return assetKey('boss', `${id}-phase-${phase}`);
}

const MINI_BOSS_ASSETS = group(
  MINI_BOSS_LIST.map((mini) => entry('miniboss', mini.id, `${mini.kingdom} circle of radius 36, thick ink outline`)),
);

const BOSS_ASSETS = group(
  BOSS_LIST.flatMap((boss) =>
    boss.phases.map((_, index) => entry('boss', `${boss.id}-phase-${index + 1}`, `${boss.kingdom} circle of radius 56, thick ink outline`)),
  ),
);

/** Boss parts with an image of their own. The Unmaking's copies use the boss's image. */
const PART_IDS = ['automaton-arm', 'belt-motor', 'war-banner', 'tesla-pylon'] as const satisfies readonly BossPartId[];

/** A boss part's image: arm-turret.png, belt-motor.png, war-banner.png and pylon.png (ART_PROMPTS.md). */
export function partAssetKey(id: BossPartId): string | undefined {
  return (PART_IDS as readonly BossPartId[]).includes(id) ? assetKey('part', BOSS_PARTS[id].name) : undefined;
}

const PART_ASSETS = group(PART_IDS.map((id) => entry('part', BOSS_PARTS[id].name, `${BOSS_PARTS[id].faction} circle, ink outline`)));

/** Constructs and traps in the arena (GDD 7.17). The weapon icons stay separate. */
export const CONSTRUCT_NAMES = {
  turret: 'Clockwork Turret',
  hound: 'Clockwork Hound',
  creature: 'Living Arsenal',
  trap: 'Spring Trap',
} as const;

export function constructAssetKey(kind: keyof typeof CONSTRUCT_NAMES): string {
  return assetKey('construct', CONSTRUCT_NAMES[kind]);
}

const CONSTRUCT_ASSETS = group(
  Object.values(CONSTRUCT_NAMES).map((name) => entry('construct', name, 'Gold or brass circle with an ink outline drawn in code')),
);

const WEAPON_ASSETS = group(WEAPON_LIST.map((weapon) => entry('weapon', weapon.name, `${weapon.family} blueprint sketch drawn in code`)));
const COMPONENT_ASSETS = group(
  COMPONENT_LIST.map((component) => entry('component', component.name, `${component.slot} socket shape in the quality colour`)),
);
const RELIC_ASSETS = group(RELIC_LIST.map((relic) => entry('relic', relic.name, `${relic.kingdom} wax seal drawn in code`)));
const SHOPKEEPER_ASSETS = group(SHOP_IDS.map((id) => entry('shopkeeper', id, 'Door with the shop name and a brass plaque')));

export const ASSETS: Readonly<Record<string, AssetEntry>> = {
  'player.the-inventor': entry('player', 'The Inventor', 'Parchment circle, ink outline, dashed gold ring'),
  ...ENEMY_ASSETS,
  ...MINI_BOSS_ASSETS,
  ...BOSS_ASSETS,
  ...PART_ASSETS,
  ...CONSTRUCT_ASSETS,
  ...WEAPON_ASSETS,
  ...COMPONENT_ASSETS,
  ...RELIC_ASSETS,
  ...SHOPKEEPER_ASSETS,
  'arena.keldrath': entry('arena', 'Keldrath', 'Muted floor, central crucible and iron pillars in the Keldrath colour'),
  'arena.myrathis': entry('arena', 'Myrathis', 'Muted floor, a ring of glass vats and workbenches in the Myrathis colour'),
  'arena.merovant': entry('arena', 'Merovant', 'Muted floor, two conveyor belts and press tiles along the walls in the Merovant colour'),
  'arena.orthelyn': entry('arena', 'Orthelyn', 'Muted floor, the central orrery and six lightning rods in the Orthelyn colour'),
  'arena.nymora': entry('arena', 'Nymora', 'Muted floor, fountains and hedges in the Nymora colour'),
  // Story cards (GDD 2.4). Text on parchment until the images exist.
  'card.opening': entry('card', 'opening', 'Opening text on a parchment page'),
  ...Object.fromEntries(
    KINGDOM_NAMES.flatMap((kingdom) => [
      [assetKey('card', `reveal-${kingdom}`), entry('card', `reveal-${kingdom}`, `${kingdom} reveal text on a parchment card with a kingdom colour band`)],
      [assetKey('card', `ending-${kingdom}`), entry('card', `ending-${kingdom}`, `${kingdom} ending text on a parchment page`)],
    ]),
  ),
  // The map of the five kingdoms on the reveal screen (GDD 5.8) and the endless loop card (GDD 2.4).
  'card.kingdom-map': entry('card', 'kingdom-map', 'Five kingdom circles with the route drawn in ink'),
  'card.endless-loop': entry('card', 'endless-loop', 'Endless loop text on the map screen'),
  'hub.grand-archive': entry('hub', 'grand-archive', 'Coloured boxes for the hall hotspots on parchment'),
  'app.app-icon': entry('app', 'app-icon', 'Brass gear ring around "P&P" on parchment'),
  // ART_PROMPTS.md lists no projectile images. Projectiles are shapes drawn in code (GDD 15.3).
  'projectile.player': { key: 'projectile.player', placeholder: 'Gold circle, ink outline' },
};

/** Every manifest entry with a file. */
export const IMAGE_ASSETS: readonly AssetEntry[] = Object.values(ASSETS).filter((item) => item.path !== undefined);
