// Asset manifest: key, file path and placeholder description (CLAUDE.md rule 8).
// Folders and file names follow ART_PROMPTS.md. A key is `<group>.<file name>`,
// and the group sets the folder inside public/assets/.
// Milestone 11 loads the files. Until then every key draws its placeholder.

import { KINGDOM_NAMES } from './kingdoms';
import { ENEMY_LIST } from './enemies';

/** Folder inside public/assets/ for each key group (ART_PROMPTS.md). */
export const ASSET_FOLDERS = {
  player: 'sprites/player',
  enemy: 'sprites/enemies',
  miniboss: 'sprites/minibosses',
  boss: 'sprites/bosses',
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

const ENEMY_ASSETS: Record<string, AssetEntry> = Object.fromEntries(
  ENEMY_LIST.map((enemy) => [
    assetKey('enemy', enemy.name),
    entry('enemy', enemy.name, `${enemy.faction} circle, ink outline, letter ${enemy.name.charAt(0)}, radius ${enemy.radius}`),
  ]),
);

export const ASSETS: Readonly<Record<string, AssetEntry>> = {
  'player.the-inventor': entry('player', 'The Inventor', 'Parchment circle, ink outline, dashed gold ring'),
  ...ENEMY_ASSETS,
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
  'app.app-icon': entry('app', 'app-icon', 'Brass gear ring around "P&P" on parchment'),
  // ART_PROMPTS.md lists no projectile images. Projectiles are shapes drawn in code (GDD 15.3).
  'projectile.player': { key: 'projectile.player', placeholder: 'Gold circle, ink outline' },
};
