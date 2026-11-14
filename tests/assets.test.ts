import { describe, expect, it } from 'vitest';
import { ASSETS, ASSET_FOLDERS, assetFileName, assetKey, assetPath } from '../src/data/assets';
import type { AssetEntry, AssetGroup } from '../src/data/assets';
import { ENEMIES } from '../src/data/enemies';
import { PLAYER_KEY, enemyKey } from '../src/render/placeholders';

describe('asset manifest (ART_PROMPTS.md)', () => {
  it('turns GDD names into kebab-case file names', () => {
    expect(assetFileName('Royal Footman')).toBe('royal-footman');
    expect(assetFileName("Philosopher's Reagent")).toBe('philosophers-reagent');
    expect(assetFileName('Precision-Ground Frame')).toBe('precision-ground-frame');
    expect(assetFileName("Regent's Crown")).toBe('regents-crown');
    expect(assetFileName('Alchemical Chain-Reactor')).toBe('alchemical-chain-reactor');
  });

  it('puts each group in the folder ART_PROMPTS.md gives', () => {
    expect(assetPath('player', 'The Inventor')).toBe('assets/sprites/player/the-inventor.png');
    expect(assetPath('enemy', 'Royal Footman')).toBe('assets/sprites/enemies/royal-footman.png');
    expect(assetPath('miniboss', 'Forge Marshal')).toBe('assets/sprites/minibosses/forge-marshal.png');
    expect(assetPath('boss', 'Iron Regent phase 1')).toBe('assets/sprites/bosses/iron-regent-phase-1.png');
    expect(assetPath('weapon', 'Crossbow')).toBe('assets/icons/weapons/crossbow.png');
    expect(assetPath('component', 'Torsion Spring')).toBe('assets/icons/components/torsion-spring.png');
    expect(assetPath('relic', 'Shard of the Unmaking')).toBe('assets/icons/relics/shard-of-the-unmaking.png');
    expect(assetPath('shopkeeper', 'Royal Inventor')).toBe('assets/portraits/shopkeepers/royal-inventor.png');
    expect(assetPath('arena', 'Keldrath')).toBe('assets/arenas/keldrath.png');
    expect(assetPath('card', 'reveal-keldrath')).toBe('assets/cards/reveal-keldrath.png');
    expect(assetPath('hub', 'grand-archive')).toBe('assets/hub/grand-archive.png');
    expect(assetPath('app', 'app-icon')).toBe('assets/icons/app/app-icon.png');
  });

  it('keeps every entry consistent with its key', () => {
    const entries: Array<[string, AssetEntry]> = Object.entries(ASSETS);
    for (const [name, entry] of entries) {
      expect(entry.key).toBe(name);
      expect(entry.placeholder.length).toBeGreaterThan(0);
      if (entry.path === undefined) continue;
      const [group, file] = entry.key.split('.') as [AssetGroup, string];
      expect(ASSET_FOLDERS[group]).toBeDefined();
      expect(entry.path).toBe(`assets/${ASSET_FOLDERS[group]}/${file}.png`);
    }
  });

  it('lists every key the placeholder textures use', () => {
    const keys = Object.keys(ASSETS);
    expect(keys).toContain(PLAYER_KEY);
    expect(keys).toContain('projectile.player');
    for (const enemy of Object.values(ENEMIES)) {
      expect(keys).toContain(enemyKey(enemy));
      expect(enemyKey(enemy)).toBe(assetKey('enemy', enemy.name));
    }
  });
});
