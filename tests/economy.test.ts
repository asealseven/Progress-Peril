import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { COMPONENT_LIST, QUALITIES, componentByName } from '../src/data/components';
import { MERGE_COST, RECIPE_COSTS, UPGRADE_COSTS } from '../src/data/economy';
import { OPENED_BY, RESEARCH_NODES } from '../src/data/research';
import { SHOP_IDS, SHOP_RULES, STOCK_ODDS, shopForComponent, shopForWeapon } from '../src/data/shop';
import { tierValue } from '../src/data/tiers';
import { WEAPONS, WEAPON_LIST, weaponByName } from '../src/data/weapons';
import {
  buildComponent,
  buildProblem,
  buyItem,
  buyProblem,
  createShopWeapon,
  dismantleComponent,
  dismantleReturn,
  dismantleWeapon,
  equipFromReserve,
  installFromInventory,
  itemName,
  materialFor,
  mergeProblem,
  mergeWeapons,
  openShop,
  recipeCost,
  recipes,
  removeToInventory,
  rerollCost,
  rerollShop,
  shopPrice,
  shopRerollCost,
  territoryPriceFactor,
  unequipWeapon,
  upgradeChoices,
  upgradeCost,
  upgradeProblem,
  upgradeWeapon,
  visitFee,
} from '../src/sim/economy';
import type { ShopItem } from '../src/sim/economy';
import { auxiliaryOpen, createComponent, createWeapon, resolveLoadout } from '../src/sim/loadout';
import { Rng } from '../src/sim/rng';
import { createRun } from '../src/sim/run';
import type { RunState } from '../src/sim/run';
import { BASE_STATS } from './helpers';

function rich(round = 1, gold = 100000): RunState {
  const run = createRun(77, CHARACTERS.inventor, WEAPONS.crossbow);
  run.round = round;
  run.gold = gold;
  run.materials = { Scrap: 500, Reagents: 500, Crystals: 500, Specimens: 500 };
  return run;
}

/** Researches the node an item waits for, with no cost. */
function open(run: RunState, item: string): void {
  const node = OPENED_BY.get(item);
  if (node && !run.research.researched.includes(node.id)) run.research.researched.push(node.id);
}

function ringNode(ring: 'Middle' | 'Outer'): string {
  const node = RESEARCH_NODES.find((entry) => entry.ring === ring);
  if (!node) throw new Error(ring);
  return node.id;
}

function part(name: string) {
  const def = componentByName(name);
  if (!def) throw new Error(name);
  return def;
}

describe('shop prices (GDD 6.5, 6.6)', () => {
  it('uses the Territory 1 base prices', () => {
    expect(QUALITIES.map((quality) => shopPrice('component', quality, 0))).toEqual([25, 45, 75, 120, 180]);
    expect(QUALITIES.map((quality) => shopPrice('weapon', quality, 0))).toEqual([40, 70, 110, 160, 220]);
  });

  it('raises prices 20 per cent per territory', () => {
    expect([0, 1, 2].map(territoryPriceFactor)).toEqual([1, 1.2, 1.4]);
    expect(shopPrice('component', 'Common', 1)).toBe(30);
    expect(shopPrice('component', 'Common', 2)).toBe(35);
    expect(shopPrice('weapon', 'Extraordinary', 2)).toBe(308);
    // Endless mode adds a further 20 per cent with each new territory.
    expect(territoryPriceFactor(3)).toBeCloseTo(1.6);
  });

  it('prices rerolls at 5 gold, rising by 5 per reroll in a visit, with free rerolls first', () => {
    expect([0, 1, 2, 3].map((count) => rerollCost(count))).toEqual([5, 10, 15, 20]);
    expect([0, 1, 2].map((count) => rerollCost(count, 1))).toEqual([0, 5, 10]);
  });
});

