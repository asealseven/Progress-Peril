import { EVENTS } from '../data/events';
import { endRun, saveNow } from './session';
import Phaser from 'phaser';
import { MATERIALS } from '../data/economy';
import { KINGDOM_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import { RELICS } from '../data/relics';
import { SCREEN } from '../data/screen';
import { STRINGS, formatTime } from '../data/strings';
import { formatSeed } from '../sim/rng';
import { kingdomForRound, runTotals, takeComponentChoice, takeRelic } from '../sim/run';
import type { RoundResult, RunState } from '../sim/run';
import { Button } from '../ui/button';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';
import { isTouchPrimary, uiScale } from './platform';

export interface ResultsData {
  run: RunState;
  result: RoundResult;
  /** The relic choice follows the summary after a territory boss (GDD 5.8 step 3). */
  step?: 'summary' | 'relics';
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

  private step: 'summary' | 'relics' = 'summary';

  init(data: ResultsData): void {
    this.run = data.run;
    this.result = data.result;
    this.step = data.step ?? 'summary';
  }

  /** Three relic cards from the beaten kingdom (GDD 5.12). */
  private drawRelicChoice(): void {
    const { width, height } = SCREEN;
    const run = this.run;
    const kingdom = kingdomForRound(run, this.result.round);
    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    drawPageFrame(this.add.graphics(), width, height);
    addText(this, width / 2, 90, STRINGS.relics.title, { role: 'heading', size: 54 }).setOrigin(0.5);
    addText(this, width / 2, 140, STRINGS.relics.note(kingdom), { size: 20, colour: PALETTE.brass, weight: '700' }).setOrigin(0.5);
    // When the kingdom has no relic left, three Rare or better components stand in (GDD 5.12).
    const choices: Array<{ name: string; effect: string }> =
      run.relicChoices.length > 0
        ? run.relicChoices.map((id) => RELICS[id])
        : run.componentChoices.map((def) => ({ name: def.name, effect: `${def.quality}. ${def.effect}` }));
    const cardW = 340;
    const gap = 30;
    const total = choices.length * cardW + (choices.length - 1) * gap;
    const take = (index: number): void => {
      const relic = run.relicChoices[index];
      const done = relic ? takeRelic(run, relic) : takeComponentChoice(run, index);
      if (done) this.scene.start('Preparation', { run });
    };
    choices.forEach((relic, index) => {
      const x = width / 2 - total / 2 + index * (cardW + gap);
      const card = this.add.graphics();
      card.fillStyle(0xe9dfc8, 1);
      card.fillRect(x, 190, cardW, 360);
      card.lineStyle(3, hexToNumber(PALETTE.ink), 1);
      card.strokeRect(x, 190, cardW, 360);
      card.fillStyle(hexToNumber(KINGDOM_COLOURS[kingdom]), 1);
      card.fillCircle(x + cardW / 2, 260, 40);
      card.lineStyle(4, hexToNumber(PALETTE.ink), 1);
      card.strokeCircle(x + cardW / 2, 260, 40);
      addText(this, x + cardW / 2, 260, `${index + 1}`, { role: 'heading', size: 36 }).setOrigin(0.5);
      addText(this, x + cardW / 2, 320, relic.name, { role: 'heading', size: 28, align: 'center', wrapWidth: cardW - 30 }).setOrigin(0.5, 0);
      addText(this, x + cardW / 2, 380, relic.effect, { size: 19, align: 'center', wrapWidth: cardW - 40 }).setOrigin(0.5, 0);
      new Button(this, x + cardW / 2, 510, { label: STRINGS.relics.take, width: cardW - 40, height: 54, textSize: 22, onClick: () => take(index) });
    });
    addText(this, width / 2, height - 60, STRINGS.relics.hint, { size: 16, colour: PALETTE.brass }).setOrigin(0.5);
    const keyboard = this.input.keyboard;
    const onKey = (event: KeyboardEvent): void => {
      const index = Number(event.key) - 1;
      if (index >= 0 && index < choices.length) take(index);
    };
    keyboard?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard?.off('keydown', onKey));
  }

  create(): void {
    if (this.step === 'relics') {
      this.confirm = () => undefined;
      this.drawRelicChoice();
      return;
    }
    // The Grand Archive saves after every round and at the end of every run (GDD 15.13).
    if (this.run.status === 'active') saveNow(this);
    else endRun(this);
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
        [STRINGS.results.archivePoints, `${run.archiveEarned}`],
        [STRINGS.results.gold, `${result.gold}`],
        [STRINGS.results.research, `${Math.round(result.research * 10) / 10}`],
        [STRINGS.results.materials, materialsLabel(result)],
        [STRINGS.results.components, result.components.length > 0 ? result.components.join(', ') : STRINGS.results.none],
      ];
      if (result.event) rows.push([STRINGS.results.event, STRINGS.results.eventLine(EVENTS[result.event].name, result.eventGold)]);
      if (result.discoveries.length > 0) rows.push([STRINGS.results.discoveries, result.discoveries.join(', ')]);
      if (run.research.captures.length > 0) note = `${note} ${STRINGS.results.capture}`;
      buttonLabel = STRINGS.results.nextRound;
      // Preparation follows every round (GDD 3.3). After a territory boss the relic choice comes first (GDD 5.8).
      this.confirm = () =>
        run.relicChoices.length > 0 || run.componentChoices.length > 0
          ? this.scene.restart({ run, result, step: 'relics' })
          : this.scene.start('Preparation', { run });
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
        // Archive Points from completed rounds stay with the player (GDD 3.8).
        [STRINGS.results.archivePoints, `${run.archiveEarned}`],
      ];
      buttonLabel = STRINGS.results.toTitle;
      this.confirm = () => this.scene.start('Hub');
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
