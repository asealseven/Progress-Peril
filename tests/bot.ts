// The test bot (CLAUDE.md "Testing"): circle the arena, buy the first
// affordable item, research the cheapest available node. Shared by the
// headless run tests and the balance report.

import { RESEARCH_NODES } from '../src/data/research';
import { SHOP_IDS } from '../src/data/shop';
import type { RunState } from '../src/sim/run';
import { captureChoices, captureNode, nodeCost, nodeState, researchNodeNow } from '../src/sim/research';
import { buyItem, buyProblem, installFromInventory, openShop, shopItemAt, upgradeProblem, upgradeWeapon } from '../src/sim/economy';
import { installProblem } from '../src/sim/loadout';
import { lineOfSight } from '../src/sim/world/hazards';
import type { StepInput } from '../src/sim/world/types';
import type { World } from '../src/sim/world/world';

export const MAX_ROUND_STEPS = 60 * 60 * 10;

/**
 * A simple bot: circle the arena centre at a fixed radius. With no enemy well
 * inside weapon range, walk toward a target, so the last enemies of a round
 * never trail behind the circle forever. The target is the weakest enemy
 * nearby, so repairing Mechanists fall before the Sentinel they mend.
 */
export function circleBot(world: World): StepInput {
  const player = world.player;
  const range = world.weapons[0]?.resolved.range ?? 0;
  let nearestX = 0;
  let nearestY = 0;
  let nearest = Infinity;
  let weakest = Infinity;
  for (const enemy of world.enemies.items) {
    if (!enemy.active) continue;
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    // Inside 500 pixels the lowest Health wins. Outside, the nearest enemy.
    const score = distance <= 500 ? enemy.health : 1e9 + distance;
    if (score < weakest) {
      weakest = score;
      nearest = distance;
      nearestX = enemy.x;
      nearestY = enemy.y;
    }
  }
  // Like a player, the bot holds manual focus on a boss part first (belt motors, arms), then on a boss or mini-boss (GDD 3.4).
  const boss =
    world.enemies.items.find((enemy) => enemy.active && enemy.boss?.role === 'part' && enemy.boss.partId !== 'unmaking-copy') ??
    world.enemies.items.find((enemy) => enemy.active && (enemy.boss?.role === 'boss' || enemy.boss?.role === 'mini'));
  const focus = boss ? { focusX: boss.x, focusY: boss.y } : {};
  // With a focus target, the bot walks into range of it.
  const move = boss
    ? steer(world, Math.hypot(boss.x - player.x, boss.y - player.y), boss.x, boss.y, range)
    : steer(world, nearest, nearestX, nearestY, range);
  const dodge = evade(world);
  const moveX = (move.moveX ?? 0) + dodge.x;
  const moveY = (move.moveY ?? 0) + dodge.y;
  const length = Math.hypot(moveX, moveY);
  return { ...(length > 1 ? { moveX: moveX / length, moveY: moveY / length } : { moveX, moveY }), ...focus };
}

/**
 * Basic evasion, as a player dodges: back away from enemies close by, more
 * from those winding up an attack, step out of boss telegraphs and sidestep
 * enemy shots heading in.
 */
function evade(world: World): { x: number; y: number } {
  const player = world.player;
  let x = 0;
  let y = 0;
  for (const enemy of world.enemies.items) {
    if (!enemy.active) continue;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const winding = enemy.action === 'windup' || enemy.action === 'charge';
    const reach = enemy.radius + player.radius + (winding ? Math.min(enemy.range, 160) + 40 : 60);
    if (distance >= reach) continue;
    const push = (1 - distance / reach) * (winding ? 2.5 : 1.2);
    x += (dx / distance) * push;
    y += (dy / distance) * push;
  }
  for (const telegraph of world.bossTelegraphs) {
    const dx = player.x - telegraph.x;
    const dy = player.y - telegraph.y;
    const distance = Math.hypot(dx, dy) || 1;
    const reach = (telegraph.shape === 'circle' ? telegraph.radius : 160) + player.radius + 20;
    if (distance >= reach) continue;
    x += (dx / distance) * 2.5;
    y += (dy / distance) * 2.5;
  }
  for (const shot of world.enemyShots.items) {
    if (!shot.active) continue;
    const dx = player.x - shot.x;
    const dy = player.y - shot.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 140) continue;
    // Heading in: step to the side of the shot's path.
    if (dx * shot.dx + dy * shot.dy <= 0) continue;
    const side = dx * shot.dy - dy * shot.dx >= 0 ? 1 : -1;
    x += -shot.dy * side * 1.5;
    y += shot.dx * side * 1.5;
  }
  return { x, y };
}

