// Bosses, mini-bosses and escorts (GDD 4.10, 10.1 to 10.6). Each boss body is
// a pooled enemy driven by this controller instead of the utility AI. Attacks
// warn with a telegraph, then land. Phases change at 70 and 30 per cent health
// (mini-bosses at 50), with a short invulnerable transition.
// No Phaser imports (CLAUDE.md rule 1).

import { ARENA_BY_KINGDOM } from '../../data/arenas';
import { BOSSES, BOSS_PARTS, BOSS_RULES } from '../../data/bosses';
import type { BossAttackId, BossId, BossPartId, PhaseDef } from '../../data/bosses';
import { DAMAGE_TYPES } from '../../data/damageTypes';
import type { DamageType } from '../../data/damageTypes';
import { ENEMIES } from '../../data/enemies';
import type { EnemyDef } from '../../data/enemies';
import { MINI_BOSSES } from '../../data/miniBosses';
import type { MiniBossId } from '../../data/miniBosses';
import type { KingdomName } from '../../data/palette';
import {
  ENEMY_RULES,
  MINI_BOSS_ESCORT_SHARE,
  MINI_BOSS_HEALTH,
  STATUS_METER,
  TERRITORY_BOSS_HEALTH,
  TERRITORY_HEALTH_FACTOR,
} from '../../data/tiers';
import { hitPlayer, killEnemy } from './damage';
import { hasShield, spawnEnemy, turnToward } from './enemies';
import { addHazard, damageConstructsIn, fireEnemyShot } from './hazards';
import { clampToArena, pushOutOfObstacles } from './movement';
import { endStatus, hasStatus } from './status';
import { addModifierFlag, removeModifierFlag } from './traits';
import type { Enemy } from './types';
import type { World } from './world';

/** What a round's bosses are (GDD 4.10, 10.6). */
export type BossPlan =
  | { readonly kind: 'mini'; readonly mini: MiniBossId }
  | {
      readonly kind: 'boss';
      readonly boss: BossId;
      readonly escort: MiniBossId;
      /** Round 21: Convergence borrows the signature attacks of these bosses at 30 per cent health. */
      readonly borrowed: readonly BossId[];
    };

export type BossRole = 'boss' | 'mini' | 'escort' | 'part';

/** Who drew a telegraph: the boss, the escort (dashed) or a borrowed attack in its kingdom's colour (GDD 10.6). */
export type TelegraphStyle = { readonly kind: 'boss' } | { readonly kind: 'escort' } | { readonly kind: 'borrowed'; readonly kingdom: KingdomName };

export interface BossTelegraph {
  readonly shape: 'circle' | 'cone' | 'line';
  x: number;
  y: number;
  radius: number;
  angle: number;
  arc: number;
  x2: number;
  y2: number;
  width: number;
  timeLeft: number;
  readonly duration: number;
  readonly style: TelegraphStyle;
  readonly owner: BossBody;
  readonly land: (world: World, telegraph: BossTelegraph) => void;
}

export interface BossBody {
  readonly enemy: Enemy;
  /** The enemy id at spawn. A reused pool slot gets a new id, so this tells a dead body apart. */
  readonly enemyId: number;
  readonly role: BossRole;
  readonly bossId?: BossId;
  readonly miniId?: MiniBossId;
  readonly partId?: BossPartId;
  /** The boss a part belongs to. */
  readonly owner?: BossBody;
  readonly name: string;
  readonly phases: readonly PhaseDef[];
  readonly thresholds: readonly number[];
  phase: number;
  transition: number;
  attackTimer: number;
  attackIndex: number;
  /** Convergence attacks, with the kingdom whose colour they keep (GDD 10.6). */
  borrowed: Array<{ readonly attack: BossAttackId; readonly kingdom: KingdomName }>;
  convergence: boolean;
  /** Seconds standing still while an attack winds up or a field lasts. */
  hold: number;
  charge: { dx: number; dy: number; left: number; hit: boolean; through: boolean } | undefined;
  /** Gatling Sweep in progress. */
  sweep: { from: number; to: number; time: number; shotTimer: number } | undefined;
  /** Damage taken by the player when the body entered, for Absolute Precision (GDD 8.12). */
  readonly damageAtEntry: number;
  /** The first hit of this phase landed (Absolute Precision, GDD 8.12). */
  phaseCritUsed: boolean;
  timers: { repair: number; adapt: number; adds: number; shuffle: number; gravity: number; wall: number; exposed: number; reveal: number };
  rooted: boolean;
  mutated: boolean;
  readonly parts: BossBody[];
  /** Offset from the owner, for parts that follow the boss. */
  offsetX: number;
  offsetY: number;
  /** Index of the belt a motor drives. */
  belt: number;
}

const EMPTY: readonly DamageType[] = [];
/** Boss health per Health step from Challenge Tiers and endless loops. */
const BOSS_HEALTH_STEP = 1.5;

// --- Health and spawning -----------------------------------------------------

/** Health of a boss role in a territory (CLAUDE.md "Turning tiers into numbers"). */
export function bossHealth(role: Exclude<BossRole, 'part'>, territory: number): number {
  const factor = TERRITORY_HEALTH_FACTOR[Math.min(2, territory)] ?? 1;
  if (role === 'boss') return TERRITORY_BOSS_HEALTH * factor;
  const mini = MINI_BOSS_HEALTH * factor;
  return role === 'escort' ? mini * MINI_BOSS_ESCORT_SHARE : mini;
}

interface BodyOptions {
  readonly role: BossRole;
  readonly name: string;
  readonly def: EnemyDef;
  readonly health: number;
  readonly phases: readonly PhaseDef[];
  readonly thresholds: readonly number[];
  readonly bossId?: BossId;
  readonly miniId?: MiniBossId;
  readonly partId?: BossPartId;
  readonly owner?: BossBody;
}

