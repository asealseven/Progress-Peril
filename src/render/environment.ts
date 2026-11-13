// Arena and hazard placeholders (GDD 5.9, 5.10, 15.1). Hazards are shapes in
// the kingdom colour. Every warning pulses with the crimson danger outline.

import type Phaser from 'phaser';
import type { ArenaDef } from '../data/arenas';
import { HAZARD_RULES } from '../data/hazards';
import { DAMAGE_TYPE_COLOURS, KINGDOM_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import type { Environment, HazardZone, LiveObstacle } from '../sim/world/environment';

const INK = hexToNumber(PALETTE.ink);
const DANGER = hexToNumber(PALETTE.danger);
const FLOOR = 0xddd2ba;
const FLOOR_LINE = 0xcbbfa5;
const STONE = 0x6b635a;
const GLASS = 0xb7d9d2;
const WOOD = 0x8c6a46;
const LEAF = 0x5e7d42;
const THORN = 0x3f5a2c;
const WATER = 0x7fb4c9;
const BLOOM = 0xf0d36a;
const VINE = 0x6e8e4e;

const HAZARD_COLOURS = {
  fire: hexToNumber(DAMAGE_TYPE_COLOURS.Fire),
  toxic: hexToNumber(DAMAGE_TYPE_COLOURS.Toxic),
  corrosive: hexToNumber(DAMAGE_TYPE_COLOURS.Corrosive),
  electric: hexToNumber(DAMAGE_TYPE_COLOURS.Electric),
  impact: hexToNumber(DAMAGE_TYPE_COLOURS.Impact),
  biological: hexToNumber(DAMAGE_TYPE_COLOURS.Biological),
} as const;

/** Floor, walls and the shapes that never move. */
export function drawArenaFloor(floor: Phaser.GameObjects.Graphics, arena: ArenaDef): void {
  const kingdom = hexToNumber(KINGDOM_COLOURS[arena.kingdom]);
  floor.fillStyle(FLOOR, 1);
  floor.fillRect(0, 0, arena.width, arena.height);
  // A faint wash of the kingdom colour tells arenas apart.
  floor.fillStyle(kingdom, 0.07);
  floor.fillRect(0, 0, arena.width, arena.height);
  floor.lineStyle(2, FLOOR_LINE, 1);
  for (let x = 200; x < arena.width; x += 200) floor.lineBetween(x, 0, x, arena.height);
  for (let y = 200; y < arena.height; y += 200) floor.lineBetween(0, y, arena.width, y);

  // Belts and press tiles sit on the floor all round. They act from the round the GDD names.
  for (const belt of arena.belts ?? []) {
    floor.fillStyle(0x8a8172, 0.55);
    floor.fillRect(belt.x, belt.y, belt.width, belt.height);
    floor.lineStyle(3, INK, 0.7);
    floor.strokeRect(belt.x, belt.y, belt.width, belt.height);
  }
  for (const tile of arena.pressTiles ?? []) {
    floor.lineStyle(3, INK, 0.45);
    floor.strokeRect(tile.x + 6, tile.y + 6, tile.width - 12, tile.height - 12);
  }
  for (const channel of arena.channels ?? []) {
    floor.lineStyle(2, INK, 0.35);
    floor.strokeRect(channel.x, channel.y, channel.width, channel.height);
  }

  floor.lineStyle(10, INK, 1);
  floor.strokeRect(5, 5, arena.width - 10, arena.height - 10);
  floor.lineStyle(3, kingdom, 0.8);
  floor.strokeRect(16, 16, arena.width - 32, arena.height - 32);

  for (const obstacle of arena.obstacles) {
    // Vats break, arms turn and thorns sprout, so the hazard layer draws them.
    if (obstacle.kind === 'vat' || obstacle.kind === 'arm' || obstacle.kind === 'thorn') continue;
    drawObstacle(floor, obstacle, kingdom);
  }
}

function drawObstacle(g: Phaser.GameObjects.Graphics, obstacle: LiveObstacle, kingdom: number): void {
  const { x, y, radius } = obstacle;
  switch (obstacle.kind) {
    case 'landmark':
      g.fillStyle(STONE, 1);
      g.fillCircle(x, y, radius);
      g.fillStyle(kingdom, 1);
      g.fillCircle(x, y, radius * 0.72);
      g.lineStyle(4, INK, 1);
      g.strokeCircle(x, y, radius * 0.72);
      g.strokeCircle(x, y, radius);
      break;
    case 'bench':
      // Low cover: a flat workbench.
      g.fillStyle(WOOD, 1);
      g.fillRect(x - radius * 1.3, y - radius * 0.7, radius * 2.6, radius * 1.4);
      g.lineStyle(3, INK, 1);
      g.strokeRect(x - radius * 1.3, y - radius * 0.7, radius * 2.6, radius * 1.4);
      break;
    case 'machine':
      g.fillStyle(STONE, 1);
      g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      g.lineStyle(3, INK, 1);
      g.strokeRect(x - radius, y - radius, radius * 2, radius * 2);
      g.strokeCircle(x, y, radius * 0.5);
      break;
    case 'rod':
      g.fillStyle(STONE, 1);
      g.fillCircle(x, y, radius);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(x, y, radius);
      g.fillStyle(kingdom, 1);
      g.fillCircle(x, y, radius * 0.45);
      break;
    case 'fountain':
      g.fillStyle(STONE, 1);
      g.fillCircle(x, y, radius);
      g.fillStyle(WATER, 1);
      g.fillCircle(x, y, radius * 0.75);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(x, y, radius);
      break;
    case 'hedge':
      g.fillStyle(LEAF, 1);
      g.fillCircle(x, y, radius);
      g.lineStyle(2, INK, 0.8);
      g.strokeCircle(x, y, radius);
      break;
    case 'thorn':
      g.fillStyle(THORN, 1);
      g.fillCircle(x, y, radius);
      g.lineStyle(2, INK, 1);
      g.strokeCircle(x, y, radius);
      // Spikes.
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        g.lineBetween(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, x + Math.cos(angle) * (radius + 7), y + Math.sin(angle) * (radius + 7));
      }
      break;
    case 'vat':
      g.fillStyle(GLASS, 1);
      g.fillCircle(x, y, radius);
      g.fillStyle(kingdom, 0.7);
      g.fillCircle(x, y + radius * 0.2, radius * 0.7);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(x, y, radius);
      break;
    case 'arm':
      g.fillStyle(0xb08d4a, 1);
      g.fillCircle(x, y, radius);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(x, y, radius);
      break;
    default:
      g.fillStyle(STONE, 1);
      g.fillCircle(x, y, radius);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(x, y, radius);
      g.lineStyle(2, INK, 0.5);
      g.strokeCircle(x, y, radius * 0.6);
  }
}

