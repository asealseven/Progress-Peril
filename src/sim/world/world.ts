// The fixed-step combat simulation. No Phaser imports (CLAUDE.md rule 1).
// A scene owns one World, feeds input in, calls step() and draws the state.

import type { ArenaDef } from '../../data/arenas';
import { ENEMIES } from '../../data/enemies';
import { COMBAT } from '../../data/tiers';
import { Rng } from '../rng';
import { createEnemy, spawnGroup, updateEnemies } from './enemies';
import { SpatialGrid } from './grid';
import { clampToArena, pushOutOfObstacles } from './movement';
import { Pool } from './pool';
import { updateProjectiles, updateWeapons } from './projectiles';
import type {
  Enemy,
  PlayerState,
  Projectile,
  RoundStats,
  SpawnEntry,
  StepInput,
  WeaponState,
  WorldConfig,
  WorldEvent,
  WorldPhase,
} from './types';

/** Seconds per simulation step. */
export const STEP_SECONDS = 1 / COMBAT.stepsPerSecond;

const ENEMY_CAPACITY = 400;
const PROJECTILE_CAPACITY = 300;
const GRID_CELL = 64;
const MAX_QUEUED_EVENTS = 4096;

export class World {
  readonly arena: ArenaDef;
  readonly rng: Rng;
  readonly round: number;
  /** Target combat duration in seconds. */
  readonly duration: number;
  readonly player: PlayerState;
  readonly weapons: WeaponState[];
  readonly enemies: Pool<Enemy>;
  readonly projectiles: Pool<Projectile>;
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
  /** Largest radius among spawned enemies, for grid queries. */
  maxEnemyRadius = 0;
  invincible: boolean;

  private readonly spawns: readonly SpawnEntry[];
  private nextSpawn = 0;

  constructor(config: WorldConfig) {
    this.arena = config.arena;
    this.rng = new Rng(config.seed);
    this.round = config.round;
    this.duration = config.duration;
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

    this.weapons = config.weapons.map((weapon) => ({
      def: weapon.def,
      stats: weapon.stats,
      cooldown: COMBAT.weaponStartDelay,
      targetSlot: -1,
      targetId: -1,
      aimX: 0,
      aimY: -1,
    }));

    const fallbackEnemy = ENEMIES['royal-footman'];
    this.enemies = new Pool<Enemy>((slot) => createEnemy(slot, fallbackEnemy), ENEMY_CAPACITY);
    this.projectiles = new Pool<Projectile>(
      (slot) => ({
        active: false,
        slot,
        x: 0,
        y: 0,
        dx: 1,
        dy: 0,
        speed: 0,
        radius: 0,
        distanceLeft: 0,
        weaponIndex: 0,
      }),
      PROJECTILE_CAPACITY,
    );
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

  /** Advances the simulation by 1/60 second. */
  step(input: StepInput): void {
    if (this.phase !== 'running') return;
    const dt = STEP_SECONDS;

    this.runSpawns();
    this.movePlayer(input, dt);
    updateEnemies(this, dt);
    this.rebuildGrid();
    updateWeapons(this, dt);
    updateProjectiles(this, dt);
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