function addBody(world: World, x: number, y: number, options: BodyOptions): BossBody | undefined {
  const enemy = spawnEnemy(world, options.def, x, y);
  if (!enemy) return undefined;
  // The Health lever and endless loops raise boss health by half per step (NOTES.md).
  enemy.maxHealth = options.role === 'part' ? options.health : options.health * BOSS_HEALTH_STEP ** Math.max(0, world.enemySteps.health);
  enemy.health = options.health;
  // Bosses resist statuses through larger meters (GDD 9.14). Mini-bosses use the champion size.
  enemy.meterScale = options.role === 'boss' ? STATUS_METER.boss : options.role === 'part' ? 1 : STATUS_METER.champion;
  const body: BossBody = {
    enemy,
    enemyId: enemy.id,
    role: options.role,
    ...(options.bossId ? { bossId: options.bossId } : {}),
    ...(options.miniId ? { miniId: options.miniId } : {}),
    ...(options.partId ? { partId: options.partId } : {}),
    ...(options.owner ? { owner: options.owner } : {}),
    name: options.name,
    phases: options.phases,
    thresholds: options.thresholds,
    phase: 1,
    transition: 0,
    attackTimer: BOSS_RULES.telegraphSeconds,
    attackIndex: 0,
    borrowed: [],
    convergence: false,
    hold: 0,
    charge: undefined,
    sweep: undefined,
    damageAtEntry: world.stats.damageTaken,
    phaseCritUsed: false,
    timers: { repair: BOSS_RULES.repairSeconds, adapt: BOSS_RULES.adaptSeconds, adds: 4, shuffle: BOSS_RULES.copyShuffleSeconds, gravity: BOSS_RULES.gravityFlipSeconds, wall: 0, exposed: 0, reveal: 0 },
    rooted: false,
    mutated: false,
    parts: [],
    offsetX: 0,
    offsetY: 0,
    belt: -1,
  };
  enemy.boss = body;
  world.bosses.push(body);
  options.owner?.parts.push(body);
  return body;
}

function addPart(world: World, owner: BossBody, partId: BossPartId, x: number, y: number, healthShare: number): BossBody | undefined {
  return addBody(world, x, y, {
    role: 'part',
    name: BOSS_PARTS[partId].name,
    def: BOSS_PARTS[partId],
    health: owner.enemy.maxHealth * healthShare,
    phases: [],
    thresholds: [],
    partId,
    owner,
  });
}

/** True while the body's enemy slot still holds the body. */
export function bodyAlive(body: BossBody): boolean {
  return body.enemy.active && body.enemy.id === body.enemyId;
}

/** Where bosses enter: by the arena's landmark, clear of solid shapes (GDD 5.9). */
function entryPoint(world: World, role: 'boss' | 'mini' | 'escort'): { x: number; y: number } {
  const arena = world.arena;
  const centreX = arena.width / 2;
  const centreY = arena.height / 2;
  if (role === 'boss') return { x: centreX, y: centreY - 260 };
  if (role === 'escort') return { x: centreX + (world.rng.chance(0.5) ? -520 : 520), y: centreY - 300 };
  return { x: centreX, y: Math.max(arena.bounds.top + 200, centreY - 420) };
}

/** Sends the round's bosses into the arena. Escorts fight from the start of the boss round (GDD 10.6). */
export function spawnBosses(world: World, plan: BossPlan): void {
  const territory = world.territory;
  if (plan.kind === 'mini') {
    const def = MINI_BOSSES[plan.mini];
    const at = entryPoint(world, 'mini');
    const body = addBody(world, at.x, at.y, {
      role: 'mini',
      name: def.name,
      def: def.body,
      health: bossHealth('mini', territory),
      phases: def.phases,
      thresholds: [BOSS_RULES.miniPhaseThreshold],
      miniId: plan.mini,
    });
    if (body) enterPhase(world, body);
    return;
  }
  const def = BOSSES[plan.boss];
  const at = entryPoint(world, 'boss');
  const body = addBody(world, at.x, at.y, {
    role: 'boss',
    name: def.name,
    def: def.body,
    health: bossHealth('boss', territory),
    phases: def.phases,
    thresholds: BOSS_RULES.phaseThresholds,
    bossId: plan.boss,
  });
  if (body) {
    // Convergence: the signature attacks of the bosses beaten earlier (GDD 10.6).
    body.borrowed = plan.borrowed.map((id) => ({ attack: BOSSES[id].signature.id, kingdom: BOSSES[id].kingdom }));
    enterPhase(world, body);
  }
  const escortDef = MINI_BOSSES[plan.escort];
  const escortAt = entryPoint(world, 'escort');
  const escort = addBody(world, escortAt.x, escortAt.y, {
    role: 'escort',
    name: escortDef.name,
    def: escortDef.body,
    health: bossHealth('escort', territory),
    phases: escortDef.phases,
    thresholds: [BOSS_RULES.miniPhaseThreshold],
    miniId: plan.escort,
  });
  if (escort) enterPhase(world, escort);
}

/** The main boss of the round, or the mini-boss on a mini-boss round. */
export function mainBoss(world: World): BossBody | undefined {
  return world.bosses.find((body) => body.role === 'boss') ?? world.bosses.find((body) => body.role === 'mini');
}

// --- Phases ------------------------------------------------------------------

