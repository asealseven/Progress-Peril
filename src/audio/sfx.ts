// Sound effects generated in code with ZzFX (GDD 15.10, CLAUDE.md "Audio"):
// one hit sound per damage type, one attack sound per weapon family, one
// voice per enemy faction, interface sounds of paper, quill and brass, and
// cues for telegraphs, bosses, elites and low health. Samples build once on
// first use. The mixer keeps at most 8 copies of one sound and gives
// telegraphs and boss attacks priority.

import { ZZFX } from 'zzfx';
import type { DamageType } from '../data/damageTypes';
import type { FactionName } from '../data/palette';
import type { WeaponFamily } from '../data/weapons';
import { Mixer } from './mixer';
import type { SoundPriority, Voice } from './mixer';

/**
 * ZzFX parameters: volume, randomness, frequency, attack, sustain, release,
 * shape, shapeCurve, slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime,
 * noise, modulation, bitCrush, delay, sustainVolume, decay, tremolo.
 */
type ZzfxParams = readonly number[];

interface SoundDef {
  readonly params: ZzfxParams;
  readonly priority: SoundPriority;
}

const sound = (params: ZzfxParams, priority: SoundPriority = 'normal'): SoundDef => ({ params, priority });

export const HIT_SOUNDS: Readonly<Record<DamageType, SoundDef>> = {
  Slashing: sound([0.5, 0.1, 900, 0, 0.01, 0.06, 2, 1, -20, 0, 0, 0, 0, 1.5, 0, 0, 0, 0.6, 0.02], 'low'),
  Piercing: sound([0.45, 0.1, 1400, 0, 0.01, 0.04, 1, 2, -40, 0, 0, 0, 0, 0.5], 'low'),
  Impact: sound([0.7, 0.1, 120, 0, 0.02, 0.12, 4, 1, -5, 0, 0, 0, 0, 1, 0, 0, 0, 0.7, 0.04], 'low'),
  Fire: sound([0.45, 0.2, 300, 0, 0.04, 0.15, 4, 1, 10, 0, 0, 0, 0, 2], 'low'),
  Cold: sound([0.4, 0.1, 1800, 0, 0.01, 0.12, 1, 0, 0, 0, 300, 0.03], 'low'),
  Electric: sound([0.4, 0.2, 600, 0, 0.02, 0.08, 2, 0, 0, 0, 0, 0, 0.02, 1, 0, 0.5], 'low'),
  Toxic: sound([0.45, 0.2, 200, 0, 0.03, 0.12, 0, 1, 20, 0, 0, 0, 0, 0.4, 5], 'low'),
  Corrosive: sound([0.45, 0.3, 400, 0, 0.02, 0.14, 0, 1, 40, 0, 0, 0, 0.03, 0.3], 'low'),
  Biological: sound([0.45, 0.3, 150, 0, 0.05, 0.16, 1, 1, -5, 0, 0, 0, 0, 0.8, 8], 'low'),
};

export const ATTACK_SOUNDS: Readonly<Record<WeaponFamily, SoundDef>> = {
  Melee: sound([0.35, 0.1, 400, 0.01, 0.03, 0.08, 4, 1, -30, 0, 0, 0, 0, 0.8], 'low'),
  Ranged: sound([0.35, 0.05, 500, 0, 0.01, 0.1, 2, 1, -60], 'low'),
  Siege: sound([0.6, 0.05, 70, 0.01, 0.08, 0.3, 4, 1, -2, 0, 0, 0, 0, 1.5, 0, 0, 0, 0.6, 0.1], 'low'),
  Mechanical: sound([0.35, 0.05, 800, 0, 0.01, 0.03, 3, 1, 0, 0, 0, 0, 0.02, 0, 0, 0.3], 'low'),
  Alchemical: sound([0.35, 0.2, 250, 0, 0.03, 0.1, 0, 1, 50, 0, 0, 0, 0, 0, 10], 'low'),
  Experimental: sound([0.35, 0.1, 1000, 0, 0.04, 0.1, 2, 0, -100, 0, 0, 0, 0, 0, 30], 'low'),
};

export const VOICE_SOUNDS: Readonly<Record<FactionName, SoundDef>> = {
  'Kingdom Armies': sound([0.4, 0.2, 140, 0.02, 0.06, 0.1, 2, 2, 0, 0, 0, 0, 0, 0, 4]),
  'Clockwork Legions': sound([0.4, 0.1, 300, 0, 0.06, 0.06, 3, 1, 0, 0, 0, 0, 0.03, 0, 0, 0.4]),
  'Failed Experiments': sound([0.4, 0.3, 100, 0.02, 0.1, 0.15, 1, 3, 10, 0, 0, 0, 0, 0.4, 12]),
  Wilds: sound([0.4, 0.3, 250, 0.01, 0.05, 0.12, 2, 1, -30, 0, 0, 0, 0, 1.2]),
  Outlaws: sound([0.4, 0.2, 180, 0.02, 0.05, 0.08, 2, 2, 15]),
  Unknown: sound([0.4, 0.1, 600, 0.05, 0.1, 0.2, 0, 1, 0, 0, 0, 0, 0.05, 0, 20]),
};

