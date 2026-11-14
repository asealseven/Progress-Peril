// Gold, materials, prices, shop stock, upgrades, recipes, dismantling and
// merging (GDD 6.1 to 6.6, 7.8 to 7.10, 7.22, 7.23). Plain rules on the run
// state. The Preparation scene calls these and draws the result.

import { relicRuleTotal } from '../data/relics';
import type { RelicId } from '../data/relics';
import { COMPONENT_LIST, QUALITIES, SCRAP_RETURN, componentFitsFamily } from '../data/components';
import type { ComponentDef, Quality, SlotType } from '../data/components';
import {
  ECONOMY_RULES,
  MATERIALS,
  MATERIAL_TAGS,
  MAX_GRADE,
  MERGE_COST,
  RECIPE_COSTS,
  UPGRADE_COSTS,
} from '../data/economy';
import type { Material, UpgradeStat } from '../data/economy';
import { roundKind, territoryIndex } from '../data/rounds';
import { SHOP_IDS, SHOP_PRICES, SHOP_RULES, STOCK_ODDS, shopForComponent, shopForWeapon } from '../data/shop';
import type { ShopId } from '../data/shop';
import { WEAPON_LIST } from '../data/weapons';
import type { WeaponDef } from '../data/weapons';
import {
  WEAPON_SLOTS,
  auxiliaryOpen,
  createComponent,
  createWeapon,
  installProblem,
  weaponStatusBuilds,
} from './loadout';
import type { ComponentInstance, WeaponGrade, WeaponInstance } from './loadout';
import { Rng } from './rng';
import { gradeOpen, hasRule, itemLockedBy } from './research';
import type { RunState } from './run';

// --- Prices (GDD 6.5, 6.6) ---------------------------------------------------------

/** Shop prices rise 20 per cent per territory: 100, 120 and 140 per cent of base. */
export function territoryPriceFactor(territory: number): number {
  return 1 + SHOP_RULES.territoryPriceGrowth * Math.max(0, territory);
}

export function shopPrice(kind: 'component' | 'weapon', quality: Quality, territory: number): number {
  return Math.round(SHOP_PRICES[quality][kind] * territoryPriceFactor(territory));
}

/** Rerolls cost 5 gold, rising by 5 with each reroll in the same visit. Free rerolls apply first. */
export function rerollCost(rerollsThisVisit: number, freeRerolls = 0): number {
  const paid = rerollsThisVisit - freeRerolls;
  if (paid < 0) return 0;
  return SHOP_RULES.rerollBase + SHOP_RULES.rerollStep * paid;
}

/** Gold and Scrap for the next grade, or undefined at Grade IV (GDD 7.22). Prices never rise with territory. */
export function upgradeCost(grade: number): { gold: number; scrap: number } | undefined {
  return grade >= MAX_GRADE ? undefined : UPGRADE_COSTS[grade];
}

/** The first matching tag sets the material type (GDD 7.23). Items with no listed tag use Scrap. */
export function materialFor(tags: readonly string[]): Material {
  for (const tag of tags) {
    for (const material of MATERIALS) {
      if (MATERIAL_TAGS[material].includes(tag)) return material;
    }
  }
  return 'Scrap';
}

/** Materials a component returns when dismantled (GDD 7.9). Default components return nothing. */
export function dismantleReturn(component: ComponentInstance): { material: Material; amount: number } {
  return {
    material: materialFor(component.def.tags),
    amount: component.isDefault ? 0 : SCRAP_RETURN[component.def.quality],
  };
}

/** Recipe gold and materials. Assembly Blueprints halve the gold (GDD 5.12). */
export function recipeCost(
  def: ComponentDef,
  relics: readonly RelicId[] = [],
): { gold: number; material: Material; amount: number } | undefined {
  const cost = RECIPE_COSTS[def.quality];
  if (!cost) return undefined;
  const half = relicRuleTotal(relics, 'recipeHalfGold');
  return { gold: Math.round(cost.gold * (1 - half)), material: materialFor(def.tags), amount: cost.materials };
}

/** Shop prices after the Royal Writ (GDD 5.12). */
function relicPrice(run: RunState, price: number): number {
  const discount = relicRuleTotal(run.relics, 'shopDiscount');
  return discount > 0 ? Math.round(price * (1 - discount)) : price;
}

// --- Research gates ----------------------------------------------------------------

/**
 * The research node an item still needs, or undefined when the run may buy
 * and build the item (GDD 8.10).
 */