function zoneColour(zone: HazardZone): number {
  switch (zone.hazard) {
    case 'molten-channel':
    case 'slag-wave':
      return HAZARD_COLOURS.fire;
    case 'toxic-puddle':
      return HAZARD_COLOURS.toxic;
    case 'acid-pool':
      return HAZARD_COLOURS.corrosive;
    case 'lightning-strike':
      return HAZARD_COLOURS.electric;
    case 'falling-ingot':
    case 'stamping-press':
      return HAZARD_COLOURS.impact;
    case 'fungal-growth':
      return HAZARD_COLOURS.biological;
    case 'healing-bloom':
      return BLOOM;
    default:
      return INK;
  }
}

function fillZone(g: Phaser.GameObjects.Graphics, zone: HazardZone, colour: number, alpha: number): void {
  g.fillStyle(colour, alpha);
  if (zone.shape === 'circle') g.fillCircle(zone.x, zone.y, zone.radius);
  else g.fillRect(zone.x, zone.y, zone.width, zone.height);
}

function strokeZone(g: Phaser.GameObjects.Graphics, zone: HazardZone, width: number, colour: number, alpha: number): void {
  g.lineStyle(width, colour, alpha);
  if (zone.shape === 'circle') g.strokeCircle(zone.x, zone.y, zone.radius);
  else g.strokeRect(zone.x, zone.y, zone.width, zone.height);
}

