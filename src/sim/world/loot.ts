// Drops and pickups (GDD 14.1, 14.2): gold, materials and components fall where
// an enemy dies. The player collects them through Pickup Radius. Everything
// left flies to the player when the round ends.

import { ARCHIVE_RULES } from '../../data/archive';
import { RELIC_RULES } from '../../data/relics';
import { COMPONENT_LIST, QUALITIES } from '../../data/components';
import type { ComponentDef } from '../../data/components';
import { ECONOMY_RULES, FACTION_MATERIALS, GOLD_DROPS, MATERIAL_DROPS, emptyMaterials } from '../../data/economy';
import type { Material, MaterialStock } from '../../data/economy';
import { RESEARCH_REWARDS } from '../../data/research';
import { STOCK_ODDS } from '../../data/shop';
import { tierValue } from '../../data/tiers';
import type { Rng } from '../rng';
import type { Enemy, Pickup } from './types';
import type { World } from './world';

/** Everything collected in a round. */
export interface Loot {
  gold: number;
  materials: MaterialStock;
  components: ComponentDef[];
  /** Research Points (GDD 8.5). Fractions from Research Yield stay in the total. */
  research: number;
}

export function emptyLoot(): Loot {
  return { gold: 0, materials: emptyMaterials(), components: [], research: 0 };
}

export function createPickup(slot: number): Pickup {
  return { active: false, slot, kind: 'gold', x: 0, y: 0, amount: 0, material: 'Scrap', component: undefined, attracted: false };
}

function collect(world: World, pickup: Pickup): void {
  if (pickup.kind === 'gold') {
    world.gold += pickup.amount;
    world.loot.gold += pickup.amount;
  } else if (pickup.kind === 'material') {
    world.loot.materials[pickup.material] += pickup.amount;
  } else if (pickup.kind === 'herb') {
    // Biology Master: a healing herb (GDD 8.13).
    const player = world.player;
    if (player.health > 0) player.health = Math.min(player.stats.maxHealth, player.health + player.stats.maxHealth * ARCHIVE_RULES.herbHeal);
  } else if (pickup.component) {
    world.loot.components.push(pickup.component);
  }
  world.emit({ type: 'pickup', kind: pickup.kind, amount: pickup.amount, x: pickup.x, y: pickup.y });
  world.pickups.release(pickup);
}

function addPickup(
  world: World,
  kind: Pickup['kind'],
  x: number,
  y: number,
  rawAmount: number,
  material: Material = 'Scrap',
  component?: ComponentDef,
): void {
  // The Naturalist: gold drops down, Low. Fractions round by chance (GDD 11.12).
  let amount = rawAmount;
  if (kind === 'gold' && world.spec('goldDown') > 0) {
    const kept = rawAmount * (1 - tierValue('modifierSize', 'Low'));
    amount = Math.floor(kept) + (world.rng.chance(kept - Math.floor(kept)) ? 1 : 0);
    if (amount <= 0) return;
  }
  if (kind === 'gold') {
    // Gold close to another gold pickup joins the pile, so swarms leave few pickups.
    const reach = ECONOMY_RULES.pickupMergeDistance;
    for (const other of world.pickups.items) {
      if (!other.active || other.kind !== 'gold') continue;
      if ((other.x - x) ** 2 + (other.y - y) ** 2 <= reach * reach) {
        other.amount += amount;
        return;
      }
    }
  }
  const pickup = world.pickups.acquire();
  if (!pickup) {
    // At the limit the drop goes straight to the player.
    if (kind === 'gold') {
      world.gold += amount;
      world.loot.gold += amount;
    } else if (kind === 'material') {
      world.loot.materials[material] += amount;
    } else if (component) {
      world.loot.components.push(component);
    }
    return;
  }
  const scatter = kind === 'gold' ? 0 : 14;
  pickup.kind = kind;
  pickup.x = Math.min(world.arena.width - 8, Math.max(8, x + world.rng.range(-scatter, scatter)));
  pickup.y = Math.min(world.arena.height - 8, Math.max(8, y + world.rng.range(-scatter, scatter)));
  pickup.amount = amount;
  pickup.material = material;
  pickup.component = component;
  pickup.attracted = false;
}

