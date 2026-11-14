import Phaser from 'phaser';
import { PALETTE } from '../data/palette';
import { SCREEN } from '../data/screen';
import { STRINGS } from '../data/strings';
import { encodeSave, exportCode, importSave } from '../sim/save';
import { Button } from '../ui/button';
import { drawPageFrame } from '../ui/frame';
import { addText } from '../ui/text';
import { profile, replaceSave, session, switchProfile } from './session';

/**
 * Settings (GDD 15.13): profiles, and save export and import. Milestone 10
 * adds the game options and accessibility settings.
 */
export class Settings extends Phaser.Scene {
  private message = '';

  constructor() {
    super('Settings');
  }

  init(data: { message?: string }): void {
    this.message = data.message ?? '';
  }

  create(): void {
    const { width, height } = SCREEN;
    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    drawPageFrame(this.add.graphics(), width, height, 14);
    addText(this, 60, 40, STRINGS.settings.title, { role: 'heading', size: 40 });
    new Button(this, width - 120, 62, { label: STRINGS.hub.back, width: 160, height: 50, textSize: 22, onClick: () => this.scene.start('Hub') });

    // Three profiles, each with its own Archive and run (GDD 15.13).
    addText(this, 60, 120, STRINGS.settings.profiles, { role: 'hand', size: 28, colour: PALETTE.brass });
    const file = session(this).file;
    file.profiles.forEach((entry, index) => {
      const active = index === file.active;
      const run = entry.run && entry.run.status === 'active' ? STRINGS.settings.runAt(entry.run.round) : STRINGS.settings.noRun;
      new Button(this, 60 + 190 + index * 400, 210, {
        label: `${entry.name}: ${STRINGS.hub.points(entry.archive.points)}`,
        width: 380,
        height: 56,
        textSize: 19,
        selected: active,
        onClick: () => {
          switchProfile(this, index);
          this.scene.restart({ message: STRINGS.settings.switched(entry.name) });
        },
      });
      addText(this, 60 + 190 + index * 400, 248, run, { size: 15, colour: PALETTE.brass }).setOrigin(0.5, 0);
    });

    // Export as a file and a copyable code; import either (GDD 15.13).
    addText(this, 60, 300, STRINGS.settings.transfer, { role: 'hand', size: 28, colour: PALETTE.brass });
    addText(this, 60, 340, STRINGS.settings.transferNote, { size: 16, wrapWidth: 1100 });
    const buttons: Array<[string, () => void]> = [
      [STRINGS.settings.exportFile, () => this.exportFile()],
      [STRINGS.settings.copyCode, () => void this.copyCode()],
      [STRINGS.settings.importFile, () => this.importFile()],
      [STRINGS.settings.importCode, () => this.importCode()],
    ];
    buttons.forEach(([label, onClick], index) => {
      new Button(this, 60 + 140 + index * 290, 420, { label, width: 270, height: 56, textSize: 19, onClick });
    });
    addText(this, 60, 470, STRINGS.settings.active(profile(this).name), { size: 15, colour: PALETTE.brass });
    if (session(this).fromBackup) addText(this, 60, 500, STRINGS.settings.fromBackup, { size: 15, colour: PALETTE.danger });
    addText(this, 60, 560, STRINGS.settings.later, { size: 15, colour: PALETTE.brass, wrapWidth: 1100 });
    if (this.message) addText(this, width / 2, height - 50, this.message, { size: 18, weight: '700', colour: PALETTE.danger }).setOrigin(0.5);
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
    this.scene.restart({ message: STRINGS.settings.exported });
  }

  private async copyCode(): Promise<void> {
    const code = exportCode(session(this).file);
    let message: string = STRINGS.settings.copied;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Without clipboard access the code shows in a prompt, ready to copy by hand.
      window.prompt(STRINGS.settings.copyPrompt, code);
      message = STRINGS.settings.shown;
    }
    this.scene.restart({ message });
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
    const code = window.prompt(STRINGS.settings.pastePrompt);
    if (code) this.finishImport(code);
  }

  private finishImport(text: string): void {
    const result = importSave(text);
    if ('problem' in result) {
      this.scene.restart({ message: STRINGS.settings.problems[result.problem] });
      return;
    }
    if (!window.confirm(STRINGS.settings.confirmImport)) return;
    replaceSave(this, result.file);
    this.scene.restart({ message: STRINGS.settings.imported });
  }
}
