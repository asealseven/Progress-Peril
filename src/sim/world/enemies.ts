// Enemy spawning, ranks, movement and the attack cycle (GDD 9.3, 9.12, 9.13, 9.15).
// src/sim/ai.ts scores the six actions. This file gathers the inputs, carries
// out the chosen action and runs wind-up, strike and recovery for each attack.

import { bannerFactor } from './bosses';
import { CHAMPION_MODIFIER_COUNT, CHAMPION_TRAIT_IDS } from '../../data/champions';
import type { ChampionTraitId } from '../../data/champions';
import { DAMAGE_TYPES } from '../../data/damageTypes';
import type { DamageType } from '../../data/damageTypes';
import { ELITE_MODIFIER_COUNT, ELITE_MODIFIER_IDS } from '../../data/eliteModifiers';
import type { EliteModifierId } from '../../data/eliteModifiers';
import { ENEMIES, escortOf } from '../../data/enemies';
import type { EnemyDef } from '../../data/enemies';
import { STATUS_EFFECTS } from '../../data/statusEffects';
import type { StatusEffect } from '../../data/statusEffects';
import {
  AI_RULES,
  COMBAT,
  ENEMY_RULES,
  RANK_HEALTH_STEPS,
  STATUS_METER,
  STATUS_RULES,
  SYNERGY_RULES,
  THREAT_COST,
  TIERS,
  scaledTierValue,
  stepTier,
  tierIndex,
  tierValue,
} from '../../data/tiers';
import type { Tier } from '../../data/tiers';
import { weaponByName } from '../../data/weapons';
import { chooseAction, isGuard, isWard, leaderRank, squadOrder, thinkInterval } from '../ai';
import { hitPlayer, killEnemy } from './damage';
import { addHazard, damageConstruct, fireEnemyShot, lineOfSight } from './hazards';
import { clampToArena, insideObstacle, pushOutOfObstacles } from './movement';
import { clearStatuses, createStatusArrays, hasStatus, isStopped, resetStatuses } from './status';
import { addModifierFlag, hasModifier, hasTrait, isJuggernaut, traitBitsOf } from './traits';
import type { AbilityKind, Enemy, EnemyRank, Formation, SpawnEntry, Squad, SquadOrder } from './types';
import type { World } from './world';

const scratch: number[] = [];
const SPAWN_TRIES = 24;
const SQUAD_UPDATE_STEPS = 15;
/** Steps a volley window stays open after the leader's call. */
const VOLLEY_WINDOW_STEPS = 12;
const ABILITY_RECOVER = 0.3;
const CRAWLER = ENEMIES['clockwork-crawler'];

/** Statuses a Hardened elite rolls its immunity from: the ten effects of GDD 9.9 minus the Artificial swaps. */
const HARDENED_CHOICES: readonly StatusEffect[] = STATUS_EFFECTS.filter(
  (status) => status !== 'Overheated' && status !== 'Short-circuited',
);

/** Damage types a Rogue Inventor's experimental weapon deals (GDD 7.17, Experimental family). */
const EXPERIMENTAL_TYPES: readonly DamageType[] = ['Electromagnetic Repeater', 'Living Arsenal', 'Tesla Rod', 'Burning Mirror']
  .map((name) => weaponByName(name)?.damageTypes[0])
  .filter((type): type is DamageType => type !== undefined);

export function createEnemy(slot: number, def: EnemyDef): Enemy {
  return {
    active: false,
    slot,
    id: -1,
    def,
    x: 0,
    y: 0,
    radius: def.radius,
    health: 0,
    maxHealth: 0,
    armour: 0,
    damage: 0,
    speed: 0,
    range: 0,
    threat: 0,
    action: 'chase',
    actionTimer: 0,
    actionDuration: 1,
    rank: 'normal',
    modifiers: [],
    modifierBits: 0,
    championTrait: undefined,
    traitBits: 0,
    ai: 'attack',
    decideAt: 0,
    squad: -1,
    formationSlot: -1,
    hasToken: false,
    flankSlot: -1,
    moveX: 0,
    moveY: 0,
    homeX: 0,
    homeY: 0,
    strafe: 1,
    wardSlot: -1,
    wardId: -1,
    attackCooldown: 0,
    attackRate: 1,
    attackType: def.damageType,
    aimX: 0,
    aimY: 0,
    chargeLeft: 0,
    chargeHit: false,
    runOverId: -1,
    ability: undefined,
    abilityCooldown: 0,
    abilityCooldown2: 0,
    sinceDamage: 0,
    retreatTimer: 0,
    trailX: 0,
    trailY: 0,
    carriedGold: 0,
    summoned: 0,
    shiftTimer: 0,
    shiftIndex: 0,
    resistType: undefined,
    hardened: undefined,
    mutated: false,
    noLegacy: false,
    baseSpeed: 0,
    purifyTimer: 0,
    burstDamage: 0,
    burstTimer: 0,
    plateTimer: 0,
    plateType: undefined,
    typeTaken: DAMAGE_TYPES.map(() => 0),
    boss: undefined,
    takenFactor: 1,
    extraWeak: [],
    thornShell: false,
    thresholdIndex: 0,
    overclocked: false,
    hitFlash: 0,
    faceX: 0,
    faceY: 1,
    slowTimer: 0,
    slowFactor: 1,
    confused: 0,
    marked: false,
    chainGuard: 0,
    vx: 0,
    vy: 0,
    prevX: 0,
    prevY: 0,
    statusMeter: createStatusArrays(),
    statusActive: createStatusArrays(),
    statusSource: createStatusArrays(),
    statusTick: createStatusArrays(),
    statusDamage: createStatusArrays(),
    statusSince: createStatusArrays(),
    statusGeneration: createStatusArrays(),
    meterScale: 1,
    stunGrowth: 1,
    fumesCooldown: 0,
    septicTimer: 0,
    trapped: 0,
    meleeMark: 0,
    reactionFlags: 0,
  };
}

// --- Ranks and modifiers ---------------------------------------------------------

/** Speed after a number of tier steps. Steps past Extreme add a fixed share each. */
export function steppedSpeed(speed: Tier, steps: number): number {
  const target = tierIndex(speed) + steps;
  const top = TIERS.length - 1;
  if (target <= top) return tierValue('enemySpeed', stepTier(speed, steps));
  return tierValue('enemySpeed', 'Extreme') * (1 + ENEMY_RULES.speedStepAboveExtreme) ** (target - top);
}

/** Speed and attack speed from Swift and Overclocked (GDD 9.12, 9.13). */
function refreshPace(enemy: Enemy): void {
  let steps = 0;
  if (hasModifier(enemy, 'swift')) steps += 1;
  if (enemy.overclocked) steps += ENEMY_RULES.overclockedSteps;
  enemy.speed = enemy.baseSpeed > 0 ? steppedSpeed(enemy.def.speed, steps) : 0;
  enemy.attackRate = ENEMY_RULES.attackSpeedStep ** steps;
}

/** Applies one elite modifier (GDD 9.12). Returns false when the enemy carries the modifier already. */
export function applyModifier(world: World, enemy: Enemy, id: EliteModifierId): boolean {
  if (!addModifierFlag(enemy, id)) return false;
  switch (id) {
    case 'armoured':
      enemy.armour = tierValue('armour', stepTier(enemy.def.armour, ENEMY_RULES.armouredSteps));
      break;
    case 'swift':
      refreshPace(enemy);
      break;
    case 'resistant': {
      const choices = DAMAGE_TYPES.filter(
        (type) => !enemy.def.resists.includes(type) && !enemy.def.immune?.includes(type),
      );
      enemy.resistType = world.rng.pick(choices);
      break;
    }
    case 'hardened':
      enemy.hardened = world.rng.pick(HARDENED_CHOICES);
      break;
    default:
      break;
  }
  return true;
}

function rollModifiers(world: World, enemy: Enemy, count: number): void {
  const pool = [...ELITE_MODIFIER_IDS];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = world.rng.int(0, pool.length - 1);
    const id = pool.splice(index, 1)[0];
    if (id) applyModifier(world, enemy, id);
  }
}

const NO_TYPES: readonly DamageType[] = [];

export interface SpawnOptions {
  readonly rank?: EnemyRank;
  /** Elite modifiers to apply. Default: a random set of the size GDD 9.12 gives. */
  readonly modifiers?: readonly EliteModifierId[];
  /** Champion trait. Default: a random trait. */
  readonly trait?: ChampionTraitId;
  readonly squad?: Squad;
}

