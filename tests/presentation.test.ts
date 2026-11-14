import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIXER_RULES, Mixer } from '../src/audio/mixer';
import { MUSIC_LAYERS, layerMix, musicFiles } from '../src/audio/music';
import { IMAGE_ASSETS, bossAssetKey, miniBossAssetKey } from '../src/data/assets';
import { DAMAGE_TYPES } from '../src/data/damageTypes';
import { STATUS_EFFECTS } from '../src/data/statusEffects';
import { DAMAGE_ICON_SHAPES, STATUS_ICONS } from '../src/render/damageIcons';
import { EXPLOSION_SIZES, TYPE_STYLES, explosionSize } from '../src/render/effects';

describe('asset manifest against ART_PROMPTS.md (CLAUDE.md rule 8)', () => {
  const prompts = readFileSync('ART_PROMPTS.md', 'utf8');
  const listed = [...prompts.matchAll(/^\| `([a-z0-9-]+\.png)` \|/gm)].map((match) => match[1]);

  it('lists every image ART_PROMPTS.md asks for, and no other', () => {
    expect(listed).toHaveLength(174);
    const files = IMAGE_ASSETS.map((entry) => entry.path?.split('/').pop());
    expect(files.sort()).toEqual([...listed].sort());
  });

  it('puts every file in the folder ART_PROMPTS.md names', () => {
    for (const entry of IMAGE_ASSETS) expect(entry.path).toMatch(/^assets\/(sprites|icons|portraits|arenas|cards|hub)\//);
  });

  it('keys boss images by phase and mini-boss images by short name', () => {
    expect(bossAssetKey('iron-regent', 2)).toBe('boss.iron-regent-phase-2');
    expect(miniBossAssetKey('forge-marshal')).toBe('miniboss.forge-marshal');
    const keys = IMAGE_ASSETS.map((entry) => entry.key);
    expect(keys).toContain('boss.the-unmaking-phase-3');
    expect(keys).toContain('miniboss.thornback-matriarch');
  });
});

describe('sound mixing (GDD 15.10)', () => {
  it('plays at most 8 copies of one sound', () => {
    const mixer = new Mixer();
    for (let index = 0; index < MIXER_RULES.maxCopies; index++) {
      const time = index * 0.1;
      expect(mixer.request('hit', 'normal', time).play).toBe(true);
      mixer.start('hit', 'normal', time);
    }
    expect(mixer.request('hit', 'normal', 5).play).toBe(false);
    expect(mixer.copies('hit')).toBe(8);
  });

  it('gives telegraphs priority: the oldest copy stops', () => {
    const mixer = new Mixer();
    const voices = Array.from({ length: MIXER_RULES.maxCopies }, (_, index) => mixer.start('telegraph', 'high', index));
    const decision = mixer.request('telegraph', 'high', 10);
    expect(decision.play).toBe(true);
    if (decision.play) expect(decision.stop).toBe(voices[0]);
  });

  it('frees a slot when a copy ends', () => {
    const mixer = new Mixer();
    const voices = Array.from({ length: MIXER_RULES.maxCopies }, (_, index) => mixer.start('hit', 'normal', index));
    voices[3]!.ended = true;
    expect(mixer.request('hit', 'normal', 20).play).toBe(true);
  });

  it('merges starts closer than the minimum gap, except for priority sounds', () => {
    const mixer = new Mixer();
    mixer.start('hit', 'normal', 1);
    expect(mixer.request('hit', 'normal', 1.01).play).toBe(false);
    expect(mixer.request('hit', 'normal', 1.05).play).toBe(true);
    mixer.start('boss', 'high', 1);
    expect(mixer.request('boss', 'high', 1.001).play).toBe(true);
  });

  it('drops ordinary sounds past the voice limit, never priority ones', () => {
    const mixer = new Mixer();
    for (let index = 0; index < MIXER_RULES.maxVoices; index++) mixer.start(`sound-${index}`, 'normal', 0);
    expect(mixer.request('another', 'normal', 1).play).toBe(false);
    expect(mixer.request('warning', 'high', 1).play).toBe(true);
  });
});

describe('music hooks (GDD 15.10)', () => {
  it('keeps three layers per kingdom in the CLAUDE.md folders', () => {
    expect(MUSIC_LAYERS).toEqual(['calm', 'combat', 'peak']);
    expect(musicFiles({ kind: 'kingdom', kingdom: 'Keldrath' })).toEqual({
      calm: 'assets/music/keldrath/calm.ogg',
      combat: 'assets/music/keldrath/combat.ogg',
      peak: 'assets/music/keldrath/peak.ogg',
    });
  });

  it('fades layers in with the threat', () => {
    expect(layerMix(0)).toEqual({ calm: 1, combat: 0, peak: 0 });
    expect(layerMix(1)).toEqual({ calm: 1, combat: 1, peak: 1 });
    const half = layerMix(0.4);
    expect(half.combat).toBeGreaterThan(0);
    expect(half.peak).toBe(0);
  });
});

describe('damage type icons and effects (GDD 15.1, 15.4)', () => {
  it('gives every damage type the GDD icon shape', () => {
    expect(Object.keys(DAMAGE_ICON_SHAPES).sort()).toEqual([...DAMAGE_TYPES].sort());
    expect(DAMAGE_ICON_SHAPES.Cold).toBe('Snowflake');
    expect(DAMAGE_ICON_SHAPES.Biological).toBe('Spore cluster');
  });

  it('gives every status meter an icon', () => {
    for (const status of STATUS_EFFECTS) expect(STATUS_ICONS[status]).toBeDefined();
  });

  it('styles a hit spark, burst and trail for every damage type', () => {
    for (const type of DAMAGE_TYPES) expect(TYPE_STYLES[type]).toBeDefined();
  });

  it('sorts explosions into three sizes', () => {
    expect(EXPLOSION_SIZES).toHaveLength(3);
    expect(explosionSize(30)).toBe(0);
    expect(explosionSize(70)).toBe(1);
    expect(explosionSize(120)).toBe(2);
  });
});
