import { describe, expect, it } from 'vitest';
import { componentByName } from '../src/data/components';
import {
  auxiliaryOpen,
  canInstall,
  createComponent,
  installComponent,
  installProblem,
  installedComponents,
  removeComponent,
  resolveLoadout,
  scrapValue,
  weaponTags,
} from '../src/sim/loadout';
import { ModifierStack } from '../src/sim/modifiers';
import { BASE_STATS, arm, resolved } from './helpers';

const part = (name: string) => componentByName(name)!;

describe('modifier stack (GDD 7.14 step 3)', () => {
  it('adds flat bonuses before percentage bonuses', () => {
    const stack = new ModifierStack();
    stack.addFlat('damage', 5);
    stack.addPercent('damage', 'components', 0.2);
    expect(stack.resolve('damage', 10)).toBeCloseTo(18, 10);
  });

  it('adds bonuses of one source type and multiplies across source types', () => {
    const stack = new ModifierStack();
    stack.addPercent('damage', 'components', 0.2);
    stack.addPercent('damage', 'components', 0.1);
    stack.addPercent('damage', 'research', 0.5);
    expect(stack.percentFor('damage', 'components')).toBeCloseTo(0.3, 10);
    expect(stack.resolve('damage', 100)).toBeCloseTo(100 * 1.3 * 1.5, 10);
  });

  it('keeps stats apart and accepts extra percentages for one call', () => {
    const stack = new ModifierStack();
    stack.addPercent('damage', 'components', 0.1);
    expect(stack.resolve('range', 100)).toBe(100);
    expect(stack.resolve('damage', 100, { components: 0.1 })).toBeCloseTo(120, 10);
    expect(stack.resolve('damage', 100, { research: 0.1 })).toBeCloseTo(121, 10);
  });

  it('never lets stacked "down" effects remove a stat', () => {
    const stack = new ModifierStack();
    stack.addPercent('attackSpeed', 'components', -2);
    expect(stack.resolve('attackSpeed', 1)).toBeCloseTo(0.2, 10);
  });
});

describe('component slot rules (GDD 7.12)', () => {
  it('lets a component fit only the families listed', () => {
    expect(canInstall(arm('Forged Longsword'), part('Sweep Hinge'))).toBe(true);
    expect(installProblem(arm('Crossbow'), part('Sweep Hinge'))).toBe('wrong-family');
    expect(canInstall(arm('Mortar'), part('Tempered Steel Frame'))).toBe(true);
  });

  it('opens the Auxiliary slot at Grade III or at the first merge', () => {
    const weapon = arm('Crossbow');
    expect(auxiliaryOpen(weapon)).toBe(false);
    expect(installProblem(weapon, part('Telescopic Sight'))).toBe('auxiliary-closed');
    weapon.grade = 2;
    expect(auxiliaryOpen(weapon)).toBe(false);
    weapon.grade = 3;
    expect(canInstall(weapon, part('Telescopic Sight'))).toBe(true);
    const merged = arm('Crossbow');
    merged.merges = 1;
    expect(auxiliaryOpen(merged)).toBe(true);
  });

  it('holds one component per slot and returns the replaced one as scrap', () => {
    const weapon = arm('Crossbow', 'Tempered Steel Frame');
    const removed = installComponent(weapon, part('Meteoric Iron Frame'));
    expect(removed?.def.name).toBe('Tempered Steel Frame');
    expect(scrapValue(removed!)).toBe(1);
    expect(weapon.components.Structure?.def.name).toBe('Meteoric Iron Frame');
    expect(scrapValue(removeComponent(weapon, 'Structure')!)).toBe(5);
    expect(installedComponents(weapon)).toHaveLength(0);
  });

  it('scraps default components for no materials', () => {
    expect(scrapValue(createComponent(part('Lightweight Frame'), true))).toBe(0);
    expect(scrapValue(createComponent(part('Lightweight Frame')))).toBe(1);
    expect(scrapValue(createComponent(part('Magnetised Core')))).toBe(3);
  });

  it('refuses a component breaking the rules', () => {
    expect(() => installComponent(arm('Crossbow'), part('Sweep Hinge'))).toThrow();
  });

  it('gives a weapon every tag from its installed components', () => {
    expect(weaponTags(arm('Crossbow', 'Tempered Steel Frame')).sort()).toEqual(['Bolt', 'Metallic', 'Projectile']);
    const tags = weaponTags(arm('Crossbow', 'Electromagnetic Accelerator'));
    expect(tags).toContain('Magnetic');
    expect(tags).toContain('Electric');
  });
});

