// Combat sound (GDD 3.10, 15.10): turns simulation events into ZzFX sounds,
// plays the accessibility cues for elite arrivals, boss attacks and low
// health, and drives the music layers with the threat on screen. Captions go
// to the scene through a callback when subtitles are on.

import type { GameSettings } from '../data/modes';
import { STRINGS } from '../data/strings';
import type { World } from '../sim/world/world';
import type { WorldEvent } from '../sim/world/types';
import { explosionSize } from '../render/effects';
import { music } from './music';
import { playAttack, playHit, playSound, playVoice } from './sfx';

/** Active enemies at which the music reaches its peak layer. */
const PEAK_ENEMIES = 45;
/** Chance that a winding-up enemy calls out in its faction's voice. */
const VOICE_CHANCE = 0.12;
const LOW_HEALTH = 0.3;

export class CombatAudio {
  private readonly announced = new Set<number>();
  private readonly windups = new Set<number>();
  private readonly telegraphs = new WeakSet<object>();
  private lowHealth = false;

  constructor(
    private readonly prefs: GameSettings,
    private readonly caption: (text: string) => void,
    /** Stereo position of a world point, -1 to 1. */
    private readonly pan: (x: number) => number,
  ) {}

  /** A cue sound plays only with audio cues on. Its caption shows only with subtitles on (GDD 3.10). */
  private cue(sound: 'eliteCue' | 'lowHealthCue' | 'telegraph', caption: string): void {
    if (this.prefs.audioCues) playSound(sound);
    if (this.prefs.subtitles) this.caption(caption);
  }

  roundStart(): void {
    playSound('roundStart');
  }

  roundEnd(): void {
    playSound('roundEnd');
  }

  event(world: World, event: WorldEvent): void {
    switch (event.type) {
      case 'shot': {
        const weapon = world.weapons[event.weaponIndex];
        if (weapon) playAttack(weapon.resolved.def.family, 0.8, this.pan(event.x));
        break;
      }
      case 'enemyHit':
        playHit(event.damageType, event.critical ? 1 : 0.7, this.pan(event.x));
        break;
      case 'enemyKilled':
        playSound('enemyDeath', 0.7, this.pan(event.x));
        break;
      case 'playerHit':
        playSound('playerHurt');
        break;
      case 'explosion':
        playSound(explosionSize(event.radius) === 2 ? 'explosionLarge' : 'explosion', 0.8, this.pan(event.x));
        break;
      case 'reaction':
        playSound('reaction', 1, this.pan(event.x));
        break;
      case 'bossPhase':
        playSound('bossPhase');
        break;
      case 'bossStrike':
      case 'bossWave':
      case 'bossNull':
        playSound('bossAttack');
        break;
      case 'pickup':
        playSound(event.kind === 'gold' ? 'pickupGold' : 'pickupMaterial', 0.7);
        break;
      default:
        break;
    }
  }

  /** Per-frame checks: elites arriving, enemies winding up, boss telegraphs, low health and the music threat. */
  frame(world: World): void {
    let active = 0;
    for (const enemy of world.enemies.items) {
      if (!enemy.active) {
        this.windups.delete(enemy.id);
        continue;
      }
      active++;
      if ((enemy.rank === 'elite' || enemy.rank === 'champion') && !this.announced.has(enemy.id)) {
        this.announced.add(enemy.id);
        this.cue('eliteCue', STRINGS.hud.captions.elite(enemy.def.name));
      }
      const winding = enemy.action === 'windup' || enemy.action === 'cast';
      if (winding && !this.windups.has(enemy.id)) {
        this.windups.add(enemy.id);
        if (Math.random() < VOICE_CHANCE) {
          playVoice(enemy.def.faction, 0.6, this.pan(enemy.x));
          if (this.prefs.subtitles) this.caption(STRINGS.hud.captions.voice(enemy.def.faction));
        }
      } else if (!winding) {
        this.windups.delete(enemy.id);
      }
    }
    // Boss telegraphs: a warning tone, a caption and the music ducks (GDD 15.10).
    for (const telegraph of world.bossTelegraphs) {
      if (this.telegraphs.has(telegraph)) continue;
      this.telegraphs.add(telegraph);
      this.cue('telegraph', STRINGS.hud.captions.boss);
      music.duck(1.2);
    }
    const share = world.player.health / world.player.stats.maxHealth;
    const low = share > 0 && share <= LOW_HEALTH;
    if (low && !this.lowHealth) this.cue('lowHealthCue', STRINGS.hud.captions.lowHealth);
    this.lowHealth = low;
    music.setThreat(world.bosses.length > 0 ? Math.max(0.75, active / PEAK_ENEMIES) : active / PEAK_ENEMIES);
  }
}