/** Puts one enemy into the arena. Returns undefined when the pool is full. */
export function spawnEnemy(world: World, def: EnemyDef, x: number, y: number, options: SpawnOptions = {}): Enemy | undefined {
  const enemy = world.enemies.acquire();
  if (!enemy) return undefined;
  const rank = options.rank ?? 'normal';
  const territory = world.territory;
  const healthSteps = rank === 'elite' ? RANK_HEALTH_STEPS.elite : rank === 'champion' ? RANK_HEALTH_STEPS.champion : 0;

  enemy.id = world.nextEnemyId++;
  enemy.def = def;
  enemy.radius = def.radius;
  // Territory 2 raises Health and Damage one step, Territory 3 two steps (GDD 9.10).
  enemy.maxHealth = scaledTierValue('enemyHealth', def.health, territory + healthSteps);
  enemy.health = enemy.maxHealth;
  enemy.armour = tierValue('armour', def.armour);
  enemy.damage = scaledTierValue('enemyDamage', def.damage, territory);
  enemy.baseSpeed = tierValue('enemySpeed', def.speed);
  enemy.speed = enemy.baseSpeed;
  enemy.range = tierValue('enemyRange', def.range);
  enemy.threat = THREAT_COST[def.threat];
  enemy.action = 'chase';
  enemy.actionTimer = 0;
  enemy.actionDuration = 1;
  enemy.rank = rank;
  enemy.modifiers.length = 0;
  enemy.modifierBits = 0;
  enemy.championTrait = undefined;
  enemy.traitBits = traitBitsOf(def);
  enemy.ai = 'attack';
  enemy.decideAt = 0;
  enemy.squad = -1;
  enemy.formationSlot = -1;
  enemy.hasToken = false;
  enemy.flankSlot = -1;
  enemy.moveX = 0;
  enemy.moveY = 0;
  enemy.strafe = enemy.id % 2 === 0 ? 1 : -1;
  enemy.wardSlot = -1;
  enemy.wardId = -1;
  enemy.attackCooldown = 0;
  enemy.attackRate = 1;
  enemy.attackType = def.damageType;
  enemy.chargeLeft = 0;
  enemy.chargeHit = false;
  enemy.ability = undefined;
  enemy.abilityCooldown = 0;
  enemy.abilityCooldown2 = 0;
  enemy.sinceDamage = 0;
  enemy.retreatTimer = 0;
  enemy.carriedGold = 0;
  enemy.summoned = 0;
  enemy.shiftTimer = 0;
  enemy.shiftIndex = 0;
  enemy.resistType = undefined;
  enemy.hardened = undefined;
  enemy.mutated = false;
  enemy.noLegacy = false;
  enemy.purifyTimer = ENEMY_RULES.purifySeconds;
  enemy.burstDamage = 0;
  enemy.burstTimer = 0;
  enemy.plateTimer = ENEMY_RULES.platingSeconds;
  enemy.plateType = undefined;
  enemy.typeTaken.fill(0);
  enemy.boss = undefined;
  enemy.takenFactor = 1;
  enemy.extraWeak = NO_TYPES;
  enemy.thornShell = false;
  enemy.thresholdIndex = 0;
  enemy.overclocked = false;
  enemy.hitFlash = 0;
  enemy.slowTimer = 0;
  enemy.slowFactor = 1;
  enemy.confused = 0;
  enemy.chainGuard = 0;
  enemy.vx = 0;
  enemy.vy = 0;
  resetStatuses(enemy);
  // Meter size grows with rank (GDD 9.14).
  enemy.meterScale = rank === 'elite' ? STATUS_METER.elite : rank === 'champion' ? STATUS_METER.champion : 1;

  enemy.x = x;
  enemy.y = y;
  clampToArena(enemy, world.arena);
  pushOutOfObstacles(enemy, world.arena);
  enemy.prevX = enemy.x;
  enemy.prevY = enemy.y;
  enemy.homeX = enemy.x;
  enemy.homeY = enemy.y;
  enemy.trailX = enemy.x;
  enemy.trailY = enemy.y;
  enemy.aimX = enemy.x;
  enemy.aimY = enemy.y;

  if (rank !== 'normal') {
    if (options.modifiers) {
      for (const id of options.modifiers) applyModifier(world, enemy, id);
    } else {
      rollModifiers(world, enemy, rank === 'champion' ? CHAMPION_MODIFIER_COUNT : (ELITE_MODIFIER_COUNT[territory] ?? 2));
    }
    if (rank === 'champion') enemy.championTrait = options.trait ?? world.rng.pick(CHAMPION_TRAIT_IDS);
  }

  // The Ancient Guardian sleeps until disturbed (GDD 9.11).
  if (hasTrait(enemy, 'dormant')) enemy.action = 'dormant';
  if (hasTrait(enemy, 'shifting-resistance')) shiftResistance(world, enemy);
  // A Rogue Inventor carries a random experimental weapon (GDD 9.11).
  if (hasTrait(enemy, 'experimental-weapon') && EXPERIMENTAL_TYPES.length > 0) {
    enemy.attackType = world.rng.pick(EXPERIMENTAL_TYPES);
  }

  if (options.squad) joinSquad(world, enemy, options.squad);
  world.maxEnemyRadius = Math.max(world.maxEnemyRadius, enemy.radius);
  world.findings.enemies.add(def.id);
  world.emit({ type: 'enemySpawned', x: enemy.x, y: enemy.y });
  return enemy;
}

// --- Squads (GDD 9.5, 9.15) --------------------------------------------------------

export function createSquad(world: World, def: EnemyDef, order: SquadOrder): Squad {
  const squad: Squad = {
    id: world.nextSquadId++,
    order,
    faction: def.faction,
    leaderId: -1,
    leaderSlot: -1,
    leaderAlive: false,
    members: 0,
    x: 0,
    y: 0,
    volleyAt: world.steps,
    slots: 0,
  };
  world.squads.set(squad.id, squad);
  return squad;
}

function joinSquad(world: World, enemy: Enemy, squad: Squad): void {
  enemy.squad = squad.id;
  squad.members++;
  if (squad.members === 1) {
    squad.x = enemy.x;
    squad.y = enemy.y;
  }
  const rank = leaderRank(enemy.def);
  const current = world.enemies.items[squad.leaderSlot];
  const currentRank = current && current.active && current.id === squad.leaderId ? leaderRank(current.def) : 0;
  if (rank > currentRank) {
    squad.leaderId = enemy.id;
    squad.leaderSlot = enemy.slot;
    squad.leaderAlive = true;
    // A named leader orders flanks (GDD 9.11, Mercenary Captain).
    if (enemy.def.leader) squad.order = 'Surround';
  }
  if (hasTrait(enemy, 'shield-line')) enemy.formationSlot = squad.slots++;
}

function squadLeader(world: World, squad: Squad): Enemy | undefined {
  if (!squad.leaderAlive) return undefined;
  const leader = world.enemies.items[squad.leaderSlot];
  return leader && leader.active && leader.id === squad.leaderId ? leader : undefined;
}

/** A dead leader leaves the squad with its last order and no formation bonuses (GDD 9.15). */
function leaveSquad(world: World, enemy: Enemy): void {
  const squad = world.squads.get(enemy.squad);
  if (!squad) return;
  squad.members--;
  if (squad.leaderId === enemy.id) squad.leaderAlive = false;
  if (squad.members <= 0) world.squads.delete(squad.id);
}

function updateSquadCentres(world: World): void {
  for (const squad of world.squads.values()) {
    squad.x = 0;
    squad.y = 0;
    squad.members = 0;
  }
  for (const enemy of world.enemies.items) {
    if (!enemy.active || enemy.squad < 0) continue;
    const squad = world.squads.get(enemy.squad);
    if (!squad) continue;
    squad.x += enemy.x;
    squad.y += enemy.y;
    squad.members++;
  }
  for (const squad of world.squads.values()) {
    if (squad.members > 0) {
      squad.x /= squad.members;
      squad.y /= squad.members;
    } else {
      world.squads.delete(squad.id);
    }
  }
}

/** Longbowmen fire together inside a short window after each call from a living leader. */
function volleyOpen(world: World, squad: Squad): boolean {
  const period = Math.round(ENEMY_RULES.volleySeconds * COMBAT.stepsPerSecond);
  return (world.steps - squad.volleyAt) % period < VOLLEY_WINDOW_STEPS;
}

// --- Spawning ----------------------------------------------------------------------

/**
 * Picks a spawn point outside the camera view (GDD 4.11): a random arena
 * point far from the player. The distance limit relaxes when the arena has
 * no point far enough.
 */
export function pickSpawnPoint(world: World, margin: number): { x: number; y: number } {
  const { arena, player, rng } = world;
  const { left, top, right, bottom } = arena.bounds;
  let minimum = COMBAT.spawnMinDistance;
  for (let attempt = 0; attempt < SPAWN_TRIES; attempt++) {
    const x = rng.range(left + margin, right - margin);
    const y = rng.range(top + margin, bottom - margin);
    const dx = x - player.x;
    const dy = y - player.y;
    if (dx * dx + dy * dy >= minimum * minimum && !insideObstacle(x, y, margin, arena)) {
      return { x, y };
    }
    if (attempt % 6 === 5) minimum *= 0.8;
  }
  // Fallback: the corner farthest from the player.
  return {
    x: player.x < (left + right) / 2 ? right - margin : left + margin,
    y: player.y < (top + bottom) / 2 ? bottom - margin : top + margin,
  };
}

/** A spawn entry on its way into the arena. The active limit splits large waves across steps (GDD 4.11). */
export interface Wave {
  readonly members: Array<{ def: EnemyDef; rank: EnemyRank }>;
  next: number;
  readonly squad: Squad | undefined;
  readonly anchors: Array<{ x: number; y: number }>;
  readonly formation: Formation;
  warned: boolean;
}

