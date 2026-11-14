import Phaser from 'phaser';
import { endRun } from './session';
import { BOSS_BY_KINGDOM } from '../data/bosses';
import { KINGDOMS } from '../data/kingdoms';
import { KINGDOM_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import { RELICS } from '../data/relics';
import { SCREEN } from '../data/screen';
import { STORY } from '../data/story';
import { STRINGS, formatTime } from '../data/strings';
import { formatSeed } from '../sim/rng';
import { kingdomForRound, runTotals } from '../sim/run';
import type { RunState } from '../sim/run';
import { Button } from '../ui/button';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';

export interface VictoryData {
  run: RunState;
}

/**
 * The end of a campaign (GDD 2.4, 13.1): the ending card of the final
 * kingdom and the campaign statistics. Endless mode arrives with Milestone 10.
 */
export class Victory extends Phaser.Scene {
  private run!: RunState;

  constructor() {
    super('Victory');
  }

  init(data: VictoryData): void {
    this.run = data.run;
  }

  create(): void {
    const { width, height } = SCREEN;
    const run = this.run;
    const kingdom = kingdomForRound(run, run.round);
    const totals = runTotals(run);
    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    drawPageFrame(this.add.graphics(), width, height);

    addText(this, width / 2, 70, STRINGS.victory.title, { role: 'heading', size: 56 }).setOrigin(0.5);
    addText(this, width / 2, 116, STRINGS.victory.subtitle(BOSS_BY_KINGDOM[kingdom].name, KINGDOMS[kingdom].title), {
      size: 19,
      colour: PALETTE.brass,
      weight: '700',
    }).setOrigin(0.5);

    // The ending card (GDD 2.4). The ending follows the final boss.
    const cardX = 60;
    const cardW = 620;
    const card = this.add.graphics();
    card.fillStyle(0xe9dfc8, 1);
    card.fillRect(cardX, 160, cardW, 420);
    card.lineStyle(3, hexToNumber(PALETTE.ink), 1);
    card.strokeRect(cardX, 160, cardW, 420);
    card.fillStyle(hexToNumber(KINGDOM_COLOURS[kingdom]), 1);
    card.fillRect(cardX, 160, cardW, 14);
    addText(this, cardX + cardW / 2, 196, STRINGS.victory.ending(kingdom), { role: 'heading', size: 30 }).setOrigin(0.5, 0);
    addText(this, cardX + cardW / 2, 260, STORY.ending[kingdom], { role: 'hand', size: 30, align: 'center', wrapWidth: cardW - 60 }).setOrigin(0.5, 0);

    // Campaign statistics and the route.
    const left = 730;
    const right = width - 60;
    addText(this, (left + right) / 2, 170, STRINGS.victory.statsHeading, { role: 'hand', size: 28, colour: PALETTE.brass }).setOrigin(0.5, 0);
    const rows: Array<[string, string]> = [
      [STRINGS.victory.route, run.kingdoms.join(', ')],
      [STRINGS.results.roundsSurvived, `${totals.roundsSurvived}`],
      [STRINGS.results.kills, `${totals.kills}`],
      [STRINGS.results.damageDealt, `${Math.round(totals.damageDealt)}`],
      [STRINGS.results.damageTaken, `${Math.round(totals.damageTaken)}`],
      [STRINGS.results.time, formatTime(totals.seconds)],
      [STRINGS.results.archivePoints, `${run.archiveEarned}`],
      [STRINGS.victory.relics, run.relics.length > 0 ? run.relics.map((id) => RELICS[id].name).join(', ') : STRINGS.results.none],
    ];
    const lines = this.add.graphics();
    lines.lineStyle(1, hexToNumber(PALETTE.ink), 0.35);
    let y = 220;
    for (const [label, value] of rows) {
      addText(this, left, y, label, { size: 17 });
      const text = addText(this, right, y, value, { size: 17, weight: '700', align: 'right', wrapWidth: 300 }).setOrigin(1, 0);
      y += Math.max(30, text.height + 8);
      lines.lineBetween(left, y - 5, right, y - 5);
    }

    const toTitle = (): void => {
      this.scene.start('Hub');
    };
    // The run ends: the Archive keeps what it earned (GDD 15.13).
    endRun(this);
    new Button(this, width / 2, height - 80, { label: STRINGS.results.toTitle, width: 360, height: 60, textSize: 26, onClick: toTitle });
    addText(this, width - 48, height - 40, STRINGS.results.seed(formatSeed(run.seed)), { role: 'hand', size: 22, colour: PALETTE.brass }).setOrigin(1, 1);

    const keyboard = this.input.keyboard;
    keyboard?.once('keydown-ENTER', toTitle);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard?.off('keydown-ENTER', toTitle));
  }
}
