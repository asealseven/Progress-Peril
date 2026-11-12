import Phaser from 'phaser';
import { MATERIALS } from '../data/economy';
import { PALETTE, hexToNumber } from '../data/palette';
import { SCREEN } from '../data/screen';
import { STRINGS, formatTime } from '../data/strings';
import { formatSeed } from '../sim/rng';
import { runTotals } from '../sim/run';
import type { RoundResult, RunState } from '../sim/run';
import { Button } from '../ui/button';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';
import { isTouchPrimary, uiScale } from './platform';

export interface ResultsData {
  run: RunState;
  result: RoundResult;
}

const GAMEPAD_CONFIRM = 0;

function materialsLabel(result: RoundResult): string {
  const parts = MATERIALS.filter((material) => result.materials[material] > 0).map(
    (material) => `${result.materials[material]} ${material}`,
  );
  return parts.length > 0 ? parts.join(', ') : STRINGS.results.none;
}

/** Short summary after each round, and campaign statistics after a death (GDD 3.8, 15.9). */
export class Results extends Phaser.Scene {
  private run!: RunState;
  private result!: RoundResult;
  private confirm: () => void = () => undefined;
  private confirmWasDown = true;

  constructor() {
    super('Results');
  }

  init(data: ResultsData): void {
    this.run = data.run;
    this.result = data.result;
  }

  create(): void {
    const { width, height } = SCREEN;
    const centreX = width / 2;
    const s = uiScale();
    const run = this.run;
    const result = this.result;
    this.confirmWasDown = true;

    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    drawPageFrame(this.add.graphics(), width, height);

    let heading: string;
    let note: string;
    let rows: Array<[string, string]>;
    let rowsHeading: string;
    let buttonLabel: string;

    if (run.status === 'active') {
      heading = STRINGS.results.roundComplete(result.round);
      note = run.freeVisit ? STRINGS.results.freeVisit : STRINGS.results.healed;
      rowsHeading = STRINGS.results.roundHeading;
      rows = [
        [STRINGS.results.kills, `${result.stats.kills}`],
        [STRINGS.results.damageDealt, `${Math.round(result.stats.damageDealt)}`],
        [STRINGS.results.criticalHits, `${result.stats.criticalHits}`],
        [STRINGS.results.damageTaken, `${Math.round(result.stats.damageTaken)}`],
        [STRINGS.results.time, formatTime(result.seconds)],
        [STRINGS.results.gold, `${result.gold}`],
        [STRINGS.results.materials, materialsLabel(result)],
        [STRINGS.results.components, result.components.length > 0 ? result.components.join(', ') : STRINGS.results.none],
      ];
      buttonLabel = STRINGS.results.nextRound;
      // Preparation follows every round (GDD 3.3).
      this.confirm = () => this.scene.start('Preparation', { run });
    } else {
      const totals = runTotals(run);
      const dead = run.status === 'dead';
      heading = dead ? STRINGS.results.defeat(run.character.name) : STRINGS.results.buildComplete;
      note = dead ? STRINGS.results.defeatRound(result.round) : STRINGS.results.buildCompleteNote;
      rowsHeading = STRINGS.results.campaignHeading;
      rows = [
        [STRINGS.results.roundsSurvived, `${totals.roundsSurvived}`],
        [STRINGS.results.kills, `${totals.kills}`],
        [STRINGS.results.damageDealt, `${Math.round(totals.damageDealt)}`],
        [STRINGS.results.damageTaken, `${Math.round(totals.damageTaken)}`],
        [STRINGS.results.time, formatTime(totals.seconds)],
      ];
      buttonLabel = STRINGS.results.toTitle;
      this.confirm = () => this.scene.start('Boot');
    }

    addText(this, centreX, 96, heading, {
      role: 'heading',
      size: 60,
      colour: run.status === 'dead' ? PALETTE.danger : PALETTE.ink,
    }).setOrigin(0.5);
    addText(this, centreX, 146, note, { size: 20 * s, align: 'center', wrapWidth: 820 }).setOrigin(0.5, 0);

    const tableTop = 220 + 24 * s;
    const rowHeight = (rows.length > 5 ? 24 : 30) * s;
    const tableWidth = 440 * s;
    addText(this, centreX, tableTop - 20, rowsHeading, { role: 'hand', size: 28 * s, colour: PALETTE.brass }).setOrigin(
      0.5,
      1,
    );
    const lines = this.add.graphics();
    lines.lineStyle(1, hexToNumber(PALETTE.ink), 0.35);
    rows.forEach(([label, value], index) => {
      const y = tableTop + index * rowHeight;
      const size = (rows.length > 5 ? 16 : 19) * s;
      addText(this, centreX - tableWidth / 2, y, label, { size }).setOrigin(0, 0);
      addText(this, centreX + tableWidth / 2, y, value, { size, weight: '700' }).setOrigin(1, 0);
      lines.lineBetween(centreX - tableWidth / 2, y + rowHeight - 3, centreX + tableWidth / 2, y + rowHeight - 3);
    });

    new Button(this, centreX, height - 110, {
      label: buttonLabel,
      width: 360 * s,
      height: 64 * s,
      textSize: 28 * s,
      onClick: () => this.confirm(),
    });

    if (run.status === 'active' && !isTouchPrimary()) {
      addText(this, centreX, height - 56, STRINGS.results.nextRoundHint, { size: 15, colour: PALETTE.brass }).setOrigin(
        0.5,
      );
    }
    addText(this, width - 48, height - 44, STRINGS.results.seed(formatSeed(run.seed)), {
      role: 'hand',
      size: 22 * s,
      colour: PALETTE.brass,
    }).setOrigin(1, 1);

    const keyboard = this.input.keyboard;
    const onEnter = (): void => this.confirm();
    keyboard?.on('keydown-ENTER', onEnter);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-ENTER', onEnter);
    });
  }

  /** Controller: A confirms (GDD 3.5). */
  override update(): void {
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
    let down = false;
    for (const pad of navigator.getGamepads()) {
      if (pad?.buttons[GAMEPAD_CONFIRM]?.pressed) down = true;
    }
    if (down && !this.confirmWasDown) this.confirm();
    this.confirmWasDown = down;
  }
}
