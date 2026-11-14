// Sound mixing rules (GDD 15.10): at most 8 copies of one sound at once, with
// priority for telegraphs and boss attacks. Pure logic with no browser audio,
// so tests cover it. sfx.ts feeds it real sound sources.

export type SoundPriority = 'low' | 'normal' | 'high';

export const MIXER_RULES = {
  /** Copies of one sound playing at once (GDD 15.10). */
  maxCopies: 8,
  /** Every sound together. Low and normal sounds drop past this. High priority sounds always play. */
  maxVoices: 28,
  /** Seconds between two starts of the same sound, so one burst of hits plays as one sound. */
  minGap: 0.03,
} as const;

export interface Voice {
  readonly id: string;
  readonly priority: SoundPriority;
  readonly startedAt: number;
  ended: boolean;
}

export type MixDecision = { readonly play: false } | { readonly play: true; readonly stop: Voice | undefined };

/** Tracks playing voices and decides whether a new sound starts. */
export class Mixer {
  private readonly voices: Voice[] = [];
  private readonly lastStart = new Map<string, number>();

  /** Voices still playing. */
  get playing(): readonly Voice[] {
    this.prune();
    return this.voices;
  }

  copies(id: string): number {
    return this.playing.filter((voice) => voice.id === id).length;
  }

  /**
   * Decides on a new sound at a time in seconds. A high priority sound always
   * plays: at the copy limit it stops its oldest copy. Other sounds drop at
   * the copy limit, the voice limit or inside the minimum gap.
   */
  request(id: string, priority: SoundPriority, now: number): MixDecision {
    this.prune();
    const high = priority === 'high';
    const last = this.lastStart.get(id);
    if (!high && last !== undefined && now - last < MIXER_RULES.minGap) return { play: false };
    const same = this.voices.filter((voice) => voice.id === id);
    let stop: Voice | undefined;
    if (same.length >= MIXER_RULES.maxCopies) {
      if (!high) return { play: false };
      stop = same[0];
    } else if (!high && this.voices.length >= MIXER_RULES.maxVoices) {
      return { play: false };
    }
    return { play: true, stop };
  }

  /** Records a voice that started. Mark it ended when its sound finishes. */
  start(id: string, priority: SoundPriority, now: number): Voice {
    const voice: Voice = { id, priority, startedAt: now, ended: false };
    this.voices.push(voice);
    this.lastStart.set(id, now);
    return voice;
  }

  private prune(): void {
    for (let index = this.voices.length - 1; index >= 0; index--) {
      if (this.voices[index]?.ended) this.voices.splice(index, 1);
    }
  }
}
