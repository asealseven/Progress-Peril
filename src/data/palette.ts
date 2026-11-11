// Colours from CLAUDE.md "Placeholder art" and GDD 15.1.

export const PALETTE = {
  parchment: '#F3EBDA',
  ink: '#2A2118',
  brass: '#8C6A36',
  danger: '#B3262E',
  playerEffects: '#C8902A',
} as const;

export const FACTION_COLOURS = {
  'Kingdom Armies': '#A7AEB6',
  'Clockwork Legions': '#C9A24A',
  'Failed Experiments': '#9FD06A',
  Wilds: '#6E8E4E',
  Outlaws: '#8C6A46',
  Unknown: '#9C86C9',
} as const;

export const KINGDOM_COLOURS = {
  Keldrath: '#D2642A',
  Myrathis: '#6FA83A',
  Merovant: '#2F8A86',
  Orthelyn: '#6E4FA3',
  Nymora: '#4E7A3A',
} as const;

export const DAMAGE_TYPE_COLOURS = {
  Slashing: '#D9DCE0',
  Piercing: '#9DB4C8',
  Impact: '#C79A3A',
  Fire: '#E07A2A',
  Cold: '#7FD3E6',
  Electric: '#F1DC5A',
  Toxic: '#4FA34A',
  Corrosive: '#B5D334',
  Biological: '#C24A9A',
} as const;

export type FactionName = keyof typeof FACTION_COLOURS;
export type KingdomName = keyof typeof KINGDOM_COLOURS;
export type DamageTypeName = keyof typeof DAMAGE_TYPE_COLOURS;

/** Converts '#RRGGBB' to the 0xRRGGBB number Phaser shapes expect. */
export function hexToNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}
