// Drops and pickups (GDD 14.1, 14.2): gold, materials and components fall where
// an enemy dies. The player collects them through Pickup Radius. Everything
// left flies to the player when the round ends.

import { COMPONENT_LIST, QUALITIES } from '../../data/components';
import type { ComponentDef } from '../../data/components';
import { ECONOMY_RULES, FACTION_MATERIALS, GOLD_DROPS, MATERIAL_DROPS, emptyMaterials } from '../../data/economy';
import type { Material, MaterialStock } from '../../data/economy';
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
}

export function emptyLoot(): Loot {
  return { gold: 0, materials: emptyMaterials(), components: [] };
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
  amount: number,
  material: Material = 'Scrap',
  component?: ComponentDef,
): void {
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

/** Drops for a defeated enemy (GDD 14.1, 14.2). Split copies and sprouted Thornlings drop nothing. */
export function dropLoot(world: World, enemy: Enemy, weaponIndex: number): void {
  if (enemy.noLegacy) return;
  const { x, y } = enemy;
  const rng = world.rng;
  const types = FACTION_MATERIALS[enemy.def.faction];
  const material = (): Material => rng.pick(types);

  if (enemy.rank === 'champion') {
    addPickup(world, 'gold', x, y, GOLD_DROPS.champion);
    addPickup(world, 'material', x, y, MATERIAL_DROPS.champion, material());
    // One Rare or better component.
    const component = rollDroppedComponent(world.territory, rng, QUALITIES.indexOf('Rare'));
    if (component) addPickup(world, 'component', x, y, 1, 'Scrap', component);
  } else if (enemy.rank === 'elite') {
    addPickup(world, 'gold', x, y, GOLD_DROPS.elite);
    const count = MATERIAL_DROPS.elite + (rng.chance(MATERIAL_DROPS.eliteSecondChance) ? 1 : 0);
    addPickup(world, 'material', x, y, count, material());
    if (rng.chance(MATERIAL_DROPS.eliteComponentChance)) {
      const component = rollDroppedComponent(world.territory, rng);
      if (component) addPickup(world, 'component', x, y, 1, 'Scrap', component);
    }
  } else {
    addPickup(world, 'gold', x, y, GOLD_DROPS.normal);
    if (rng.chance(MATERIAL_DROPS.normalChance)) addPickup(world, 'material', x, y, 1, material());
  }

  // Specimen Jar: kills with this weapon grant extra Specimens (GDD 7.18).
  const weapon = world.weapons[weaponIndex];
  if (weapon?.resolved.triggers.specimenOnKill) {
    if (rng.chance(tierValue('modifierSize', ECONOMY_RULES.resourceOnKillChance))) {
      addPickup(world, 'material', x, y, 1, 'Specimens');
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
