// Damage type icon shapes (GDD 15.1): each damage type has one colour and one
// shape, and status meters use the same pair, so colour-blind players read
// the code by shape (GDD 3.10). Drawn in code on any Graphics object.

import type Phaser from 'phaser';
import type { DamageType } from '../data/damageTypes';
import { DAMAGE_TYPE_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import { STATUS_DEFS } from '../data/statusEffects';
import type { StatusEffect } from '../data/statusEffects';

const INK = hexToNumber(PALETTE.ink);

/** The GDD 15.1 shape name for each damage type. */
export const DAMAGE_ICON_SHAPES: Readonly<Record<DamageType, string>> = {
  Slashing: 'Crescent',
  Piercing: 'Arrowhead',
  Impact: 'Starburst',
  Fire: 'Flame',
  Cold: 'Snowflake',
  Electric: 'Zigzag',
  Toxic: 'Droplet',
  Corrosive: 'Bubbles',
  Biological: 'Spore cluster',
};

type Point = { x: number; y: number };

function polygon(g: Phaser.GameObjects.Graphics, points: readonly Point[], fill: number, alpha: number, line: number): void {
  const first = points[0];
  if (!first) return;
  g.fillStyle(fill, alpha);
  g.beginPath();
  g.moveTo(first.x, first.y);
  for (const point of points.slice(1)) g.lineTo(point.x, point.y);
  g.closePath();
  g.fillPath();
  if (line > 0) {
    g.lineStyle(line, INK, alpha);
    g.strokePath();
  }
}

/**
 * Draws the icon of a damage type centred on x and y, about r in radius.
 * The colour defaults to the damage type colour (colour-blind palettes included).
 */
export function drawDamageIcon(
  g: Phaser.GameObjects.Graphics,
  type: DamageType,
  x: number,
  y: number,
  r: number,
  options: { colour?: number; alpha?: number; outline?: number } = {},
): void {
  const colour = options.colour ?? hexToNumber(DAMAGE_TYPE_COLOURS[type]);
  const alpha = options.alpha ?? 1;
  const line = options.outline ?? Math.max(1, r / 5);
  switch (type) {
    case 'Slashing': {
      // Crescent: an outer arc and an inner arc offset to one side.
      const points: Point[] = [];
      for (let step = 0; step <= 12; step++) {
        const angle = -Math.PI * 0.8 + (step / 12) * Math.PI * 1.6;
        points.push({ x: x + Math.cos(angle) * r, y: y + Math.sin(angle) * r });
      }
      for (let step = 12; step >= 0; step--) {
        const angle = -Math.PI * 0.7 + (step / 12) * Math.PI * 1.4;
        points.push({ x: x + r * 0.45 + Math.cos(angle) * r * 0.75, y: y + Math.sin(angle) * r * 0.75 });
      }
      polygon(g, points, colour, alpha, line);
      break;
    }
    case 'Piercing':
      polygon(g, [{ x: x + r, y }, { x: x - r * 0.8, y: y - r * 0.8 }, { x: x - r * 0.35, y }, { x: x - r * 0.8, y: y + r * 0.8 }], colour, alpha, line);
      break;
    case 'Impact': {
      const points: Point[] = [];
      for (let step = 0; step < 16; step++) {
        const angle = (step / 16) * Math.PI * 2;
        const reach = step % 2 === 0 ? r : r * 0.5;
        points.push({ x: x + Math.cos(angle) * reach, y: y + Math.sin(angle) * reach });
      }
      polygon(g, points, colour, alpha, line);
      break;
    }
    case 'Fire':
      polygon(
        g,
        [
          { x, y: y - r },
          { x: x + r * 0.35, y: y - r * 0.3 },
          { x: x + r * 0.75, y: y + r * 0.15 },
          { x: x + r * 0.55, y: y + r * 0.8 },
          { x, y: y + r },
          { x: x - r * 0.55, y: y + r * 0.8 },
          { x: x - r * 0.75, y: y + r * 0.15 },
          { x: x - r * 0.2, y: y - r * 0.1 },
        ],
        colour,
        alpha,
        line,
      );
      break;
    case 'Cold':
      g.lineStyle(Math.max(2, r / 3.2), INK, alpha);
      for (let arm = 0; arm < 3; arm++) {
        const angle = (arm / 3) * Math.PI;
        g.lineBetween(x - Math.cos(angle) * r, y - Math.sin(angle) * r, x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      }
      g.lineStyle(Math.max(1, r / 5.5), colour, alpha);
      for (let arm = 0; arm < 3; arm++) {
        const angle = (arm / 3) * Math.PI;
        g.lineBetween(x - Math.cos(angle) * r, y - Math.sin(angle) * r, x + Math.cos(angle) * r, y + Math.sin(angle) * r);
      }
      break;
    case 'Electric':
      polygon(
        g,
        [
          { x: x + r * 0.2, y: y - r },
          { x: x - r * 0.6, y: y + r * 0.1 },
          { x: x - r * 0.05, y: y + r * 0.1 },
          { x: x - r * 0.3, y: y + r },
          { x: x + r * 0.6, y: y - r * 0.15 },
          { x: x + r * 0.05, y: y - r * 0.15 },
        ],
        colour,
        alpha,
        line,
      );
      break;
    case 'Toxic': {
      const points: Point[] = [{ x, y: y - r }];
      for (let step = 0; step <= 10; step++) {
        const angle = -Math.PI * 0.15 + (step / 10) * Math.PI * 1.3;
        points.push({ x: x + Math.cos(angle) * r * 0.62, y: y + r * 0.3 + Math.sin(angle) * r * 0.62 });
      }
      polygon(g, points, colour, alpha, line);
      break;
    }
    case 'Corrosive':
      for (const [dx, dy, size] of [
        [-0.35, 0.3, 0.55],
        [0.4, 0.15, 0.45],
        [0.05, -0.5, 0.4],
      ] as const) {
        g.fillStyle(colour, alpha);
        g.fillCircle(x + dx * r, y + dy * r, size * r);
        g.lineStyle(line, INK, alpha);
        g.strokeCircle(x + dx * r, y + dy * r, size * r);
      }
      break;
    case 'Biological':
      for (let dot = 0; dot < 6; dot++) {
        const angle = (dot / 6) * Math.PI * 2;
        g.fillStyle(colour, alpha);
        g.fillCircle(x + Math.cos(angle) * r * 0.62, y + Math.sin(angle) * r * 0.62, r * 0.3);
        g.lineStyle(Math.max(1, line * 0.7), INK, alpha);
        g.strokeCircle(x + Math.cos(angle) * r * 0.62, y + Math.sin(angle) * r * 0.62, r * 0.3);
      }
      g.fillStyle(colour, alpha);
      g.fillCircle(x, y, r * 0.32);
      g.lineStyle(Math.max(1, line * 0.7), INK, alpha);
      g.strokeCircle(x, y, r * 0.32);
      break;
  }
}

/** Each status meter uses its damage type's icon (GDD 15.1). Marked has no damage type and draws a brass crosshair. */
export const STATUS_ICONS: Readonly<Record<StatusEffect, DamageType | 'mark'>> = {
  Burning: 'Fire',
  Poisoned: 'Toxic',
  Corroded: 'Corrosive',
  Electrified: 'Electric',
  Frozen: 'Cold',
  Bleeding: 'Slashing',
  Stunned: 'Impact',
  Infected: 'Biological',
  Marked: 'mark',
  Overheated: 'Fire',
  'Short-circuited': 'Electric',
};

/** Draws a status icon: the damage type shape, or the crosshair for Marked. */
export function drawStatusIcon(
  g: Phaser.GameObjects.Graphics,
  status: StatusEffect,
  x: number,
  y: number,
  r: number,
  alpha = 1,
): void {
  const icon = STATUS_ICONS[status];
  if (icon !== 'mark') {
    drawDamageIcon(g, icon, x, y, r, { alpha, colour: hexToNumber(STATUS_DEFS[status].colour) });
    return;
  }
  g.lineStyle(Math.max(1.5, r / 3), hexToNumber(PALETTE.brass), alpha);
  g.strokeCircle(x, y, r * 0.7);
  g.lineBetween(x - r, y, x + r, y);
  g.lineBetween(x, y - r, x, y + r);
}
