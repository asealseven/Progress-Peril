import Phaser from 'phaser';
import { PALETTE, hexToNumber } from '../data/palette';
import { SCREEN } from '../data/screen';
import { STRINGS } from '../data/strings';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';

/** Title screen: "Progress & Peril" on parchment. */
export class Boot extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const { width, height } = SCREEN;
    const centreX = width / 2;

    this.cameras.main.setBackgroundColor(PALETTE.parchment);

    const frame = this.add.graphics();
    drawPageFrame(frame, width, height);

    addText(this, centreX, 250, STRINGS.setting, {
      role: 'hand',
      size: 34,
      colour: PALETTE.brass,
    }).setOrigin(0.5);

    addText(this, centreX, 330, STRINGS.title, {
      role: 'heading',
      size: 96,
    }).setOrigin(0.5);

    const rule = this.add.graphics();
    rule.lineStyle(2, hexToNumber(PALETTE.brass), 1);
    rule.lineBetween(centreX - 260, 400, centreX + 260, 400);
    rule.fillStyle(hexToNumber(PALETTE.brass), 1);
    rule.fillCircle(centreX, 400, 5);

    addText(this, centreX, 440, STRINGS.tagline, {
      role: 'body',
      size: 26,
    }).setOrigin(0.5);
  }
}