describe('weapon resolution', () => {
  it('reads base numbers from the tier tables', () => {
    const crossbow = resolved('Crossbow');
    expect(crossbow.damage).toBe(20);
    expect(crossbow.damageParts).toEqual([{ type: 'Piercing', amount: 20 }]);
    expect(crossbow.attacksPerSecond).toBeCloseTo(0.7, 10);
    expect(crossbow.range).toBe(340);
    expect(crossbow.area).toBe(0);
    expect(crossbow.criticalChance).toBeCloseTo(0.2, 10);
    expect(crossbow.criticalDamage).toBeCloseTo(1.75, 10);
    expect(crossbow.projectiles).toBe(1);
    expect(crossbow.delivery).toBe('straight');
    expect(resolved('War Hammer').criticalChance).toBeCloseTo(0.05, 10);
  });

  it('splits two damage types evenly', () => {
    expect(resolved('Field Cannon').damageParts).toEqual([
      { type: 'Impact', amount: 17.5 },
      { type: 'Fire', amount: 17.5 },
    ]);
  });

  it('applies "up" and "down" stat effects by modifier size', () => {
    expect(resolved('Crossbow', 'Tempered Steel Frame').damage).toBeCloseTo(22, 10);
    const light = resolved('Crossbow', 'Lightweight Frame');
    expect(light.attacksPerSecond).toBeCloseTo(0.7 * 1.2, 10);
    expect(light.damage).toBeCloseTo(18, 10);
    const hammer = resolved('War Hammer', 'Counterweight Assembly');
    expect(hammer.damage).toBeCloseTo(24, 10);
    expect(hammer.attacksPerSecond).toBeCloseTo(0.7 * 0.9, 10);
    const barrel = resolved('Crossbow', 'Reinforced Barrel');
    expect(barrel.range).toBeCloseTo(408, 10);
    expect(barrel.projectileSpeed).toBeCloseTo(840, 10);
    expect(resolved('Mortar', 'Glass Reaction Vessel').area).toBeCloseTo(102, 10);
    expect(resolved('Forged Longsword', 'Sweep Hinge').arcWidth).toBeCloseTo(1.2, 10);
  });

  it('adds component bonuses together, since components are one source type', () => {
    expect(resolved('Crossbow', 'Tempered Steel Frame', 'Iron Bolts').damage).toBeCloseTo(24, 10);
    expect(resolved('Crossbow', 'Lightweight Frame', 'Torsion Spring').attacksPerSecond).toBeCloseTo(0.7 * 1.4, 10);
    const overclock = resolved('Crossbow', 'Tempered Steel Frame', 'Prototype Overclock');
    expect(overclock.damage).toBeCloseTo(20 * 1.45, 10);
    expect(overclock.triggers.jam).toBe(true);
  });

  it('adds the tier value for Critical Chance and the modifier size for Critical Damage', () => {
    expect(resolved('Forged Longsword', 'Damascus Alloy').criticalChance).toBeCloseTo(0.15, 10);
    // Damascus Alloy works on Slashing hits only. The War Hammer deals Impact.
    expect(resolved('War Hammer', 'Damascus Alloy').criticalChance).toBeCloseTo(0.05, 10);
    expect(resolved('Crossbow', 'Precision-Ground Frame').criticalDamage).toBeCloseTo(1.95, 10);
    const sight = resolved('Crossbow', 'Telescopic Sight');
    expect(sight.range).toBeCloseTo(408, 10);
    expect(sight.criticalDamage).toBeCloseTo(1.85, 10);
  });

  it('adds knockback from several sources', () => {
    expect(resolved('Crossbow').knockback).toBe(0);
    expect(resolved('Crossbow', 'Hardwood Stock', 'Pneumatic Bellows').knockback).toBe(30);
  });

  it('adds extra damage types as a share of weapon damage', () => {
    expect(resolved('Crossbow', 'Copper Coil Housing').damageParts).toEqual([
      { type: 'Piercing', amount: 20 },
      { type: 'Electric', amount: 2 },
    ]);
  });

  it('applies a damage bonus tied to one damage type to the matching part', () => {
    const cannon = resolved('Field Cannon', 'Heat Sink Housing');
    expect(cannon.damageParts[0]).toEqual({ type: 'Impact', amount: 17.5 });
    expect(cannon.damageParts[1]?.amount).toBeCloseTo(19.25, 10);
    expect(cannon.statusDurationFor.Burning).toBeCloseTo(1.2, 10);
    expect(cannon.inactive).toEqual([]);
  });

  it('changes projectile counts, penetration and bounces', () => {
    const multishot = resolved('Crossbow', 'Multishot Rack');
    expect(multishot.projectiles).toBe(2);
    expect(multishot.damage).toBeCloseTo(18, 10);
    expect(multishot.spreadDegrees).toBe(8);
    expect(resolved('Crossbow', 'Piercing Rail').penetration).toBe(1);
    const meteoric = resolved('Crossbow', 'Meteoric Iron Frame');
    expect(meteoric.damage).toBeCloseTo(27, 10);
    expect(meteoric.penetration).toBe(1);
    expect(resolved('Crossbow', 'Ricochet Deflector').bounces).toBe(1);
    expect(resolved('Sawblade Launcher', 'Ricochet Deflector').bounces).toBe(4);
    const knives = resolved('Knife Bandolier', 'Multishot Rack');
    expect(knives.projectiles).toBe(4);
    expect(knives.spreadDegrees).toBe(32);
    const steady = resolved('Knife Bandolier', 'Multishot Rack', 'Gyroscopic Stabiliser');
    expect(steady.spreadDegrees).toBe(16);
    expect(steady.homing).toBeGreaterThan(0);
  });

  it('converts the delivery with Spray Nozzle and Orbit Mount', () => {
    const spray = resolved('Firebomb Satchel', 'Spray Nozzle');
    expect(spray.delivery).toBe('cone');
    expect(spray.behaviours).toEqual(['Cone']);
    expect(spray.area).toBeCloseTo(66, 10);
    expect(spray.range).toBeCloseTo(176, 10);
    expect(spray.blast).toBe(false);
    expect(spray.zone).toBeUndefined();
    const orbit = resolved('Crossbow', 'Orbit Mount');
    expect(orbit.delivery).toBe('orbit');
    expect(orbit.behaviours).toEqual(['Orbit']);
    expect(orbit.tags).toContain('Orbit');
  });

  it('changes targeting with the Targeting Lens and the Precise tag', () => {
    expect(resolved('Crossbow').targeting).toBe('Nearest');
    expect(resolved('Crossbow').markedFirst).toBe(false);
    const lens = resolved('Crossbow', 'Targeting Lens');
    expect(lens.targeting).toBe('Highest threat');
    expect(lens.criticalChance).toBeCloseTo(0.25, 10);
    expect(lens.markedFirst).toBe(true);
    expect(resolved('Burning Mirror').markedFirst).toBe(true);
    expect(resolved('Mortar').targeting).toBe('Clustered');
    expect(resolved('Ballista').targeting).toBe('Strongest');
  });

  it('applies the Electromagnetic Accelerator and the Magnetised Core', () => {
    const accelerator = resolved('Crossbow', 'Electromagnetic Accelerator');
    expect(accelerator.projectileSpeed).toBeCloseTo(700 * 1.35, 10);
    expect(accelerator.damage).toBeCloseTo(22, 10);
    expect(accelerator.tags).toContain('Electric');
    const core = resolved('Crossbow', 'Magnetised Core');
    expect(core.homing).toBe(5);
    expect(core.homingProperty).toBe('Metallic');
    expect(core.behaviours).toContain('Homing');
  });

  it('grows the Living Wood Frame one Minimal step per round, capped at High', () => {
    const weapon = arm('Crossbow', 'Living Wood Frame');
    const damageAfter = (rounds: number): number => {
      weapon.components.Structure!.rounds = rounds;
      return resolveLoadout([weapon], BASE_STATS).weapons[0]!.damage;
    };
    expect(damageAfter(0)).toBeCloseTo(20, 10);
    expect(damageAfter(3)).toBeCloseTo(23, 10);
    expect(damageAfter(7)).toBeCloseTo(27, 10);
    expect(damageAfter(20)).toBeCloseTo(27, 10);
  });

  it('adapts the Living Arsenal each round as a separate source type', () => {
    const weapon = arm('Living Arsenal', 'Tempered Steel Frame');
    weapon.rounds = 2;
    // Components give 10 per cent and the weapon gives 10 per cent: different source types multiply.
    expect(resolveLoadout([weapon], BASE_STATS).weapons[0]!.damage).toBeCloseTo(12 * 1.1 * 1.1, 10);
  });

  it('records conditional and construct effects', () => {
    expect(resolved('Crossbow', 'Nerve Fibre Trigger').lowHealthAttackSpeed).toBeCloseTo(0.35, 10);
    expect(resolved('Clockwork Turret', 'Clockwork Chassis').constructHealthFactor).toBeCloseTo(1.2, 10);
    expect(resolved('Clockwork Turret', 'Self-Winding Escapement').constructAttackSpeedFactor).toBeCloseTo(1.2, 10);
    expect(resolved('Clockwork Turret', 'Repair Kit Housing').constructRepair).toBe(true);
  });

  it('lists components waiting for a later milestone', () => {
    expect(resolved('Crossbow', 'Incendiary Oil').inactive).toEqual([]);
    expect(resolved('Crossbow', 'Research Notebook').inactive).toEqual([{ component: 'Research Notebook', activeFrom: 5 }]);
    expect(resolved('Crossbow', 'Tempered Steel Frame').inactive).toEqual([]);
  });

  it('ignores a component left in a closed Auxiliary slot', () => {
    const weapon = arm('Crossbow', 'Telescopic Sight');
    weapon.grade = 1;
    expect(resolveLoadout([weapon], BASE_STATS).weapons[0]!.range).toBe(340);
  });

  it('stacks Chitin Plating into player Armour with diminishing returns', () => {
    const one = resolveLoadout([arm('Crossbow', 'Chitin Plating')], BASE_STATS).playerStats.armour;
    expect(one).toBeCloseTo(0.17647, 4);
    const three = resolveLoadout(
      [arm('Crossbow', 'Chitin Plating'), arm('Pike', 'Chitin Plating'), arm('Mortar', 'Chitin Plating')],
      BASE_STATS,
    ).playerStats.armour;
    expect(three).toBeGreaterThan(one);
    expect(three - one).toBeLessThan(2 * (one - 0.1));
    expect(three).toBeLessThanOrEqual(0.4);
  });
});