function clampPoint(world: World, x: number, y: number, margin: number): { x: number; y: number } {
  const { left, top, right, bottom } = world.arena.bounds;
  return {
    x: Math.min(right - margin, Math.max(left + margin, x)),
    y: Math.min(bottom - margin, Math.max(top + margin, y)),
  };
}

/** Flattens a spawn entry, picks its entry points and forms its squad. */
export function prepareWave(world: World, entry: SpawnEntry): Wave {
  const members: Wave['members'] = [];
  const add = (def: EnemyDef, count: number, rank: EnemyRank | undefined): void => {
    for (let i = 0; i < count; i++) members.push({ def, rank: rank ?? 'normal' });
  };
  add(entry.enemy, entry.count, entry.rank);
  for (const member of entry.with ?? []) add(member.enemy, member.count, member.rank);
  // Leaders, Supports and Tanks enter first, so a shield line forms behind them.
  members.sort((a, b) => leaderRank(b.def) - leaderRank(a.def));

  const formation = entry.formation ?? 'cluster';
  const margin = entry.enemy.radius + 8;
  const first = pickSpawnPoint(world, margin);
  const anchors = [first];
  const player = world.player;
  if (formation === 'pincer') {
    // Two entry points on opposite sides of the player (GDD 4.11, flanking).
    anchors.push(clampPoint(world, 2 * player.x - first.x, 2 * player.y - first.y, margin));
  } else if (formation === 'ring') {
    // Three entry points around the player (GDD 4.11, coordinated assaults).
    const angle = Math.atan2(first.y - player.y, first.x - player.x);
    const distance = Math.hypot(first.x - player.x, first.y - player.y);
    for (const turn of [(Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
      anchors.push(
        clampPoint(world, player.x + Math.cos(angle + turn) * distance, player.y + Math.sin(angle + turn) * distance, margin),
      );
    }
  }

  const order = entry.order ?? squadOrder(members.map((member) => member.def));
  const squad = members.length > 1 ? createSquad(world, entry.enemy, order) : undefined;
  return { members, next: 0, squad, anchors, formation, warned: false };
}

/** Spawns up to `room` members of a wave. Returns the number spawned. */
export function spawnFromWave(world: World, wave: Wave, room: number): number {
  let spawned = 0;
  const player = world.player;
  while (wave.next < wave.members.length && spawned < room) {
    const index = wave.next;
    const member = wave.members[index];
    if (!member) break;
    const anchor = wave.anchors[index % wave.anchors.length] ?? { x: 0, y: 0 };
    let x = anchor.x;
    let y = anchor.y;
    if (wave.formation === 'line') {
      // A line across the path to the player: guards in the front rank, the rest behind.
      const dx = player.x - anchor.x;
      const dy = player.y - anchor.y;
      const length = Math.hypot(dx, dy) || 1;
      const row = Math.floor(index / 5);
      const column = (index % 5) - 2;
      x += (-dy / length) * column * 34 - (dx / length) * row * 40;
      y += (dx / length) * column * 34 - (dy / length) * row * 40;
    } else if (wave.members.length > 1) {
      const angle = world.rng.range(0, Math.PI * 2);
      const distance = world.rng.range(0, COMBAT.spawnGroupSpread);
      x += Math.cos(angle) * distance;
      y += Math.sin(angle) * distance;
    }
    if (!spawnEnemy(world, member.def, x, y, { rank: member.rank, squad: wave.squad })) break;
    wave.next++;
    spawned++;
  }
  return spawned;
}

/** Spawns a group around one point, as one squad. Tests and the debug tools use this. */
export function spawnGroup(world: World, def: EnemyDef, count: number, rank: EnemyRank = 'normal'): void {
  const wave = prepareWave(world, { time: 0, enemy: def, count, rank, kind: 'group' });
  spawnFromWave(world, wave, count);
}

/** Summons allies next to an enemy, inside the active limit. Returns the number spawned. */
function summon(world: World, owner: Enemy, def: EnemyDef, count: number): number {
  let spawned = 0;
  for (let i = 0; i < count; i++) {
    if (world.enemies.activeCount >= world.activeLimit) break;
    const angle = world.rng.range(0, Math.PI * 2);
    const distance = owner.radius + def.radius + 6;
    const squad = world.squads.get(owner.squad);
    if (spawnEnemy(world, def, owner.x + Math.cos(angle) * distance, owner.y + Math.sin(angle) * distance, { squad })) {
      spawned++;
    }
  }
  return spawned;
}

// --- Damage taken ------------------------------------------------------------------

function teleportEnemy(world: World, enemy: Enemy, x: number, y: number): void {
  const fromX = enemy.x;
  const fromY = enemy.y;
  enemy.x = x;
  enemy.y = y;
  clampToArena(enemy, world.arena);
  pushOutOfObstacles(enemy, world.arena);
  // No velocity from the jump, so shots never lead a teleport.
  enemy.prevX = enemy.x;
  enemy.prevY = enemy.y;
  world.emit({ type: 'teleport', x1: fromX, y1: fromY, x2: enemy.x, y2: enemy.y });
}

/** Bookkeeping for every hit an enemy takes: regeneration delay, waking and champion traits. */
export function noteDamage(world: World, enemy: Enemy, amount: number, damageType: DamageType): void {
  enemy.sinceDamage = 0;
  if (enemy.action === 'dormant') enemy.action = 'chase';
  if (enemy.rank !== 'champion' || !enemy.active) return;

  if (enemy.championTrait === 'reactive-plating') {
    const index = DAMAGE_TYPES.indexOf(damageType);
    enemy.typeTaken[index] = (enemy.typeTaken[index] ?? 0) + amount;
  } else if (enemy.championTrait === 'phase-shifter' && enemy.health > 0) {
    // Teleports after taking a large burst of damage (GDD 9.13).
    if (enemy.burstTimer <= 0) {
      enemy.burstTimer = ENEMY_RULES.phaseWindow;
      enemy.burstDamage = 0;
    }
    enemy.burstDamage += amount;
    if (enemy.burstDamage >= enemy.maxHealth * ENEMY_RULES.phaseBurstShare) {
      enemy.burstDamage = 0;
      enemy.burstTimer = 0;
      const angle = world.rng.range(0, Math.PI * 2);
      const player = world.player;
      teleportEnemy(
        world,
        enemy,
        player.x + Math.cos(angle) * ENEMY_RULES.phaseDistance,
        player.y + Math.sin(angle) * ENEMY_RULES.phaseDistance,
      );
      if (enemy.action !== 'chase') endAttack(enemy);
    }
  }
}

function shiftResistance(world: World, enemy: Enemy): void {
  // The Anomaly never resists its own weakness.
  const cycle = DAMAGE_TYPES.filter((type) => !enemy.def.weakTo.includes(type));
  if (enemy.shiftTimer <= 0 && enemy.resistType === undefined) enemy.shiftIndex = world.rng.int(0, cycle.length - 1);
  else enemy.shiftIndex = (enemy.shiftIndex + 1) % cycle.length;
  enemy.resistType = cycle[enemy.shiftIndex];
  enemy.shiftTimer = ENEMY_RULES.shiftSeconds;
}

/** Signature traits, elite modifiers and champion traits ticking each step. */
function tickPassives(world: World, enemy: Enemy, distance: number, dt: number): void {
  const burningOrCorroded = hasStatus(enemy, 'Burning') || hasStatus(enemy, 'Corroded');

  if (enemy.health < enemy.maxHealth && !burningOrCorroded) {
    // Regenerator: heals after a short time without damage (GDD 9.11).
    if (hasTrait(enemy, 'regenerate') && enemy.sinceDamage >= ENEMY_RULES.regenDelay) {
      enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.maxHealth * ENEMY_RULES.regenPerSecond * dt);
    }
    // Regenerating elites heal over time (GDD 9.12).
    if (hasModifier(enemy, 'regenerating')) {
      enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.maxHealth * ENEMY_RULES.eliteRegenPerSecond * dt);
    }
  }

  if (hasTrait(enemy, 'shifting-resistance')) {
    enemy.shiftTimer -= dt;
    if (enemy.shiftTimer <= 0) shiftResistance(world, enemy);
  }

  // Chemical Crawler: leaves an acid trail (GDD 9.11).
  if (hasTrait(enemy, 'acid-trail')) {
    const moved = Math.hypot(enemy.x - enemy.trailX, enemy.y - enemy.trailY);
    if (moved >= ENEMY_RULES.acidSpacing) {
      enemy.trailX = enemy.x;
      enemy.trailY = enemy.y;
      addHazard(world, 'acid', enemy.x, enemy.y, ENEMY_RULES.acidRadius, ENEMY_RULES.acidSeconds, {
        damage: enemy.damage * ENEMY_RULES.hazardDamageShare,
        damageType: 'Corrosive',
      });
    }
  }

  // The Unstable: suppresses Auxiliary components on nearby player weapons (GDD 9.11).
  if (hasTrait(enemy, 'suppress-auxiliary') && distance <= ENEMY_RULES.suppressRadius) world.suppressing = true;

  // Vat Chimera: gains a random elite modifier at half health (GDD 9.11).
  if (hasTrait(enemy, 'mutate') && !enemy.mutated && enemy.health <= enemy.maxHealth * ENEMY_RULES.mutateHealthShare) {
    enemy.mutated = true;
    const choices = ELITE_MODIFIER_IDS.filter((id) => !hasModifier(enemy, id));
    const id = world.rng.pick(choices);
    applyModifier(world, enemy, id);
    world.emit({ type: 'mutated', x: enemy.x, y: enemy.y, modifier: id });
  }

  if (hasModifier(enemy, 'magnetised')) world.magnets.push(enemy);

  if (enemy.rank !== 'champion') return;
  switch (enemy.championTrait) {
    case 'purifier':
      enemy.purifyTimer -= dt;
      if (enemy.purifyTimer <= 0) {
        enemy.purifyTimer = ENEMY_RULES.purifySeconds;
        clearStatuses(enemy);
      }
      break;
    case 'reactive-plating':
      enemy.plateTimer -= dt;
      if (enemy.plateTimer <= 0) {
        enemy.plateTimer = ENEMY_RULES.platingSeconds;
        let best = -1;
        let bestAmount = 0;
        for (let index = 0; index < enemy.typeTaken.length; index++) {
          const amount = enemy.typeTaken[index] ?? 0;
          if (amount > bestAmount) {
            best = index;
            bestAmount = amount;
          }
        }
        enemy.plateType = best >= 0 ? DAMAGE_TYPES[best] : undefined;
        enemy.typeTaken.fill(0);
      }
      break;
    case 'phase-shifter':
      if (enemy.burstTimer > 0) enemy.burstTimer -= dt;
      break;
    case 'overclocked':
      if (!enemy.overclocked && enemy.health <= enemy.maxHealth * ENEMY_RULES.overclockedHealthShare) {
        enemy.overclocked = true;
        refreshPace(enemy);
      }
      break;
    case 'warlord': {
      // Summons an escort group at set health thresholds (GDD 9.13).
      const threshold = ENEMY_RULES.warlordThresholds[enemy.thresholdIndex];
      if (threshold !== undefined && enemy.health <= enemy.maxHealth * threshold) {
        enemy.thresholdIndex++;
        summon(world, enemy, escortOf(enemy.def.faction), ENEMY_RULES.warlordEscorts);
      }
      break;
    }
    default:
      break;
  }
}