/** Hazards and moving parts, redrawn every frame. `time` is the elapsed combat time in seconds. */
export function drawEnvironment(g: Phaser.GameObjects.Graphics, env: Environment, time: number): void {
  g.clear();
  const arena = env.arena;
  const kingdom = hexToNumber(KINGDOM_COLOURS[arena.kingdom]);
  const pulse = 0.5 + 0.5 * Math.sin(time * 12);

  // Vines creep in from the edges.
  if (env.flags.vines) {
    const depth = env.vineDepth;
    g.fillStyle(VINE, 0.32);
    g.fillRect(0, 0, arena.width, depth);
    g.fillRect(0, arena.height - depth, arena.width, depth);
    g.fillRect(0, depth, depth, arena.height - depth * 2);
    g.fillRect(arena.width - depth, depth, depth, arena.height - depth * 2);
    g.lineStyle(3, VINE, 0.9);
    g.strokeRect(depth, depth, arena.width - depth * 2, arena.height - depth * 2);
  }

  // Belts: moving arrows while running.
  for (const belt of env.belts) {
    if (!belt.running) continue;
    const spacing = 80;
    const offset = ((time * HAZARD_RULES.beltSpeed * belt.sign) % spacing + spacing) % spacing;
    g.lineStyle(4, kingdom, 0.9);
    const midY = belt.y + belt.height / 2;
    for (let x = belt.x + offset; x < belt.x + belt.width; x += spacing) {
      const tip = x + 18 * belt.sign;
      g.lineBetween(x - 18 * belt.sign, midY - 22, tip, midY);
      g.lineBetween(tip, midY, x - 18 * belt.sign, midY + 22);
    }
  }

  for (const zone of env.zones) {
    const armed = time >= zone.armedAt;
    const colour = zoneColour(zone);
    if (zone.hazard === 'gravity-well') {
      // A distortion ring.
      for (let ring = 1; ring <= 3; ring++) {
        const r = zone.radius * ((((time * 0.6 + ring / 3) % 1) + 0.05));
        g.lineStyle(2, kingdom, armed ? 0.6 : 0.3);
        g.strokeCircle(zone.x, zone.y, r);
      }
      g.lineStyle(2, INK, 0.5);
      g.strokeCircle(zone.x, zone.y, zone.radius);
      continue;
    }
    if (zone.hazard === 'healing-bloom') {
      fillZone(g, zone, BLOOM, armed ? 0.3 : 0.12);
      g.fillStyle(BLOOM, 0.9);
      for (let petal = 0; petal < 5; petal++) {
        const angle = (petal / 5) * Math.PI * 2 + time;
        g.fillCircle(zone.x + Math.cos(angle) * 12, zone.y + Math.sin(angle) * 12, 8);
      }
      continue;
    }
    if (!armed) {
      // Warning: the crimson outline pulses, the hazard colour builds (GDD 5.10).
      const progress = 1 - Math.max(0, zone.armedAt - time) / HAZARD_RULES.warningSeconds;
      fillZone(g, zone, colour, 0.08 + 0.2 * Math.max(0, Math.min(1, progress)));
      strokeZone(g, zone, 3, DANGER, 0.45 + 0.5 * pulse);
      continue;
    }
    switch (zone.hazard) {
      case 'molten-channel':
      case 'toxic-puddle':
      case 'acid-pool':
      case 'fungal-growth':
        fillZone(g, zone, colour, 0.45);
        strokeZone(g, zone, 2, INK, 0.5);
        break;
      default:
        // A burst lands: a short bright flash.
        fillZone(g, zone, colour, 0.75);
        strokeZone(g, zone, 3, INK, 0.8);
    }
  }

  // Vats, bubbling while volatile.
  for (const obstacle of arena.obstacles) {
    if (obstacle.kind !== 'vat') continue;
    drawObstacle(g, obstacle, kingdom);
    if (env.vatsVolatile) {
      g.fillStyle(0xffffff, 0.7);
      const bob = (time * 2 + obstacle.x * 0.01) % 1;
      g.fillCircle(obstacle.x - 10, obstacle.y + 10 - bob * 26, 4);
      g.fillCircle(obstacle.x + 8, obstacle.y + 4 - ((bob + 0.5) % 1) * 26, 3);
      g.lineStyle(2, DANGER, 0.3 + 0.4 * pulse);
      g.strokeCircle(obstacle.x, obstacle.y, obstacle.radius + 5);
    }
  }

  // Orrery arms.
  for (const segment of env.armSegments) drawObstacle(g, segment, kingdom);

  // Thorn hedges: a pale outline while they sprout, then solid.
  for (const thorn of env.thorns) {
    if (env.thornsUp) drawObstacle(g, thorn, kingdom);
    else {
      g.lineStyle(2, DANGER, 0.4 + 0.5 * pulse);
      g.strokeCircle(thorn.x, thorn.y, thorn.radius * Math.min(1, time / HAZARD_RULES.warningSeconds));
    }
  }

  // Erased tiles: the void past the live area, and the next ring flickering.
  const bounds = arena.bounds;
  if (bounds.left > 0) {
    g.fillStyle(INK, 1);
    g.fillRect(0, 0, arena.width, bounds.top);
    g.fillRect(0, bounds.bottom, arena.width, arena.height - bounds.bottom);
    g.fillRect(0, bounds.top, bounds.left, bounds.bottom - bounds.top);
    g.fillRect(bounds.right, bounds.top, arena.width - bounds.right, bounds.bottom - bounds.top);
  }
  if (env.eraseWarning) {
    const tile = arena.tile ?? 200;
    g.lineStyle(6, DANGER, 0.3 + 0.6 * pulse);
    g.strokeRect(bounds.left + tile, bounds.top + tile, bounds.right - bounds.left - tile * 2, bounds.bottom - bounds.top - tile * 2);
    g.fillStyle(INK, 0.15 + 0.25 * pulse);
    g.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, tile);
    g.fillRect(bounds.left, bounds.bottom - tile, bounds.right - bounds.left, tile);
    g.fillRect(bounds.left, bounds.top + tile, tile, bounds.bottom - bounds.top - tile * 2);
    g.fillRect(bounds.right - tile, bounds.top + tile, tile, bounds.bottom - bounds.top - tile * 2);
  }
}
