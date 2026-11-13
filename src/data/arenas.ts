// Arena layouts (GDD 5.3, 5.9). One arena per kingdom, 2400 by 1600 pixels.
// Each arena lists its solid shapes and the places its hazards use. The
// simulation reads the round within the territory and turns hazards on
// (src/sim/world/environment.ts).

import type { KingdomName } from './palette';
import { ARENA_SIZE } from './tiers';

export interface ArenaObstacle {
  readonly kind: 'landmark' | 'pillar' | 'vat' | 'bench' | 'machine' | 'rod' | 'fountain' | 'hedge' | 'thorn' | 'arm';
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** Low cover blocks movement but lets every projectile pass (GDD 5.9). */
  readonly low?: boolean;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The live area of an arena. Orthelyn's erased tiles shrink it (GDD 5.10). */
export interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface Belt extends Rect {
  /** Push direction while running: +1 or -1 along the belt's long side. */
  readonly direction: 1 | -1;
}

/** One line of the GDD 5.9 round table. */
export interface ArenaStage {
  /** Rounds within the territory, 1 to 7. */
  readonly rounds: readonly number[];
  readonly change: string;
}

export interface ArenaDef {
  readonly id: string;
  readonly kingdom: KingdomName;
  readonly name: string;
  readonly description: string;
  readonly width: number;
  readonly height: number;
  readonly playerStart: Point;
  /** Solid shapes. They block movement and Straight projectiles (GDD 7.16), except low cover. */
  readonly obstacles: readonly ArenaObstacle[];
  readonly bounds?: Bounds;
  readonly stages: readonly ArenaStage[];
  // Hazard places. Each arena fills the fields its hazards need.
  readonly channels?: readonly Rect[];
  readonly puddles?: readonly Point[];
  readonly belts?: readonly Belt[];
  readonly pressTiles?: readonly Rect[];
  readonly rods?: readonly Point[];
  readonly hedgeLines?: readonly ArenaObstacle[];
  /** Tile size for erased tiles. */
  readonly tile?: number;
}

const width = ARENA_SIZE.width;
const height = ARENA_SIZE.height;
const centreX = width / 2;
const centreY = height / 2;

/** Points on an ellipse around the centre, for vats and rods. */
function ring(count: number, radiusX: number, radiusY: number, offset = 0): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = offset + (index / count) * Math.PI * 2;
    return { x: Math.round(centreX + Math.cos(angle) * radiusX), y: Math.round(centreY + Math.sin(angle) * radiusY) };
  });
}

/** A hedge line of touching circles from one point to another. */
function hedgeLine(x1: number, x2: number, y: number, kind: 'hedge' | 'thorn', radius: number): ArenaObstacle[] {
  const shapes: ArenaObstacle[] = [];
  for (let x = x1; x <= x2; x += radius * 1.6) shapes.push({ kind, x: Math.round(x), y, radius });
  return shapes;
}

const VATS = ring(12, 980, 620, Math.PI / 12);
const RODS = ring(6, 640, 420, Math.PI / 6);
const PRESS_X = [360, 720, 1080, 1320, 1680, 2040];