export function lockedBy(run: RunState, item: ComponentDef | WeaponDef): string | undefined {
  return itemLockedBy(run, item.name);
}

// --- Ledger ------------------------------------------------------------------------

/** Economy per round, for the debug logger and the comparison with GDD 14.3. */
export interface RoundLedger {
  round: number;
  kills: number;
  goldEarned: number;
  goldSpent: number;
  materialsEarned: number;
  materialsSpent: number;
  componentsFound: number;
  /** Research Points earned in the round and spent in the preparation after. */
  researchEarned: number;
}

/** The ledger entry of the round just played: spending in preparation counts toward the round before. */
function ledger(run: RunState): RoundLedger {
  const last = run.ledger[run.ledger.length - 1];
  if (last) return last;
  const entry: RoundLedger = {
    round: 0,
    kills: 0,
    goldEarned: 0,
    goldSpent: 0,
    materialsEarned: 0,
    materialsSpent: 0,
    componentsFound: 0,
    researchEarned: 0,
  };
  run.ledger.push(entry);
  return entry;
}

function spendGold(run: RunState, amount: number): void {
  run.gold -= amount;
  ledger(run).goldSpent += amount;
}

function spendMaterial(run: RunState, material: Material, amount: number): void {
  run.materials[material] -= amount;
  ledger(run).materialsSpent += amount;
}

// --- Shops (GDD 6.1 to 6.6) --------------------------------------------------------

export type ShopItem =
  | { readonly kind: 'component'; readonly def: ComponentDef; readonly quality: Quality; readonly price: number }
  | { readonly kind: 'weapon'; readonly weapon: WeaponInstance; readonly quality: Quality; readonly price: number };

export function itemName(item: ShopItem): string {
  return item.kind === 'component' ? item.def.name : item.weapon.def.name;
}

export interface ShopVisit {
  readonly free: boolean;
  rerolls: number;
  purchases: number;
  experimental: number;
  extraordinary: number;
}

export interface ShopState {
  readonly id: ShopId;
  /** General rotating stock. A sold slot holds undefined until a reroll. */
  stock: Array<ShopItem | undefined>;
  /** The persistent specialist slot, kept across visits until bought (GDD 6.5). */
  specialist: ShopItem | undefined;
  /** The visit of this preparation phase. Undefined while the door stays shut. */
  visit: ShopVisit | undefined;
  /** Stock rolls so far, for a fresh seed each time. */
  rolls: number;
  /** Perfect Information shows the stock before the door opens (GDD 8.12). */
  previewed: boolean;
}

export function createShops(): Record<ShopId, ShopState> {
  const shop = (id: ShopId): ShopState => ({ id, stock: [], specialist: undefined, visit: undefined, rolls: 0, previewed: false });
  return { blacksmith: shop('blacksmith'), alchemist: shop('alchemist'), 'royal-inventor': shop('royal-inventor') };
}

function rollQuality(odds: readonly number[], rng: Rng, atLeast = 0): Quality {
  let total = 0;
  for (let index = atLeast; index < odds.length; index++) total += odds[index] ?? 0;
  let roll = rng.range(0, total);
  for (let index = atLeast; index < odds.length; index++) {
    roll -= odds[index] ?? 0;
    if (roll < 0) return QUALITIES[index] ?? 'Common';
  }
  return QUALITIES[Math.max(atLeast, 0)] ?? 'Common';
}

/** Builds a weapon at a quality: stat steps and default components by quality (GDD 7.17). */
export function createShopWeapon(def: WeaponDef, quality: Quality, rng: Rng): WeaponInstance {
  const weapon = createWeapon(def);
  weapon.quality = quality;
  const stats: UpgradeStat[] = ['damage', 'attackSpeed', 'range'];
  for (let i = 0; i < ECONOMY_RULES.qualitySteps[quality]; i++) weapon.qualitySteps.push(rng.pick(stats));
  const slots: SlotType[] = ['Structure', 'Mechanism', 'Payload'];
  for (let i = 0; i < ECONOMY_RULES.qualityDefaults[quality] && slots.length > 0; i++) {
    const slot = slots.splice(rng.int(0, slots.length - 1), 1)[0];
    const choices = COMPONENT_LIST.filter(
      (component) => component.slot === slot && component.quality === 'Common' && componentFitsFamily(component, def.family),
    );
    if (slot && choices.length > 0) weapon.components[slot] = createComponent(rng.pick(choices), true);
  }
  return weapon;
}

