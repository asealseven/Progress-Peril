// Asset manifest: key, file path and placeholder description (CLAUDE.md rule 8).
// File names are the kebab-case form of the GDD name. Folders follow the
// CLAUDE.md example until ART_PROMPTS.md arrives (see NOTES.md).
// Milestone 11 loads the files. Until then every key draws its placeholder.

export interface AssetEntry {
  readonly key: string;
  readonly path: string;
  readonly placeholder: string;
}

export const ASSETS = {
  'character.the-inventor': {
    key: 'character.the-inventor',
    path: 'assets/sprites/characters/the-inventor.png',
    placeholder: 'Parchment circle, ink outline, dashed gold ring',
  },
  'enemy.royal-footman': {
    key: 'enemy.royal-footman',
    path: 'assets/sprites/enemies/royal-footman.png',
    placeholder: 'Kingdom Armies circle, ink outline, letter R, radius 14',
  },
  'projectile.player': {
    key: 'projectile.player',
    path: 'assets/sprites/projectiles/player.png',
    placeholder: 'Gold circle, ink outline',
  },
} as const satisfies Record<string, AssetEntry>;

export type AssetKey = keyof typeof ASSETS;
