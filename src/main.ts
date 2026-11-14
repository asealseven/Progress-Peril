import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/im-fell-english/latin-400.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-500.css';
import '@fontsource/alegreya-sans/latin-700.css';
import '@fontsource/caveat/latin-400.css';
import { FONT_PRELOAD } from './data/fonts';
import { PALETTE } from './data/palette';
import { SCREEN } from './data/screen';
import { STRINGS } from './data/strings';
import { Boot } from './scenes/Boot';
import { CharacterSelect } from './scenes/CharacterSelect';
import { Combat } from './scenes/Combat';
import { DebugMenu } from './scenes/DebugMenu';
import { Preparation } from './scenes/Preparation';
import { Results } from './scenes/Results';
import { Transition } from './scenes/Transition';
import { Victory } from './scenes/Victory';
import { Hub } from './scenes/Hub';
import { Settings } from './scenes/Settings';

const FONT_TIMEOUT_MS = 3000;

/** Waits for the self-hosted fonts so the first scene draws with them. */
async function loadFonts(): Promise<void> {
  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, FONT_TIMEOUT_MS);
  });
  const loads = Promise.all(FONT_PRELOAD.map((font) => document.fonts.load(font))).then(
    () => undefined,
    () => undefined,
  );
  await Promise.race([loads, timeout]);
}

async function start(): Promise<void> {
  const rotatePrompt = document.getElementById('rotate-prompt');
  if (rotatePrompt) rotatePrompt.textContent = STRINGS.rotatePrompt;

  registerSW({ immediate: true });
  await loadFonts();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: SCREEN.width,
    height: SCREEN.height,
    backgroundColor: PALETTE.parchment,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 3,
    },
    scene: [Boot, Hub, CharacterSelect, Transition, Combat, Results, Preparation, Victory, Settings, DebugMenu],
  });

  // Development builds expose the game for browser test scripts.
  if (import.meta.env.DEV) {
    (window as unknown as { __game?: Phaser.Game }).__game = game;
  }
}

void start();