function steer(world: World, nearest: number, nearestX: number, nearestY: number, range: number): StepInput {
  const player = world.player;
  // A pillar between the bot and its target blocks Straight shots, so the bot walks round.
  const blocked = nearest !== Infinity && !lineOfSight(world.arena, player.x, player.y, nearestX, nearestY, 8);
  if (nearest !== Infinity && blocked && nearest <= range) {
    // In range but behind cover: circle the target to find a clear line, as a player would.
    return { moveX: -(nearestY - player.y) / nearest, moveY: (nearestX - player.x) / nearest };
  }
  if (nearest !== Infinity && (nearest > range * 0.6 || blocked)) {
    return { moveX: (nearestX - player.x) / nearest, moveY: (nearestY - player.y) / nearest };
  }

  const dx = player.x - world.arena.width / 2;
  const dy = player.y - world.arena.height / 2;
  const distance = Math.hypot(dx, dy) || 1;
  const radial = (420 - distance) / 100;
  return {
    moveX: -dy / distance + (dx / distance) * radial,
    moveY: dx / distance + (dy / distance) * radial,
  };
}

/**
 * The bot's preparation phase (CLAUDE.md "Testing"): buy weapon grades, visit a
 * shop and buy the first affordable item, then fit components into free slots.
 */
export function prepare(run: RunState): void {
  // Research the cheapest available node, again and again while points last (CLAUDE.md "Testing").
  for (;;) {
    const cheapest = RESEARCH_NODES.filter((entry) => nodeState(run, entry) === 'available').sort(
      (a, b) => nodeCost(run, a).points - nodeCost(run, b).points,
    )[0];
    if (!cheapest) break;
    researchNodeNow(run, cheapest);
  }
  const capture = captureChoices(run)[0];
  if (capture) captureNode(run, capture);

  // Grades first, lowest grade first, always in Damage.
  for (;;) {
    const weapon = [...run.weapons]
      .sort((a, b) => a.grade - b.grade)
      .find((entry) => upgradeProblem(run, entry, 'damage') === undefined);
    if (!weapon) break;
    upgradeWeapon(run, weapon, 'damage');
  }

  // One shop per phase: a free visit, or a paid one when the gold covers the fee and a purchase.
  const shopId = SHOP_IDS[run.round % SHOP_IDS.length] ?? 'blacksmith';
  if (run.freeVisit || run.gold >= 80) {
    openShop(run, shopId);
    const slots: Array<number | 'specialist'> = [...run.shops[shopId].stock.keys(), 'specialist'];
    // A weapon for a free slot comes first.
    if (run.weapons.length < 3) {
      const weaponSlot = slots.find(
        (slot) => shopItemAt(run, shopId, slot)?.kind === 'weapon' && buyProblem(run, shopId, slot) === undefined,
      );
      if (weaponSlot !== undefined) buyItem(run, shopId, weaponSlot);
    }
    for (const slot of slots) {
      const item = shopItemAt(run, shopId, slot);
      if (!item || item.kind === 'weapon') continue;
      if (buyProblem(run, shopId, slot) === undefined) buyItem(run, shopId, slot);
    }
  }

  for (const component of [...run.inventory]) {
    const weapon = run.weapons.find(
      (entry) => !entry.components[component.def.slot] && installProblem(entry, component.def) === undefined,
    );
    if (weapon) installFromInventory(run, weapon, component);
  }
}