/** Effects that start with a phase (GDD 10.4, 10.5). */
function enterPhase(world: World, body: BossBody): void {
  const enemy = body.enemy;
  const arena = world.arena;
  body.phaseCritUsed = false;
  body.attackIndex = 0;
  const phase = body.phase;
  switch (body.bossId ?? body.miniId) {
    case 'iron-regent':
      if (phase === 1) {
        // Two engineers repair the Regent's armour.
        for (let index = 0; index < BOSS_RULES.engineers; index++) {
          spawnEnemy(world, ENEMIES.mechanist, enemy.x + (index === 0 ? -90 : 90), enemy.y - 40);
        }
      } else if (phase === 2) {
        // Glowing Plate: Fire resistance, Cold weakness. Molten channels open around the throne.
        enemy.resistType = 'Fire';
        enemy.extraWeak = ['Cold'];
        world.environment.openMoltenRing(arena.width / 2, arena.height / 2);
      } else {
        // Unbound: the armour comes off, the Regent moves faster and Forgeguard Knights join.
        enemy.armour = 0;
        enemy.resistType = undefined;
        enemy.extraWeak = EMPTY;
        enemy.speed = enemy.baseSpeed * 1.5;
        for (let index = 0; index < BOSS_RULES.forgeguardJoin; index++) {
          spawnEnemy(world, ENEMIES['forgeguard-knight'], enemy.x + (index - 1) * 80, enemy.y + 60);
        }
      }
      break;
    case 'grand-automaton':
      if (phase === 1) {
        addModifierFlag(enemy, 'shielded');
        // Two arm turrets ride on the body. Belt motors drive the belts.
        for (const side of [-1, 1]) {
          const arm = addPart(world, body, 'automaton-arm', enemy.x + side * 80, enemy.y, BOSS_RULES.armHealthShare);
          if (arm) arm.offsetX = side * 80;
        }
        const belts = world.environment.belts;
        for (let index = 0; index < 2; index++) {
          const belt = belts[index];
          const x = belt ? (index === 0 ? belt.x + 40 : belt.x + belt.width - 40) : index === 0 ? 120 : arena.width - 120;
          const y = belt ? belt.y + belt.height / 2 : arena.height / 2;
          const motor = addPart(world, body, 'belt-motor', x, y, BOSS_RULES.motorHealthShare);
          if (motor) {
            motor.belt = belt ? index : -1;
            motor.rooted = true;
          }
        }
      } else if (phase === 2) {
        // Overload: the shield drops and steam vents open. Electric and Cold hit harder.
        removeModifierFlag(enemy, 'shielded');
        enemy.extraWeak = ['Electric', 'Cold'];
      }
      break;
    case 'the-unmaking':
      if (phase === 3) {
        // Probability: three copies, one real.
        for (let index = 0; index < 2; index++) {
          const copy = addPart(world, body, 'unmaking-copy', enemy.x + (index === 0 ? -260 : 260), enemy.y, 1);
          if (copy) copy.enemy.takenFactor = 0;
        }
      }
      break;
    case 'spore-sovereign':
      body.rooted = phase === 1;
      if (phase === 1) {
        // Rooted in the fountain: the boss takes the fountain's place, so every weapon reaches it.
        enemy.x = arena.width / 2;
        enemy.y = arena.height / 2;
        const fountain = arena.obstacles.findIndex(
          (obstacle) => obstacle.kind === 'fountain' && Math.hypot(obstacle.x - enemy.x, obstacle.y - enemy.y) < 10,
        );
        if (fountain >= 0) arena.obstacles.splice(fountain, 1);
      }
      break;
    case 'mad-alchemist':
      if (phase === 2 && !body.mutated) {
        // Drinks a potion and mutates.
        body.mutated = true;
        enemy.speed *= BOSS_RULES.mutateSpeed;
        enemy.damage *= BOSS_RULES.mutateDamage;
        enemy.radius *= 1.2;
      }
      break;
    case 'thornback-matriarch':
      enemy.thornShell = phase === 2;
      break;
    default:
      break;
  }
  // Convergence starts with the last phase of the final boss (GDD 10.6).
  if (body.role === 'boss' && phase === 3 && body.borrowed.length > 0) body.convergence = true;
}

function checkPhase(world: World, body: BossBody): void {
  const enemy = body.enemy;
  const next = body.thresholds[body.phase - 1];
  if (next === undefined || enemy.health > enemy.maxHealth * next) return;
  body.phase++;
  body.transition = BOSS_RULES.transitionSeconds;
  body.charge = undefined;
  body.sweep = undefined;
  // A transition clears the body's own telegraphs, so a new phase starts clean.
  for (let index = world.bossTelegraphs.length - 1; index >= 0; index--) {
    if (world.bossTelegraphs[index]?.owner === body) world.bossTelegraphs.splice(index, 1);
  }
  world.emit({ type: 'bossPhase', x: enemy.x, y: enemy.y, name: body.phases[body.phase - 1]?.name ?? '', phase: body.phase, role: body.role });
  enterPhase(world, body);
}

// --- Telegraphs --------------------------------------------------------------

type TelegraphInit = Omit<BossTelegraph, 'timeLeft' | 'duration' | 'style' | 'x2' | 'y2' | 'width' | 'angle' | 'arc' | 'radius'> &
  Partial<Pick<BossTelegraph, 'x2' | 'y2' | 'width' | 'angle' | 'arc' | 'radius'>> & { readonly seconds?: number; readonly style?: TelegraphStyle };

function styleOf(body: BossBody): TelegraphStyle {
  return body.role === 'escort' ? { kind: 'escort' } : { kind: 'boss' };
}

function telegraph(world: World, init: TelegraphInit): BossTelegraph {
  const seconds = init.seconds ?? BOSS_RULES.telegraphSeconds;
  const entry: BossTelegraph = {
    shape: init.shape,
    x: init.x,
    y: init.y,
    radius: init.radius ?? 0,
    angle: init.angle ?? 0,
    arc: init.arc ?? 0,
    x2: init.x2 ?? init.x,
    y2: init.y2 ?? init.y,
    width: init.width ?? 0,
    timeLeft: seconds,
    duration: seconds,
    style: init.style ?? styleOf(init.owner),
    land: init.land,
    owner: init.owner,
  };
  world.bossTelegraphs.push(entry);
  return entry;
}

/** True when a circle of radius `r` at (px, py) overlaps the telegraph's shape. */
export function insideTelegraph(t: BossTelegraph, px: number, py: number, r: number): boolean {
  const dx = px - t.x;
  const dy = py - t.y;
  if (t.shape === 'circle') return dx * dx + dy * dy <= (t.radius + r) ** 2;
  if (t.shape === 'cone') {
    const distance = Math.hypot(dx, dy);
    if (distance > t.radius + r) return false;
    if (distance <= r) return true;
    let delta = Math.atan2(dy, dx) - t.angle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return Math.abs(delta) <= t.arc / 2 + Math.asin(Math.min(1, r / distance));
  }
  // Line: distance from the point to the segment.
  const lx = t.x2 - t.x;
  const ly = t.y2 - t.y;
  const lengthSq = lx * lx + ly * ly || 1;
  const along = Math.max(0, Math.min(1, (dx * lx + dy * ly) / lengthSq));
  const cx = t.x + lx * along - px;
  const cy = t.y + ly * along - py;
  return cx * cx + cy * cy <= (t.width / 2 + r) ** 2;
}