/** One stock item for a shop at a rolled quality. Steps down in quality when the shop holds nothing there. */
function rollItem(
  run: RunState,
  shopId: ShopId,
  quality: Quality,
  territory: number,
  rng: Rng,
  milestone: boolean,
): ShopItem | undefined {
  const weapons = WEAPON_LIST.filter((weapon) => shopForWeapon(weapon) === shopId);
  for (let index = QUALITIES.indexOf(quality); index >= 0; index--) {
    const rolled = QUALITIES[index] ?? 'Common';
    const components = COMPONENT_LIST.filter(
      (component) =>
        component.quality === rolled &&
        shopForComponent(component) === shopId &&
        // An Extraordinary component needs its outer node and a free milestone shop (GDD 6.6, 8.12).
        // Other locked items show with the node's name.
        (rolled !== 'Extraordinary' || (milestone && !lockedBy(run, component))),
    );
    const wantComponent =
      components.length > 0 &&
      (weapons.length === 0 || rolled === 'Extraordinary' || rng.chance(ECONOMY_RULES.componentShare));
    if (wantComponent) {
      return { kind: 'component', def: rng.pick(components), quality: rolled, price: relicPrice(run, shopPrice('component', rolled, territory)) };
    }
    if (weapons.length > 0) {
      const weapon = createShopWeapon(rng.pick(weapons), rolled, rng);
      return { kind: 'weapon', weapon, quality: rolled, price: relicPrice(run, shopPrice('weapon', rolled, territory)) };
    }
  }
  return undefined;
}

function stockOdds(run: RunState, free: boolean): readonly number[] {
  // Free milestone visits use the odds of the next territory (GDD 6.6).
  const territory = Math.min(STOCK_ODDS.length - 1, territoryIndex(run.round) + (free ? 1 : 0));
  return STOCK_ODDS[territory] ?? STOCK_ODDS[0] ?? [100, 0, 0, 0, 0];
}

/** Restocks every slot of a shop. Free visits show six items, with one Rare or better. */
function rollStock(run: RunState, shop: ShopState, free: boolean): void {
  const rng = new Rng(run.seed).fork(7000 + SHOP_IDS.indexOf(shop.id) * 1000 + shop.rolls++);
  const territory = territoryIndex(run.round);
  const odds = stockOdds(run, free);
  const slots = free ? SHOP_RULES.freeSlots : SHOP_RULES.paidSlots;
  shop.stock = [];
  const names = new Set<string>(shop.specialist ? [itemName(shop.specialist)] : []);
  for (let slot = 0; slot < slots; slot++) {
    const guaranteed = free && slot === 0;
    // A few fresh rolls keep one visit from showing the same item twice.
    let item: ShopItem | undefined;
    for (let attempt = 0; attempt < 6; attempt++) {
      item = rollItem(run, shop.id, rollQuality(odds, rng, guaranteed ? 2 : 0), territory, rng, free);
      if (!item || !names.has(itemName(item))) break;
    }
    if (item) names.add(itemName(item));
    shop.stock.push(item);
  }
  if (!shop.specialist) {
    // The specialist slot holds one Rare or better item from the next territory's odds.
    const next = stockOdds(run, true);
    shop.specialist = rollItem(run, shop.id, rollQuality(next, rng, 2), territory, rng, false);
  }
}

export type ShopProblem =
  | 'no-gold'
  | 'not-open'
  | 'sold'
  | 'locked'
  | 'purchase-limit'
  | 'experimental-cap'
  | 'extraordinary-cap';

/** Gold a visit to this shop costs now: nothing for an open door or a free visit. */
export function visitFee(run: RunState, shopId: ShopId): number {
  if (run.shops[shopId].visit || run.freeVisit) return 0;
  return SHOP_RULES.visitFee;
}

/**
 * Opens a shop for this preparation phase. A free milestone visit opens one
 * shop of the player's choice. Other doors cost 20 gold each (GDD 6.5).
 */
export function openShop(run: RunState, shopId: ShopId): ShopProblem | undefined {
  const shop = run.shops[shopId];
  if (shop.visit) return undefined;
  const free = run.freeVisit;
  if (!free) {
    if (run.gold < SHOP_RULES.visitFee) return 'no-gold';
    spendGold(run, SHOP_RULES.visitFee);
  }
  run.freeVisit = false;
  shop.visit = { free, rerolls: 0, purchases: 0, experimental: 0, extraordinary: 0 };
  // Perfect Information showed the stock of all three shops. The chosen shop keeps the stock shown.
  if (!(free && shop.previewed)) rollStock(run, shop, free);
  if (free) {
    for (const id of SHOP_IDS) {
      const other = run.shops[id];
      if (other !== shop && other.previewed && !other.visit) other.stock = [];
      other.previewed = false;
    }
  }
  return undefined;
}

