import Phaser from 'phaser';
import { music } from '../audio/music';
import { DENSITY_STEPS, INPUT_ACTIONS, JOYSTICK_STEPS, PAD_ACTIONS, VOLUME_STEPS } from '../data/modes';
import type { ColourPalette, GameSettings, InputAction, PadAction, TextSize } from '../data/modes';
import { PALETTE } from '../data/palette';
import { SCREEN } from '../data/screen';
import { STRINGS } from '../data/strings';
import { encodeSave, exportCode, importSave } from '../sim/save';
import { Button } from '../ui/button';
import { drawPageFrame } from '../ui/frame';
import { openDialog } from '../ui/dialog';
import { addText } from '../ui/text';
import { applySettings, profile, replaceSave, saveNow, session, settings, switchProfile } from './session';

type Tab = 'options' | 'controls' | 'saves';

interface SettingsData {
  message?: string;
  tab?: Tab;
  capture?: Capture;
}

// Waiting for a key or a controller button to remap an action.
type Capture = { readonly kind: 'key'; readonly action: InputAction } | { readonly kind: 'pad'; readonly action: PadAction };

const PALETTES: readonly ColourPalette[] = ['standard', 'protanopia', 'deuteranopia', 'tritanopia'];
const TEXT_SIZES: readonly TextSize[] = ['normal', 'large', 'larger'];
const OUTLINE_STEPS: readonly number[] = [0, 0.3, 0.6, 1];

function next<T>(options: readonly T[], current: T): T {
  const index = options.indexOf(current);
  return options[(index + 1) % options.length] ?? current;
}

/**
 * Settings (GDD 3.10, 3.12, 15.13): accessibility options, remappable
 * controls, profiles and save transfer. Every change saves at once.
 */
export class Settings extends Phaser.Scene {
  private message = '';
  private tab: Tab = 'options';
  private capture: Capture | undefined;
  private padWasDown: boolean[] = [];

  constructor() {
    super('Settings');
  }

  init(data: SettingsData): void {
    this.message = data.message ?? '';
    this.tab = data.tab ?? 'options';
    this.capture = data.capture;
    this.padWasDown = [];
  }