/** A landed attack hits the player and constructs inside the shape. */
function strikeArea(world: World, t: BossTelegraph, damage: number, type: DamageType): boolean {
  const player = world.player;
  const hit = insideTelegraph(t, player.x, player.y, player.radius) && hitPlayer(world, damage, type);
  if (t.shape === 'circle') damageConstructsIn(world, t.x, t.y, t.radius, damage);
  return hit;
}

function damageOf(body: BossBody, share: number, world?: World): number {
  return body.enemy.damage * share * (world ? bannerFactor(world, body.enemy.x, body.enemy.y) : 1);
}

/** The Forge Marshal's war banner raises the damage of allies nearby (GDD 10.5). */
export function bannerFactor(world: World, x: number, y: number): number {
  for (const body of world.bosses) {
    if (body.partId !== 'war-banner' || !bodyAlive(body)) continue;
    if (Math.hypot(body.enemy.x - x, body.enemy.y - y) <= BOSS_RULES.bannerRadius) return 1 + BOSS_RULES.bannerDamage;
  }
  return 1;
}

// --- Attacks -----------------------------------------------------------------

function aimAt(body: BossBody, world: World): number {
  return Math.atan2(world.player.y - body.enemy.y, world.player.x - body.enemy.x);
}

function startAttack(world: World, body: BossBody, attack: BossAttackId, style?: TelegraphStyle): void {
  const enemy = body.enemy;
  const rules = BOSS_RULES;
  const player = world.player;
  const angle = aimAt(body, world);
  const heavy = damageOf(body, rules.heavyShare, world);
  const light = damageOf(body, rules.lightShare, world);
  const type = enemy.attackType;
  const base = { owner: body, ...(style ? { style } : {}) };
  body.hold = rules.telegraphSeconds;
  switch (attack) {
    case 'sword-sweep':
    case 'thorn-lash':
    case 'halberd-sweep': {
      const wide = attack === 'halberd-sweep' && body.phase === 2;
      const radius = attack === 'thorn-lash' ? rules.lashRadius : wide ? rules.wideSweepRadius : rules.sweepRadius;
      const arc = attack === 'thorn-lash' ? rules.lashArc : wide ? rules.wideSweepArc : rules.sweepArc;
      const damageType: DamageType = attack === 'halberd-sweep' ? 'Fire' : attack === 'thorn-lash' ? 'Slashing' : type;
      telegraph(world, {
        ...base,
        shape: 'cone',
        x: enemy.x,
        y: enemy.y,
        radius,
        angle,
        arc,
        land: (w, t) => {
          t.x = enemy.x;
          t.y = enemy.y;
          strikeArea(w, t, light, damageType);
          w.emit({ type: 'bossStrike', x: t.x, y: t.y, radius, damageType });
        },
      });
      break;
    }
    case 'claw-slam':
    case 'stomp':
    case 'steam-vents': {
      const vents = attack === 'steam-vents';
      const radius = vents ? rules.ventRadius : rules.slamRadius;
      const damageType: DamageType = vents ? 'Fire' : 'Impact';
      telegraph(world, {
        ...base,
        shape: 'circle',
        x: enemy.x,
        y: enemy.y,
        radius,
        land: (w, t) => {
          t.x = enemy.x;
          t.y = enemy.y;
          strikeArea(w, t, vents ? light : heavy, damageType);
          w.emit({ type: 'bossStrike', x: t.x, y: t.y, radius, damageType });
        },
      });
      break;
    }
    case 'shield-charge':
    case 'uprooted-charge':
    case 'spider-charge':
    case 'hedge-charge': {
      const length = rules.chargeLength;
      const x2 = enemy.x + Math.cos(angle) * length;
      const y2 = enemy.y + Math.sin(angle) * length;
      // The Matriarch charges through hedges (GDD 10.5).
      const through = attack === 'hedge-charge';
      telegraph(world, {
        ...base,
        shape: 'line',
        x: enemy.x,
        y: enemy.y,
        x2,
        y2,
        width: rules.chargeWidth,
        land: () => {
          body.charge = { dx: Math.cos(angle), dy: Math.sin(angle), left: length, hit: false, through };
        },
      });
      break;
    }
    case 'royal-decree': {
      // Three shockwaves in a cone (GDD 10.3).
      for (const offset of [-rules.decreeSpread, 0, rules.decreeSpread]) {
        const a = angle + offset;
        telegraph(world, {
          ...base,
          shape: 'line',
          x: enemy.x,
          y: enemy.y,
          x2: enemy.x + Math.cos(a) * rules.decreeLength,
          y2: enemy.y + Math.sin(a) * rules.decreeLength,
          width: rules.decreeWidth,
          land: (w, t) => {
            strikeArea(w, t, heavy, 'Impact');
            w.emit({ type: 'bossWave', x1: t.x, y1: t.y, x2: t.x2, y2: t.y2, damageType: 'Impact' });
          },
        });
      }
      break;
    }
    case 'mutagenic-spew': {
      // A cone of bile leaving acid pools (GDD 10.3).
      telegraph(world, {
        ...base,
        shape: 'cone',
        x: enemy.x,
        y: enemy.y,
        radius: rules.spewRadius,
        angle,
        arc: rules.spewArc,
        land: (w, t) => {
          strikeArea(w, t, heavy, 'Corrosive');
          w.emit({ type: 'bossStrike', x: t.x, y: t.y, radius: t.radius, damageType: 'Corrosive' });
          for (let index = 0; index < rules.spewPools; index++) {
            const a = t.angle + (index - 1) * (t.arc / 3);
            const d = t.radius * (0.45 + 0.25 * index);
            addHazard(w, 'acid', t.x + Math.cos(a) * d, t.y + Math.sin(a) * d, 60, ENEMY_RULES.acidSeconds * 3, {
              damage: light * 0.3,
              damageType: 'Corrosive',
            });
          }
          // Meltdown: the core sits exposed after each spew (GDD 10.4).
          if (body.bossId === 'abomination' && body.phase === 3) body.timers.exposed = rules.exposedSeconds;
        },
      });
      break;
    }
    case 'gatling-sweep': {
      // Arm turrets fire. Destroying an arm removes the matching attack (GDD 10.4).
      const arms = body.parts.filter((part) => part.partId === 'automaton-arm' && bodyAlive(part));
      if (body.bossId === 'grand-automaton' && arms.length === 0) {
        body.hold = 0;
        return;
      }
      const half = rules.gatlingArc / 2;
      telegraph(world, {
        ...base,
        shape: 'cone',
        x: enemy.x,
        y: enemy.y,
        radius: 520,
        angle,
        arc: rules.gatlingArc,
        land: () => {
          body.sweep = { from: angle - half, to: angle + half, time: 0, shotTimer: 0 };
          body.hold = rules.gatlingSeconds;
        },
      });
      break;
    }
    case 'void-bolts': {
      telegraph(world, {
        ...base,
        shape: 'cone',
        x: enemy.x,
        y: enemy.y,
        radius: 300,
        angle,
        arc: 0.6,
        seconds: rules.telegraphSeconds,
        land: (w, t) => {
          for (let index = 0; index < rules.voidBolts; index++) {
            const a = t.angle + (index - (rules.voidBolts - 1) / 2) * 0.14;
            fireEnemyShot(w, enemy.x, enemy.y, Math.cos(a), Math.sin(a), light, 'Electric', 900);
          }
        },
      });
      break;
    }
    case 'displacement': {
      // Teleports between plaza points.
      const bounds = world.arena.bounds;
      let x = enemy.x;
      let y = enemy.y;
      for (let attempt = 0; attempt < 8; attempt++) {
        x = world.rng.range(bounds.left + 160, bounds.right - 160);
        y = world.rng.range(bounds.top + 160, bounds.bottom - 160);
        if (Math.hypot(x - player.x, y - player.y) > 320) break;
      }
      telegraph(world, {
        ...base,
        shape: 'circle',
        x,
        y,
        radius: enemy.radius + 20,
        land: (w, t) => {
          w.emit({ type: 'teleport', x1: enemy.x, y1: enemy.y, x2: t.x, y2: t.y });
          enemy.x = t.x;
          enemy.y = t.y;
          strikeArea(w, t, light, 'Electric');
        },
      });
      break;
    }
    case 'null-field': {
      // An expanding ring suppressing synergies and Auxiliary components inside (GDD 10.3).
      telegraph(world, {
        ...base,
        shape: 'circle',
        x: enemy.x,
        y: enemy.y,
        radius: rules.nullFieldRadius,
        land: (w, t) => {
          t.x = enemy.x;
          t.y = enemy.y;
          w.emit({ type: 'bossNull', x: t.x, y: t.y, radius: t.radius });
          if (insideTelegraph(t, w.player.x, w.player.y, w.player.radius)) w.nullTimer = rules.nullSuppressSeconds;
        },
      });
      break;
    }
    case 'spore-burst': {
      // A ring of pods hatching Thornlings (GDD 10.3). Fire burns the pods first.
      for (let index = 0; index < rules.sporePods; index++) {
        const a = (index / rules.sporePods) * Math.PI * 2 + angle;
        const x = enemy.x + Math.cos(a) * rules.sporeRingRadius;
        const y = enemy.y + Math.sin(a) * rules.sporeRingRadius;
        telegraph(world, {
          ...base,
          shape: 'circle',
          x,
          y,
          radius: 40,
          land: (w, t) => {
            strikeArea(w, t, light, 'Biological');
            addHazard(w, 'seed', t.x, t.y, ENEMY_RULES.seedRadius, ENEMY_RULES.seedSeconds, { sprout: ENEMIES.thornling });
          },
        });
      }
      break;
    }
    case 'war-banner': {
      // Plants a war banner raising ally damage. One banner at a time.
      if (body.parts.some((part) => part.partId === 'war-banner' && bodyAlive(part))) {
        startAttack(world, body, 'halberd-sweep', style);
        return;
      }
      const banner = addPart(world, body, 'war-banner', enemy.x - Math.cos(angle) * 60, enemy.y - Math.sin(angle) * 60, BOSS_RULES.bannerHealthShare);
      if (banner) banner.rooted = true;
      body.hold = 0.6;
      break;
    }
    case 'flask-throw': {
      const radius = rules.flaskRadius * (body.mutated ? 1.2 : 1);
      const kinds = ['burning', 'acid', 'toxic'] as const;
      const kind = world.rng.pick(kinds);
      const damageType: DamageType = kind === 'burning' ? 'Fire' : kind === 'acid' ? 'Corrosive' : 'Toxic';
      telegraph(world, {
        ...base,
        shape: 'circle',
        x: player.x,
        y: player.y,
        radius,
        land: (w, t) => {
          strikeArea(w, t, light, damageType);
          w.emit({ type: 'bossStrike', x: t.x, y: t.y, radius: t.radius, damageType });
          addHazard(w, kind, t.x, t.y, t.radius * 0.8, kind === 'burning' ? ENEMY_RULES.burningGroundSeconds * 2 : ENEMY_RULES.toxicPoolSeconds, {
            damage: light * 0.25,
            damageType,
          });
        },
      });
      body.hold = 0.8;
      break;
    }
    case 'shatter-vat': {
      // The Mad Alchemist shatters vats. Vat-born adds climb out (GDD 5.9, 10.5).
      const vats = world.arena.obstacles.filter((obstacle) => obstacle.kind === 'vat');
      vats.sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
      const vat = vats[0];
      const x = vat ? vat.x : enemy.x + 120;
      const y = vat ? vat.y : enemy.y;
      telegraph(world, {
        ...base,
        shape: 'circle',
        x,
        y,
        radius: vat ? 110 : 60,
        land: (w, t) => {
          if (vat) w.environment.shatterVat(w, vat);
          for (let index = 0; index < 2; index++) spawnEnemy(w, ENEMIES['chemical-crawler'], t.x + (index - 0.5) * 50, t.y + 40);
        },
      });
      break;
    }
    case 'cannon-shot': {
      telegraph(world, {
        ...base,
        shape: 'circle',
        x: player.x,
        y: player.y,
        radius: 80,
        land: (w, t) => {
          strikeArea(w, t, heavy, 'Impact');
          w.emit({ type: 'bossStrike', x: t.x, y: t.y, radius: t.radius, damageType: 'Impact' });
        },
      });
      body.hold = body.timers.wall > 0 ? 0.4 : 0.8;
      break;
    }
    case 'lay-mines': {
      for (let index = 0; index < rules.mineCount; index++) {
        const a = world.rng.range(0, Math.PI * 2);
        addHazard(world, 'mine', enemy.x + Math.cos(a) * 140, enemy.y + Math.sin(a) * 140, 12, ENEMY_RULES.mineSeconds, {
          damage: heavy,
          damageType: 'Impact',
          arming: ENEMY_RULES.mineArmSeconds,
        });
      }
      body.hold = 0.5;
      break;
    }
    case 'wall-climb': {
      // Climbs the nearest wall to bombard from there.
      const bounds = world.arena.bounds;
      const left = enemy.x - bounds.left;
      const right = bounds.right - enemy.x;
      const top = enemy.y - bounds.top;
      const bottom = bounds.bottom - enemy.y;
      const nearest = Math.min(left, right, top, bottom);
      const margin = enemy.radius + 4;
      const x = nearest === left ? bounds.left + margin : nearest === right ? bounds.right - margin : enemy.x;
      const y = nearest === top ? bounds.top + margin : nearest === bottom ? bounds.bottom - margin : enemy.y;
      world.emit({ type: 'teleport', x1: enemy.x, y1: enemy.y, x2: x, y2: y });
      enemy.x = x;
      enemy.y = y;
      body.timers.wall = rules.wallSeconds;
      body.hold = 0.4;
      break;
    }
    case 'place-pylon': {
      const pylons = body.parts.filter((part) => part.partId === 'tesla-pylon' && bodyAlive(part));
      if (pylons.length >= rules.pylons) {
        startAttack(world, body, 'pylon-chain', style);
        return;
      }
      const a = world.rng.range(0, Math.PI * 2);
      const pylon = addPart(world, body, 'tesla-pylon', enemy.x + Math.cos(a) * 240, enemy.y + Math.sin(a) * 240, rules.pylonHealthShare);
      if (pylon) pylon.rooted = true;
      body.hold = 0.5;
      break;
    }
    case 'pylon-chain': {
      // Lightning chains between pylons, and from the Warden to its nearest pylon.
      const points = [enemy, ...body.parts.filter((part) => part.partId === 'tesla-pylon' && bodyAlive(part)).map((part) => part.enemy)];
      if (points.length < 2) {
        startAttack(world, body, 'place-pylon', style);
        return;
      }
      for (let index = 1; index < points.length; index++) {
        const from = points[index - 1];
        const to = points[index];
        if (!from || !to) continue;
        telegraph(world, {
          ...base,
          shape: 'line',
          x: from.x,
          y: from.y,
          x2: to.x,
          y2: to.y,
          width: rules.pylonChainWidth,
          land: (w, t) => {
            strikeArea(w, t, light, 'Electric');
            w.emit({ type: 'hazardArc', fromX: t.x, fromY: t.y, toX: t.x2, toY: t.y2 });
          },
        });
      }
      break;
    }
    case 'rod-overload': {
      // Overloads the rods: every rod strikes. Away from Orthelyn, strikes ring the player.
      const rods = world.arena.rods ?? [];
      const points = rods.length > 0 ? rods : Array.from({ length: 4 }, (_, i) => ({ x: player.x + Math.cos(i * 1.57) * 160, y: player.y + Math.sin(i * 1.57) * 160 }));
      for (const point of points) {
        telegraph(world, {
          ...base,
          shape: 'circle',
          x: point.x,
          y: point.y,
          radius: 110,
          land: (w, t) => {
            strikeArea(w, t, light, 'Electric');
            w.emit({ type: 'hazardBurst', hazard: 'lightning-strike', x: t.x, y: t.y, radius: t.radius });
          },
        });
      }
      break;
    }
    case 'call-thornlings': {
      for (let index = 0; index < rules.thornlingCalls; index++) {
        const a = (index / rules.thornlingCalls) * Math.PI * 2;
        spawnEnemy(world, ENEMIES.thornling, enemy.x + Math.cos(a) * 70, enemy.y + Math.sin(a) * 70);
      }
      body.hold = 0.6;
      break;
    }
    default:
      body.hold = 0;
  }
}

