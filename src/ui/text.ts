import type Phaser from 'phaser';
import { FONTS } from '../data/fonts';
import { PALETTE } from '../data/palette';

export type TextRole = 'heading' | 'body' | 'hand';

/** Text size and readable font for the research web and tooltips (GDD 3.10). */
const textOptions = { scale: 1, readable: false };

export function setTextOptions(options: { scale: number; readable: boolean }): void {
  textOptions.scale = options.scale;
  textOptions.readable = options.readable;
}

export interface TextOptions {
  /** Follows the text size and readable font settings: the research web and tooltips (GDD 3.10). */
  scalable?: boolean;
  role?: TextRole;
  size?: number;
  colour?: string;
  weight?: '400' | '500' | '700';
  align?: 'left' | 'center' | 'right';
  wrapWidth?: number;
}

/** Text draws at twice the logical resolution so scaled-up screens stay sharp. */
const TEXT_RESOLUTION = 2;

/** Creates text in one of the three GDD 15.1 typefaces. */
export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  content: string,
  options: TextOptions = {},
): Phaser.GameObjects.Text {
  const scalable = options.scalable === true;
  const role = scalable && textOptions.readable ? 'body' : (options.role ?? 'body');
  const size = (options.size ?? 20) * (scalable ? textOptions.scale : 1);
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: `"${FONTS[role]}", ${role === 'body' ? 'sans-serif' : 'serif'}`,
    fontSize: `${size}px`,
    fontStyle: options.weight ?? '400',
    color: options.colour ?? PALETTE.ink,
    align: options.align ?? 'left',
    resolution: TEXT_RESOLUTION,
  };
  if (options.wrapWidth !== undefined) {
    style.wordWrap = { width: options.wrapWidth * (scalable ? textOptions.scale : 1) };
  }
  return scene.add.text(x, y, content, style);
}