export function shopRerollCost(run: RunState, shopId: ShopId): number {
  // Optimisation: the first reroll in each shop visit is free.
  return rerollCost(run.shops[shopId].visit?.rerolls ?? 0, run.freeRerolls + (hasRule(run, 'freeReroll') ? 1 : 0));
}

/** Rerolls restock every slot. The specialist slot stays (GDD 6.5). */
export function rerollShop(run: RunState, shopId: ShopId): ShopProblem | undefined {
  const shop = run.shops[shopId];
  if (!shop.visit) return 'not-open';
  const cost = shopRerollCost(run, shopId);
  if (run.gold < cost) return 'no-gold';
  spendGold(run, cost);
  shop.visit.rerolls++;
  rollStock(run, shop, shop.visit.free);
  return undefined;
}

/** `slot` is a stock index, or 'specialist'. */
export function shopItemAt(run: RunState, shopId: ShopId, slot: number | 'specialist'): ShopItem | undefined {
  const shop = run.shops[shopId];
  return slot === 'specialist' ? shop.specialist : shop.stock[slot];
}

/** The reason a purchase fails, or undefined when the purchase goes through. */
export function buyProblem(run: RunState, shopId: ShopId, slot: number | 'specialist'): ShopProblem | undefined {
  const shop = run.shops[shopId];
  const visit = shop.visit;
  if (!visit) return 'not-open';
  const item = shopItemAt(run, shopId, slot);
  if (!item) return 'sold';
  if (lockedBy(run, item.kind === 'component' ? item.def : item.weapon.def)) return 'locked';
  if (visit.purchases >= SHOP_RULES.purchasesPerVisit) return 'purchase-limit';
  // High-ranking caps per visit: 2 Experimental items and 1 Extraordinary item.
  if (item.quality === 'Experimental' && visit.experimental >= SHOP_RULES.experimentalCap) return 'experimental-cap';
  if (item.quality === 'Extraordinary' && visit.extraordinary >= SHOP_RULES.extraordinaryCap) return 'extraordinary-cap';
  if (run.gold < item.price) return 'no-gold';
  return undefined;
}

/** Adds a weapon to the first free weapon slot, or to the reserve. */
export function addWeapon(run: RunState, weapon: WeaponInstance): void {
  if (run.weapons.length < WEAPON_SLOTS) run.weapons.push(weapon);
  else run.reserve.push(weapon);
}

export function buyItem(run: RunState, shopId: ShopId, slot: number | 'specialist'): ShopProblem | undefined {
  const problem = buyProblem(run, shopId, slot);
  if (problem) return problem;
  const shop = run.shops[shopId];
  const item = shopItemAt(run, shopId, slot);
  const visit = shop.visit;
  if (!item || !visit) return 'sold';
  spendGold(run, item.price);
  visit.purchases++;
  if (item.quality === 'Experimental') visit.experimental++;
  if (item.quality === 'Extraordinary') visit.extraordinary++;
  if (item.kind === 'component') run.inventory.push(createComponent(item.def));
  else addWeapon(run, item.weapon);
  if (slot === 'specialist') shop.specialist = undefined;
  else shop.stock[slot] = undefined;
  return undefined;
}

/**
 * Starts a preparation phase: every door shuts again and the stock rotates
 * out. Mini-boss and boss rounds grant one free visit (GDD 6.1).
 */
/** Perfect Information: free milestone visits preview the stock of all three shops (GDD 8.12). */
export function previewShops(run: RunState): void {
  if (!run.freeVisit || !hasRule(run, 'perfectInformation')) return;
  for (const id of SHOP_IDS) {
    const shop = run.shops[id];
    if (shop.visit || shop.previewed) continue;
    rollStock(run, shop, true);
    shop.previewed = true;
  }
}

export function beginPreparation(run: RunState, finishedRound: number): void {
  for (const id of SHOP_IDS) {
    run.shops[id].visit = undefined;
    run.shops[id].stock = [];
    run.shops[id].previewed = false;
  }
  run.freeVisit = roundKind(finishedRound) !== 'encounter';
  previewShops(run);
}

// --- Workbench (GDD 7.8 to 7.10, 7.12, 7.22, 7.23, 15.8) ------------------------------

