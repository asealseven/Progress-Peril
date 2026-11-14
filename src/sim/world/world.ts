// The fixed-step combat simulation. No Phaser imports (CLAUDE.md rule 1).
// A scene owns one World, feeds input in, calls step() and draws the state.

import { ARCHIVE_RULES } from '../../data/archive';
import type { SpecialisationRule } from '../../data/specialisations';
import type { Discipline } from '../../data/weapons';
import type { DamageType } from '../../data/damageTypes';
import { ENEMIES } from '../../data/enemies';
import { roundInTerritory, territoryIndex } from '../../data/rounds';
import { COMBAT, DIRECTOR_RULES, PERFORMANCE_LIMITS, WEAPON_RULES, activeEnemyLimit } from '../../data/tiers';
import type { PerformanceLimits } from '../../data/tiers';
import { attackTokens } from '../ai';
import type { ResolvedWeapon } from '../loadout';
import type { ResearchRule } from '../../data/research';
import { RELIC_RULES } from '../../data/relics';
import type { RelicRule } from '../../data/relics';
import { RESEARCH_RULES } from '../../data/research';
import { emptyFindings } from '../research';
import type { RoundFindings } from '../research';
import { Rng } from '../rng';
import { updateWeapons } from './attacks';
import { createConstruct, updateConstructs } from './constructs';
import { BOSS_RULES } from '../../data/bosses';
import { spawnBosses, updateBosses } from './bosses';
import type { BossBody, BossPlan, BossTelegraph } from './bosses';
import { explode } from './damage';
import { Environment, createRoundArena } from './environment';
import type { RoundArena } from './environment';
import { createEnemy, enemyDied, prepareWave, spawnFromWave, updateEnemies } from './enemies';
import type { Wave } from './enemies';
import { SpatialGrid } from './grid';
import { createEnemyShot, createHazard, enemyBlast, updateEnemyShots, updateHazards } from './hazards';
import { collectAll, createPickup, emptyLoot, updatePickups } from './loot';
import type { Loot } from './loot';
import { clampToArena, pushOutOfObstacles } from './movement';
import { Pool } from './pool';
import { createProjectile, updateProjectiles } from './projectiles';
import type {
  ArchivePerks,
  Construct,
  Enemy,
  EnemyShot,
  Hazard,
  PendingBlast,
  PendingExplosion,
  Pickup,
  Squad,
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
import { updateStatuses } from './status';
import { createTrap, createZone, updateTraps, updateZones } from './zones';

/** Seconds per simulation step. */
export const STEP_SECONDS = 1 / COMBAT.stepsPerSecond;

const NO_PERKS: ArchivePerks = { rules: new Map(), statusFill: new Map(), masters: [], masterStatus: 'Burning', revival: false };

const NO_SYNERGIES: ReadonlySet<string> = new Set();

const ENEMY_CAPACITY = 400;
const GRID_CELL = 64;
const MAX_QUEUED_EVENTS = 4096;

function createWeaponState(
  resolved: ResolvedWeapon,
  suppressed: ResolvedWeapon | undefined,
  nulled: ResolvedWeapon | undefined,
): WeaponState {
  return {
    resolved,
    full: resolved,
    suppressed: suppressed ?? resolved,
    nulled: nulled ?? suppressed ?? resolved,
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
    lightningTimer: WEAPON_RULES.lightningSeconds / 4,
    bayonetTimer: 0,
    smokeTimer: 0,
    firstHits: new Set(),
    damageDealt: 0,
    kills: 0,
  };
}

export class World {
  readonly arena: RoundArena;
  /** Arena changes and hazards (GDD 5.9, 5.10). */
  readonly environment: Environment;
  readonly rng: Rng;
  readonly round: number;
  /** Target combat duration in seconds. */
  readonly duration: number;
  readonly limits: PerformanceLimits;
  readonly player: PlayerState;
  readonly weapons: WeaponState[];
  /** Ids of every active synergy (GDD 7.19). */
  /** Ids of the active synergies. A Null Field switches them off (GDD 10.3). */
  get synergies(): ReadonlySet<string> {
    return this.nullTimer > 0 ? NO_SYNERGIES : this.allSynergies;
  }
  private readonly allSynergies: ReadonlySet<string>;
  /** Bosses, mini-bosses, escorts and their parts (GDD 10). */
  readonly bosses: BossBody[] = [];
  readonly bossTelegraphs: BossTelegraph[] = [];
  /** Seconds left inside a Null Field's effect (GDD 10.3). */
  nullTimer = 0;
  /** The territory boss fell: the round ends (GDD 5.8). */
  bossFallen = false;
  private readonly bossPlan: BossPlan | undefined;
  private bossesIn = false;
  /** Which weapon set is in use: full, suppressed or nulled. */
  private weaponMode: 'full' | 'suppressed' | 'nulled' = 'full';
  readonly enemies: Pool<Enemy>;
  readonly projectiles: Pool<Projectile>;
  readonly constructs: Pool<Construct>;
  readonly traps: Pool<Trap>;
  readonly zones: Pool<Zone>;
  readonly enemyShots: Pool<EnemyShot>;
  readonly hazards: Pool<Hazard>;
  readonly pickups: Pool<Pickup>;
  /** Gold, materials and components collected this round (GDD 14.1, 14.2). */
  readonly loot: Loot = emptyLoot();
  readonly grid: SpatialGrid;
  /** Territory index, 0 to 2. Sets enemy Health and Damage steps (GDD 9.10). */
  readonly territory: number;
  /** Most enemies alive at once (GDD 4.11). */
  readonly activeLimit: number;
  /** Enemies allowed to attack the player at once (GDD 9.15). */
  readonly tokenLimit: number;
  tokensHeld = 0;
  /** Squad blackboards by squad id (GDD 9.15). */
  readonly squads = new Map<number, Squad>();
  nextSquadId = 1;
  /** Holders of the flank slots around the player. */
  readonly flankHolders: Array<{ slot: number; id: number } | undefined> = [];
  /** Magnetised elites alive this step (GDD 9.12). */
  readonly magnets: Enemy[] = [];
  /** Thornling seeds waiting to sprout. A round stays open while one waits. */
  seedCount = 0;
  /** Gold the player carries. Highwaymen steal from this (GDD 9.11). */
  gold: number;
  /** Damage type of the last hit on an enemy, for death rules such as burned seeds. */
  lastHitType: DamageType = 'Impact';
  /** An Unstable stands close this step. */
  suppressing = false;
  /** Auxiliary components are switched off (GDD 9.11). */
  auxiliarySuppressed = false;
  readonly stats: RoundStats = {
    kills: 0,
    damageDealt: 0,
    damageTaken: 0,
    hitsTaken: 0,
    hitsEvaded: 0,
    shotsFired: 0,
    criticalHits: 0,
  };
  /** Named research rules (GDD 8.12). */
  readonly research: ReadonlyMap<ResearchRule, number>;
  private readonly relicRules: ReadonlyMap<RelicRule, number>;
  /** Grand Archive effects: specialisations, Master mechanics and the revival (GDD 3.8, 8.13, 11.12). */
  readonly perks: ArchivePerks;
  /** The revival came this round (GDD 3.8). */
  revived = false;
  /** Engineering Master: weapons whose first construct starts at half health. */
  readonly carryHalf = new Set<number>();
  /** What the round showed for the hidden node conditions (GDD 8.12). */
  readonly findings: RoundFindings = emptyFindings();
  /** Times of recent critical hits, for Probability Storm. */
  private readonly criticalTimes: number[] = [];
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
  /** The spawn entry entering the arena now. */
  private wave: Wave | undefined;
  /** Enemy blasts waiting for the next step. */
  private readonly pendingBlasts: PendingBlast[] = [];
  /** Chain explosions waiting for a later step (GDD 7.20). */
  private readonly pendingExplosions: PendingExplosion[] = [];

  constructor(config: WorldConfig) {
    this.arena = createRoundArena(config.arena);
    this.rng = new Rng(config.seed);
    this.round = config.round;
    this.duration = config.duration;
    this.limits = config.limits ?? PERFORMANCE_LIMITS.pc;
    this.invincible = config.invincible ?? false;
    this.territory = territoryIndex(config.round);
    this.activeLimit = config.activeLimit ?? activeEnemyLimit(this.limits, config.round);
    this.tokenLimit = attackTokens(this.territory);
    this.gold = config.gold ?? 0;
    this.research = config.research ?? new Map();
    this.relicRules = config.relicRules ?? new Map();
    this.perks = config.perks ?? NO_PERKS;
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
      faceX: 0,
      faceY: -1,
      slowTimer: 0,
      slowFactor: 1,
    };

    this.weapons = config.weapons.map((weapon, index) =>
      createWeaponState(weapon, config.suppressedWeapons?.[index], config.nulledWeapons?.[index]),
    );
    // Engineering Master: constructs keep half their health between rounds and start deployed (GDD 8.13).
    if ((config.perks?.masters ?? []).includes('Engineering')) {
      this.weapons.forEach((weapon, index) => {
        const delivery = weapon.resolved.delivery;
        if (delivery !== 'turret' && delivery !== 'companion') return;
        weapon.deployTimer = 0;
        this.carryHalf.add(index);
      });
    }
    this.allSynergies = new Set(config.synergies ?? []);
    this.bossPlan = config.bosses;

    const fallbackEnemy = ENEMIES['royal-footman'];
    this.enemies = new Pool<Enemy>((slot) => createEnemy(slot, fallbackEnemy), ENEMY_CAPACITY);
    this.projectiles = new Pool<Projectile>(createProjectile, this.limits.projectiles);
    this.constructs = new Pool<Construct>(createConstruct, this.limits.constructs);
    this.traps = new Pool<Trap>(createTrap, this.limits.traps);
    this.zones = new Pool<Zone>(createZone, this.limits.areaEffects);
    this.enemyShots = new Pool<EnemyShot>(createEnemyShot, this.limits.enemyShots);
    this.hazards = new Pool<Hazard>(createHazard, this.limits.hazards);
    this.pickups = new Pool<Pickup>(createPickup, this.limits.pickups);
    this.grid = new SpatialGrid(config.arena.width, config.arena.height, GRID_CELL);
    this.environment = new Environment(
      this.arena,
      { localRound: config.localRound ?? roundInTerritory(config.round), ...(config.event ? { event: config.event } : {}) },
      this.territory,
    );
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
    return this.nextSpawn >= this.spawns.length && this.wave === undefined;
  }

  /** Threat units the director has not sent in yet. */
  get spawnsLeft(): number {
    return this.spawns.length - this.nextSpawn + (this.wave ? 1 : 0);
  }

  /** True when a discipline's Master mechanic is on (GDD 8.13). */
  master(discipline: Discipline): boolean {
    return this.perks.masters.includes(discipline);
  }

  /** The summed amount of a specialisation rule (GDD 11.12). */
  spec(rule: SpecialisationRule): number {
    return this.perks.rules.get(rule) ?? 0;
  }

  /** The summed amount of a relic rule held. 0 means the rule is off (GDD 5.12). */
  relic(rule: RelicRule): number {
    return this.relicRules.get(rule) ?? 0;
  }

  /** How many researched nodes carry a rule. 0 means the rule is off. */
  rule(name: ResearchRule): number {
    return this.research.get(name) ?? 0;
  }

  /** A chance roll in the player's favour. Chaos Theory rolls twice and keeps the better result. */
  luck(chance: number): boolean {
    const first = this.rng.chance(chance);
    if (this.rule('chaosTheory') === 0) return first;
    return this.rng.chance(chance) || first;
  }

  /** A chance roll against the player. Chaos Theory rolls twice and keeps the better result. */
  mishap(chance: number): boolean {
    const first = this.rng.chance(chance);
    if (this.rule('chaosTheory') === 0) return first;
    return this.rng.chance(chance) && first;
  }

  /** Damage kept per chain generation (GDD 7.20). Infinite Series slows the fall. */
  get chainFalloff(): number {
    return this.rule('slowChainFalloff') > 0 ? RESEARCH_RULES.slowFalloff : WEAPON_RULES.chainFalloff;
  }

  /** Records a critical hit and the most landed inside one second. */
  noteCritical(): void {
    const now = this.elapsed;
    const times = this.criticalTimes;
    times.push(now);
    while (times.length > 0 && now - (times[0] ?? now) > RESEARCH_RULES.criticalBurstSeconds) times.shift();
    if (times.length > this.findings.criticalBurst) this.findings.criticalBurst = times.length;
  }

  /** Records the depth a chain reached against the limit of its weapon. */
  noteChain(generation: number, limit: number): void {
    if (generation > this.findings.chainDepth) this.findings.chainDepth = generation;
    if (generation >= limit) this.findings.chainLimitReached = true;
  }

  emit(event: WorldEvent): void {
    if (this.events.length >= MAX_QUEUED_EVENTS) this.events.length = 0;
    this.events.push(event);
  }

  /** Chain events queue across steps instead of resolving in one step (GDD 7.20). */
  queueExplosion(explosion: PendingExplosion): void {
    this.pendingExplosions.push(explosion);
  }

  /** Enemy blasts resolve on the next step, so death bursts never recurse. */
  queueBlast(blast: PendingBlast): void {
    this.pendingBlasts.push(blast);
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
    // Bosses enter a moment after the round starts. Escorts come with them (GDD 10.6).
    if (this.bossPlan && !this.bossesIn && this.elapsed >= BOSS_RULES.entrySeconds) {
      this.bossesIn = true;
      spawnBosses(this, this.bossPlan);
    }
    if (this.bosses.length > 0 || this.bossTelegraphs.length > 0) updateBosses(this, dt);
    if (this.nullTimer > 0) this.nullTimer = Math.max(0, this.nullTimer - dt);
    // Gravity Anchor: enemies near the player slow down (GDD 5.12).
    if (this.relic('gravitySlow') > 0) {
      const reach = RELIC_RULES.gravityRadius;
      for (const enemy of this.enemies.items) {
        if (!enemy.active || enemy.championTrait === 'juggernaut') continue;
        if ((enemy.x - this.player.x) ** 2 + (enemy.y - this.player.y) ** 2 > reach * reach) continue;
        enemy.slowFactor = Math.min(enemy.slowFactor, RELIC_RULES.gravitySlow);
        enemy.slowTimer = Math.max(enemy.slowTimer, 0.1);
      }
    }
    this.applySuppression();
    this.rebuildGrid();
    updateStatuses(this, dt);
    this.runChainEvents();
    updateWeapons(this, dt);
    updateConstructs(this, dt);
    updateTraps(this, dt);
    updateProjectiles(this, dt);
    updateEnemyShots(this, dt);
    updateZones(this, dt);
    updateHazards(this, dt);
    this.environment.update(this, dt);
    updatePickups(this, dt);
    this.tickPlayer(dt);

    this.steps++;

    if (this.player.health <= 0 && this.perks.revival && !this.revived) {
      // One revival per campaign: partial health and a short invulnerability window (GDD 3.8).
      this.revived = true;
      this.player.health = this.player.stats.maxHealth * ARCHIVE_RULES.revivalHealth;
      this.player.invulnerable = ARCHIVE_RULES.revivalInvulnerable;
      this.emit({ type: 'revived' });
    } else if (this.player.health <= 0) {
      this.phase = 'defeat';
    } else if (this.bossFallen) {
      // The boss falls: remaining enemies flee and the round ends (GDD 5.8 step 1).
      this.endBossRound();
    } else if (
      (this.bossPlan === undefined || this.bossesIn) &&
      this.spawningFinished &&
      this.enemies.activeCount === 0 &&
      this.seedCount === 0 &&
      this.pendingBlasts.length === 0
    ) {
      // A round ends when spawning has finished and every enemy is defeated,
      // not when the timer expires (GDD 4.9).
      this.phase = 'cleared';
      // Uncollected gold flies to the player when the round ends (GDD 14.1).
      collectAll(this);
    }
  }

  /**
   * Sends scheduled spawns into the arena. When the active limit is full, the
   * director holds spending until enemies die. Budget still unspent when the
   * round timer ends never enters (GDD 4.11).
   */
  private runSpawns(): void {
    const now = this.elapsed;
    for (;;) {
      if (!this.wave) {
        const entry = this.spawns[this.nextSpawn];
        if (!entry) return;
        const size = entry.count + (entry.with ?? []).reduce((sum, member) => sum + member.count, 0);
        const large = size >= DIRECTOR_RULES.warningSize;
        if (entry.time - (large ? DIRECTOR_RULES.warningSeconds : 0) > now) return;
        this.wave = prepareWave(this, entry);
        this.nextSpawn++;
        // Spawn points sit outside the camera view, with a warning marker before large groups enter.
        if (large) {
          for (const anchor of this.wave.anchors) {
            this.emit({ type: 'spawnWarning', x: anchor.x, y: anchor.y, count: Math.ceil(size / this.wave.anchors.length) });
          }
          this.waveTime = Math.max(entry.time, now);
        } else {
          this.waveTime = entry.time;
        }
      }
      if (this.waveTime > now) return;
      const wave = this.wave;
      const held = now >= this.duration && this.waveTime < this.duration;
      if (held && wave.next === 0 && this.enemies.activeCount >= this.activeLimit) {
        // The timer ran out with the limit still full: the entry stays unspent.
        this.dropWave(wave);
        continue;
      }
      spawnFromWave(this, wave, this.activeLimit - this.enemies.activeCount);
      if (wave.next < wave.members.length) {
        if (now >= this.duration && this.enemies.activeCount >= this.activeLimit) this.dropWave(wave);
        return;
      }
      this.wave = undefined;
    }
  }

  private waveTime = 0;

  private dropWave(wave: Wave): void {
    if (wave.squad && wave.squad.members <= 0) this.squads.delete(wave.squad.id);
    this.wave = undefined;
  }

  /**
   * The Unstable switches Auxiliary components off on nearby player weapons (GDD 9.11).
   * A Null Field switches off synergies and Auxiliary components (GDD 10.3).
   */
  private applySuppression(): void {
    // Anomalous Physics: Auxiliary components ignore suppression.
    const auxiliaryOff = this.suppressing && this.rule('ignoreSuppression') === 0;
    const mode = this.nullTimer > 0 ? 'nulled' : auxiliaryOff ? 'suppressed' : 'full';
    if (this.suppressing !== this.auxiliarySuppressed) {
      this.auxiliarySuppressed = this.suppressing;
      if (this.rule('ignoreSuppression') === 0) this.emit({ type: 'suppressed', active: this.suppressing });
    }
    if (mode === this.weaponMode) return;
    this.weaponMode = mode;
    for (const weapon of this.weapons) weapon.resolved = weapon[mode];
  }

  /** Remaining enemies flee: they leave with no loot and no death effects. */
  private endBossRound(): void {
    for (const enemy of this.enemies.items) {
      if (!enemy.active) continue;
      enemy.noLegacy = true;
      enemy.carriedGold = 0;
      enemyDied(this, enemy, false);
      this.enemies.release(enemy);
    }
    for (const hazard of this.hazards.items) if (hazard.active && hazard.kind === 'seed') this.hazards.release(hazard);
    this.seedCount = 0;
    this.nextSpawn = this.spawns.length;
    this.wave = undefined;
    this.pendingBlasts.length = 0;
    this.pendingExplosions.length = 0;
    this.bossTelegraphs.length = 0;
    this.bosses.length = 0;
    this.phase = 'cleared';
    collectAll(this);
  }

  /** Resolves queued chain explosions, up to the per-step cap (GDD 7.20, 7.21). */
  private runChainEvents(): void {
    const batch = this.pendingExplosions.splice(0, this.limits.chainEventsPerStep);
    for (const pending of batch) {
      this.noteChain(pending.generation, this.weapons[pending.weaponIndex]?.resolved.chainDepthLimit ?? WEAPON_RULES.chainDepthLimit);
      explode(this, pending.x, pending.y, pending.radius, pending.weaponIndex, {
        scale: pending.damageScale * this.chainFalloff ** (pending.generation - 1),
        generation: pending.generation,
        explosive: pending.explosive,
      });
    }
    const blasts = this.pendingBlasts.splice(0, this.limits.chainEventsPerStep);
    for (const blast of blasts) enemyBlast(this, blast);
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
    // Latched crawlers and spore clouds slow the player (GDD 9.11).
    const speed = player.stats.moveSpeed * (player.slowTimer > 0 ? player.slowFactor : 1);
    player.vx = moveX * speed;
    player.vy = moveY * speed;
    if (length > 1e-6) {
      player.faceX = moveX / Math.min(1, length);
      player.faceY = moveY / Math.min(1, length);
    }
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
    if (player.slowTimer > 0) {
      player.slowTimer -= dt;
      if (player.slowTimer <= 0) player.slowFactor = 1;
    }
    if (player.health > 0) {
      // Regeneration (research): the rate doubles below half health.
      const low = this.rule('regenBelowHalf') > 0 && player.health < player.stats.maxHealth / 2;
      player.health = Math.min(player.stats.maxHealth, player.health + player.stats.regeneration * (low ? 2 : 1) * dt);
    }
  }
}