/** The next attack in rotation. Convergence weaves in the borrowed attacks (GDD 10.6). */
function nextAttack(body: BossBody): { attack: BossAttackId; style?: TelegraphStyle } | undefined {
  const list = body.phases[body.phase - 1]?.attacks ?? [];
  const borrowed = body.convergence ? body.borrowed : [];
  const total = list.length + borrowed.length;
  if (total === 0) return undefined;
  const index = body.attackIndex++ % total;
  if (index < list.length) {
    const attack = list[index];
    return attack ? { attack } : undefined;
  }
  const entry = borrowed[index - list.length];
  return entry ? { attack: entry.attack, style: { kind: 'borrowed', kingdom: entry.kingdom } } : undefined;
}

// --- Update ------------------------------------------------------------------

export function updateBosses(world: World, dt: number): void {
  for (let index = world.bosses.length - 1; index >= 0; index--) {
    const body = world.bosses[index];
    if (!body) continue;
    if (!bodyAlive(body)) {
      world.bosses.splice(index, 1);
      continue;
    }
    if (body.role === 'part') updatePart(world, body, dt);
    else updateBody(world, body, dt);
  }

  // Telegraphs count down and land.
  for (let index = world.bossTelegraphs.length - 1; index >= 0; index--) {
    const entry = world.bossTelegraphs[index];
    if (!entry) continue;
    entry.timeLeft -= dt;
    if (entry.timeLeft > 0) continue;
    world.bossTelegraphs.splice(index, 1);
    if (bodyAlive(entry.owner)) entry.land(world, entry);
  }
}