export const SOUNDS = {
  enemyDeath: sound([0.45, 0.1, 180, 0, 0.03, 0.15, 4, 1, -10, 0, 0, 0, 0, 1], 'low'),
  playerHurt: sound([0.8, 0.05, 220, 0, 0.04, 0.18, 2, 1.5, -15, 0, 0, 0, 0, 1.2], 'high'),
  pickupGold: sound([0.35, 0, 1200, 0, 0.02, 0.08, 0, 1, 0, 0, 500, 0.04], 'low'),
  pickupMaterial: sound([0.3, 0, 700, 0, 0.02, 0.06, 1, 1, 0, 0, 200, 0.03], 'low'),
  click: sound([0.3, 0, 1500, 0, 0.005, 0.02, 3, 1]),
  page: sound([0.25, 0.2, 500, 0.02, 0.05, 0.1, 4, 1, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0.4]),
  quill: sound([0.2, 0.3, 2400, 0.01, 0.04, 0.05, 4, 1, 0, 0, 0, 0, 0, 3]),
  purchase: sound([0.45, 0, 880, 0, 0.04, 0.2, 0, 1, 0, 0, 440, 0.06]),
  research: sound([0.4, 0, 523, 0.02, 0.1, 0.3, 1, 1, 0, 0, 262, 0.1, 0, 0, 0, 0, 0.1]),
  telegraph: sound([0.5, 0, 300, 0, 0.15, 0.05, 1, 1, 0, 0, 0, 0, 0.08], 'high'),
  bossAttack: sound([0.9, 0, 90, 0.02, 0.2, 0.3, 2, 1, -3, 0, 0, 0, 0, 0.5], 'high'),
  bossPhase: sound([0.9, 0, 60, 0.05, 0.3, 0.6, 2, 1, 1, 0, 0, 0, 0, 0.6, 0, 0, 0.1], 'high'),
  explosion: sound([0.6, 0.1, 80, 0.01, 0.08, 0.3, 4, 1, -2, 0, 0, 0, 0, 1.5, 0, 0, 0, 0.5, 0.1]),
  explosionLarge: sound([0.9, 0.1, 60, 0.01, 0.15, 0.5, 4, 1, -1, 0, 0, 0, 0, 2, 0, 0, 0, 0.5, 0.2]),
  reaction: sound([0.5, 0.1, 700, 0, 0.05, 0.2, 1, 1, 0, 0, 350, 0.05, 0, 0.3]),
  roundStart: sound([0.5, 0, 392, 0.02, 0.15, 0.2, 1, 1, 0, 0, 196, 0.1], 'high'),
  roundEnd: sound([0.5, 0, 523, 0.02, 0.2, 0.4, 1, 1, 0, 0, -131, 0.15], 'high'),
  eliteCue: sound([0.6, 0, 660, 0, 0.1, 0.1, 1, 1, 0, 0, 330, 0.08, 0.12], 'high'),
  lowHealthCue: sound([0.5, 0, 200, 0, 0.08, 0.08, 0, 1, 0, 0, 0, 0, 0.25], 'high'),
} as const satisfies Record<string, SoundDef>;

export type SoundId = keyof typeof SOUNDS;

const mixer = new Mixer();
/** Sources by voice, so a high priority sound can stop the oldest copy. */
const sources = new Map<Voice, AudioBufferSourceNode>();
const samples = new Map<SoundDef, number[]>();
let volume = 0.8;

function now(): number {
  return ZZFX.audioContext.currentTime;
}

/** Sets the sound effect volume, 0 to 1. */
export function setSfxVolume(value: number): void {
  volume = Math.max(0, Math.min(1, value));
}

/** Browsers start audio on the first tap or key press (CLAUDE.md "Audio"). */
export function unlockAudio(): void {
  if (ZZFX.audioContext.state === 'suspended') void ZZFX.audioContext.resume().catch(() => undefined);
}

function play(id: string, def: SoundDef, gain = 1, pan = 0): void {
  if (volume <= 0 || ZZFX.audioContext.state !== 'running') return;
  const time = now();
  const decision = mixer.request(id, def.priority, time);
  if (!decision.play) return;
  if (decision.stop) {
    // A high priority sound at the copy limit stops its oldest copy.
    decision.stop.ended = true;
    try {
      sources.get(decision.stop)?.stop();
    } catch {
      // Already stopped.
    }
    sources.delete(decision.stop);
  }
  let built = samples.get(def);
  if (!built) {
    built = ZZFX.buildSamples(...def.params);
    samples.set(def, built);
  }
  const voice = mixer.start(id, def.priority, time);
  const source = ZZFX.playSamples([built], volume * gain, 1, Math.max(-1, Math.min(1, pan)));
  sources.set(voice, source);
  source.onended = () => {
    voice.ended = true;
    sources.delete(voice);
  };
}

export function playSound(id: SoundId, gain = 1, pan = 0): void {
  play(id, SOUNDS[id], gain, pan);
}

export function playHit(type: DamageType, gain = 1, pan = 0): void {
  play(`hit.${type}`, HIT_SOUNDS[type], gain, pan);
}

export function playAttack(family: WeaponFamily, gain = 1, pan = 0): void {
  play(`attack.${family}`, ATTACK_SOUNDS[family], gain, pan);
}

export function playVoice(faction: FactionName, gain = 1, pan = 0): void {
  play(`voice.${faction}`, VOICE_SOUNDS[faction], gain, pan);
}
