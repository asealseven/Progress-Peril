// Music hooks (GDD 15.10, CLAUDE.md "Audio"). Each kingdom theme has three
// layers, calm, combat and peak, in public/assets/music/<kingdom>/. Layers
// fade in and out with the threat on screen. Boss themes, the Convergence
// blend and the Archive menu theme have hooks too (NOTES.md). A missing file
// stays silent. Nothing plays before the first tap or key press.

import files from 'virtual:asset-files';
import type { KingdomName } from '../data/palette';

export const MUSIC_LAYERS = ['calm', 'combat', 'peak'] as const;
export type MusicLayer = (typeof MUSIC_LAYERS)[number];

export type MusicTrack =
  | { readonly kind: 'menu' }
  | { readonly kind: 'kingdom'; readonly kingdom: KingdomName }
  | { readonly kind: 'boss'; readonly id: string; readonly kingdom: KingdomName };

/** File paths for a track, by layer. The menu and boss tracks use one file. */
export function musicFiles(track: MusicTrack): Partial<Record<MusicLayer, string>> {
  if (track.kind === 'menu') return { calm: 'assets/music/archive.ogg' };
  if (track.kind === 'boss') return { peak: `assets/music/bosses/${track.id}.ogg` };
  const folder = track.kingdom.toLowerCase();
  return Object.fromEntries(MUSIC_LAYERS.map((layer) => [layer, `assets/music/${folder}/${layer}.ogg`]));
}

/**
 * Layer volumes for a threat level from 0 to 1 (GDD 15.10): calm always,
 * combat from light threat, peak near the top.
 */
export function layerMix(threat: number): Record<MusicLayer, number> {
  const clamp = (value: number): number => Math.max(0, Math.min(1, value));
  return { calm: 1, combat: clamp((threat - 0.15) / 0.3), peak: clamp((threat - 0.6) / 0.25) };
}

const FADE_PER_SECOND = 0.6;
const DUCK_LEVEL = 0.4;
const TICK_MS = 100;

interface Layer {
  readonly audio: HTMLAudioElement;
  level: number;
  target: number;
}

class MusicDirector {
  private readonly present = new Set(files);
  private layers = new Map<MusicLayer, Layer>();
  private trackKey = '';
  private threat = 0;
  private volume = 0.6;
  private duckLeft = 0;
  private unlocked = false;
  private timer: ReturnType<typeof setInterval> | undefined;

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
  }

  /** Starts a track. A track already playing keeps playing. A boss track with no file falls back to the kingdom layers. */
  play(track: MusicTrack): void {
    const chosen = track.kind === 'boss' && !this.present.has(musicFiles(track).peak ?? '') ? ({ kind: 'kingdom', kingdom: track.kingdom } as const) : track;
    const key = JSON.stringify(chosen);
    if (key === this.trackKey) return;
    this.stop();
    this.trackKey = key;
    for (const [layer, path] of Object.entries(musicFiles(chosen)) as Array<[MusicLayer, string]>) {
      if (!this.present.has(path)) continue;
      const audio = new Audio(path);
      audio.loop = true;
      audio.volume = 0;
      this.layers.set(layer, { audio, level: 0, target: 0 });
    }
    // A boss theme plays at full level. Other tracks follow the threat.
    if (chosen.kind === 'boss') this.threat = 1;
    this.start();
  }

  /** Threat on screen from 0 to 1 (GDD 15.10). */
  setThreat(threat: number): void {
    this.threat = Math.max(0, Math.min(1, threat));
  }

  /** Music ducks under boss telegraphs (GDD 15.10). */
  duck(seconds: number): void {
    this.duckLeft = Math.max(this.duckLeft, seconds);
  }

  /** Called on the first tap or key press: browsers block sound until then. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.start();
  }

  stop(): void {
    for (const layer of this.layers.values()) {
      layer.audio.pause();
      layer.audio.src = '';
    }
    this.layers.clear();
    this.trackKey = '';
  }

  private start(): void {
    if (!this.unlocked || this.layers.size === 0) return;
    for (const layer of this.layers.values()) void layer.audio.play().catch(() => undefined);
    this.timer ??= setInterval(() => this.tick(TICK_MS / 1000), TICK_MS);
  }

  private tick(dt: number): void {
    const mix = layerMix(this.threat);
    this.duckLeft = Math.max(0, this.duckLeft - dt);
    const duck = this.duckLeft > 0 ? DUCK_LEVEL : 1;
    for (const [name, layer] of this.layers) {
      layer.target = mix[name];
      const step = FADE_PER_SECOND * dt;
      layer.level += Math.max(-step, Math.min(step, layer.target - layer.level));
      layer.audio.volume = Math.max(0, Math.min(1, layer.level * this.volume * duck));
    }
  }
}

export const music = new MusicDirector();