function updatePart(world: World, body: BossBody, dt: number): void {
  const enemy = body.enemy;
  const owner = body.owner;
  if (!owner || !bodyAlive(owner)) {
    // A part dies with its boss, leaving nothing behind.
    enemy.noLegacy = true;
    killEnemy(world, enemy, -1, 0);
    return;
  }
  enemy.moveX = 0;
  enemy.moveY = 0;
  if (body.partId === 'automaton-arm') {
    enemy.x = owner.enemy.x + body.offsetX;
    enemy.y = owner.enemy.y + body.offsetY;
  } else if (body.partId === 'unmaking-copy') {
    // Copies drift toward the player like the real body.
    chase(world, body, dt, 0.8);
  }
}

function chase(world: World, body: BossBody, dt: number, pace = 1): void {
  const enemy = body.enemy;
  const player = world.player;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1e-6) return;
  // A shield turns slowly, so flanking finds an opening (GDD 10.4).
  if (hasShield(enemy)) turnToward(enemy, dx / distance, dy / distance, ENEMY_RULES.shieldTurnRate, dt);
  else {
    enemy.faceX = dx / distance;
    enemy.faceY = dy / distance;
  }
  const stop = enemy.radius + player.radius + 20;
  const step = Math.min(enemy.speed * enemy.slowFactor * pace * dt, Math.max(0, distance - stop));
  enemy.x += (dx / distance) * step;
  enemy.y += (dy / distance) * step;
}