// --- Decisions ---------------------------------------------------------------------

/** The nearest fragile ally to guard. Iron Sentinels look for Mechanists first (GDD 9.11). */
function findWard(world: World, enemy: Enemy): Enemy | undefined {
  const preferMechanist = hasTrait(enemy, 'guard-mechanist');
  let chosen: Enemy | undefined;
  let chosenScore = Infinity;
  for (const slot of world.grid.query(enemy.x, enemy.y, AI_RULES.allyRadius, scratch)) {
    const other = world.enemies.items[slot];
    if (!other || !other.active || other === enemy || !isWard(other.def)) continue;
    let score = Math.hypot(other.x - enemy.x, other.y - enemy.y);
    if (score > AI_RULES.allyRadius) continue;
    if (preferMechanist && other.def.id !== 'mechanist') score += AI_RULES.allyRadius;
    if (score < chosenScore || (score === chosenScore && chosen && other.slot < chosen.slot)) {
      chosen = other;
      chosenScore = score;
    }
  }
  enemy.wardSlot = chosen ? chosen.slot : -1;
  enemy.wardId = chosen ? chosen.id : -1;
  return chosen;
}

function currentWard(world: World, enemy: Enemy): Enemy | undefined {
  const ward = world.enemies.items[enemy.wardSlot];
  return ward && ward.active && ward.id === enemy.wardId ? ward : undefined;
}

/** The most damaged Mechanical ally inside repair range. */
function repairTarget(world: World, enemy: Enemy): Enemy | undefined {
  let chosen: Enemy | undefined;
  let chosenShare = 0.999;
  for (const slot of world.grid.query(enemy.x, enemy.y, ENEMY_RULES.repairRange, scratch)) {
    const other = world.enemies.items[slot];
    if (!other || !other.active || other === enemy || !other.def.properties.includes('Mechanical')) continue;
    if (Math.hypot(other.x - enemy.x, other.y - enemy.y) > ENEMY_RULES.repairRange) continue;
    const share = other.health / other.maxHealth;
    if (share < chosenShare || (share === chosenShare && chosen && other.slot < chosen.slot)) {
      chosen = other;
      chosenShare = share;
    }
  }
  return chosen;
}

/** The ability an enemy has ready with its conditions met, if any. */
function readyAbility(world: World, enemy: Enemy, distance: number): AbilityKind | undefined {
  if (enemy.traitBits === 0 || enemy.confused > 0) return undefined;
  if (hasTrait(enemy, 'repair') && enemy.abilityCooldown <= 0 && repairTarget(world, enemy)) return 'repair';
  if (
    hasTrait(enemy, 'deploy-crawlers') &&
    enemy.abilityCooldown2 <= 0 &&
    enemy.summoned < ENEMY_RULES.deployCap &&
    world.enemies.activeCount + ENEMY_RULES.deployCount <= world.activeLimit
  ) {
    return 'deploy';
  }
  if (hasTrait(enemy, 'spore-pods') && enemy.abilityCooldown <= 0 && distance <= ENEMY_RULES.sporePodRange * 2.5) {
    return 'spores';
  }
  if (hasTrait(enemy, 'mines') && enemy.abilityCooldown <= 0 && distance <= ENEMY_RULES.mineThrowRange + 120) {
    return 'mine';
  }
  if (hasTrait(enemy, 'teleport') && enemy.abilityCooldown <= 0 && distance > ENEMY_RULES.teleportMin) return 'teleport';
  return undefined;
}

/** True when the flank slot has no living holder still flanking. */
function flankSlotFree(world: World, index: number): boolean {
  const holder = world.flankHolders[index];
  if (!holder) return true;
  const enemy = world.enemies.items[holder.slot];
  return !enemy || !enemy.active || enemy.id !== holder.id || enemy.ai !== 'flank' || enemy.flankSlot !== index;
}

/** The free flank slot furthest behind the player's facing, close to the enemy's side. -1 when none is free. */
function pickFlankSlot(world: World, enemy: Enemy): number {
  const player = world.player;
  const count = AI_RULES.flankSlots;
  const bearing = Math.atan2(enemy.y - player.y, enemy.x - player.x);
  let best = -1;
  let bestScore = -Infinity;
  for (let index = 0; index < count; index++) {
    if (!flankSlotFree(world, index)) continue;
    const angle = (index / count) * Math.PI * 2;
    const behind = -(Math.cos(angle) * player.faceX + Math.sin(angle) * player.faceY);
    let turn = Math.abs(angle - bearing) % (Math.PI * 2);
    if (turn > Math.PI) turn = Math.PI * 2 - turn;
    const score = behind - 0.35 * turn;
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  }
  return best;
}

/** Attack kinds a token gates. Detonations and shockwaves need none (NOTES.md, GDD 9.15). */
function needsToken(enemy: Enemy): boolean {
  return enemy.def.attack !== 'detonate' && enemy.def.attack !== 'shockwave';
}

function formationPoint(world: World, enemy: Enemy, squad: Squad): { x: number; y: number } | undefined {
  if (enemy.formationSlot < 0) return undefined;
  const leader = squadLeader(world, squad);
  if (!leader || leader === enemy || !hasTrait(leader, 'tower-shield')) return undefined;
  const player = world.player;
  const dx = player.x - leader.x;
  const dy = player.y - leader.y;
  const length = Math.hypot(dx, dy) || 1;
  const slot = enemy.formationSlot;
  const side = slot % 2 === 0 ? 1 : -1;
  const column = (Math.floor(slot / 2) % 3) + 0.5;
  const row = Math.floor(slot / 6);
  const back = 46 + row * 32;
  return {
    x: leader.x - (dx / length) * back + (-dy / length) * side * column * 30,
    y: leader.y - (dy / length) * back + (dx / length) * side * column * 30,
  };
}