export type WorkbenchProblem =
  | 'no-gold'
  | 'no-materials'
  | 'max-grade'
  | 'no-effect'
  | 'wrong-family'
  | 'auxiliary-closed'
  | 'not-buildable'
  | 'locked'
  | 'no-copy'
  | 'last-weapon'
  | 'missing';

/** Upgrade stats with an effect on this weapon. Status Build-up needs a status to build. */
export function upgradeChoices(weapon: WeaponInstance): UpgradeStat[] {
  const choices: UpgradeStat[] = ['damage', 'attackSpeed', 'criticalChance', 'range', 'area'];
  if (weaponStatusBuilds(weapon).builds.length > 0) choices.push('statusBuildUp');
  return choices;
}

export function upgradeProblem(run: RunState, weapon: WeaponInstance, stat: UpgradeStat): WorkbenchProblem | undefined {
  const cost = upgradeCost(weapon.grade);
  if (!cost) return 'max-grade';
  if (!upgradeChoices(weapon).includes(stat)) return 'no-effect';
  // Grade III needs any middle-ring node, Grade IV any outer-ring node (GDD 8.10).
  if (!gradeOpen(run, weapon.grade + 1)) return 'locked';
  if (run.gold < cost.gold) return 'no-gold';
  if (run.materials.Scrap < cost.scrap) return 'no-materials';
  return undefined;
}

/** Buys the next grade: one stat step in the chosen category. Grade III opens the Auxiliary slot. */
export function upgradeWeapon(run: RunState, weapon: WeaponInstance, stat: UpgradeStat): WorkbenchProblem | undefined {
  const problem = upgradeProblem(run, weapon, stat);
  if (problem) return problem;
  const cost = upgradeCost(weapon.grade);
  if (!cost) return 'max-grade';
  spendGold(run, cost.gold);
  spendMaterial(run, 'Scrap', cost.scrap);
  weapon.grade = (weapon.grade + 1) as WeaponGrade;
  weapon.upgrades.push(stat);
  return undefined;
}

/** Installs a component from the tray. The replaced component returns to the tray. */
export function installFromInventory(run: RunState, weapon: WeaponInstance, component: ComponentInstance): WorkbenchProblem | undefined {
  const index = run.inventory.indexOf(component);
  if (index < 0) return 'missing';
  const problem = installProblem(weapon, component.def);
  if (problem) return problem;
  const replaced = weapon.components[component.def.slot];
  run.inventory.splice(index, 1);
  weapon.components[component.def.slot] = component;
  if (replaced) run.inventory.push(replaced);
  return undefined;
}

/** Moves an installed component back to the tray. */
export function removeToInventory(run: RunState, weapon: WeaponInstance, slot: SlotType): WorkbenchProblem | undefined {
  const component = weapon.components[slot];
  if (!component) return 'missing';
  delete weapon.components[slot];
  run.inventory.push(component);
  return undefined;
}

/** Dismantles a component in the tray into materials (GDD 7.9). */
export function dismantleComponent(run: RunState, component: ComponentInstance): WorkbenchProblem | undefined {
  const index = run.inventory.indexOf(component);
  if (index < 0) return 'missing';
  const { material, amount } = dismantleReturn(component);
  run.inventory.splice(index, 1);
  run.materials[material] += amount;
  return undefined;
}

export function buildProblem(run: RunState, def: ComponentDef): WorkbenchProblem | undefined {
  const cost = recipeCost(def, run.relics);
  if (!cost) return 'not-buildable';
  if (lockedBy(run, def)) return 'locked';
  if (run.gold < cost.gold) return 'no-gold';
  if (run.materials[cost.material] < cost.amount) return 'no-materials';
  return undefined;
}

/** Builds a component at the workshop (GDD 7.23). */
export function buildComponent(run: RunState, def: ComponentDef): WorkbenchProblem | undefined {
  const problem = buildProblem(run, def);
  if (problem) return problem;
  const cost = recipeCost(def, run.relics);
  if (!cost) return 'not-buildable';
  spendGold(run, cost.gold);
  spendMaterial(run, cost.material, cost.amount);
  run.inventory.push(createComponent(def));
  return undefined;
}

/** Every weapon the run holds: equipped first, then the reserve. */
export function ownedWeapons(run: RunState): WeaponInstance[] {
  return [...run.weapons, ...run.reserve];
}

function removeWeapon(run: RunState, weapon: WeaponInstance): void {
  const equipped = run.weapons.indexOf(weapon);
  if (equipped >= 0) run.weapons.splice(equipped, 1);
  const reserve = run.reserve.indexOf(weapon);
  if (reserve >= 0) run.reserve.splice(reserve, 1);
}