export const ARENAS = {
  'great-foundry': {
    id: 'great-foundry',
    kingdom: 'Keldrath',
    name: 'the Great Foundry',
    description: 'A square foundry floor around a central crucible. Iron pillars give cover against ranged enemies.',
    width,
    height,
    playerStart: { x: centreX, y: centreY + 320 },
    obstacles: [
      { kind: 'landmark', x: centreX, y: centreY, radius: 120 },
      { kind: 'pillar', x: 520, y: 400, radius: 38 },
      { kind: 'pillar', x: 1880, y: 400, radius: 38 },
      { kind: 'pillar', x: 520, y: 1200, radius: 38 },
      { kind: 'pillar', x: 1880, y: 1200, radius: 38 },
      { kind: 'pillar', x: 820, y: 800, radius: 38 },
      { kind: 'pillar', x: 1580, y: 800, radius: 38 },
    ],
    stages: [
      { rounds: [1, 2], change: 'Cold floor. Pillars block projectiles.' },
      { rounds: [3], change: 'Molten channels open in lines across the floor.' },
      { rounds: [4], change: 'Mini-boss round. Channels stay open.' },
      { rounds: [5, 6], change: 'The crucible tips and pours a slag wave across half the arena, with a warning.' },
      { rounds: [7], change: "The Iron Regent's throne platform rises in the centre. Cranes drop iron ingots during the fight." },
    ],
    // Two lines of channels with a crossing near the crucible.
    channels: [
      { x: 160, y: 560, width: 760, height: 48 },
      { x: 1480, y: 560, width: 760, height: 48 },
      { x: 160, y: 1000, width: 760, height: 48 },
      { x: 1480, y: 1000, width: 760, height: 48 },
    ],
  },
  'grand-laboratory': {
    id: 'grand-laboratory',
    kingdom: 'Myrathis',
    name: 'the Grand Laboratory',
    description: 'A round laboratory ringed by glass vats, with workbenches as low cover.',
    width,
    height,
    playerStart: { x: centreX, y: centreY + 300 },
    obstacles: [
      { kind: 'landmark', x: centreX, y: centreY, radius: 100 },
      ...VATS.map((point) => ({ kind: 'vat' as const, ...point, radius: 44 })),
      { kind: 'bench', x: 760, y: 560, radius: 34, low: true },
      { kind: 'bench', x: 1640, y: 560, radius: 34, low: true },
      { kind: 'bench', x: 760, y: 1040, radius: 34, low: true },
      { kind: 'bench', x: 1640, y: 1040, radius: 34, low: true },
    ],
    stages: [
      { rounds: [1, 2], change: 'Vats intact.' },
      { rounds: [3], change: 'Vats leak. Toxic puddles appear near the edge.' },
      { rounds: [4], change: 'Mini-boss round. The Mad Alchemist shatters vats as an attack.' },
      { rounds: [5, 6], change: 'Volatile vats explode when hit by any attack, from enemies or the player, and join chain reactions.' },
      { rounds: [7], change: 'The Abomination bursts from the central vat. Acid pools spread from the centre.' },
    ],
    // Puddles sit inside the ring of vats, near the edge.
    puddles: ring(8, 820, 500, 0),
  },
  'assembly-yards': {
    id: 'assembly-yards',
    kingdom: 'Merovant',
    name: 'the Assembly Yards',
    description: 'A long factory floor crossed by conveyor belts, with stamping presses along the walls.',
    width,
    height,
    playerStart: { x: centreX, y: centreY + 200 },
    obstacles: [
      { kind: 'machine', x: 300, y: 800, radius: 50 },
      { kind: 'machine', x: 2100, y: 800, radius: 50 },
      { kind: 'machine', x: 900, y: 800, radius: 40 },
      { kind: 'machine', x: 1500, y: 800, radius: 40 },
    ],
    stages: [
      { rounds: [1, 2], change: 'Belts idle.' },
      { rounds: [3], change: 'Belts start and push anyone standing on them.' },
      { rounds: [4], change: 'Mini-boss round. The Siege Spider climbs the walls.' },
      { rounds: [5, 6], change: 'Presses stamp marked tiles. Belts reverse direction at intervals.' },
      { rounds: [7], change: 'The Grand Automaton assembles on the central line. Belts carry spare parts to the boss until the player destroys them.' },
    ],
    belts: [
      { x: 240, y: 420, width: 1920, height: 110, direction: 1 },
      { x: 240, y: 1070, width: 1920, height: 110, direction: -1 },
    ],
    pressTiles: [
      ...PRESS_X.map((x) => ({ x: x - 80, y: 80, width: 160, height: 160 })),
      ...PRESS_X.map((x) => ({ x: x - 80, y: height - 240, width: 160, height: 160 })),
    ],
  },
  'observatory-plaza': {
    id: 'observatory-plaza',
    kingdom: 'Orthelyn',
    name: 'the Observatory Plaza',
    description: 'A round plaza around a giant orrery, open to the sky.',
    width,
    height,
    playerStart: { x: centreX, y: centreY + 300 },
    obstacles: [
      { kind: 'landmark', x: centreX, y: centreY, radius: 110 },
      ...RODS.map((point) => ({ kind: 'rod' as const, ...point, radius: 18 })),
    ],
    stages: [
      { rounds: [1, 2], change: 'Lightning rods idle. The plaza is fully open.' },
      { rounds: [3], change: 'Lightning rods strike marked circles.' },
      { rounds: [4], change: 'Mini-boss round. The Tesla Warden powers the rods.' },
      { rounds: [5, 6], change: 'Gravity wells open. Orrery arms sweep the plaza and block projectiles.' },
      { rounds: [7], change: 'The Unmaking erases plaza tiles, shrinking the arena in stages.' },
    ],
    rods: RODS,
    tile: 200,
  },
  'overgrown-arboretum': {
    id: 'overgrown-arboretum',
    kingdom: 'Nymora',
    name: 'the Overgrown Arboretum',
    description: 'A ruined greenhouse garden with hedges and fountains.',
    width,
    height,
    playerStart: { x: centreX, y: centreY + 300 },
    obstacles: [
      { kind: 'fountain', x: centreX, y: centreY, radius: 100 },
      { kind: 'fountain', x: 560, y: 800, radius: 50 },
      { kind: 'fountain', x: 1840, y: 800, radius: 50 },
      ...hedgeLine(360, 640, 330, 'hedge', 28),
      ...hedgeLine(1760, 2040, 330, 'hedge', 28),
      ...hedgeLine(360, 640, 1270, 'hedge', 28),
      ...hedgeLine(1760, 2040, 1270, 'hedge', 28),
    ],
    stages: [
      { rounds: [1, 2], change: 'Garden paths clear.' },
      { rounds: [3], change: 'Vines spread from the edges and slow movement.' },
      { rounds: [4], change: 'Mini-boss round. The Thornback Matriarch charges through hedges.' },
      { rounds: [5, 6], change: 'Thorn hedges grow and split the arena into lanes. Healing blooms open.' },
      { rounds: [7], change: 'The Spore Sovereign roots in the central fountain. Fungal growth spreads unless burned.' },
    ],
    // Two thorn lines split the garden into three lanes, with gaps at both ends and the middle.
    hedgeLines: [
      ...hedgeLine(260, 1000, 560, 'thorn', 26),
      ...hedgeLine(1400, 2140, 560, 'thorn', 26),
      ...hedgeLine(260, 1000, 1040, 'thorn', 26),
      ...hedgeLine(1400, 2140, 1040, 'thorn', 26),
    ],
  },
} as const satisfies Record<string, ArenaDef>;

export type ArenaId = keyof typeof ARENAS;

export const ARENA_BY_KINGDOM: Readonly<Record<KingdomName, ArenaDef>> = {
  Keldrath: ARENAS['great-foundry'],
  Myrathis: ARENAS['grand-laboratory'],
  Merovant: ARENAS['assembly-yards'],
  Orthelyn: ARENAS['observatory-plaza'],
  Nymora: ARENAS['overgrown-arboretum'],
};

/** The GDD 5.9 line for a round within the territory. */
export function arenaStage(arena: ArenaDef, localRound: number): ArenaStage | undefined {
  return arena.stages.find((stage) => stage.rounds.includes(localRound));
}