/** Scores the six actions and picks the best (GDD 9.15). */
function decide(world: World, enemy: Enemy, distance: number): void {
  const def = enemy.def;
  const player = world.player;
  const squad = world.squads.get(enemy.squad);
  const gap = distance - enemy.radius - player.radius;

  const guard = isGuard(def) || hasTrait(enemy, 'guard-mechanist');
  const ward = guard ? findWard(world, enemy) : undefined;
  enemy.ability = readyAbility(world, enemy, distance);

  const ranged = def.attack === 'ranged';
  const threatened =
    ranged && hasTrait(enemy, 'kite') && enemy.attackCooldown > 0 && gap < enemy.range * ENEMY_RULES.kiteShare;

  const formation = squad ? formationPoint(world, enemy, squad) : undefined;
  const leader = squad ? squadLeader(world, squad) : undefined;
  // A shield line holds until the player closes on the Bastion (GDD 9.11).
  const formationOpen =
    formation !== undefined &&
    leader !== undefined &&
    Math.hypot(player.x - leader.x, player.y - leader.y) > 200 &&
    Math.hypot(formation.x - enemy.x, formation.y - enemy.y) > 24;

  const bearingX = (enemy.x - player.x) / (distance || 1);
  const bearingY = (enemy.y - player.y) / (distance || 1);
  const inFront = bearingX * player.faceX + bearingY * player.faceY > 0;
  const slot = enemy.flankSlot >= 0 && !flankSlotFree(world, enemy.flankSlot) ? enemy.flankSlot : pickFlankSlot(world, enemy);

  enemy.ai = chooseAction(
    {
      distance,
      attackReady: enemy.attackCooldown <= 0,
      tokenFree: enemy.hasToken || !needsToken(enemy) || world.tokensHeld < world.tokenLimit,
      guard,
      wardNear: ward !== undefined,
      wardHealth: ward ? ward.health / ward.maxHealth : 1,
      healthShare: enemy.health / enemy.maxHealth,
      threatened,
      disengaging: enemy.retreatTimer > 0,
      squadDistance: squad ? Math.hypot(squad.x - enemy.x, squad.y - enemy.y) : 0,
      squadSize: squad ? squad.members : 1,
      leaderAlive: leader !== undefined,
      leaderLost: squad !== undefined && squad.leaderId >= 0 && !squad.leaderAlive,
      formationOpen,
      inFront,
      flankSlotFree: slot >= 0 && gap > AI_RULES.waitGap,
      speed: enemy.speed,
      abilityReady: enemy.ability !== undefined,
      order: squad?.order,
      nearHome: Math.hypot(player.x - enemy.homeX, player.y - enemy.homeY) <= AI_RULES.homeRadius,
      weakTarget: player.health <= player.stats.maxHealth * AI_RULES.weakTargetShare,
    },
    def.personality,
    world.rng,
  );

  if (enemy.ai === 'flank' && slot >= 0) {
    enemy.flankSlot = slot;
    world.flankHolders[slot] = { slot: enemy.slot, id: enemy.id };
  } else {
    enemy.flankSlot = -1;
    if (enemy.ai === 'flank') enemy.ai = 'attack';
  }
}

// --- Attacks -----------------------------------------------------------------------

/** Nearby Mercenary Captains and Commanding elites raise ally damage (GDD 9.11, 9.12). */
function commandFactor(world: World, enemy: Enemy): number {
  for (const slot of world.grid.query(enemy.x, enemy.y, ENEMY_RULES.commandRadius, scratch)) {
    const other = world.enemies.items[slot];
    if (!other || !other.active || other === enemy) continue;
    if (!hasTrait(other, 'command') && !hasModifier(other, 'commanding')) continue;
    if (Math.hypot(other.x - enemy.x, other.y - enemy.y) <= ENEMY_RULES.commandRadius) {
      return 1 + tierValue('modifierSize', ENEMY_RULES.commandBonus);
    }
  }
  return 1;
}

/** Damage of this enemy's next strike, with command bonuses. */
export function strikeDamage(world: World, enemy: Enemy): number {
  // The Forge Marshal's war banner raises ally damage nearby (GDD 10.5).
  return enemy.damage * commandFactor(world, enemy) * (world.bosses.length > 0 ? bannerFactor(world, enemy.x, enemy.y) : 1);
}

/** A direct hit on the player, with the on-hit traits. Returns true when the hit landed. */
function strikePlayer(world: World, enemy: Enemy): boolean {
  const landed = hitPlayer(world, strikeDamage(world, enemy), enemy.attackType);
  if (!landed) return false;
  const player = world.player;
  // Clockwork Crawler: latches on and slows the player (GDD 9.11).
  if (hasTrait(enemy, 'latch')) {
    const current = player.slowTimer > 0 ? player.slowFactor : 1;
    player.slowFactor = Math.max(ENEMY_RULES.latchSlowMin, current * ENEMY_RULES.latchSlow);
    player.slowTimer = ENEMY_RULES.latchSeconds;
  }
  // Highwayman: steals gold on hit (GDD 9.11).
  if (hasTrait(enemy, 'steal-gold')) {
    const amount = Math.min(ENEMY_RULES.stealGold, world.gold);
    if (amount > 0) {
      world.gold -= amount;
      enemy.carriedGold += amount;
      world.emit({ type: 'goldStolen', amount, x: enemy.x, y: enemy.y });
    }
  }
  // Vampiric elites heal on each hit against the player (GDD 9.12).
  if (hasModifier(enemy, 'vampiric')) {
    enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.maxHealth * ENEMY_RULES.vampiricHealShare);
  }
  return true;
}

function endAttack(enemy: Enemy): void {
  enemy.action = 'chase';
  enemy.actionTimer = 0;
  enemy.hasToken = false;
  enemy.attackCooldown = ENEMY_RULES.attackCooldown / enemy.attackRate;
}

function beginRecovery(enemy: Enemy, seconds: number): void {
  enemy.action = 'recover';
  enemy.actionTimer = seconds;
  enemy.actionDuration = seconds;
}

function windupSeconds(enemy: Enemy): number {
  switch (enemy.def.attack) {
    case 'ranged':
      return ENEMY_RULES.rangedWindup;
    case 'slam':
      return ENEMY_RULES.slamWindup;
    case 'detonate':
      return ENEMY_RULES.detonateWindup;
    case 'charge':
      return enemy.def.charge?.windup ?? COMBAT.enemyMeleeWindup;
    case 'shockwave':
      return ENEMY_RULES.shockwaveWindup;
    default:
      return COMBAT.enemyMeleeWindup;
  }
}

/** Starts the wind-up when the attack is ready, in range and a token is free. Returns true on a start. */
function tryAttack(world: World, enemy: Enemy, gap: number, distance: number): boolean {
  const player = world.player;
  if (enemy.attackCooldown > 0 || enemy.confused > 0 || player.health <= 0) return false;
  const def = enemy.def;
  let inRange: boolean;
  switch (def.attack) {
    case 'ranged': {
      inRange = gap <= enemy.range && lineOfSight(world.arena, enemy.x, enemy.y, player.x, player.y, ENEMY_RULES.shotRadius);
      // Fires volleys on command: a living leader calls the moment (GDD 9.11).
      if (inRange && hasTrait(enemy, 'volley')) {
        const squad = world.squads.get(enemy.squad);
        if (squad && squadLeader(world, squad) && !volleyOpen(world, squad)) inRange = false;
      }
      break;
    }
    case 'slam':
      inRange = gap <= ENEMY_RULES.slamReach;
      break;
    case 'detonate':
      inRange = gap <= ENEMY_RULES.detonateGap;
      break;
    case 'charge':
      inRange = gap <= (def.charge?.trigger ?? enemy.range) && lineOfSight(world.arena, enemy.x, enemy.y, player.x, player.y);
      break;
    case 'shockwave':
      inRange = distance <= ENEMY_RULES.shockwaveRadius * 0.75;
      break;
    default:
      inRange = gap <= enemy.range;
      break;
  }
  if (!inRange) return false;

  if (needsToken(enemy) && !enemy.hasToken) {
    if (world.tokensHeld >= world.tokenLimit) return false;
    enemy.hasToken = true;
    world.tokensHeld++;
  }
  enemy.action = 'windup';
  enemy.actionDuration = windupSeconds(enemy);
  enemy.actionTimer = enemy.actionDuration;
  enemy.moveX = 0;
  enemy.moveY = 0;
  // Slams and charges lock their aim at the start, so a sidestep works (GDD 9.16).
  if (def.attack === 'slam') {
    enemy.aimX = enemy.x + enemy.faceX * (enemy.radius + ENEMY_RULES.slamReach);
    enemy.aimY = enemy.y + enemy.faceY * (enemy.radius + ENEMY_RULES.slamReach);
  } else if (def.attack === 'charge') {
    const reach = def.charge?.distance ?? 200;
    enemy.aimX = enemy.x + enemy.faceX * reach;
    enemy.aimY = enemy.y + enemy.faceY * reach;
  } else {
    enemy.aimX = player.x;
    enemy.aimY = player.y;
  }
  return true;
}

/** The strike at the end of a wind-up. */
function strike(world: World, enemy: Enemy, gap: number): void {
  const def = enemy.def;
  const player = world.player;
  switch (def.attack) {
    case 'ranged': {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      fireEnemyShot(
        world,
        enemy.x + (dx / length) * enemy.radius,
        enemy.y + (dy / length) * enemy.radius,
        dx / length,
        dy / length,
        strikeDamage(world, enemy),
        enemy.attackType,
        enemy.range + 160,
      );
      beginRecovery(enemy, ENEMY_RULES.rangedRecover);
      break;
    }
    case 'slam': {
      world.queueBlast({
        x: enemy.aimX,
        y: enemy.aimY,
        radius: ENEMY_RULES.slamRadius,
        damage: strikeDamage(world, enemy),
        damageType: enemy.attackType,
        hurtsEnemies: false,
      });
      // Forgeguard Knight: hammer slams leave burning ground for a short time (GDD 9.11).
      if (hasTrait(enemy, 'burning-slam')) {
        addHazard(world, 'burning', enemy.aimX, enemy.aimY, ENEMY_RULES.slamRadius, ENEMY_RULES.burningGroundSeconds, {
          damage: enemy.damage * ENEMY_RULES.hazardDamageShare,
          damageType: 'Fire',
        });
      }
      beginRecovery(enemy, ENEMY_RULES.slamRecover);
      break;
    }
    case 'detonate':
      // The death handler queues the blast, so a Volatile Specimen shot down bursts too.
      world.lastHitType = enemy.attackType;
      killEnemy(world, enemy, -1, 0);
      break;
    case 'charge': {
      enemy.action = 'charge';
      enemy.chargeLeft = def.charge?.distance ?? 200;
      enemy.chargeHit = false;
      enemy.runOverId = -1;
      const dx = enemy.aimX - enemy.x;
      const dy = enemy.aimY - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      enemy.faceX = dx / length;
      enemy.faceY = dy / length;
      break;
    }
    case 'shockwave':
      addHazard(
        world,
        'shockwave',
        enemy.x,
        enemy.y,
        enemy.radius,
        ENEMY_RULES.shockwaveRadius / ENEMY_RULES.shockwaveSpeed,
        { damage: strikeDamage(world, enemy), damageType: enemy.attackType },
      );
      beginRecovery(enemy, ENEMY_RULES.shockwaveRecover);
      break;
    default:
      // The strike lands when the player is still in range (GDD 15.3).
      if (gap <= enemy.range) strikePlayer(world, enemy);
      beginRecovery(enemy, COMBAT.enemyMeleeRecover);
      break;
  }
}