  create(): void {
    // The quiet Archive theme plays in menus (GDD 15.10).
    if (!this.scene.isPaused('Combat')) music.play({ kind: 'menu' });
    const { width, height } = SCREEN;
    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    drawPageFrame(this.add.graphics(), width, height, 14);
    addText(this, 60, 34, STRINGS.settings.title, { role: 'heading', size: 40 });
    // Opened from the pause screen, Back returns to the paused round. Saves stay with the Hub then.
    const fromCombat = this.scene.isPaused('Combat');
    new Button(this, width - 120, 56, {
      label: STRINGS.hub.back,
      width: 160,
      height: 50,
      textSize: 22,
      onClick: () => {
        if (this.scene.isPaused('Combat')) {
          this.scene.resume('Combat');
          this.scene.stop();
        } else {
          this.scene.start('Hub');
        }
      },
    });
    const tabs: Array<[Tab, string]> = [
      ['options', STRINGS.settings.tabs.options],
      ['controls', STRINGS.settings.tabs.controls],
      ['saves', STRINGS.settings.tabs.saves],
    ];
    if (fromCombat) tabs.pop();
    if (fromCombat && this.tab === 'saves') this.tab = 'options';
    tabs.forEach(([tab, label], index) => {
      new Button(this, 400 + index * 200, 56, {
        label,
        width: 186,
        height: 46,
        textSize: 19,
        selected: this.tab === tab,
        onClick: () => this.scene.restart({ tab }),
      });
    });
    if (this.tab === 'options') this.drawOptions();
    else if (this.tab === 'controls') this.drawControls();
    else this.drawSaves();
    if (this.message) addText(this, width / 2, height - 30, this.message, { size: 17, weight: '700', colour: PALETTE.danger }).setOrigin(0.5);

    const keyboard = this.input.keyboard;
    const onKey = (event: KeyboardEvent): void => this.onKey(event);
    keyboard?.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => keyboard?.off('keydown', onKey));
  }

  /** Changes one setting, saves, reapplies shared settings and redraws. */
  private change(update: (prefs: GameSettings) => void): void {
    update(settings(this));
    applySettings(this);
    saveNow(this);
    this.scene.restart({ tab: this.tab });
  }

  /** A row of setting buttons: each press moves the value on. */
  private grid(rows: ReadonlyArray<readonly [string, () => void]>, top: number): void {
    rows.forEach(([label, onClick], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      new Button(this, 60 + 285 + column * 590, top + row * 60, { label, width: 570, height: 50, textSize: 18, onClick });
    });
  }

  private drawOptions(): void {
    const prefs = settings(this);
    const on = (value: boolean): string => (value ? STRINGS.settings.on : STRINGS.settings.off);
    const t = STRINGS.settings.options;
    this.grid(
      [
        [`${t.screenShake}: ${on(prefs.screenShake)}`, () => this.change((p) => (p.screenShake = !p.screenShake))],
        [`${t.flashes}: ${on(prefs.flashes)}`, () => this.change((p) => (p.flashes = !p.flashes))],
        [`${t.damageNumbers}: ${on(prefs.damageNumbers)}`, () => this.change((p) => (p.damageNumbers = !p.damageNumbers))],
        [`${t.lowHealth}: ${on(prefs.lowHealthWarning)}`, () => this.change((p) => (p.lowHealthWarning = !p.lowHealthWarning))],
        [`${t.density}: ${Math.round(prefs.effectDensity * 100)}%`, () => this.change((p) => (p.effectDensity = next(DENSITY_STEPS, p.effectDensity)))],
        [`${t.palette}: ${STRINGS.settings.palettes[prefs.colourPalette]}`, () => this.change((p) => (p.colourPalette = next(PALETTES, p.colourPalette)))],
        [`${t.textSize}: ${STRINGS.settings.textSizes[prefs.textSize]}`, () => this.change((p) => (p.textSize = next(TEXT_SIZES, p.textSize)))],
        [`${t.readableFont}: ${on(prefs.readableFont)}`, () => this.change((p) => (p.readableFont = !p.readableFont))],
        [`${t.outline}: ${Math.round(prefs.projectileOutline * 100)}%`, () => this.change((p) => (p.projectileOutline = next(OUTLINE_STEPS, p.projectileOutline)))],
        [`${t.audioCues}: ${on(prefs.audioCues)}`, () => this.change((p) => (p.audioCues = !p.audioCues))],
        [`${t.subtitles}: ${on(prefs.subtitles)}`, () => this.change((p) => (p.subtitles = !p.subtitles))],
        [`${t.trial}: ${on(prefs.trial)}`, () => this.change((p) => (p.trial = !p.trial))],
        [`${t.sfxVolume}: ${Math.round(prefs.sfxVolume * 100)}%`, () => this.change((p) => (p.sfxVolume = next(VOLUME_STEPS, p.sfxVolume)))],
        [`${t.musicVolume}: ${Math.round(prefs.musicVolume * 100)}%`, () => this.change((p) => (p.musicVolume = next(VOLUME_STEPS, p.musicVolume)))],
      ],
      130,
    );
    addText(this, 60, 560, t.note, { size: 14, colour: PALETTE.brass, wrapWidth: 1160 });
  }

  private drawControls(): void {
    const prefs = settings(this);
    const c = STRINGS.settings.controls;
    this.grid(
      [
        [`${c.focus}: ${c.focusModes[prefs.focusMode]}`, () => this.change((p) => (p.focusMode = p.focusMode === 'hold' ? 'toggle' : 'hold'))],
        [`${c.hand}: ${c.hands[prefs.handedness]}`, () => this.change((p) => (p.handedness = p.handedness === 'right' ? 'left' : 'right'))],
        [`${c.joystickSize}: ${Math.round(prefs.joystickScale * 100)}%`, () => this.change((p) => (p.joystickScale = next(JOYSTICK_STEPS, p.joystickScale)))],
        [`${c.joystickFixed}: ${prefs.joystickFixed ? c.fixed : c.floating}`, () => this.change((p) => (p.joystickFixed = !p.joystickFixed))],
      ],
      130,
    );
    // Remappable keys and controller buttons (GDD 3.10).
    addText(this, 60, 262, c.keys, { role: 'hand', size: 24, colour: PALETTE.brass });
    INPUT_ACTIONS.forEach((action, index) => {
      const waiting = this.capture?.kind === 'key' && this.capture.action === action;
      new Button(this, 60 + 140 + (index % 4) * 290, 320 + Math.floor(index / 4) * 56, {
        label: waiting ? c.pressKey : `${c.actions[action]}: ${prefs.keys[action]}`,
        width: 280,
        height: 46,
        textSize: 16,
        selected: waiting,
        onClick: () => this.startCapture({ kind: 'key', action }),
      });
    });
    addText(this, 60, 430, c.pad, { role: 'hand', size: 24, colour: PALETTE.brass });
    PAD_ACTIONS.forEach((action, index) => {
      const waiting = this.capture?.kind === 'pad' && this.capture.action === action;
      new Button(this, 60 + 180 + index * 380, 490, {
        label: waiting ? c.pressButton : `${c.padActions[action]}: ${c.button(prefs.pad[action])}`,
        width: 360,
        height: 46,
        textSize: 16,
        selected: waiting,
        onClick: () => this.startCapture({ kind: 'pad', action }),
      });
    });
    new Button(this, 60 + 140, 560, {
      label: c.reset,
      width: 280,
      height: 44,
      textSize: 16,
      onClick: () =>
        this.change((p) => {
          p.keys = { up: 'W', down: 'S', left: 'A', right: 'D', pause: 'ESC', fastForward: 'TAB', focusToggle: 'F' };
          p.pad = { pause: 9, fastForward: 8, confirm: 0 };
        }),
    });
    addText(this, 60, 600, c.note, { size: 14, colour: PALETTE.brass, wrapWidth: 1160 });
  }

  private startCapture(capture: Capture): void {
    this.scene.restart({ tab: this.tab, capture });
  }

  private onKey(event: KeyboardEvent): void {
    const capture = this.capture;
    if (!capture || capture.kind !== 'key') return;
    const name = keyName(event);
    if (!name) return;
    this.capture = undefined;
    this.change((p) => (p.keys[capture.action] = name));
  }

  /** Controller remapping waits for the next button press. */
  override update(): void {
    const capture = this.capture;
    if (!capture || capture.kind !== 'pad' || typeof navigator.getGamepads !== 'function') return;
    for (const pad of navigator.getGamepads()) {
      if (!pad) continue;
      for (let index = 0; index < pad.buttons.length; index++) {
        const down = pad.buttons[index]?.pressed ?? false;
        if (down && this.padWasDown[index] === false) {
          this.capture = undefined;
          this.change((p) => (p.pad[capture.action] = index));
          return;
        }
        this.padWasDown[index] = down;
      }
    }
  }

  private drawSaves(): void {
    const width = SCREEN.width;
    // Three profiles, each with its own Archive and run (GDD 15.13).
    addText(this, 60, 110, STRINGS.settings.profiles, { role: 'hand', size: 28, colour: PALETTE.brass });
    const file = session(this).file;
    file.profiles.forEach((entry, index) => {
      const active = index === file.active;
      const run = entry.run && entry.run.status === 'active' ? STRINGS.settings.runAt(entry.run.round) : STRINGS.settings.noRun;
      new Button(this, 60 + 190 + index * 400, 200, {
        label: `${entry.name}: ${STRINGS.hub.points(entry.archive.points)}`,
        width: 380,
        height: 56,
        textSize: 19,
        selected: active,
        onClick: () => {
          switchProfile(this, index);
          this.scene.restart({ tab: 'saves', message: STRINGS.settings.switched(entry.name) });
        },
      });
      addText(this, 60 + 190 + index * 400, 238, run, { size: 15, colour: PALETTE.brass }).setOrigin(0.5, 0);
    });

    // Export as a file and a copyable code; import either (GDD 15.13).
    addText(this, 60, 290, STRINGS.settings.transfer, { role: 'hand', size: 28, colour: PALETTE.brass });
    addText(this, 60, 330, STRINGS.settings.transferNote, { size: 16, wrapWidth: width - 120 });
    const buttons: Array<[string, () => void]> = [
      [STRINGS.settings.exportFile, () => this.exportFile()],
      [STRINGS.settings.copyCode, () => void this.copyCode()],
      [STRINGS.settings.importFile, () => this.importFile()],
      [STRINGS.settings.importCode, () => this.importCode()],
    ];
    buttons.forEach(([label, onClick], index) => {
      new Button(this, 60 + 140 + index * 290, 410, { label, width: 270, height: 56, textSize: 19, onClick });
    });
    addText(this, 60, 460, STRINGS.settings.active(profile(this).name), { size: 15, colour: PALETTE.brass });
    if (session(this).fromBackup) addText(this, 60, 490, STRINGS.settings.fromBackup, { size: 15, colour: PALETTE.danger });
  }

  private exportFile(): void {
    const blob = new Blob([encodeSave(session(this).file)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = STRINGS.settings.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.scene.restart({ tab: 'saves', message: STRINGS.settings.exported });
  }

  private async copyCode(): Promise<void> {
    const code = exportCode(session(this).file);
    let message: string = STRINGS.settings.copied;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Without clipboard access the code shows on a notebook page, ready to copy by hand.
      message = STRINGS.settings.shown;
      await openDialog({ title: STRINGS.settings.copyCode, text: STRINGS.settings.copyPrompt, field: { value: code, readOnly: true }, buttons: [STRINGS.settings.done] });
    }
    this.scene.restart({ tab: 'saves', message });
  }

  private importFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,text/plain';
    input.addEventListener('change', () => {
      const fileHandle = input.files?.[0];
      if (!fileHandle) return;
      void fileHandle.text().then((text) => this.finishImport(text));
    });
    input.click();
  }

  private importCode(): void {
    void openDialog({
      title: STRINGS.settings.importCode,
      text: STRINGS.settings.pastePrompt,
      field: { placeholder: 'PP1:' },
      buttons: [STRINGS.settings.importButton, STRINGS.settings.cancel],
    }).then((result) => {
      if (result.button === 0 && result.value.trim()) this.finishImport(result.value);
    });
  }

  private finishImport(text: string): void {
    const result = importSave(text);
    if ('problem' in result) {
      this.scene.restart({ tab: 'saves', message: STRINGS.settings.problems[result.problem] });
      return;
    }
    void openDialog({ title: STRINGS.settings.importCode, text: STRINGS.settings.confirmImport, buttons: [STRINGS.settings.replace, STRINGS.settings.cancel] }).then(
      (answer) => {
        if (answer.button !== 0) return;
        replaceSave(this, result.file);
        applySettings(this);
        this.scene.restart({ tab: 'saves', message: STRINGS.settings.imported });
      },
    );
  }
}

/** Phaser's key name for a browser key event, or undefined for keys the game never binds. */
function keyName(event: KeyboardEvent): string | undefined {
  const key = event.key;
  if (key.length === 1 && /[a-z0-9]/i.test(key)) return key.toUpperCase();
  const named: Record<string, string> = {
    Escape: 'ESC',
    Tab: 'TAB',
    ' ': 'SPACE',
    Enter: 'ENTER',
    Shift: 'SHIFT',
    Control: 'CTRL',
    Alt: 'ALT',
    Backspace: 'BACKSPACE',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
  };
  return named[key];
}
