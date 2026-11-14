import { describe, expect, it } from 'vitest';
import { assetFileName } from '../src/data/assets';
import { CHARACTERS } from '../src/data/characters';
import { COMPONENT_LIST, QUALITIES, SLOT_TYPES } from '../src/data/components';
import { DAMAGE_TYPES } from '../src/data/damageTypes';
import { TAGS } from '../src/data/tags';
import { TIERS } from '../src/data/tiers';
import {
  PROJECTILE_BEHAVIOURS,
  STARTING_WEAPONS,
  TARGETING_RULES,
  WEAPON_FAMILIES,
  WEAPON_LIST,
} from '../src/data/weapons';
import { resolved } from './helpers';

describe('weapon catalogue (GDD 7.17)', () => {
  it('holds 24 weapons, four per family', () => {
    expect(WEAPON_LIST).toHaveLength(24);
    for (const family of WEAPON_FAMILIES) {
      expect(WEAPON_LIST.filter((weapon) => weapon.family === family)).toHaveLength(4);
    }
  });

  it('uses unique names, kebab-case ids and known tiers, tags and damage types', () => {
    expect(new Set(WEAPON_LIST.map((weapon) => weapon.name)).size).toBe(24);
    for (const weapon of WEAPON_LIST) {
      expect(weapon.id).toBe(assetFileName(weapon.name));
      for (const tier of [weapon.damage, weapon.attackSpeed, weapon.range, weapon.area]) expect(TIERS).toContain(tier);
      for (const tag of weapon.tags) expect(TAGS).toContain(tag);
      expect(weapon.damageTypes.length).toBeGreaterThanOrEqual(1);
      for (const type of weapon.damageTypes) expect(DAMAGE_TYPES).toContain(type);
      expect(TARGETING_RULES).toContain(weapon.targeting);
      expect(weapon.description.length).toBeGreaterThan(0);
    }
  });

  it('copies the GDD rows for sample weapons', () => {
    const cannon = WEAPON_LIST.find((weapon) => weapon.name === 'Field Cannon')!;
    expect([cannon.damage, cannon.attackSpeed, cannon.range, cannon.area]).toEqual(['Extreme', 'Minimal', 'High', 'High']);
    expect(cannon.tags).toEqual(['Heavy', 'Explosive', 'Projectile']);
    expect(cannon.damageTypes).toEqual(['Impact', 'Fire']);
    const mirror = WEAPON_LIST.find((weapon) => weapon.name === 'Burning Mirror')!;
    expect([mirror.damage, mirror.attackSpeed, mirror.range, mirror.area]).toEqual(['Low', 'Extreme', 'High', 'Minimal']);
    expect(mirror.tags).toEqual(['Beam', 'Fire', 'Precise']);
  });

  it('lists the six starting weapons of The Inventor', () => {
    expect(STARTING_WEAPONS.map((weapon) => weapon.name)).toEqual(CHARACTERS.inventor.startingWeapons);
    expect(WEAPON_LIST.filter((weapon) => weapon.starting)).toHaveLength(6);
  });

  it('shows every behaviour in GDD 7.16 through a weapon or a component', () => {
    const shown = new Set<string>(WEAPON_LIST.flatMap((weapon) => weapon.behaviours));
    for (const behaviour of resolved('Crossbow', 'Magnetised Core').behaviours) shown.add(behaviour);
    for (const behaviour of PROJECTILE_BEHAVIOURS) expect(shown).toContain(behaviour);
  });
});

describe('component catalogue (GDD 7.18)', () => {
  it('holds 60 components, 15 per slot type', () => {
    expect(COMPONENT_LIST).toHaveLength(60);
    for (const slot of SLOT_TYPES) {
      expect(COMPONENT_LIST.filter((component) => component.slot === slot)).toHaveLength(15);
    }
  });

  it('matches the quality spread: 15 Common, 24 Uncommon, 13 Rare, 4 Experimental, 4 Extraordinary', () => {
    const counts = QUALITIES.map((quality) => COMPONENT_LIST.filter((component) => component.quality === quality).length);
    expect(counts).toEqual([15, 24, 13, 4, 4]);
  });

  it('uses unique names, known tags and families, and at least one effect each', () => {
    expect(new Set(COMPONENT_LIST.map((component) => component.name)).size).toBe(60);
    expect(new Set(COMPONENT_LIST.map((component) => component.id)).size).toBe(60);
    for (const component of COMPONENT_LIST) {
      expect(component.id).toBe(assetFileName(component.name));
      for (const tag of component.tags) expect(TAGS).toContain(tag);
      if (component.fits !== 'All') {
        expect(component.fits.length).toBeGreaterThan(0);
        for (const family of component.fits) expect(WEAPON_FAMILIES).toContain(family);
      }
      expect(component.effects.length).toBeGreaterThan(0);
      expect(component.effect.length).toBeGreaterThan(0);
    }
  });

  it('copies the GDD rows for sample components', () => {
    const hinge = COMPONENT_LIST.find((component) => component.name === 'Sweep Hinge')!;
    expect(hinge).toMatchObject({ slot: 'Mechanism', fits: ['Melee'], quality: 'Common', tags: ['Mechanical'] });
    const reagent = COMPONENT_LIST.find((component) => component.name === "Philosopher's Reagent")!;
    expect(reagent).toMatchObject({ slot: 'Payload', fits: 'All', quality: 'Extraordinary' });
    expect(reagent.tags).toEqual(['Volatile', 'Toxic', 'Corrosive', 'Fire']);
  });

  it('marks effects for later milestones', () => {
    const waiting = COMPONENT_LIST.filter((component) => component.effects.some((effect) => effect.activeFrom));
    // Status effects arrived in Milestone 3. Research Points and Specimens arrive in Milestone 5.
    expect(waiting.map((component) => component.name)).toEqual(['Research Notebook', 'Specimen Jar']);
  });
});