/** Non-default components return to the tray when their weapon leaves. */
function stripComponents(run: RunState, weapon: WeaponInstance): void {
  for (const slot of Object.keys(weapon.components) as SlotType[]) {
    const component = weapon.components[slot];
    if (component && !component.isDefault) run.inventory.push(component);
    delete weapon.components[slot];
  }
}

/** Another copy of the same weapon to merge into this one. */
export function mergeCopy(run: RunState, survivor: WeaponInstance): WeaponInstance | undefined {
  // The reserve goes first, so equipped weapons stay in place where possible.
  return [...run.reserve, ...run.weapons].find((weapon) => weapon !== survivor && weapon.def === survivor.def);
}

export function mergeProblem(run: RunState, survivor: WeaponInstance): WorkbenchProblem | undefined {
  if (!mergeCopy(run, survivor)) return 'no-copy';
  if (run.gold < MERGE_COST) return 'no-gold';
  return undefined;
}

/**
 * Merges another copy into the chosen weapon for 50 gold (GDD 7.10, 7.23).
 * The survivor keeps its components and grade. The first merge opens the
 * Auxiliary slot. The other weapon is scrapped and its components return to the tray.
 */
export function mergeWeapons(run: RunState, survivor: WeaponInstance): WorkbenchProblem | undefined {
  const problem = mergeProblem(run, survivor);
  if (problem) return problem;
  const other = mergeCopy(run, survivor);
  if (!other) return 'no-copy';
  spendGold(run, MERGE_COST);
  stripComponents(run, other);
  removeWeapon(run, other);
  survivor.merges++;
  return undefined;
}

/** Materials a dismantled weapon returns: the scrap value of its quality. */
export function weaponDismantleReturn(weapon: WeaponInstance): { material: Material; amount: number } {
  return { material: materialFor(weapon.def.tags), amount: SCRAP_RETURN[weapon.quality] };
}

/** Dismantles a weapon. Its components return to the tray. The last weapon stays. */
export function dismantleWeapon(run: RunState, weapon: WeaponInstance): WorkbenchProblem | undefined {
  if (!ownedWeapons(run).includes(weapon)) return 'missing';
  if (run.weapons.includes(weapon) && run.weapons.length <= 1) return 'last-weapon';
  const { material, amount } = weaponDismantleReturn(weapon);
  stripComponents(run, weapon);
  removeWeapon(run, weapon);
  run.materials[material] += amount;
  return undefined;
}

/** Moves a reserve weapon into a weapon slot. A weapon already in the slot goes to the reserve. */
export function equipFromReserve(run: RunState, weapon: WeaponInstance, slot: number): WorkbenchProblem | undefined {
  const index = run.reserve.indexOf(weapon);
  if (index < 0 || slot < 0 || slot >= WEAPON_SLOTS) return 'missing';
  run.reserve.splice(index, 1);
  const current = run.weapons[slot];
  if (current) {
    run.weapons[slot] = weapon;
    run.reserve.push(current);
  } else {
    run.weapons.push(weapon);
  }
  return undefined;
}

/** Moves an equipped weapon to the reserve. The last weapon stays. */
export function unequipWeapon(run: RunState, weapon: WeaponInstance): WorkbenchProblem | undefined {
  const index = run.weapons.indexOf(weapon);
  if (index < 0) return 'missing';
  if (run.weapons.length <= 1) return 'last-weapon';
  run.weapons.splice(index, 1);
  run.reserve.push(weapon);
  return undefined;
}

/** True when the Auxiliary socket shows a padlock (GDD 15.8). */
export function auxiliaryLocked(weapon: WeaponInstance): boolean {
  return !auxiliaryOpen(weapon);
}

/** Components the workshop builds, in catalogue order: every quality below Extraordinary. */
export function recipes(): ComponentDef[] {
  return COMPONENT_LIST.filter((def) => RECIPE_COSTS[def.quality] !== undefined);
}

/** Records the loot of a finished round in the ledger. */
export function recordRound(
  run: RunState,
  round: number,
  kills: number,
  goldEarned: number,
  materialsEarned: number,
  componentsFound: number,
  researchEarned = 0,
): void {
  run.ledger.push({
    round,
    kills,
    goldEarned,
    goldSpent: 0,
    materialsEarned,
    materialsSpent: 0,
    componentsFound,
    researchEarned,
  });
}
