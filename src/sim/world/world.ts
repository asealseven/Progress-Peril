// The fixed-step combat simulation. No Phaser imports (CLAUDE.md rule 1).
// A scene owns one World, feeds input in, calls step() and draws the state.

import type { ArenaDef } from '../../data/arenas';
import { ENEMIES } from '../../data/enemies';
import { COMBAT, PERFORMANCE_LIMITS, WEAPON_RULES } from '../../data/tiers';
import type { PerformanceLimits } from '../../data/tiers';
import type { ResolvedWeapon } from '../loadout';
import { Rng } from '../rng';
import { updateWeapons } from './attacks';
import { createConstruct, updateConstructs } from './constructs';
import { explode } from './damage';
import { createEnemy, spawnGroup, updateEnemies } from './enemies';
import { SpatialGrid } from './grid';
import { clampToArena, pushOutOfObstacles } from './movement';
import { Pool } from './pool';
import { createProjectile, updateProjectiles } from './projectiles';
import type {
  Construct,
  Enemy,
  PendingExplosion,
  PlayerState,
  Projectile,
  RoundStats,
  SpawnEntry,
  StepInput,
  Trap,
  WeaponState,
  WorldConfig,
  WorldEvent,
  WorldPhase,
  Zone,
} from './types';
import { createTrap, createZone, updateTraps, updateZones } from './zones';

/** Seconds per simulation step. */
export const STEP_SECONDS = 1 / COMBAT.stepsPerSecond;

const ENEMY_CAPACITY = 400;
const GRID_CELL = 64;
const MAX_QUEUED_EVENTS = 4096;

function createWeaponState(resolved: ResolvedWeapon): WeaponState {
  return {
    resolved,
    cooldown: COMBAT.weaponStartDelay,
    targetSlot: -1,
    targetId: -1,
    aimX: 0,
    aimY: -1,
    attackCount: 0,
    rampStacks: 0,
    sinceAttack: 0,
    killStacks: 0,
    killStackTimer: 0,
    jamTimer: 0,
    grappleReady: false,
    orbitAngle: 0,
    contactReady: new Map(),
    beamTargetId: -1,
    beamTicks: 0,
    beamActive: false,
    beamX: 0,
    beamY: 0,
    deployTimer: COMBAT.weaponStartDelay,
    lightningTimer: WEAPON_RULES.lightningSeconds / 2,
    bayonetTimer: 0,
    smokeTimer: 0,
    damageDealt: 0,
    kills: 0,
  };
}

export class World {
  readonly arena: ArenaDef;
  readonly rng: Rng;
  readonly round: number;
  /** Target combat duration in seconds. */
  readonly duration: number;
  readonly limits: PerformanceLimits;
  readonly player: PlayerState;
  readonly weapons: WeaponState[];
  readonly enemies: Pool<Enemy>;
  readonly projectiles: Pool<Projectile>;
  readonly constructs: Pool<Construct>;
  readonly traps: Pool<Trap>;
  readonly zones: Pool<Zone>;
  readonly grid: SpatialGrid;
  readonly stats: RoundStats = {
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
    hitsTaken: 0,
    hitsEvaded: 0,
    shotsFired: 0,
    criticalHits: 0,
  };
  /** Events since the scene last cleared the list. */
  readonly events: WorldEvent[] = [];

  phase: WorldPhase = 'running';
  /** Steps run so far. */
  steps = 0;
  nextEnemyId = 1;
  nextConstructId = 1;
  /** Largest radius among spawned enemies, for grid queries. */
  maxEnemyRadius = 0;
  invincible: boolean;
  /** Manual focus point while the focus input is held (GDD 3.4). */
  focus: { x: number; y: number } | undefined;

  private readonly spawns: readonly SpawnEntry[];
  private nextSpawn = 0;
  /** Chain explosions waiting for a later step (GDD 7.20). */
  private readonly pendingExplosions: PendingExplosion[] = [];

