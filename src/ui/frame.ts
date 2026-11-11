import type Phaser from 'phaser';
import { PALETTE, hexToNumber } from '../data/palette';

/**
 * Draws the notebook page frame: a double ink border with brass corner rivets
 * (GDD 15.1, the Inventor's Notebook theme).
 */
export function drawPageFrame(
  graphics: Phaser.GameObjects.Graphics,
  width: number,
  height: number,
  margin = 24,
): void {
  const ink = hexToNumber(PALETTE.ink);
  const brass = hexToNumber(PALETTE.brass);

  graphics.lineStyle(3, ink, 1);
  graphics.strokeRect(margin, margin, width - margin * 2, height - margin * 2);
  graphics.lineStyle(1, ink, 0.6);
  graphics.strokeRect(margin + 8, margin + 8, width - (margin + 8) * 2, height - (margin + 8) * 2);

  const corners: ReadonlyArray<readonly [number, number]> = [
    [margin, margin],
    [width - margin, margin],
    [margin, height - margin],
    [width - margin, height - margin],
  ];
  for (const [x, y] of corners) {
    graphics.fillStyle(brass, 1);
    graphics.fillCircle(x, y, 9);
    graphics.lineStyle(2, ink, 1);
    graphics.strokeCircle(x, y, 9);
  }
}