function updateBody(world: World, body: BossBody, dt: number): void {
  const enemy = body.enemy;
  const rules = BOSS_RULES;
  checkPhase(world, body);

  // The short invulnerable transition between phases (GDD 10.4).
  if (body.transition > 0) {
    body.transition -= dt;
    enemy.takenFactor = 0;
    if (body.transition <= 0) enemy.takenFactor = 1;
    return;
  }
  enemy.takenFactor = body.timers.exposed > 0 ? rules.exposedTaken : 1;
  if (body.timers.exposed > 0) {
    body.timers.exposed -= dt;
    enemy.extraWeak = body.timers.exposed > 0 ? ['Fire'] : EMPTY;
  }

  phaseUpkeep(world, body, dt);
  if (!bodyAlive(body)) return;

  // Charges run first: they move the body fast along the telegraphed line.
  const charge = body.charge;
  if (charge) {
    const step = Math.min(rules.chargeSpeed * dt, charge.left);
    enemy.x += charge.dx * step;
    enemy.y += charge.dy * step;
    charge.left -= step;
    const player = world.player;
    if (!charge.hit && Math.hypot(player.x - enemy.x, player.y - enemy.y) <= enemy.radius + player.radius) {
      charge.hit = hitPlayer(world, damageOf(body, rules.heavyShare, world), enemy.attackType);
    }
    if (!charge.through) pushOutOfObstacles(enemy, world.arena);
    clampToArena(enemy, world.arena);
    if (charge.left <= 1e-6) body.charge = undefined;
    return;
  }

  // Gatling Sweep: a rotating barrage from each arm, or from the body when borrowed.
  const sweep = body.sweep;
  if (sweep) {
    sweep.time += dt;
    sweep.shotTimer -= dt;
    const share = Math.min(1, sweep.time / rules.gatlingSeconds);
    const angle = sweep.from + (sweep.to - sweep.from) * share;
    if (sweep.shotTimer <= 0) {
      sweep.shotTimer += 1 / rules.gatlingShotsPerSecond;
      const arms = body.parts.filter((part) => part.partId === 'automaton-arm' && bodyAlive(part));
      const sources = arms.length > 0 ? arms.map((arm) => arm.enemy) : [enemy];
      for (const source of sources) {
        fireEnemyShot(world, source.x, source.y, Math.cos(angle), Math.sin(angle), damageOf(body, 0.35, world), 'Piercing', 620);
      }
    }
    if (sweep.time >= rules.gatlingSeconds) body.sweep = undefined;
  }

  if (body.hold > 0) {
    body.hold -= dt;
  } else if (!body.rooted && body.timers.wall <= 0) {
    chase(world, body, dt);
  }
  if (body.timers.wall > 0) body.timers.wall -= dt;

  // The next attack.
  const gaps = rules.attackGap;
  const gap = (gaps[Math.min(gaps.length - 1, body.phase - 1)] ?? 3) * (body.role === 'escort' ? rules.escortGapFactor : 1) * (body.timers.wall > 0 ? 0.5 : 1);
  body.attackTimer -= dt;
  if (body.attackTimer <= 0 && body.hold <= 0 && !body.sweep) {
    body.attackTimer = gap;
    // On the wall, the Siege Spider only bombards.
    const next = body.timers.wall > 0 ? { attack: 'cannon-shot' as const } : nextAttack(body);
    if (next) startAttack(world, body, next.attack, next.style);
  }
  if (!body.rooted && body.timers.wall <= 0) pushOutOfObstacles(enemy, world.arena);
  clampToArena(enemy, world.arena);
}