  constructor(config: WorldConfig) {
    this.arena = config.arena;
    this.rng = new Rng(config.seed);
    this.round = config.round;
    this.duration = config.duration;
    this.limits = config.limits ?? PERFORMANCE_LIMITS.pc;
    this.invincible = config.invincible ?? false;
    this.spawns = [...config.spawns].sort((a, b) => a.time - b.time);

    this.player = {
      x: config.arena.playerStart.x,
      y: config.arena.playerStart.y,
      vx: 0,
      vy: 0,
      radius: COMBAT.playerRadius,
      health: config.playerStats.maxHealth,
      stats: config.playerStats,
      invulnerable: 0,
      adaptation: { ...config.adaptation },
    };

    this.weapons = config.weapons.map(createWeaponState);

    const fallbackEnemy = ENEMIES['royal-footman'];
    this.enemies = new Pool<Enemy>((slot) => createEnemy(slot, fallbackEnemy), ENEMY_CAPACITY);
    this.projectiles = new Pool<Projectile>(createProjectile, this.limits.projectiles);
    this.constructs = new Pool<Construct>(createConstruct, this.limits.constructs);
    this.traps = new Pool<Trap>(createTrap, this.limits.traps);
    this.zones = new Pool<Zone>(createZone, this.limits.areaEffects);
    this.grid = new SpatialGrid(config.arena.width, config.arena.height, GRID_CELL);
  }

  /** Seconds of combat so far. */
  get elapsed(): number {
    return this.steps * STEP_SECONDS;
  }

  /** Seconds left on the round timer. Stays at zero during the clean-up. */
  get timeLeft(): number {
    return Math.max(0, this.duration - this.elapsed);
  }

  /** True when every scheduled spawn has entered the arena (GDD 4.9). */
  get spawningFinished(): boolean {
    return this.nextSpawn >= this.spawns.length;
  }

  emit(event: WorldEvent): void {
    if (this.events.length >= MAX_QUEUED_EVENTS) this.events.length = 0;
    this.events.push(event);
  }

  /** Chain events queue across steps instead of resolving in one step (GDD 7.20). */
  queueExplosion(explosion: PendingExplosion): void {
    this.pendingExplosions.push(explosion);
  }

  /** Advances the simulation by 1/60 second. */
  step(input: StepInput): void {
    if (this.phase !== 'running') return;
    const dt = STEP_SECONDS;

    this.focus =
      input.focusX !== undefined && input.focusY !== undefined && Number.isFinite(input.focusX + input.focusY)
        ? { x: input.focusX, y: input.focusY }
        : undefined;

    this.runSpawns();
    this.movePlayer(input, dt);
    updateEnemies(this, dt);
    this.rebuildGrid();
    this.runChainEvents();
    updateWeapons(this, dt);
    updateConstructs(this, dt);
    updateTraps(this, dt);
    updateProjectiles(this, dt);
    updateZones(this, dt);
    this.tickPlayer(dt);

    this.steps++;

    if (this.player.health <= 0) {
      this.phase = 'defeat';
    } else if (this.spawningFinished && this.enemies.activeCount === 0) {
      // A round ends when spawning has finished and every enemy is defeated,
      // not when the timer expires (GDD 4.9).
      this.phase = 'cleared';
    }
  }

  private runSpawns(): void {
    const now = this.elapsed;
    while (this.nextSpawn < this.spawns.length) {
      const entry = this.spawns[this.nextSpawn];
      if (!entry || entry.time > now) break;
      spawnGroup(this, entry.enemy, entry.count);
      this.nextSpawn++;
    }
  }

  /** Resolves queued chain explosions, up to the per-step cap (GDD 7.20, 7.21). */
  private runChainEvents(): void {
    const batch = this.pendingExplosions.splice(0, this.limits.chainEventsPerStep);
    for (const pending of batch) {
      explode(this, pending.x, pending.y, pending.radius, pending.weaponIndex, {
        scale: pending.damageScale * WEAPON_RULES.chainFalloff ** (pending.generation - 1),
        generation: pending.generation,
        explosive: pending.explosive,
      });
    }
  }

  private movePlayer(input: StepInput, dt: number): void {
    const player = this.player;
    let moveX = Number.isFinite(input.moveX) ? input.moveX : 0;
    let moveY = Number.isFinite(input.moveY) ? input.moveY : 0;
    const length = Math.sqrt(moveX * moveX + moveY * moveY);
    if (length > 1) {
      moveX /= length;
      moveY /= length;
    }
    player.vx = moveX * player.stats.moveSpeed;
    player.vy = moveY * player.stats.moveSpeed;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    pushOutOfObstacles(player, this.arena);
    clampToArena(player, this.arena);
  }

  private rebuildGrid(): void {
    this.grid.clear();
    for (const enemy of this.enemies.items) {
      if (enemy.active) this.grid.insert(enemy.slot, enemy.x, enemy.y);
    }
  }

  private tickPlayer(dt: number): void {
    const player = this.player;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.health > 0) {
      player.health = Math.min(player.stats.maxHealth, player.health + player.stats.regeneration * dt);
    }
  }
}
