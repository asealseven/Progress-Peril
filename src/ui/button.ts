import type Phaser from 'phaser';
import { PALETTE, hexToNumber } from '../data/palette';
import { addText } from './text';

export interface ButtonOptions {
  label: string;
  onClick: () => void;
  width?: number;
  height?: number;
  textSize?: number;
}

const HOVER_FILL = 0xe6d9bd;

/**
 * A notebook-style button: parchment panel, ink border, heading text.
 * `objects` lists the parts, for camera routing and visibility.
 */
export class Button {
  readonly objects: Phaser.GameObjects.GameObject[];
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    const width = options.width ?? 300;
    const height = options.height ?? 64;
    const parchment = hexToNumber(PALETTE.parchment);

    this.panel = scene.add.rectangle(x, y, width, height, parchment, 1);
    this.panel.setStrokeStyle(3, hexToNumber(PALETTE.ink), 1);
    this.panel.setInteractive({ useHandCursor: true });
    this.panel.on('pointerover', () => this.panel.setFillStyle(HOVER_FILL, 1));
    this.panel.on('pointerout', () => this.panel.setFillStyle(parchment, 1));
    this.panel.on('pointerup', () => {
      if (this.panel.visible) options.onClick();
    });

    this.text = addText(scene, x, y, options.label, {
      role: 'heading',
      size: options.textSize ?? 28,
    }).setOrigin(0.5);

    this.objects = [this.panel, this.text];
  }

  setDepth(depth: number): this {
    this.panel.setDepth(depth);
    this.text.setDepth(depth + 1);
    return this;
  }

  setVisible(visible: boolean): this {
    this.panel.setVisible(visible);
    this.text.setVisible(visible);
    if (visible) this.panel.setInteractive({ useHandCursor: true });
    else this.panel.disableInteractive();
    return this;
  }
}