/** One step of a charge: a dash along a straight line. */
function updateCharge(world: World, enemy: Enemy, dt: number, pace: number): void {
  const charge = enemy.def.charge;
  const player = world.player;
  const travel = Math.min((charge?.speed ?? 300) * pace * dt, enemy.chargeLeft);
  const wantX = enemy.x + enemy.faceX * travel;
  const wantY = enemy.y + enemy.faceY * travel;
  enemy.x = wantX;
  enemy.y = wantY;
  enemy.chargeLeft -= travel;
  pushOutOfObstacles(enemy, world.arena);
  clampToArena(enemy, world.arena);
  const blocked = Math.hypot(enemy.x - wantX, enemy.y - wantY) > 0.5;

  if (!enemy.chargeHit && player.health > 0) {
    const reach = enemy.radius + player.radius + 2;
    if ((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2 <= reach * reach) {
      enemy.chargeHit = true;
      strikePlayer(world, enemy);
    }
  }
  // A charge runs over constructs in its path (NOTES.md, GDD 9.13).
  for (const construct of world.constructs.items) {
    if (!construct.active || construct.id === enemy.runOverId) continue;
    const reach = enemy.radius + construct.radius;
    if ((construct.x - enemy.x) ** 2 + (construct.y - enemy.y) ** 2 <= reach * reach) {
      enemy.runOverId = construct.id;
      damageConstruct(world, construct, enemy.damage);
    }
  }

  if (blocked) {
    // Gear Lancer: stalls after hitting a wall (GDD 9.11).
    if (hasTrait(enemy, 'stall-on-wall')) {
      enemy.action = 'stall';
      enemy.actionTimer = ENEMY_RULES.stallSeconds;
      enemy.actionDuration = ENEMY_RULES.stallSeconds;
      enemy.hasToken = false;
    } else {
      beginRecovery(enemy, ENEMY_RULES.chargeRecover);
    }
  } else if (enemy.chargeLeft <= 1e-6) {
    beginRecovery(enemy, ENEMY_RULES.chargeRecover);
  }
}

// --- Abilities ---------------------------------------------------------------------

function abilityCast(kind: AbilityKind): number {
  switch (kind) {
    case 'repair':
      return ENEMY_RULES.repairCast;
    case 'deploy':
      return ENEMY_RULES.deployCast;
    case 'spores':
      return ENEMY_RULES.sporeCast;
    case 'mine':
      return ENEMY_RULES.mineCast;
    default:
      return ENEMY_RULES.teleportCast;
  }
}

function startAbility(world: World, enemy: Enemy, kind: AbilityKind, distance: number): void {
  const player = world.player;
  enemy.action = 'cast';
  enemy.actionDuration = abilityCast(kind);
  enemy.actionTimer = enemy.actionDuration;
  enemy.moveX = 0;
  enemy.moveY = 0;
  const dx = (player.x - enemy.x) / (distance || 1);
  const dy = (player.y - enemy.y) / (distance || 1);
  if (kind === 'mine') {
    // The mine lands on the player's position, inside the throw range.
    const reach = Math.min(distance, ENEMY_RULES.mineThrowRange);
    enemy.aimX = enemy.x + dx * reach;
    enemy.aimY = enemy.y + dy * reach;
  } else if (kind === 'spores') {
    const reach = Math.min(Math.max(0, distance - 40), ENEMY_RULES.sporePodRange);
    const spread = world.rng.range(-0.5, 0.5);
    enemy.aimX = enemy.x + Math.cos(Math.atan2(dy, dx) + spread) * reach;
    enemy.aimY = enemy.y + Math.sin(Math.atan2(dy, dx) + spread) * reach;
  } else if (kind === 'teleport') {
    // Teleports short distances: a new point around the player (GDD 9.11).
    const angle = world.rng.range(0, Math.PI * 2);
    const reach = world.rng.range(ENEMY_RULES.teleportMin, ENEMY_RULES.teleportMax);
    const arena = world.arena;
    enemy.aimX = Math.min(arena.width - enemy.radius, Math.max(enemy.radius, player.x + Math.cos(angle) * reach));
    enemy.aimY = Math.min(arena.height - enemy.radius, Math.max(enemy.radius, player.y + Math.sin(angle) * reach));
  } else {
    enemy.aimX = enemy.x;
    enemy.aimY = enemy.y;
  }
}

function performAbility(world: World, enemy: Enemy, kind: AbilityKind): void {
  switch (kind) {
    case 'repair': {
      // Mechanist: repairs mechanical allies (GDD 9.11).
      const target = repairTarget(world, enemy);
      if (target) {
        target.health = Math.min(target.maxHealth, target.health + target.maxHealth * ENEMY_RULES.repairShare);
        world.emit({ type: 'repair', x1: enemy.x, y1: enemy.y, x2: target.x, y2: target.y });
      }
      enemy.abilityCooldown = ENEMY_RULES.repairCooldown;
      break;
    }
    case 'deploy':
      // Mechanist: deploys Clockwork Crawlers (GDD 9.11).
      enemy.summoned += summon(world, enemy, CRAWLER, ENEMY_RULES.deployCount);
      enemy.abilityCooldown2 = ENEMY_RULES.deployCooldown;
      break;
    case 'spores':
      // Spore Mother: spawns spore pods, which burst into slowing clouds (GDD 9.11).
      addHazard(world, 'pod', enemy.aimX, enemy.aimY, 14, ENEMY_RULES.sporePodSeconds);
      enemy.abilityCooldown = ENEMY_RULES.sporeCooldown;
      break;
    case 'mine':
      // Rogue Inventor: throws traps and mines (GDD 9.11).
      addHazard(world, 'mine', enemy.aimX, enemy.aimY, 12, ENEMY_RULES.mineSeconds, {
        damage: enemy.damage,
        damageType: enemy.attackType,
        arming: ENEMY_RULES.mineArmSeconds,
      });
      enemy.abilityCooldown = ENEMY_RULES.mineCooldown;
      break;
    case 'teleport':
      teleportEnemy(world, enemy, enemy.aimX, enemy.aimY);
      enemy.abilityCooldown = ENEMY_RULES.teleportCooldown;
      break;
  }
}

// --- Movement ----------------------------------------------------------------------

/** Turns the facing toward a direction at a limited rate, so shield carriers leave an opening. */
export function turnToward(enemy: Enemy, dirX: number, dirY: number, rate: number, dt: number): void {
  const current = Math.atan2(enemy.faceY, enemy.faceX);
  let difference = Math.atan2(dirY, dirX) - current;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  const turn = Math.max(-rate * dt, Math.min(rate * dt, difference));
  enemy.faceX = Math.cos(current + turn);
  enemy.faceY = Math.sin(current + turn);
}

/** True when the enemy carries a frontal shield: Royal Bastions and Shielded elites (GDD 9.11, 9.12). */
export function hasShield(enemy: Enemy): boolean {
  return hasTrait(enemy, 'tower-shield') || hasModifier(enemy, 'shielded');
}

/** True when a shot travelling along (dirX, dirY) strikes the enemy's shield side. */
export function shieldFaces(enemy: Enemy, dirX: number, dirY: number): boolean {
  return hasShield(enemy) && -(dirX * enemy.faceX + dirY * enemy.faceY) >= ENEMY_RULES.frontCos;
}

/**
 * Shielded elites block frontal projectiles outright (GDD 9.12). The shield
 * drops while the elite attacks or stands stopped, so every weapon finds an opening.
 */
export function shieldBlocks(enemy: Enemy, dirX: number, dirY: number): boolean {
  return (
    hasModifier(enemy, 'shielded') && enemy.action === 'chase' && !isStopped(enemy) && shieldFaces(enemy, dirX, dirY)
  );
}

function face(enemy: Enemy, dirX: number, dirY: number, dt: number): void {
  if (hasShield(enemy)) {
    turnToward(enemy, dirX, dirY, ENEMY_RULES.shieldTurnRate, dt);
  } else {
    enemy.faceX = dirX;
    enemy.faceY = dirY;
  }
}

function setMove(enemy: Enemy, dirX: number, dirY: number, share: number): void {
  const length = Math.hypot(dirX, dirY);
  if (length < 1e-6) {
    enemy.moveX = 0;
    enemy.moveY = 0;
    return;
  }
  enemy.moveX = (dirX / length) * share;
  enemy.moveY = (dirY / length) * share;
}

/** Heads for a point and stops inside `arrive` pixels. Returns true on arrival. */
function seek(enemy: Enemy, x: number, y: number, arrive: number, share = 1): boolean {
  const dx = x - enemy.x;
  const dy = y - enemy.y;
  if (dx * dx + dy * dy <= arrive * arrive) {
    enemy.moveX = 0;
    enemy.moveY = 0;
    return true;
  }
  setMove(enemy, dx, dy, share);
  return false;
}

/** Simple avoidance around obstacles (GDD 9.15): slide along the side the enemy heads for. */
function avoidObstacles(world: World, enemy: Enemy): void {
  if (enemy.moveX === 0 && enemy.moveY === 0) return;
  for (const obstacle of world.arena.obstacles) {
    const ox = obstacle.x - enemy.x;
    const oy = obstacle.y - enemy.y;
    const reach = obstacle.radius + enemy.radius + AI_RULES.avoidMargin;
    const distanceSq = ox * ox + oy * oy;
    if (distanceSq > reach * reach) continue;
    const distance = Math.sqrt(distanceSq) || 1;
    const toward = (enemy.moveX * ox + enemy.moveY * oy) / distance;
    if (toward <= 0) continue;
    // Tangent on the side of the current heading.
    const cross = enemy.moveX * oy - enemy.moveY * ox;
    const side = cross >= 0 ? 1 : -1;
    const share = Math.hypot(enemy.moveX, enemy.moveY);
    setMove(enemy, (oy / distance) * side, (-ox / distance) * side, share);
    return;
  }
}

/** Sets the movement for the chosen action and starts attacks and abilities. */
function steer(world: World, enemy: Enemy, toPlayerX: number, toPlayerY: number, distance: number): void {
  const player = world.player;
  const def = enemy.def;
  const gap = distance - enemy.radius - player.radius;

  // Siege Breaker: targets and destroys player constructs and traps first (GDD 9.13).
  if (enemy.championTrait === 'siege-breaker' && siege(world, enemy)) return;

  if (enemy.ai === 'ability' && enemy.ability) {
    startAbility(world, enemy, enemy.ability, distance);
    return;
  }

  const disengaging = enemy.ai === 'retreat' && enemy.retreatTimer > 0;
  if (!disengaging && tryAttack(world, enemy, gap, distance)) return;

  switch (enemy.ai) {
    case 'retreat':
      setMove(enemy, -toPlayerX, -toPlayerY, 1);
      return;
    case 'regroup': {
      const squad = world.squads.get(enemy.squad);
      const point = squad ? (formationPoint(world, enemy, squad) ?? squad) : undefined;
      if (point) {
        seek(enemy, point.x, point.y, 20);
        return;
      }
      break;
    }
    case 'protect': {
      const ward = currentWard(world, enemy);
      if (ward) {
        // Stand between the ward and the player.
        const dx = player.x - ward.x;
        const dy = player.y - ward.y;
        const length = Math.hypot(dx, dy) || 1;
        const hold = Math.min(AI_RULES.guardDistance + ward.radius + enemy.radius, length * 0.5);
        seek(enemy, ward.x + (dx / length) * hold, ward.y + (dy / length) * hold, 12);
        return;
      }
      break;
    }
    case 'flank': {
      if (enemy.flankSlot >= 0 && gap > AI_RULES.waitGap) {
        const angle = (enemy.flankSlot / AI_RULES.flankSlots) * Math.PI * 2;
        const x = player.x + Math.cos(angle) * AI_RULES.flankRadius;
        const y = player.y + Math.sin(angle) * AI_RULES.flankRadius;
        if (!seek(enemy, x, y, 40)) return;
      }
      // In position: strike from the flank.
      enemy.ai = 'attack';
      enemy.flankSlot = -1;
      break;
    }
    default:
      break;
  }

  // Attack, and every action with no goal left.
  if (def.attack === 'ranged' || def.attack === 'shockwave') {
    const hold = enemy.range * ENEMY_RULES.holdShare;
    if (gap > hold) {
      setMove(enemy, toPlayerX, toPlayerY, 1);
    } else if (hasTrait(enemy, 'kite') && gap < enemy.range * ENEMY_RULES.kiteShare) {
      setMove(enemy, -toPlayerX, -toPlayerY, 0.8);
    } else if (def.attack === 'ranged') {
      // Sidestep while the next shot readies. Without a line of sight the sidestep finds one.
      const clear = lineOfSight(world.arena, enemy.x, enemy.y, player.x, player.y, ENEMY_RULES.shotRadius);
      setMove(enemy, -toPlayerY * enemy.strafe, toPlayerX * enemy.strafe, clear ? 0.35 : 1);
    } else {
      setMove(enemy, 0, 0, 0);
    }
    return;
  }

  const waiting = needsToken(enemy) && !enemy.hasToken && world.tokensHeld >= world.tokenLimit;
  if (waiting && gap <= AI_RULES.waitGap + 30) {
    // No token free: circle the player and wait (GDD 9.15).
    const radial = (gap - AI_RULES.waitGap) / 30;
    setMove(
      enemy,
      -toPlayerY * enemy.strafe + toPlayerX * radial,
      toPlayerX * enemy.strafe + toPlayerY * radial,
      0.7,
    );
    return;
  }
  const stop = def.attack === 'charge' ? Math.max(0, (def.charge?.trigger ?? 0) * 0.6) : 0;
  if (gap > stop) setMove(enemy, toPlayerX, toPlayerY, 1);
  else setMove(enemy, 0, 0, 0);
}

/** Siege Breaker movement and strikes. Returns false when no construct or trap is left. */
function siege(world: World, enemy: Enemy): boolean {
  let targetX = 0;
  let targetY = 0;
  let targetRadius = 0;
  let best = Infinity;
  let construct: (typeof world.constructs.items)[number] | undefined;
  let trap: (typeof world.traps.items)[number] | undefined;
  for (const candidate of world.constructs.items) {
    if (!candidate.active) continue;
    const distance = Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y);
    if (distance < best) {
      best = distance;
      construct = candidate;
      trap = undefined;
      targetX = candidate.x;
      targetY = candidate.y;
      targetRadius = candidate.radius;
    }
  }
  for (const candidate of world.traps.items) {
    if (!candidate.active) continue;
    const distance = Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y);
    if (distance < best) {
      best = distance;
      trap = candidate;
      construct = undefined;
      targetX = candidate.x;
      targetY = candidate.y;
      targetRadius = 0;
    }
  }
  if (!construct && !trap) return false;
  if (best - enemy.radius - targetRadius <= ENEMY_RULES.siegeReach) {
    enemy.moveX = 0;
    enemy.moveY = 0;
    if (enemy.attackCooldown <= 0) {
      enemy.attackCooldown = COMBAT.enemyMeleeRecover / enemy.attackRate;
      if (construct) damageConstruct(world, construct, construct.maxHealth);
      else if (trap) {
        world.emit({ type: 'constructDestroyed', x: trap.x, y: trap.y });
        world.traps.release(trap);
      }
    }
  } else {
    seek(enemy, targetX, targetY, 0);
  }
  return true;
}

