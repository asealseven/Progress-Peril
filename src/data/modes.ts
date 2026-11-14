// Difficulty, game speed, endless mode, the Apprentice Trial and player
// settings (GDD 3.9 to 3.12, 13.1 to 13.3). Numbers with no GDD value sit in
// MODE_RULES. NOTES.md records each choice.

import type { DamageType } from './damageTypes';

/** Levers a Challenge Tier adds, in the GDD 3.9 order. */
export type DifficultyLever = 'enemyDamage' | 'threatBudget' | 'eliteOdds' | 'enemyHealth' | 'enemyTactics';

export const TIER_LEVERS: readonly DifficultyLever[] = ['enemyDamage', 'threatBudget', 'eliteOdds', 'enemyHealth', 'enemyTactics'];

export const MAX_TIER = 5;

/** Archive Point rates (GDD 3.9). Index 0 is Normal. */
export const TIER_RATES: readonly number[] = [1, 1.2, 1.4, 1.6, 1.8, 2];
export const ASSIST_RATE = 0.5;

/** The revival works up to Tier 2 (GDD 3.8). */
export const REVIVAL_MAX_TIER = 2;

/** One campaign's difficulty: Assist on or off, and a Challenge Tier from 0 (Normal) to 5. */
export interface DifficultyMode {
  readonly assist: boolean;
  readonly tier: number;
}

export const NORMAL_MODE: DifficultyMode = { assist: false, tier: 0 };

/** Levers on at a tier. */
export function leversAt(tier: number): DifficultyLever[] {
  return TIER_LEVERS.slice(0, Math.max(0, Math.min(MAX_TIER, tier)));
}

export const MODE_RULES = {
  /** Fast-forward: one setting at 1.5 times speed (GDD 3.12). */
  fastForward: 1.5,
  /** Assist mode's slower game speed (GDD 3.9). */
  assistSpeed: 0.8,
  /** The threat budget lever multiplies each round's budget. */
  threatBudgetFactor: 1.25,
  /** The elite and champion odds lever moves both odds up one tier step. */
  eliteOddsSteps: 1,
  /** The tactics lever brings formations, flanking and coordinated assaults this many rounds earlier. */
  tacticsRounds: 3,
  /** Endless: completed loops of five territories add one Health and Damage step each (GDD 13.3). */
  loopLength: 5,
} as const;

// --- The Apprentice Trial (GDD 3.11) ------------------------------------------------

export interface TrialStep {
  readonly step: string;
  readonly teaches: string;
  readonly content: string;
}

/** The six steps of the trial, as GDD 3.11 lists them. */
export const TRIAL_STEPS: readonly TrialStep[] = [
  { step: 'Round 1', teaches: 'Movement and automatic combat', content: 'One weapon, Swarmers only' },
  { step: 'Preparation 1', teaches: 'Components', content: 'Install one free component and see the stat change' },
  { step: 'Round 2', teaches: 'Status effects and manual focus', content: 'Enemies weak to the installed payload, plus one priority target to focus' },
  { step: 'Preparation 2', teaches: 'Research', content: 'Spend Research Points on one centre node of the research web' },
  { step: 'Round 3', teaches: 'Synergies', content: 'A second weapon arrives and triggers a cross-weapon synergy' },
  { step: 'Preparation 3', teaches: 'Shop', content: 'One free visit with fixed stock' },
];

/** Trial content with no GDD names: the free component and its matching enemies (NOTES.md). */
export const TRIAL_RULES = {
  /** The trial runs in Keldrath (GDD 5.7). */
  kingdom: 'Keldrath',
  swarmer: 'clockwork-crawler',
  freeComponent: 'Incendiary Oil',
  /** Enemies weak to Fire, the free payload's damage. */
  weakEnemies: ['chemical-crawler', 'hunting-hound'],
  priorityTarget: 'regenerator',
  researchPoints: 15,
  /** Fixed stock for the free visit after Round 3. */
  shop: 'blacksmith',
} as const;

// --- Settings (GDD 3.10, 3.12) --------------------------------------------------------

export type ColourPalette = 'standard' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type TextSize = 'normal' | 'large' | 'larger';
export type FocusMode = 'hold' | 'toggle';
export type Handedness = 'right' | 'left';