/** A dropped component by the stock odds of the territory. Extraordinary components come only from shops and boss rewards (GDD 7.23). */
export function rollDroppedComponent(territory: number, rng: Rng, atLeast = 0): ComponentDef | undefined {
  const odds = STOCK_ODDS[Math.min(STOCK_ODDS.length - 1, territory)] ?? STOCK_ODDS[0];
  if (!odds) return undefined;
  const top = QUALITIES.indexOf('Experimental');
  let total = 0;
  for (let index = atLeast; index <= top; index++) total += odds[index] ?? 0;
  let roll = rng.range(0, total);
  let chosen = atLeast;
  for (let index = atLeast; index <= top; index++) {
    roll -= odds[index] ?? 0;
    if (roll < 0) {
      chosen = index;
      break;
    }
  }
  for (let index = chosen; index >= 0; index--) {
    const choices = COMPONENT_LIST.filter((component) => component.quality === QUALITIES[index]);
    if (choices.length > 0) return rng.pick(choices);
  }
  return undefined;
}

/** A mini-boss drops a Rare component one time in four (GDD 14.2). */
const MINI_BOSS_RARE_CHANCE = 0.25;

/** Drops for a defeated enemy (GDD 14.1, 14.2). Split copies and sprouted Thornlings drop nothing. */
export function dropLoot(world: World, enemy: Enemy, weaponIndex: number): void {
  if (enemy.noLegacy) return;
  const { x, y } = enemy;
  // Bloom Crown: kills sometimes drop healing blooms (GDD 5.12).
  if (world.relic('bloomDrops') > 0 && world.luck(RELIC_RULES.bloomChance)) world.environment.addBloom(x, y, RELIC_RULES.bloomSeconds);
  // Biology Master: Organic enemies sometimes drop healing herbs (GDD 8.13).
  if (world.master('Biology') && enemy.def.properties.includes('Organic') && world.luck(ARCHIVE_RULES.herbChance)) {
    addPickup(world, 'herb', x, y, 1);
  }
  const rng = world.rng;
  const types = FACTION_MATERIALS[enemy.def.faction];
  const material = (): Material => rng.pick(types);
  // Fortune raises the odds of rare drops (GDD 3.6).
  const odds = 1 + world.player.stats.fortune;
  // Material collection from the Grand Archive (GDD 11.11).
  const materialYield = world.player.stats.materialYield;
  const drop = (amount: number, type: Material): void => {
    // Natural History: Specimen yield up, Low. The Naturalist: up, Medium (GDD 11.12).
    const specimenChance =
      (world.rule('specimenYield') > 0 ? tierValue('modifierSize', 'Low') : 0) +
      (world.spec('specimenYield') > 0 ? tierValue('modifierSize', 'Medium') : 0);
    const extra = type === 'Specimens' && specimenChance > 0 && world.luck(specimenChance) ? 1 : 0;
    addPickup(world, 'material', x, y, amount + extra, type);
  };

  const notebookShare = world.weapons[weaponIndex]?.resolved.triggers.researchOnKill
    ? tierValue('modifierSize', ECONOMY_RULES.resourceOnKillChance)
    : 0;
  // Bosses (GDD 4.10, 5.5, 14.1, 14.2). Parts and engineers' bosses drop nothing of their own.
  const boss = enemy.boss;
  if (boss) {
    if (boss.role === 'part') return;
    const research = boss.role === 'boss' ? RESEARCH_REWARDS.boss : boss.role === 'mini' ? RESEARCH_REWARDS.miniBoss : RESEARCH_REWARDS.escort;
    world.loot.research += research * (world.player.stats.researchYield + notebookShare);
    if (boss.role === 'boss') {
      addPickup(world, 'gold', x, y, GOLD_DROPS.boss);
      drop(MATERIAL_DROPS.boss, material());
    } else if (boss.role === 'mini') {
      addPickup(world, 'gold', x, y, GOLD_DROPS.miniBoss);
      drop(MATERIAL_DROPS.miniBoss, material());
      // A 25 per cent chance of a Rare component (GDD 14.2).
      if (world.luck(MINI_BOSS_RARE_CHANCE * odds)) {
        const component = rollDroppedComponent(world.territory, rng, QUALITIES.indexOf('Rare'));
        if (component) addPickup(world, 'component', x, y, 1, 'Scrap', component);
      }
    } else {
      // Escorts: bonus materials and Research Points only (GDD 4.10).
      drop(MATERIAL_DROPS.miniBoss, material());
    }
    return;
  }

  // A champion drops a Rare component or a large Research Point reward, at even odds (GDD 9.13).
  const championComponent = enemy.rank === 'champion' && rng.chance(0.5);
  // Research Points go straight to the notebook (GDD 8.5). Research Notebook adds to kills with its weapon.
  let reward: number = RESEARCH_REWARDS.normal;
  if (enemy.rank === 'elite') reward = RESEARCH_REWARDS.elite;
  else if (enemy.rank === 'champion') reward = championComponent ? RESEARCH_REWARDS.normal : RESEARCH_REWARDS.champion;
  world.loot.research += reward * (world.player.stats.researchYield + notebookShare);

  if (enemy.rank === 'champion') {
    addPickup(world, 'gold', x, y, GOLD_DROPS.champion);
    drop(MATERIAL_DROPS.champion, material());
    if (championComponent) {
      // One Rare or better component.
      const component = rollDroppedComponent(world.territory, rng, QUALITIES.indexOf('Rare'));
      if (component) addPickup(world, 'component', x, y, 1, 'Scrap', component);
    }
  } else if (enemy.rank === 'elite') {
    addPickup(world, 'gold', x, y, GOLD_DROPS.elite);
    const count = MATERIAL_DROPS.elite + (world.luck(MATERIAL_DROPS.eliteSecondChance * odds * materialYield) ? 1 : 0);
    drop(count, material());
    if (world.luck(MATERIAL_DROPS.eliteComponentChance * odds)) {
      const component = rollDroppedComponent(world.territory, rng);
      if (component) addPickup(world, 'component', x, y, 1, 'Scrap', component);
    }
  } else {
    addPickup(world, 'gold', x, y, GOLD_DROPS.normal);
    if (world.luck(MATERIAL_DROPS.normalChance * odds * materialYield)) drop(1, material());
  }

  // Specimen Jar: kills with this weapon grant extra Specimens (GDD 7.18).
  const weapon = world.weapons[weaponIndex];
  if (weapon?.resolved.triggers.specimenOnKill) {
    if (world.luck(tierValue('modifierSize', ECONOMY_RULES.resourceOnKillChance))) {
      drop(1, 'Specimens');
    }
  }
}

/** Pickups inside Pickup Radius fly to the player. */
export function updatePickups(world: World, dt: number): void {
  const player = world.player;
  if (player.health <= 0) return;
  const radius = player.stats.pickupRadius;
  for (const pickup of world.pickups.items) {
    if (!pickup.active) continue;
    const dx = player.x - pickup.x;
    const dy = player.y - pickup.y;
    const distance = Math.hypot(dx, dy);
    if (!pickup.attracted && distance <= radius) pickup.attracted = true;
    if (!pickup.attracted) continue;
    const step = ECONOMY_RULES.pickupSpeed * dt;
    if (distance <= player.radius + step) {
      collect(world, pickup);
      continue;
    }
    pickup.x += (dx / distance) * step;
    pickup.y += (dy / distance) * step;
  }
}

/** Uncollected gold flies to the player when the round ends (GDD 14.1). Materials and components follow. */
export function collectAll(world: World): void {
  for (const pickup of world.pickups.items) {
    if (pickup.active) collect(world, pickup);
  }
}
