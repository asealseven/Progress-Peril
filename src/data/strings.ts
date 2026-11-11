// Every player-facing text lives here (GDD 15.14, Localisation). English first.

export const STRINGS = {
  title: 'Progress & Peril',
  tagline: 'Every discovery has a consequence.',
  setting: 'The Age of Invention',
  rotatePrompt: 'Rotate your device to play.',

  boot: {
    startKeyboard: 'Press any key to begin',
    startTouch: 'Tap to begin',
    controlsKeyboard: 'Move with WASD or the arrow keys. Weapons fire on their own. Esc pauses.',
    controlsTouch: 'Drag on the left half of the screen to move. Weapons fire on their own.',
  },

  hud: {
    round: (round: number) => `Round ${round}`,
    territory: (kingdom: string, arena: string) => `${kingdom}, ${arena}`,
    health: (current: number, max: number) => `${current} / ${max}`,
    cleanup: (left: number) => (left === 1 ? 'Defeat the last enemy' : `Defeat the remaining enemies: ${left}`),
    roundCleared: 'Round cleared',
    defeated: 'Defeated',
    emptySlot: 'Empty',
  },

  pause: {
    title: 'Paused',
    seed: (seed: string) => `Seed ${seed}`,
    resume: 'Resume',
    quit: 'Quit to title',
    hintKeyboard: 'Esc resumes',
  },

  results: {
    roundComplete: (round: number) => `Round ${round} complete`,
    buildComplete: 'Three rounds survived',
    buildCompleteNote: 'The first playable build ends here. Later milestones add the mini-boss and the full campaign.',
    defeat: (character: string) => `${character} has fallen`,
    defeatRound: (round: number) => `Defeated in Round ${round}`,
    healed: 'Health restored in full.',
    roundHeading: 'This round',
    campaignHeading: 'Campaign so far',
    kills: 'Enemies defeated',
    damageDealt: 'Damage dealt',
    damageTaken: 'Damage taken',
    hitsTaken: 'Hits taken',
    time: 'Combat time',
    criticalHits: 'Critical hits',
    roundsSurvived: 'Rounds survived',
    nextRound: 'Start next round',
    nextRoundHint: 'Enter starts the next round',
    toTitle: 'Return to title',
    seed: (seed: string) => `Seed ${seed}`,
  },

  debug: {
    invincibleOn: 'Invincible: on (I)',
    invincibleOff: 'Invincible: off (I)',
  },
} as const;

/** Formats seconds as m:ss. */
export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}