/** Remappable keyboard and controller actions (GDD 3.5, 3.10). */
export const INPUT_ACTIONS = ['up', 'down', 'left', 'right', 'pause', 'fastForward', 'focusToggle'] as const;
export type InputAction = (typeof INPUT_ACTIONS)[number];

export const PAD_ACTIONS = ['pause', 'fastForward', 'confirm'] as const;
export type PadAction = (typeof PAD_ACTIONS)[number];

export interface GameSettings {
  screenShake: boolean;
  flashes: boolean;
  damageNumbers: boolean;
  lowHealthWarning: boolean;
  /** Particle share from 0.25 to 1. Gameplay never changes (CLAUDE.md rule 9). */
  effectDensity: number;
  textSize: TextSize;
  readableFont: boolean;
  colourPalette: ColourPalette;
  /** Brightness of the high-contrast outline on enemy projectiles, 0 to 1. */
  projectileOutline: number;
  focusMode: FocusMode;
  handedness: Handedness;
  /** Touch joystick size multiplier. */
  joystickScale: number;
  /** A fixed joystick sits at a set point instead of floating under the thumb. */
  joystickFixed: boolean;
  audioCues: boolean;
  subtitles: boolean;
  /** Sound effect and music volume, 0 to 1 (GDD 15.10). */
  sfxVolume: number;
  musicVolume: number;
  /** Keyboard key names (Phaser key codes by name), per action. */
  keys: Record<InputAction, string>;
  /** Controller button indices, per action. */
  pad: Record<PadAction, number>;
  /** Fast-forward stays as the player left it (GDD 3.12). */
  fastForward: boolean;
  /** The Apprentice Trial on the first campaign (GDD 3.11). */
  trial: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  screenShake: true,
  flashes: true,
  damageNumbers: true,
  lowHealthWarning: true,
  effectDensity: 1,
  textSize: 'normal',
  readableFont: false,
  colourPalette: 'standard',
  projectileOutline: 0.6,
  focusMode: 'hold',
  handedness: 'right',
  joystickScale: 1,
  joystickFixed: false,
  audioCues: true,
  subtitles: true,
  sfxVolume: 0.8,
  musicVolume: 0.6,
  keys: { up: 'W', down: 'S', left: 'A', right: 'D', pause: 'ESC', fastForward: 'TAB', focusToggle: 'F' },
  pad: { pause: 9, fastForward: 8, confirm: 0 },
  fastForward: false,
  trial: true,
};

export const TEXT_SCALE: Readonly<Record<TextSize, number>> = { normal: 1, large: 1.15, larger: 1.3 };
export const DENSITY_STEPS: readonly number[] = [0.25, 0.5, 0.75, 1];
export const VOLUME_STEPS: readonly number[] = [0, 0.2, 0.4, 0.6, 0.8, 1];
export const JOYSTICK_STEPS: readonly number[] = [0.8, 1, 1.25, 1.5];

/**
 * Three colour-blind palettes for damage types (GDD 3.10). Each keeps the nine
 * types apart for its colour-vision type. Shapes carry the type as well (GDD 15.1).
 */
export const DAMAGE_PALETTES: Readonly<Record<Exclude<ColourPalette, 'standard'>, Readonly<Record<DamageType, string>>>> = {
  protanopia: {
    Slashing: '#E8E8E8',
    Piercing: '#56B4E9',
    Impact: '#8C7A3A',
    Fire: '#E69F00',
    Cold: '#9AD7F0',
    Electric: '#F0E442',
    Toxic: '#0072B2',
    Corrosive: '#B5B5B5',
    Biological: '#CC79A7',
  },
  deuteranopia: {
    Slashing: '#E8E8E8',
    Piercing: '#56B4E9',
    Impact: '#9C8040',
    Fire: '#D55E00',
    Cold: '#A6DCEF',
    Electric: '#F0E442',
    Toxic: '#0072B2',
    Corrosive: '#BDBDBD',
    Biological: '#CC79A7',
  },
  tritanopia: {
    Slashing: '#E8E8E8',
    Piercing: '#7A7A7A',
    Impact: '#A0522D',
    Fire: '#E8433A',
    Cold: '#5FD3C8',
    Electric: '#FFB3B3',
    Toxic: '#1B7F5A',
    Corrosive: '#D9A0A0',
    Biological: '#B5338A',
  },
};