describe('shop visits (GDD 6.1, 6.4, 6.5)', () => {
  it('charges 20 gold for a paid visit and shows 5 items', () => {
    const run = rich(1, 100);
    expect(visitFee(run, 'blacksmith')).toBe(20);
    expect(openShop(run, 'blacksmith')).toBeUndefined();
    expect(run.gold).toBe(80);
    expect(run.shops.blacksmith.stock).toHaveLength(SHOP_RULES.paidSlots);
    expect(run.shops.blacksmith.stock.every((item) => item !== undefined)).toBe(true);
    // The door stays open for this preparation phase at no further cost.
    expect(visitFee(run, 'blacksmith')).toBe(0);
    expect(openShop(run, 'blacksmith')).toBeUndefined();
    expect(run.gold).toBe(80);
  });

  it('refuses a visit without the gold', () => {
    const run = rich(1, 19);
    expect(openShop(run, 'alchemist')).toBe('no-gold');
    expect(run.shops.alchemist.visit).toBeUndefined();
  });

  it('opens one shop of the player choice on a free visit, with 6 items and one Rare or better', () => {
    for (let seed = 0; seed < 20; seed++) {
      const run = rich(4, 100);
      run.shops.alchemist.rolls = seed;
      run.freeVisit = true;
      expect(visitFee(run, 'alchemist')).toBe(0);
      openShop(run, 'alchemist');
      expect(run.gold).toBe(100);
      expect(run.freeVisit).toBe(false);
      const stock = run.shops.alchemist.stock;
      expect(stock).toHaveLength(SHOP_RULES.freeSlots);
      expect(stock.some((item) => item && QUALITIES.indexOf(item.quality) >= 2)).toBe(true);
      // A second shop in the same phase costs gold.
      expect(visitFee(run, 'blacksmith')).toBe(20);
    }
  });

  it('keeps an independent inventory per shop', () => {
    const run = rich();
    openShop(run, 'blacksmith');
    openShop(run, 'alchemist');
    const before = JSON.stringify(run.shops.alchemist.stock.map((item) => item && item.price));
    rerollShop(run, 'blacksmith');
    buyItem(run, 'blacksmith', 0);
    expect(JSON.stringify(run.shops.alchemist.stock.map((item) => item && item.price))).toBe(before);
  });

  it('stocks each shop by GDD 6.6', () => {
    for (const weapon of WEAPON_LIST) {
      const shop = shopForWeapon(weapon);
      if (['Melee', 'Ranged', 'Siege'].includes(weapon.family)) expect(shop).toBe('blacksmith');
      if (weapon.family === 'Alchemical') expect(shop).toBe('alchemist');
      if (['Mechanical', 'Experimental'].includes(weapon.family)) expect(shop).toBe('royal-inventor');
    }
    for (const component of COMPONENT_LIST) {
      const shop = shopForComponent(component);
      if (component.slot === 'Payload') expect(shop).toBe('alchemist');
      if (component.slot === 'Auxiliary') expect(shop).toBe('royal-inventor');
    }
    expect(shopForComponent(part('Tempered Steel Frame'))).toBe('blacksmith');
    // Every shop stocks components and weapons.
    for (const id of SHOP_IDS) {
      expect(COMPONENT_LIST.some((component) => shopForComponent(component) === id)).toBe(true);
      expect(WEAPON_LIST.some((weapon) => shopForWeapon(weapon) === id)).toBe(true);
    }
    const run = rich();
    for (const id of SHOP_IDS) {
      for (let i = 0; i < 12; i++) {
        if (i === 0) openShop(run, id);
        else rerollShop(run, id);
        for (const item of run.shops[id].stock) {
          if (!item) continue;
          if (item.kind === 'component') expect(shopForComponent(item.def)).toBe(id);
          else expect(shopForWeapon(item.weapon.def)).toBe(id);
        }
      }
    }
  });

  it('shows few repeats inside one visit', () => {
    let repeats = 0;
    let slots = 0;
    for (let seed = 0; seed < 60; seed++) {
      const run = rich(8);
      run.shops.blacksmith.rolls = seed;
      openShop(run, 'blacksmith');
      const names = run.shops.blacksmith.stock.map((item) => (item?.kind === 'component' ? item.def.name : item?.weapon.def.name));
      repeats += names.length - new Set(names).size;
      slots += names.length;
    }
    expect(repeats / slots).toBeLessThan(0.02);
  });

  it('follows the stock odds of the territory', () => {
    const counts = (round: number): number[] => {
      const run = rich(round);
      const found = QUALITIES.map(() => 0);
      openShop(run, 'blacksmith');
      for (let i = 0; i < 400; i++) {
        rerollShop(run, 'blacksmith');
        for (const item of run.shops.blacksmith.stock) {
          if (item && item.kind === 'weapon') found[QUALITIES.indexOf(item.quality)]!++;
        }
      }
      const total = found.reduce((sum, count) => sum + count, 0);
      return found.map((count) => (count / total) * 100);
    };
    // Weapons appear at any quality, so their share follows the odds table.
    const first = counts(1);
    const third = counts(15);
    expect(first[0]).toBeGreaterThan(50);
    expect(first[4]).toBe(0);
    expect(third[0]).toBeLessThan(35);
    expect(third[2]).toBeGreaterThan(first[2]!);
    expect(third[4]).toBeGreaterThan(0);
    for (const odds of STOCK_ODDS) expect(odds.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('prices stock by quality and territory', () => {
    for (const round of [1, 8, 15]) {
      const run = rich(round);
      openShop(run, 'royal-inventor');
      const territory = Math.floor((round - 1) / 7);
      for (const item of [...run.shops['royal-inventor'].stock, run.shops['royal-inventor'].specialist]) {
        if (item) expect(item.price).toBe(shopPrice(item.kind, item.quality, territory));
      }
    }
  });

  it('rerolls every slot for a rising price and keeps the specialist slot', () => {
    const run = rich(1, 100);
    openShop(run, 'blacksmith');
    buyItem(run, 'blacksmith', 0);
    const gold = run.gold;
    const specialist = run.shops.blacksmith.specialist;
    expect(specialist).toBeDefined();
    expect(shopRerollCost(run, 'blacksmith')).toBe(5);
    expect(rerollShop(run, 'blacksmith')).toBeUndefined();
    expect(run.gold).toBe(gold - 5);
    expect(run.shops.blacksmith.stock.every((item) => item !== undefined)).toBe(true);
    expect(run.shops.blacksmith.specialist).toBe(specialist);
    expect(shopRerollCost(run, 'blacksmith')).toBe(10);
    rerollShop(run, 'blacksmith');
    expect(run.gold).toBe(gold - 15);
    // Free rerolls from the Grand Archive apply first.
    const archive = rich(1, 100);
    archive.freeRerolls = 1;
    openShop(archive, 'blacksmith');
    rerollShop(archive, 'blacksmith');
    expect(archive.gold).toBe(80);
    expect(shopRerollCost(archive, 'blacksmith')).toBe(5);
  });

  it('keeps the specialist slot across visits until bought', () => {
    const run = rich(2);
    openShop(run, 'alchemist');
    const specialist = run.shops.alchemist.specialist;
    expect(specialist && QUALITIES.indexOf(specialist.quality)).toBeGreaterThanOrEqual(2);
    // A new preparation phase: the door shuts and the stock rotates.
    run.shops.alchemist.visit = undefined;
    run.shops.alchemist.stock = [];
    openShop(run, 'alchemist');
    expect(run.shops.alchemist.specialist).toBe(specialist);
    // The specialist item waits for its research node (GDD 8.10).
    open(run, specialist ? itemName(specialist) : '');
    expect(buyItem(run, 'alchemist', 'specialist')).toBeUndefined();
    expect(run.shops.alchemist.specialist).toBeUndefined();
    run.shops.alchemist.visit = undefined;
    openShop(run, 'alchemist');
    expect(run.shops.alchemist.specialist).toBeDefined();
    expect(run.shops.alchemist.specialist).not.toBe(specialist);
  });

  it('moves a bought component to the tray and a bought weapon to a free slot or the reserve', () => {
    const run = rich();
    const component: ShopItem = { kind: 'component', def: part('Tempered Steel Frame'), quality: 'Common', price: 25 };
    const weapon = (): ShopItem => ({
      kind: 'weapon',
      weapon: createWeapon(weaponByName('Pike')!),
      quality: 'Common',
      price: 40,
    });
    openShop(run, 'blacksmith');
    run.shops.blacksmith.stock = [component, weapon(), weapon(), weapon()];
    const gold = run.gold;
    for (let slot = 0; slot < 4; slot++) expect(buyItem(run, 'blacksmith', slot)).toBeUndefined();
    expect(run.gold).toBe(gold - 25 - 120);
    expect(run.inventory.map((entry) => entry.def.name)).toEqual(['Tempered Steel Frame']);
    expect(run.weapons).toHaveLength(3);
    expect(run.reserve).toHaveLength(1);
    expect(buyItem(run, 'blacksmith', 0)).toBe('sold');
  });

  it('refuses a purchase without the gold', () => {
    const run = rich(1, 30);
    openShop(run, 'blacksmith');
    run.shops.blacksmith.stock = [{ kind: 'component', def: part('Tempered Steel Frame'), quality: 'Common', price: 25 }];
    expect(buyProblem(run, 'blacksmith', 0)).toBe('no-gold');
    expect(buyItem(run, 'blacksmith', 0)).toBe('no-gold');
    expect(run.inventory).toHaveLength(0);
  });

  it('caps a visit at 2 Experimental items, 1 Extraordinary item and 100 purchases', () => {
    const run = rich();
    openShop(run, 'royal-inventor');
    const item = (quality: 'Experimental' | 'Extraordinary' | 'Common'): ShopItem => ({
      kind: 'component',
      def: part('Tempered Steel Frame'),
      quality,
      price: 1,
    });
    run.shops['royal-inventor'].stock = [
      item('Experimental'),
      item('Experimental'),
      item('Experimental'),
      item('Extraordinary'),
      item('Extraordinary'),
    ];
    expect(buyItem(run, 'royal-inventor', 0)).toBeUndefined();
    expect(buyItem(run, 'royal-inventor', 1)).toBeUndefined();
    expect(buyItem(run, 'royal-inventor', 2)).toBe('experimental-cap');
    expect(buyItem(run, 'royal-inventor', 3)).toBeUndefined();
    expect(buyItem(run, 'royal-inventor', 4)).toBe('extraordinary-cap');
    // A reroll restocks the slots. The caps of the visit stay.
    run.shops['royal-inventor'].stock = [item('Experimental'), item('Common')];
    expect(buyItem(run, 'royal-inventor', 0)).toBe('experimental-cap');
    run.shops['royal-inventor'].visit!.purchases = SHOP_RULES.purchasesPerVisit;
    expect(buyItem(run, 'royal-inventor', 1)).toBe('purchase-limit');
  });
});

describe('weapon quality (GDD 7.17)', () => {
  it('adds stat steps and default components by quality, not a new identity', () => {
    const def = weaponByName('Crossbow')!;
    const common = createShopWeapon(def, 'Common', new Rng(1));
    expect(common.qualitySteps).toEqual([]);
    expect(Object.keys(common.components)).toHaveLength(0);
    const rare = createShopWeapon(def, 'Rare', new Rng(1));
    expect(rare.def).toBe(def);
    expect(rare.qualitySteps).toHaveLength(1);
    expect(Object.values(rare.components)).toHaveLength(1);
    const extraordinary = createShopWeapon(def, 'Extraordinary', new Rng(1));
    expect(extraordinary.qualitySteps).toHaveLength(2);
    const defaults = Object.values(extraordinary.components);
    expect(defaults).toHaveLength(2);
    // Default components scrap for no materials (GDD 7.12).
    for (const component of defaults) {
      expect(component.isDefault).toBe(true);
      expect(dismantleReturn(component).amount).toBe(0);
    }
  });
});

describe('weapon grades (GDD 7.8, 7.22)', () => {
  it('costs 25, 50, 90 and 140 gold with 2, 4, 6 and 8 Scrap', () => {
    expect([0, 1, 2, 3].map(upgradeCost)).toEqual([
      { gold: 25, scrap: 2 },
      { gold: 50, scrap: 4 },
      { gold: 90, scrap: 6 },
      { gold: 140, scrap: 8 },
    ]);
    expect(upgradeCost(4)).toBeUndefined();
    // Upgrading all three weapons to Grade IV costs 915 gold.
    expect(3 * UPGRADE_COSTS.reduce((sum, cost) => sum + cost.gold, 0)).toBe(915);
  });

  it('buys grades in order, up to Grade IV, and opens the Auxiliary slot at Grade III', () => {
    const run = rich(1, 305);
    run.materials.Scrap = 20;
    const weapon = run.weapons[0]!;
    expect(weapon.grade).toBe(0);
    // Grades III and IV wait for a middle-ring and an outer-ring node (GDD 8.10).
    run.research.researched.push(ringNode('Middle'), ringNode('Outer'));
    for (let grade = 1; grade <= 4; grade++) {
      expect(auxiliaryOpen(weapon)).toBe(grade > 3);
      expect(upgradeWeapon(run, weapon, 'damage')).toBeUndefined();
      expect(weapon.grade).toBe(grade);
    }
    expect(auxiliaryOpen(weapon)).toBe(true);
    expect(run.gold).toBe(0);
    expect(run.materials.Scrap).toBe(0);
    expect(upgradeWeapon(run, weapon, 'damage')).toBe('max-grade');
  });

  it('needs the gold and the Scrap', () => {
    const run = rich(1, 24);
    expect(upgradeProblem(run, run.weapons[0]!, 'damage')).toBe('no-gold');
    run.gold = 25;
    run.materials.Scrap = 1;
    expect(upgradeProblem(run, run.weapons[0]!, 'damage')).toBe('no-materials');
    // Other materials never pay for a grade.
    expect(run.materials.Crystals).toBe(500);
  });

  it('grants one stat step in the chosen category', () => {
    const stats = (upgrade?: Parameters<typeof upgradeWeapon>[2]) => {
      const run = rich();
      if (upgrade) upgradeWeapon(run, run.weapons[0]!, upgrade);
      return resolveLoadout(run.weapons, BASE_STATS).weapons[0]!;
    };
    const base = stats();
    // The Crossbow: Damage High, Attack Speed Low, Range High, single target, Critical Chance High.
    expect(base.damage).toBe(tierValue('weaponDamage', 'High'));
    expect(stats('damage').damage).toBe(tierValue('weaponDamage', 'Extreme'));
    expect(stats('attackSpeed').attacksPerSecond).toBe(tierValue('weaponAttackSpeed', 'Medium'));
    expect(stats('range').range).toBe(tierValue('weaponRange', 'Extreme'));
    expect(stats('area').area).toBe(tierValue('weaponArea', 'Low'));
    expect(stats('criticalChance').criticalChance).toBe(tierValue('criticalChance', 'Extreme'));
    expect(stats('damage').attacksPerSecond).toBe(base.attacksPerSecond);
  });

  it('keeps stepping past Extreme by the ratio of the last two tiers', () => {
    const run = rich();
    const weapon = run.weapons[0]!;
    upgradeWeapon(run, weapon, 'damage');
    upgradeWeapon(run, weapon, 'damage');
    expect(resolveLoadout(run.weapons, BASE_STATS).weapons[0]!.damage).toBeCloseTo(35 * (35 / 20));
  });

  it('offers Status Build-up only to weapons building a status', () => {
    expect(upgradeChoices(createWeapon(weaponByName('Crossbow')!))).not.toContain('statusBuildUp');
    const run = rich();
    run.weapons = [createWeapon(weaponByName('War Hammer')!)];
    const weapon = run.weapons[0]!;
    expect(upgradeChoices(weapon)).toContain('statusBuildUp');
    const before = resolveLoadout(run.weapons, BASE_STATS).weapons[0]!.statusBuilds[0]!.share;
    expect(upgradeWeapon(run, weapon, 'statusBuildUp')).toBeUndefined();
    expect(resolveLoadout(run.weapons, BASE_STATS).weapons[0]!.statusBuilds[0]!.share).toBeGreaterThan(before);
    const crossbow = rich();
    expect(upgradeWeapon(crossbow, crossbow.weapons[0]!, 'statusBuildUp')).toBe('no-effect');
  });
});

describe('recipes and dismantling (GDD 7.9, 7.23)', () => {
  it('costs 10, 20, 35 and 60 gold with 2, 4, 7 and 9 materials', () => {
    expect(QUALITIES.map((quality) => RECIPE_COSTS[quality])).toEqual([
      { gold: 10, materials: 2 },
      { gold: 20, materials: 4 },
      { gold: 35, materials: 7 },
      { gold: 60, materials: 9 },
      undefined,
    ]);
  });

  it('sets the material type by the first matching tag', () => {
    expect(materialFor(['Metallic'])).toBe('Scrap');
    expect(materialFor(['Fire', 'Metallic'])).toBe('Reagents');
    expect(materialFor(['Precise'])).toBe('Crystals');
    expect(materialFor(['Biological'])).toBe('Specimens');
    expect(materialFor(['Projectile'])).toBe('Scrap');
  });

  it('builds a component for gold and materials', () => {
    const run = rich(1, 10);
    run.materials = { Scrap: 2, Reagents: 0, Crystals: 0, Specimens: 0 };
    const frame = part('Tempered Steel Frame');
    expect(recipeCost(frame)).toEqual({ gold: 10, material: 'Scrap', amount: 2 });
    expect(buildComponent(run, frame)).toBeUndefined();
    expect(run.gold).toBe(0);
    expect(run.materials.Scrap).toBe(0);
    expect(run.inventory.map((entry) => entry.def)).toEqual([frame]);
    expect(buildProblem(run, frame)).toBe('no-gold');
    run.gold = 10;
    expect(buildProblem(run, frame)).toBe('no-materials');
  });

  it('never builds Extraordinary components', () => {
    const extraordinary = COMPONENT_LIST.filter((component) => component.quality === 'Extraordinary');
    expect(extraordinary.length).toBeGreaterThan(0);
    for (const component of extraordinary) {
      expect(buildProblem(rich(), component)).toBe('not-buildable');
      expect(recipes()).not.toContain(component);
    }
    expect(recipes().length).toBe(COMPONENT_LIST.length - extraordinary.length);
  });

  it('costs less gold to build than to buy', () => {
    for (const component of recipes()) {
      expect(recipeCost(component)!.gold).toBeLessThan(shopPrice('component', component.quality, 0));
    }
  });

  it('returns 1 to 5 materials when dismantled, 43 to 50 per cent of the recipe', () => {
    const returns = QUALITIES.map((quality) => {
      const def = COMPONENT_LIST.find((component) => component.quality === quality)!;
      return dismantleReturn(createComponent(def)).amount;
    });
    expect(returns).toEqual([1, 2, 3, 4, 5]);
    for (const component of recipes()) {
      const share = dismantleReturn(createComponent(component)).amount / recipeCost(component)!.amount;
      expect(share).toBeGreaterThanOrEqual(0.42);
      expect(share).toBeLessThanOrEqual(0.5);
    }
    const run = rich();
    run.materials.Scrap = 0;
    const owned = createComponent(part('Tempered Steel Frame'));
    run.inventory.push(owned);
    expect(dismantleComponent(run, owned)).toBeUndefined();
    expect(run.inventory).toHaveLength(0);
    expect(run.materials.Scrap).toBe(1);
  });
});

describe('workbench (GDD 7.12, 15.8)', () => {
  it('installs from the tray and returns the replaced component to the tray', () => {
    const run = rich();
    const weapon = run.weapons[0]!;
    const frame = createComponent(part('Tempered Steel Frame'));
    const light = createComponent(part('Lightweight Frame'));
    run.inventory.push(frame, light);
    expect(installFromInventory(run, weapon, frame)).toBeUndefined();
    expect(weapon.components.Structure).toBe(frame);
    expect(run.inventory).toEqual([light]);
    expect(installFromInventory(run, weapon, light)).toBeUndefined();
    expect(weapon.components.Structure).toBe(light);
    expect(run.inventory).toEqual([frame]);
    expect(removeToInventory(run, weapon, 'Structure')).toBeUndefined();
    expect(weapon.components.Structure).toBeUndefined();
    expect(run.inventory).toHaveLength(2);
  });

  it('keeps the slot rules: family fit and the Auxiliary padlock', () => {
    const run = rich();
    const weapon = run.weapons[0]!;
    const hinge = createComponent(part('Sweep Hinge'));
    const sight = createComponent(part('Telescopic Sight'));
    run.inventory.push(hinge, sight);
    expect(installFromInventory(run, weapon, hinge)).toBe('wrong-family');
    expect(installFromInventory(run, weapon, sight)).toBe('auxiliary-closed');
    expect(run.inventory).toHaveLength(2);
    weapon.grade = 3;
    expect(installFromInventory(run, weapon, sight)).toBeUndefined();
  });
});

describe('merging (GDD 7.10, 7.23)', () => {
  it('combines two copies for 50 gold: the chosen weapon survives with its components and grade', () => {
    const run = rich(1, 60);
    const survivor = run.weapons[0]!;
    survivor.grade = 2;
    survivor.components.Structure = createComponent(part('Tempered Steel Frame'));
    expect(mergeProblem(run, survivor)).toBe('no-copy');
    const copy = createWeapon(WEAPONS.crossbow);
    copy.components.Mechanism = createComponent(part('Ratchet Repeater'));
    run.reserve.push(copy);
    const before = resolveLoadout([survivor], BASE_STATS).weapons[0]!.damage;
    expect(mergeWeapons(run, survivor)).toBeUndefined();
    expect(run.gold).toBe(60 - MERGE_COST);
    expect(run.reserve).toHaveLength(0);
    expect(run.weapons).toEqual([survivor]);
    expect(survivor.grade).toBe(2);
    expect(survivor.merges).toBe(1);
    expect(survivor.components.Structure?.def.name).toBe('Tempered Steel Frame');
    // The scrapped weapon's component returns to the tray.
    expect(run.inventory.map((entry) => entry.def.name)).toEqual(['Ratchet Repeater']);
    // Improved base statistics, and the first merge opens the Auxiliary slot.
    expect(resolveLoadout([survivor], BASE_STATS).weapons[0]!.damage).toBeCloseTo(before * 1.1);
    expect(auxiliaryOpen(survivor)).toBe(true);
    run.reserve.push(createWeapon(WEAPONS.crossbow));
    expect(mergeProblem(run, survivor)).toBe('no-gold');
  });

  it('never merges two different weapons', () => {
    const run = rich();
    run.reserve.push(createWeapon(weaponByName('Pike')!));
    expect(mergeWeapons(run, run.weapons[0]!)).toBe('no-copy');
  });
});

describe('equipment management (GDD 3.3)', () => {
  it('swaps weapons between the three slots and the reserve', () => {
    const run = rich();
    const pike = createWeapon(weaponByName('Pike')!);
    run.reserve.push(pike);
    const crossbow = run.weapons[0]!;
    expect(equipFromReserve(run, pike, 0)).toBeUndefined();
    expect(run.weapons).toEqual([pike]);
    expect(run.reserve).toEqual([crossbow]);
    expect(equipFromReserve(run, crossbow, 1)).toBeUndefined();
    expect(run.weapons).toEqual([pike, crossbow]);
    expect(unequipWeapon(run, crossbow)).toBeUndefined();
    expect(unequipWeapon(run, pike)).toBe('last-weapon');
  });

  it('dismantles a weapon for materials, returns its components and keeps the last weapon', () => {
    const run = rich();
    run.materials.Scrap = 0;
    const crossbow = run.weapons[0]!;
    expect(dismantleWeapon(run, crossbow)).toBe('last-weapon');
    const pike = createWeapon(weaponByName('Pike')!);
    pike.components.Structure = createComponent(part('Tempered Steel Frame'));
    pike.components.Mechanism = createComponent(part('Counterweight Assembly'), true);
    run.weapons.push(pike);
    expect(dismantleWeapon(run, pike)).toBeUndefined();
    expect(run.weapons).toEqual([crossbow]);
    expect(run.materials.Scrap).toBe(1);
    // Default components leave with the weapon.
    expect(run.inventory.map((entry) => entry.def.name)).toEqual(['Tempered Steel Frame']);
  });
});