/** Phase effects that run every step (GDD 10.4). */
function phaseUpkeep(world: World, body: BossBody, dt: number): void {
  const enemy = body.enemy;
  const rules = BOSS_RULES;
  const timers = body.timers;
  switch (body.bossId) {
    case 'iron-regent': {
      if (body.phase > 2) break;
      // Engineers repair the armour: Corroded comes off while any engineer lives.
      timers.repair -= dt;
      if (timers.repair <= 0) {
        timers.repair = rules.repairSeconds;
        let engineers = 0;
        for (const other of world.enemies.items) if (other.active && other.def.id === 'mechanist') engineers++;
        if (engineers > 0 && hasStatus(enemy, 'Corroded')) {
          endStatus(enemy, 'Corroded');
          world.emit({ type: 'bossRepair', x: enemy.x, y: enemy.y });
        }
      }
      break;
    }
    case 'abomination': {
      if (body.phase === 1) {
        // Adaptation: resists the damage type taken most, shown by colour.
        timers.adapt -= dt;
        if (timers.adapt <= 0) {
          timers.adapt = rules.adaptSeconds;
          let best = -1;
          let bestType: DamageType | undefined;
          enemy.typeTaken.forEach((amount, index) => {
            if (amount > best && amount > 0) {
              best = amount;
              bestType = DAMAGE_TYPES[index];
            }
          });
          enemy.resistType = bestType;
          enemy.typeTaken.fill(0);
        }
      } else {
        enemy.resistType = undefined;
      }
      if (body.phase === 2) {
        // Overgrowth: Chemical Crawlers climb out of the vats.
        timers.adds -= dt;
        if (timers.adds <= 0) {
          timers.adds = rules.overgrowthSeconds;
          const vats = world.arena.obstacles.filter((obstacle) => obstacle.kind === 'vat');
          for (let index = 0; index < rules.overgrowthCrawlers; index++) {
            const vat = vats.length > 0 ? world.rng.pick(vats) : undefined;
            spawnEnemy(world, ENEMIES['chemical-crawler'], (vat?.x ?? enemy.x) + 50, (vat?.y ?? enemy.y) + 50);
          }
        }
      }
      break;
    }
    case 'grand-automaton': {
      if (body.phase === 3) {
        // Emergency protocol: crawler swarms, and repairs from each running belt.
        timers.adds -= dt;
        if (timers.adds <= 0) {
          timers.adds = rules.crawlerSwarmSeconds;
          for (let index = 0; index < rules.crawlerSwarm; index++) {
            const a = (index / rules.crawlerSwarm) * Math.PI * 2;
            spawnEnemy(world, ENEMIES['clockwork-crawler'], enemy.x + Math.cos(a) * 120, enemy.y + Math.sin(a) * 120);
          }
        }
        const motors = body.parts.filter((part) => part.partId === 'belt-motor' && bodyAlive(part)).length;
        enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.maxHealth * rules.beltRepair * motors * dt);
      }
      // A destroyed motor stops its belt.
      world.environment.belts.forEach((belt, index) => {
        const motor = body.parts.find((part) => part.belt === index);
        if (motor && !bodyAlive(motor)) belt.running = false;
      });
      break;
    }
    case 'the-unmaking': {
      if (body.phase === 2) {
        // Gravity flips between pull and push.
        timers.gravity -= dt;
        if (timers.gravity <= 0) {
          timers.gravity = rules.gravityFlipSeconds;
          world.environment.gravitySign = world.environment.gravitySign === 1 ? -1 : 1;
        }
      } else {
        world.environment.gravitySign = 1;
      }
      if (body.phase === 3) {
        // Marked and critical hits reveal the real body.
        if (hasStatus(enemy, 'Marked')) timers.reveal = rules.revealSeconds;
        if (timers.reveal > 0) timers.reveal -= dt;
        timers.shuffle -= dt;
        if (timers.shuffle <= 0) {
          timers.shuffle = rules.copyShuffleSeconds;
          const copies = body.parts.filter((part) => part.partId === 'unmaking-copy' && bodyAlive(part));
          const copy = copies.length > 0 ? world.rng.pick(copies) : undefined;
          if (copy) {
            // The real body trades places with one copy.
            const x = enemy.x;
            const y = enemy.y;
            enemy.x = copy.enemy.x;
            enemy.y = copy.enemy.y;
            copy.enemy.x = x;
            copy.enemy.y = y;
            world.emit({ type: 'teleport', x1: x, y1: y, x2: enemy.x, y2: enemy.y });
          }
        }
      }
      break;
    }
    case 'spore-sovereign': {
      if (body.phase === 3) {
        // Full Bloom: heals from fungal growth. Burning the growth stops the healing.
        let patches = 0;
        for (const zone of world.environment.zones) if (zone.hazard === 'fungal-growth') patches++;
        enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.maxHealth * rules.bloomHeal * patches * dt);
      }
      break;
    }
    default:
      break;
  }
}

/** A critical hit on The Unmaking's real body reveals it (GDD 10.4). */
export function noteBossCritical(enemy: Enemy): void {
  const body = enemy.boss;
  if (body?.bossId === 'the-unmaking' && body.phase === 3) body.timers.reveal = BOSS_RULES.revealSeconds;
}

/** Absolute Precision: the first hit in each boss phase is a critical hit (GDD 8.12). */
export function forcedBossCritical(world: World, enemy: Enemy): boolean {
  const body = enemy.boss;
  if (!body || body.role === 'part' || body.phaseCritUsed || world.rule('bossFirstCritical') === 0) return false;
  body.phaseCritUsed = true;
  return true;
}

/** The boss falls: remaining enemies flee and the round ends (GDD 5.8 step 1). */
export function bossDefeated(world: World, body: BossBody): void {
  if (body.role === 'mini') {
    // Absolute Precision: a mini-boss beaten without taking damage (GDD 8.12).
    world.findings.miniBossKilled = true;
    if (world.stats.damageTaken <= body.damageAtEntry + 1e-9) world.findings.miniBossFlawless = true;
    return;
  }
  if (body.role !== 'boss') return;
  world.bossFallen = true;
  world.emit({ type: 'bossDefeated', x: body.enemy.x, y: body.enemy.y, name: body.name });
}

/** Kingdom of a boss, for the borrowed telegraph colour. */
export function bossKingdom(id: BossId): KingdomName {
  return BOSSES[id].kingdom;
}

/** The arena landmark a boss stands by. Used by tests. */
export function bossArena(id: BossId) {
  return ARENA_BY_KINGDOM[BOSSES[id].kingdom];
}