/** Speed after slows and auras. Juggernauts ignore slows (GDD 9.13). */
function currentSpeed(enemy: Enemy, distance: number, magneticSlow: number): number {
  let speed = enemy.speed;
  if (isJuggernaut(enemy)) return speed;
  if (enemy.slowTimer > 0) speed *= enemy.slowFactor;
  // Magnetic Field: Metallic enemies slow down near the player (GDD 7.19).
  if (magneticSlow < 1 && distance <= SYNERGY_RULES.magneticSlowRange && enemy.def.properties.includes('Metallic')) {
    speed *= magneticSlow;
  }
  return speed;
}

function separate(world: World, enemy: Enemy): void {
  const enemies = world.enemies.items;
  for (const slot of world.grid.query(enemy.x, enemy.y, enemy.radius + world.maxEnemyRadius, scratch)) {
    if (slot === enemy.slot) continue;
    const other = enemies[slot];
    if (!other || !other.active) continue;
    const ox = enemy.x - other.x;
    const oy = enemy.y - other.y;
    const minimum = enemy.radius + other.radius;
    const gapSq = ox * ox + oy * oy;
    if (gapSq >= minimum * minimum) continue;
    const gap = Math.sqrt(gapSq);
    if (gap < 1e-6) {
      // Same point: split along a fixed axis by slot order.
      enemy.x += enemy.slot < other.slot ? -0.5 : 0.5;
      continue;
    }
    const push = ((minimum - gap) * 0.5) / gap;
    enemy.x += ox * push;
    enemy.y += oy * push;
  }
}

// --- The enemy loop ----------------------------------------------------------------

