// Every player-facing text lives here (GDD 15.14, Localisation). English first.

export const STRINGS = {
  title: 'Progress & Peril',
  tagline: 'Every discovery has a consequence.',
  setting: 'The Age of Invention',
  rotatePrompt: 'Rotate your device to play.',

  boot: {
    startKeyboard: 'Press any key to begin',
    startTouch: 'Tap to begin',
    controlsKeyboard: 'Move with WASD or the arrow keys. Weapons fire on their own. Hold a mouse button to focus fire. Esc pauses.',
    controlsTouch: 'Drag on the left half to move. Weapons fire on their own. Hold the right half to focus fire.',
  },

  hud: {
    round: (round: number) => `Round ${round}`,
    territory: (territory: number, kingdom: string) => `Territory ${territory}: ${kingdom}`,
    suppressed: 'Auxiliary suppressed',
    goldStolen: (amount: number) => `-${amount} gold`,
    goldReturned: (amount: number) => `+${amount} gold`,
    champion: (trait: string, enemy: string) => `${trait} ${enemy}`,
    health: (current: number, max: number) => `${current} / ${max}`,
    cleanup: (left: number) => (left === 1 ? 'Defeat the last enemy' : `Defeat the remaining enemies: ${left}`),
    roundCleared: 'Round cleared',
    defeated: 'Defeated',
    emptySlot: 'Empty',
  },

  pause: {
    title: 'Paused',
    seed: (seed: string) => `Seed ${seed}`,
    synergies: (names: readonly string[]) =>
      names.length > 0 ? `Synergies: ${names.join(', ')}` : 'No active synergies',
    resume: 'Resume',
    quit: 'Quit to title',
    hintKeyboard: 'Esc resumes',
  },

  results: {
    roundComplete: (round: number) => `Round ${round} complete`,
    buildComplete: 'Campaign survived',
    buildCompleteNote: 'All 21 rounds cleared. Later milestones add the shop, research, kingdoms and bosses.',
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

  select: {
    heading: 'Choose a starting weapon',
    character: (name: string) => `${name} sets out with one weapon.`,
    hintKeyboard: 'Press 1 to 6, or use the arrow keys and Enter',
    hintTouch: 'Tap a weapon to begin',
    stats: (damage: string, speed: string, range: string, area: string) =>
      `Damage ${damage}  ·  Speed ${speed}  ·  Range ${range}  ·  Area ${area}`,
  },

  debug: {
    invincibleOn: 'Invincible: on',
    invincibleOff: 'Invincible: off',
    loadout: 'Loadout (L)',
    spawn: 'Spawn 5 (K)',
    spawnEnemy: (name: string) => `Enemy: ${name}`,
    spawnRank: (rank: string) => `Rank: ${rank}`,
    round: (round: number) => `Round ${round}`,
    roster: (kingdom: string) => `Roster: ${kingdom}`,
    invincible: 'Invincible (I)',
    menuTitle: 'Workbench (debug)',
    menuNote: 'Equip any weapon and component. Pick a round and a roster. Applying restarts the round.',
    slot: (index: number) => `Weapon ${index}`,
    noWeapon: 'No weapon',
    empty: 'Empty',
    closed: 'Closed',
    gradeLow: 'Grade I: Auxiliary closed',
    gradeHigh: 'Grade III: Auxiliary open',
    apply: 'Apply and restart round',
    cancel: 'Cancel',
    waiting: (component: string, milestone: number) => `${component}: active from Milestone ${milestone}`,
    needWeapon: 'Equip at least one weapon.',
    researchLocked: 'Research synergies: locked',
    researchOpen: 'Research synergies: open',
    activeSynergies: (names: readonly string[]) =>
      names.length > 0 ? `Active synergies: ${names.join(', ')}` : 'Active synergies: none',
    nearMisses: (texts: readonly string[]) => (texts.length > 0 ? `Near: ${texts.join('. ')}` : ''),
    lockedSynergies: (names: readonly string[]) =>
      names.length > 0 ? `Needs research: ${names.join(', ')}` : '',
  },
} as const;

/** Formats seconds as m:ss. */
export function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}
