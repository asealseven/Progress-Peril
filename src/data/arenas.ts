// Arena layouts (GDD 5.9). Milestone 1 holds a placeholder Great Foundry.
// Milestone 7 adds round-by-round changes and the other four arenas.

import type { KingdomName } from './palette';
import { ARENA_SIZE } from './tiers';

export interface ArenaObstacle {
  readonly kind: 'landmark' | 'pillar';
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface ArenaDef {
  readonly id: string;
  readonly kingdom: KingdomName;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly playerStart: { readonly x: number; readonly y: number };
  /** Solid shapes. They block movement and Straight projectiles (GDD 7.16). */
  readonly obstacles: readonly ArenaObstacle[];
}

const centreX = ARENA_SIZE.width / 2;
const centreY = ARENA_SIZE.height / 2;

export const ARENAS = {
  'great-foundry': {
    id: 'great-foundry',
    kingdom: 'Keldrath',
    name: 'the Great Foundry',
    width: ARENA_SIZE.width,
    height: ARENA_SIZE.height,
    playerStart: { x: centreX, y: centreY + 320 },
    obstacles: [
      // The central crucible.
      { kind: 'landmark', x: centreX, y: centreY, radius: 120 },
      // Iron pillars.
      { kind: 'pillar', x: 520, y: 400, radius: 38 },
      { kind: 'pillar', x: 1880, y: 400, radius: 38 },
      { kind: 'pillar', x: 520, y: 1200, radius: 38 },
      { kind: 'pillar', x: 1880, y: 1200, radius: 38 },
      { kind: 'pillar', x: 820, y: 800, radius: 38 },
      { kind: 'pillar', x: 1580, y: 800, radius: 38 },
    ],
  },
} as const satisfies Record<string, ArenaDef>;

export type ArenaId = keyof typeof ARENAS;