export function updateEnemies(world: World, dt: number): void {
  const player = world.player;
  const enemies = world.enemies.items;
  const magneticSlow = world.synergies.has('magnetic-field')
    ? 1 - tierValue('modifierSize', SYNERGY_RULES.magneticSlow)
    : 1;
  const decideSteps = Math.round(COMBAT.stepsPerSecond / AI_RULES.decisionsPerSecond);

  if (world.steps % SQUAD_UPDATE_STEPS === 0) updateSquadCentres(world);

  // Attack tokens: recounted each step, so a token never leaks (GDD 9.15).
  let held = 0;
  for (const enemy of enemies) if (enemy.active && enemy.hasToken) held++;
  world.tokensHeld = held;
  world.magnets.length = 0;
  world.suppressing = false;

  for (const enemy of enemies) {
    if (!enemy.active) continue;
    // Velocity over the last step, measured from position, so pushes and pulls count.
    enemy.vx = (enemy.x - enemy.prevX) / dt;
    enemy.vy = (enemy.y - enemy.prevY) / dt;
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.chainGuard = Math.max(0, enemy.chainGuard - dt);
    enemy.confused = Math.max(0, enemy.confused - dt);
    enemy.sinceDamage += dt;
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
      if (enemy.slowTimer <= 0) enemy.slowFactor = 1;
    }

    let dx = player.x - enemy.x;
    let dy = player.y - enemy.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    const toPlayerX = distance > 1e-6 ? dx / distance : 0;
    const toPlayerY = distance > 1e-6 ? dy / distance : 1;

    if (enemy.traitBits !== 0 || enemy.rank !== 'normal') {
      tickPassives(world, enemy, distance, dt);
      if (!enemy.active) continue;
    }

    // The Ancient Guardian sleeps until the player comes close or a hit lands (GDD 9.11).
    if (enemy.action === 'dormant') {
      if (distance <= ENEMY_RULES.wakeRadius) enemy.action = 'chase';
      continue;
    }

    // Frozen, Stunned and Short-circuited enemies stop: no movement, no attack, timers on hold (GDD 9.14).
    if (isStopped(enemy)) continue;
    // Overheated enemies attack slower (GDD 9.14).
    const actionDt = (hasStatus(enemy, 'Overheated') ? dt / STATUS_RULES.overheated.attackSlow : dt) * enemy.attackRate;
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - actionDt / enemy.attackRate);
    enemy.abilityCooldown = Math.max(0, enemy.abilityCooldown - dt);
    enemy.abilityCooldown2 = Math.max(0, enemy.abilityCooldown2 - dt);
    enemy.retreatTimer = Math.max(0, enemy.retreatTimer - dt);

    const near = distance <= AI_RULES.nearDistance;
    const thinking = near || (world.steps + enemy.id) % thinkInterval(distance) === 0;
    const pace = currentSpeed(enemy, distance, magneticSlow) / (enemy.speed || 1);

    // Bosses follow their own controller (src/sim/world/bosses.ts).
    if (enemy.boss) continue;

    switch (enemy.action) {
      case 'chase': {
        // An enemy with no target stands still and starts no attack (Smoke Canister, GDD 7.18).
        if (enemy.confused > 0) break;
        if (thinking) {
          if (world.steps >= enemy.decideAt) {
            enemy.decideAt = world.steps + decideSteps;
            decide(world, enemy, distance);
          }
          if (distance > 1e-6) face(enemy, toPlayerX, toPlayerY, dt * (near ? 1 : thinkInterval(distance)));
          steer(world, enemy, toPlayerX, toPlayerY, distance);
          avoidObstacles(world, enemy);
        }
        if (enemy.action === 'chase') {
          const step = enemy.speed * pace * dt;
          // Melee enemies stop at the player's edge.
          const room = Math.max(0, distance - enemy.radius - player.radius);
          const toward = enemy.moveX * toPlayerX + enemy.moveY * toPlayerY;
          const limit = toward > 0.7 ? Math.min(step, room) : step;
          enemy.x += enemy.moveX * limit;
          enemy.y += enemy.moveY * limit;
        }
        break;
      }
      case 'windup': {
        const kind = enemy.def.attack;
        if (kind !== 'slam' && kind !== 'charge' && distance > 1e-6) face(enemy, toPlayerX, toPlayerY, dt);
        enemy.actionTimer -= actionDt;
        if (enemy.actionTimer <= 0) strike(world, enemy, distance - enemy.radius - player.radius);
        break;
      }
      case 'charge':
        updateCharge(world, enemy, dt, pace);
        break;
      case 'cast':
        enemy.actionTimer -= actionDt;
        if (enemy.actionTimer <= 0) {
          const kind = enemy.ability;
          if (kind) performAbility(world, enemy, kind);
          enemy.ability = undefined;
          beginRecovery(enemy, ABILITY_RECOVER);
        }
        break;
      case 'stall':
        enemy.actionTimer -= dt;
        if (enemy.actionTimer <= 0) endAttack(enemy);
        break;
      default:
        enemy.actionTimer -= actionDt;
        if (enemy.actionTimer <= 0) {
          endAttack(enemy);
          // Hunting Hounds strike, then retreat (GDD 9.11).
          if (hasTrait(enemy, 'strike-retreat')) {
            enemy.retreatTimer = ENEMY_RULES.retreatSeconds;
            enemy.decideAt = 0;
          }
        }
        break;
    }
    if (!enemy.active) continue;

    // Keep enemies from stacking on each other. Uses the grid of the last step.
    if (thinking) separate(world, enemy);

    // Enemies never overlap the player, except during a charge.
    if (enemy.action !== 'charge') {
      dx = enemy.x - player.x;
      dy = enemy.y - player.y;
      distance = Math.sqrt(dx * dx + dy * dy);
      const minimum = enemy.radius + player.radius;
      if (distance < minimum && distance > 1e-6) {
        enemy.x = player.x + (dx / distance) * minimum;
        enemy.y = player.y + (dy / distance) * minimum;
      }
      pushOutOfObstacles(enemy, world.arena);
      clampToArena(enemy, world.arena);
    }
  }
}

// --- Death -------------------------------------------------------------------------

/**
 * Death effects of signature traits and elite modifiers. Runs before the slot
 * returns to the pool. `burned` is true for an enemy that died Burning or from Fire.
 */
export function enemyDied(world: World, enemy: Enemy, burned: boolean): void {
  const { x, y } = enemy;
  leaveSquad(world, enemy);
  enemy.hasToken = false;

  // Highwayman: drops the stolen gold on death (GDD 9.11).
  if (enemy.carriedGold > 0) {
    world.gold += enemy.carriedGold;
    world.emit({ type: 'goldReturned', amount: enemy.carriedGold, x, y });
    enemy.carriedGold = 0;
  }

  // Volatile Specimen: the blast hurts other enemies too (GDD 9.11).
  if (enemy.def.attack === 'detonate') {
    world.queueBlast({
      x,
      y,
      radius: ENEMY_RULES.detonateRadius,
      damage: strikeDamage(world, enemy),
      damageType: enemy.attackType,
      hurtsEnemies: hasTrait(enemy, 'blast-allies'),
    });
  }
  // Static Mote: bursts on death, arcing Electric damage to everything nearby (GDD 9.11).
  if (hasTrait(enemy, 'death-burst')) {
    world.queueBlast({
      x,
      y,
      radius: ENEMY_RULES.deathBurstRadius,
      damage: enemy.damage,
      damageType: 'Electric',
      hurtsEnemies: true,
    });
  }
  // Volatile elites explode on death (GDD 9.12).
  if (hasModifier(enemy, 'volatile')) {
    world.queueBlast({
      x,
      y,
      radius: ENEMY_RULES.volatileRadius,
      damage: enemy.damage * ENEMY_RULES.volatileDamageFactor,
      damageType: 'Fire',
      hurtsEnemies: false,
    });
  }
  // Chemical Crawlers and Infectious elites leave a toxic pool (GDD 9.11, 9.12).
  if (hasTrait(enemy, 'toxic-burst') || hasModifier(enemy, 'infectious')) {
    addHazard(world, 'toxic', x, y, ENEMY_RULES.toxicPoolRadius, ENEMY_RULES.toxicPoolSeconds, {
      damage: enemy.damage * ENEMY_RULES.hazardDamageShare,
      damageType: 'Toxic',
    });
  }

  if (enemy.noLegacy) return;
  // Thornling: leaves a seed, which sprouts again unless burned (GDD 9.11).
  if (hasTrait(enemy, 'seed') && !burned) {
    addHazard(world, 'seed', x, y, ENEMY_RULES.seedRadius, ENEMY_RULES.seedSeconds, { sprout: enemy.def });
  }
}

/** Splitting elites split into two smaller copies on death (GDD 9.12). Runs after the slot is free. */
export function splitEnemy(world: World, def: EnemyDef, x: number, y: number, maxHealth: number, squadId: number): void {
  const squad = world.squads.get(squadId);
  for (let i = 0; i < ENEMY_RULES.splitCopies; i++) {
    if (world.enemies.activeCount >= world.activeLimit) return;
    const side = i === 0 ? -1 : 1;
    const copy = spawnEnemy(world, def, x + side * def.radius * 0.8, y, { squad });
    if (!copy) return;
    copy.maxHealth = maxHealth * ENEMY_RULES.splitHealthShare;
    copy.health = copy.maxHealth;
    copy.radius = def.radius * ENEMY_RULES.splitRadiusShare;
    copy.noLegacy = true;
  }
}
