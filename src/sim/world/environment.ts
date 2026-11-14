// Environmental hazards (GDD 5.9, 5.10, 5.11). Arena changes turn on by the
// round within the territory and stay on for the rest of the territory.
// Every hazard warns first, then hits the player and enemies alike.
// No Phaser imports (CLAUDE.md rule 1).

import type { ArenaDef, ArenaObstacle, Belt, Bounds, Rect } from '../../data/arenas';
import type { DamageType } from '../../data/damageTypes';
import { ENEMIES } from '../../data/enemies';
import type { EventId } from '../../data/events';
import { HAZARDS, HAZARD_RULES } from '../../data/hazards';
import type { HazardId } from '../../data/hazards';
import { scaledTierValue } from '../../data/tiers';
import { hitPlayer, killEnemy } from './damage';
import { spawnEnemy } from './enemies';
import { harmEnemy } from './hazards';
import { clampToArena, pushOutOfObstacles } from './movement';
import { buildStatus, hasStatus } from './status';
import type { Enemy } from './types';
import type { World } from './world';

/** An arena obstacle the simulation moves or removes: orrery arms, vats and thorn hedges. */
export interface LiveObstacle {
  kind: ArenaObstacle['kind'];
  x: number;
  y: number;
  radius: number;
  low?: boolean;
}

/** The arena as one round sees it: obstacles change and the live area shrinks. */
export interface RoundArena extends Omit<ArenaDef, 'obstacles' | 'bounds'> {
  obstacles: LiveObstacle[];
  bounds: Bounds;
}

export type ZoneShape = 'circle' | 'rect';

/** One hazard on the floor. Bursts fire once when the warning ends. Other zones act while armed. */
export interface HazardZone {
  readonly hazard: HazardId;
  readonly shape: ZoneShape;
  x: number;
  y: number;
  radius: number;
  width: number;
  height: number;
  /** Elapsed seconds when the warning ends. */
  armedAt: number;
  /** Elapsed seconds when the zone goes. Infinity for zones lasting the round. */
  endsAt: number;
  tick: number;
  fired: boolean;
}

export interface EnvironmentSetup {
  readonly localRound: number;
  readonly event?: EventId;
}

/** Which arena changes run this round. Changes stay on to the end of the territory (NOTES.md). */
export interface EnvironmentFlags {
  channels: boolean;
  slag: boolean;
  ingots: boolean;
  puddles: boolean;
  volatileVats: boolean;
  acid: boolean;
  beltsRun: boolean;
  beltsReverse: boolean;
  presses: boolean;
  lightning: boolean;
  gravity: boolean;
  orrery: boolean;
  erase: boolean;
  vines: boolean;
  thorns: boolean;
  blooms: boolean;
  fungal: boolean;
  /** Rift Storm moves the gravity wells. */
  movingWells: boolean;
  /** Biological Bloom spreads fungal growth with Thornlings. */
  bloomEvent: boolean;
}

export function environmentFlags(kingdom: ArenaDef['kingdom'], localRound: number, event?: EventId): EnvironmentFlags {
  const from = (round: number): boolean => localRound >= round;
  return {
    channels: kingdom === 'Keldrath' && from(3),
    slag: kingdom === 'Keldrath' && from(5),
    ingots: kingdom === 'Keldrath' && from(7),
    puddles: kingdom === 'Myrathis' && from(3),
    volatileVats: kingdom === 'Myrathis' && from(5),
    acid: kingdom === 'Myrathis' && from(7),
    beltsRun: kingdom === 'Merovant' && from(3),
    beltsReverse: kingdom === 'Merovant' && from(5),
    presses: kingdom === 'Merovant' && from(5),
    lightning: kingdom === 'Orthelyn' && from(3),
    gravity: (kingdom === 'Orthelyn' && from(5)) || event === 'rift-storm',
    orrery: kingdom === 'Orthelyn' && from(5),
    erase: kingdom === 'Orthelyn' && from(7),
    vines: kingdom === 'Nymora' && from(3),
    thorns: kingdom === 'Nymora' && from(5),
    blooms: kingdom === 'Nymora' && from(5),
    fungal: (kingdom === 'Nymora' && from(7)) || event === 'biological-bloom',
    movingWells: event === 'rift-storm',
    bloomEvent: event === 'biological-bloom',
  };
}

type TimerKey = 'slag' | 'ingot' | 'press' | 'lightning' | 'erase' | 'acid' | 'bloom' | 'fungal' | 'wells';

/** Hazard state for one round. The Combat scene draws from this. */
export class Environment {
  readonly flags: EnvironmentFlags;
  readonly zones: HazardZone[] = [];
  readonly belts: Array<Belt & { running: boolean; sign: 1 | -1 }>;
  /** Orrery arms: segments along two turning lines. */
  readonly armSegments: LiveObstacle[] = [];
  armAngle = 0;
  /** Thorn hedges sprout over the warning, then block (GDD 5.10). */
  readonly thorns: LiveObstacle[];
  thornsUp = false;
  /** Vine depth from each edge, pixels. */
  vineDepth = 0;
  /** Erased rings of tiles so far, and the next ring while it flickers. */
  erased = 0;
  eraseWarning = false;
  /** Vats waiting to burst, with the step they burst on. */
  private readonly pendingVats: Array<{ vat: LiveObstacle; step: number }> = [];
  /** Player Armour share this step. Acid lowers it (GDD 5.10). */
  armourShare = 1;
  /** Gravity wells pull at 1 and push at -1. The Unmaking flips them (GDD 10.4). */
  gravitySign: 1 | -1 = 1;
  /** Elapsed seconds at the last update. */
  private now = 0;
  private beltTimer = HAZARD_RULES.beltReverseSeconds;
  private readonly timers: Record<TimerKey, number> = { slag: 8, ingot: 3, press: 3, lightning: 3, erase: HAZARD_RULES.eraseIntervalSeconds, acid: 1, bloom: 2, fungal: 1, wells: HAZARD_RULES.gravityMoveSeconds };
  private acidCount = 0;

  constructor(
    readonly arena: RoundArena,
    readonly setup: EnvironmentSetup,
    private readonly territory: number,
  ) {
    this.flags = environmentFlags(arena.kingdom, setup.localRound, setup.event);
    const flags = this.flags;
    this.belts = (arena.belts ?? []).map((belt) => ({ ...belt, running: flags.beltsRun, sign: belt.direction }));
    this.thorns = flags.thorns ? (arena.hedgeLines ?? []).map((shape) => ({ ...shape })) : [];
    const warn = HAZARD_RULES.warningSeconds;
    if (flags.channels) {
      for (const rect of arena.channels ?? []) this.addRect('molten-channel', rect, warn, Infinity);
    }
    if (flags.puddles) {
      for (const point of arena.puddles ?? []) this.addCircle('toxic-puddle', point.x, point.y, HAZARD_RULES.puddleRadius, warn, Infinity);
    }
    if (flags.gravity) this.placeWells(undefined);
    if (flags.orrery) {
      for (let arm = 0; arm < HAZARD_RULES.orreryArms; arm++) {
        for (let segment = 0; segment < HAZARD_RULES.orreryArmSegments; segment++) {
          const shape: LiveObstacle = { kind: 'arm', x: 0, y: 0, radius: HAZARD_RULES.orreryArmRadius };
          this.armSegments.push(shape);
          arena.obstacles.push(shape);
        }
      }
      this.placeArms();
    }
    if (flags.vines) this.vineDepth = HAZARD_RULES.vineStartDepth;
  }

  /** Damage of a hazard hit after territory scaling. Champions resist one step (GDD 5.10). */
  damageOf(hazard: HazardId, resist = false): number {
    const tier = HAZARDS[hazard].damage;
    if (!tier) return 0;
    return scaledTierValue('enemyDamage', tier, this.territory - (resist ? HAZARD_RULES.resistSteps : 0));
  }

  private addCircle(hazard: HazardId, x: number, y: number, radius: number, warning: number, lasts: number, now = 0): HazardZone {
    const zone: HazardZone = { hazard, shape: 'circle', x, y, radius, width: 0, height: 0, armedAt: now + warning, endsAt: now + warning + lasts, tick: 0, fired: false };
    this.zones.push(zone);
    return zone;
  }

  private addRect(hazard: HazardId, rect: Rect, warning: number, lasts: number, now = 0): HazardZone {
    const zone: HazardZone = {
      hazard,
      shape: 'rect',
      x: rect.x,
      y: rect.y,
      radius: 0,
      width: rect.width,
      height: rect.height,
      armedAt: now + warning,
      endsAt: now + warning + lasts,
      tick: 0,
      fired: false,
    };
    this.zones.push(zone);
    return zone;
  }

  private placeWells(world: World | undefined): void {
    for (let index = this.zones.length - 1; index >= 0; index--) {
      if (this.zones[index]?.hazard === 'gravity-well') this.zones.splice(index, 1);
    }
    const arena = this.arena;
    for (let index = 0; index < HAZARD_RULES.gravityWells; index++) {
      // Fixed wells sit either side of the orrery. Rift Storm moves them at random.
      const x = world ? world.rng.range(400, arena.width - 400) : arena.width * (index === 0 ? 0.25 : 0.75);
      const y = world ? world.rng.range(300, arena.height - 300) : arena.height / 2;
      this.addCircle('gravity-well', x, y, HAZARD_RULES.gravityRadius, HAZARD_RULES.warningSeconds, Infinity, world?.elapsed ?? 0);
    }
  }

  private placeArms(): void {
    const arena = this.arena;
    const count = HAZARD_RULES.orreryArmSegments;
    this.armSegments.forEach((segment, index) => {
      const arm = Math.floor(index / count);
      const step = (index % count) + 1;
      const angle = this.armAngle + (arm * Math.PI * 2) / HAZARD_RULES.orreryArms;
      const distance = 140 + ((HAZARD_RULES.orreryArmLength - 140) * step) / count;
      segment.x = arena.width / 2 + Math.cos(angle) * distance;
      segment.y = arena.height / 2 + Math.sin(angle) * distance * 0.7;
    });
  }

  /** True while a vat explodes on any hit (GDD 5.9, Rounds 5 to 7 in Myrathis). */
  get vatsVolatile(): boolean {
    return this.flags.volatileVats;
  }

  /** Marks a vat to burst next step, so chains spread one step at a time (GDD 7.20). */
  breakVat(world: World, vat: LiveObstacle, force = false): void {
    if ((!this.flags.volatileVats && !force) || vat.kind !== 'vat') return;
    if (this.pendingVats.some((entry) => entry.vat === vat)) return;
    this.pendingVats.push({ vat, step: world.steps + 1 });
  }

  /** The Mad Alchemist shatters a vat on purpose, volatile or not (GDD 5.9). */
  shatterVat(world: World, vat: LiveObstacle): void {
    this.breakVat(world, vat, true);
  }

  /** Bloom Crown: a healing bloom where an enemy fell (GDD 5.12). */
  addBloom(x: number, y: number, seconds: number): void {
    this.addCircle('healing-bloom', x, y, HAZARD_RULES.bloomRadius, 0, seconds, this.now);
  }

  /** Glowing Plate: molten channels open around the throne (GDD 10.4). */
  openMoltenRing(x: number, y: number): void {
    for (let index = 0; index < 6; index++) {
      const angle = (index / 6) * Math.PI * 2;
      this.addCircle('molten-channel', x + Math.cos(angle) * 300, y + Math.sin(angle) * 220, 70, HAZARD_RULES.warningSeconds, Infinity, this.now);
    }
  }

  /** Breaks every vat touching a circle: blasts and explosions join the chain. */
  breakVatsIn(world: World, x: number, y: number, radius: number): void {
    if (!this.flags.volatileVats) return;
    for (const obstacle of this.arena.obstacles) {
      if (obstacle.kind !== 'vat') continue;
      const reach = radius + obstacle.radius;
      if ((obstacle.x - x) ** 2 + (obstacle.y - y) ** 2 <= reach * reach) this.breakVat(world, obstacle);
    }
  }

  /** Fire burns fungal growth away (GDD 5.10). */
  burnFungus(x: number, y: number, radius: number): void {
    for (let index = this.zones.length - 1; index >= 0; index--) {
      const zone = this.zones[index];
      if (!zone || zone.hazard !== 'fungal-growth') continue;
      const reach = radius + zone.radius;
      if ((zone.x - x) ** 2 + (zone.y - y) ** 2 <= reach * reach) this.zones.splice(index, 1);
    }
  }

  /** True when a point lies outside the live tiles of the plaza. */
  outside(x: number, y: number): boolean {
    const bounds = this.arena.bounds;
    return x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom;
  }

  update(world: World, dt: number): void {
    const now = world.elapsed;
    this.now = now;
    const flags = this.flags;
    const rules = HAZARD_RULES;
    this.armourShare = 1;

    // Timed hazards: each timer starts a new warning, then the burst lands.
    const due = (key: TimerKey, interval: number): boolean => {
      this.timers[key] -= dt;
      if (this.timers[key] > 0) return false;
      this.timers[key] += interval;
      return true;
    };
    const arena = this.arena;
    const player = world.player;
    if (flags.slag && due('slag', rules.slagIntervalSeconds)) {
      // The crucible tilts toward one half of the arena.
      const side = world.rng.int(0, 3);
      const halfW = arena.width / 2;
      const halfH = arena.height / 2;
      const rect: Rect =
        side === 0
          ? { x: 0, y: 0, width: halfW, height: arena.height }
          : side === 1
            ? { x: halfW, y: 0, width: halfW, height: arena.height }
            : side === 2
              ? { x: 0, y: 0, width: arena.width, height: halfH }
              : { x: 0, y: halfH, width: arena.width, height: halfH };
      this.addRect('slag-wave', rect, rules.warningSeconds * 2, 0.4, now);
    }
    if (flags.ingots && due('ingot', rules.ingotIntervalSeconds)) {
      const x = clamp(player.x + world.rng.range(-260, 260), 80, arena.width - 80);
      const y = clamp(player.y + world.rng.range(-260, 260), 80, arena.height - 80);
      this.addCircle('falling-ingot', x, y, rules.ingotRadius, rules.warningSeconds, 0.2, now);
    }
    if (flags.presses && due('press', rules.pressIntervalSeconds)) {
      const tiles = [...(arena.pressTiles ?? [])];
      for (let index = 0; index < rules.pressesPerStamp && tiles.length > 0; index++) {
        const tile = tiles.splice(world.rng.int(0, tiles.length - 1), 1)[0];
        if (tile) this.addRect('stamping-press', tile, rules.warningSeconds, 0.2, now);
      }
    }
    if (flags.lightning && due('lightning', rules.lightningIntervalSeconds)) {
      for (let index = 0; index < rules.lightningStrikes; index++) {
        // One strike near the player, the rest anywhere on the plaza.
        const near = index === 0;
        const x = near ? player.x + world.rng.range(-180, 180) : world.rng.range(arena.bounds.left + 100, arena.bounds.right - 100);
        const y = near ? player.y + world.rng.range(-180, 180) : world.rng.range(arena.bounds.top + 100, arena.bounds.bottom - 100);
        this.addCircle('lightning-strike', x, y, rules.lightningRadius, rules.warningSeconds, 0.2, now);
      }
    }
    if (flags.acid && due('acid', rules.acidIntervalSeconds)) {
      // Acid spreads outward from the central vat.
      const angle = world.rng.range(0, Math.PI * 2);
      const distance = Math.min(700, rules.acidSpread * (1 + this.acidCount++ * 0.6));
      this.addCircle('acid-pool', arena.width / 2 + Math.cos(angle) * distance, arena.height / 2 + Math.sin(angle) * distance * 0.7, rules.acidRadius, rules.warningSeconds, Infinity, now);
    }
    if (flags.blooms && due('bloom', rules.bloomIntervalSeconds)) {
      this.addCircle('healing-bloom', world.rng.range(200, arena.width - 200), world.rng.range(200, arena.height - 200), rules.bloomRadius, rules.warningSeconds, rules.bloomSeconds, now);
    }
    if (flags.fungal && due('fungal', rules.fungalIntervalSeconds) && this.count('fungal-growth') < rules.fungalLimit) {
      let x: number;
      let y: number;
      if (flags.bloomEvent) {
        x = world.rng.range(200, arena.width - 200);
        y = world.rng.range(200, arena.height - 200);
      } else {
        // The Spore Sovereign's fountain: growth spreads outward from the centre.
        const angle = world.rng.range(0, Math.PI * 2);
        const distance = 160 + this.count('fungal-growth') * 40;
        x = clamp(arena.width / 2 + Math.cos(angle) * distance, 80, arena.width - 80);
        y = clamp(arena.height / 2 + Math.sin(angle) * distance * 0.7, 80, arena.height - 80);
      }
      this.addCircle('fungal-growth', x, y, rules.fungalRadius, rules.warningSeconds, Infinity, now);
      if (flags.bloomEvent) {
        // Thornlings sprout from every patch (GDD 5.11).
        for (let index = 0; index < rules.fungalSprouts; index++) spawnEnemy(world, ENEMIES.thornling, x, y, { minion: true });
      }
    }
    if (flags.movingWells && due('wells', rules.gravityMoveSeconds)) this.placeWells(world);
    if (flags.erase && this.erased < rules.eraseStages) {
      this.timers.erase -= dt;
      this.eraseWarning = this.timers.erase <= rules.warningSeconds;
      if (this.timers.erase <= 0) {
        this.timers.erase += rules.eraseIntervalSeconds;
        this.eraseRing(world);
      }
    } else {
      this.eraseWarning = false;
    }

    // Moving parts.
    if (flags.beltsReverse) {
      this.beltTimer -= dt;
      if (this.beltTimer <= 0) {
        this.beltTimer += rules.beltReverseSeconds;
        for (const belt of this.belts) belt.sign = belt.sign === 1 ? -1 : 1;
      }
    }
    if (flags.orrery) {
      this.armAngle += rules.orreryTurn * dt;
      this.placeArms();
    }
    if (flags.thorns && !this.thornsUp && now >= rules.warningSeconds) {
      this.thornsUp = true;
      arena.obstacles.push(...this.thorns);
    }
    if (flags.vines) {
      const grow = Math.min(1, now / rules.vineGrowSeconds);
      this.vineDepth = rules.vineStartDepth + (rules.vineFullDepth - rules.vineStartDepth) * grow;
    }

    this.burstVats(world);
    this.actOnBodies(world, dt);

    // Zones end.
    for (let index = this.zones.length - 1; index >= 0; index--) {
      const zone = this.zones[index];
      if (zone && now >= zone.endsAt) this.zones.splice(index, 1);
    }
  }

  private count(hazard: HazardId): number {
    let total = 0;
    for (const zone of this.zones) if (zone.hazard === hazard) total++;
    return total;
  }

  /** The Unmaking erases the outer ring of tiles (GDD 5.10). */
  private eraseRing(world: World): void {
    const tile = this.arena.tile ?? 200;
    this.erased++;
    const depth = this.erased * tile;
    this.arena.bounds = { left: depth, top: depth, right: this.arena.width - depth, bottom: this.arena.height - depth };
    world.emit({ type: 'tilesErased', stage: this.erased });
    for (const enemy of world.enemies.items) {
      if (enemy.active && this.outside(enemy.x, enemy.y)) killEnemy(world, enemy, -1, 0);
    }
    this.returnPlayer(world);
  }

  /** A player past the edge takes damage and returns to the nearest tile. */
  returnPlayer(world: World): void {
    const player = world.player;
    if (!this.outside(player.x, player.y)) return;
    hitPlayer(world, this.damageOf('erased-tile'), 'Impact');
    clampToArena(player, this.arena);
  }

  private burstVats(world: World): void {
    for (let index = this.pendingVats.length - 1; index >= 0; index--) {
      const entry = this.pendingVats[index];
      if (!entry || entry.step > world.steps) continue;
      this.pendingVats.splice(index, 1);
      const position = this.arena.obstacles.indexOf(entry.vat);
      if (position < 0) continue;
      this.arena.obstacles.splice(position, 1);
      const { x, y } = entry.vat;
      world.emit({ type: 'hazardBurst', hazard: 'volatile-vat', x, y, radius: HAZARD_RULES.vatBlastRadius });
      this.hurtCircle(world, 'volatile-vat', x, y, HAZARD_RULES.vatBlastRadius, 1);
      // The blast reaches nearby vats on the next step.
      this.breakVatsIn(world, x, y, HAZARD_RULES.vatChainRadius - entry.vat.radius);
    }
  }

  /** Hits the player and every enemy inside a circle with a hazard's damage. */
  private hurtCircle(world: World, hazard: HazardId, x: number, y: number, radius: number, share: number): Enemy[] {
    const type = HAZARDS[hazard].damageType ?? 'Impact';
    const player = world.player;
    if ((player.x - x) ** 2 + (player.y - y) ** 2 <= (radius + player.radius) ** 2) {
      hitPlayer(world, this.damageOf(hazard) * share, type);
    }
    const hit: Enemy[] = [];
    for (const enemy of world.enemies.items) {
      if (!enemy.active) continue;
      if ((enemy.x - x) ** 2 + (enemy.y - y) ** 2 > (radius + enemy.radius) ** 2) continue;
      hit.push(enemy);
    }
    for (const enemy of hit) this.hurtEnemy(world, enemy, hazard, share, type);
    return hit;
  }

  private hurtEnemy(world: World, enemy: Enemy, hazard: HazardId, share: number, type: DamageType): void {
    const resist = enemy.rank === 'champion';
    harmEnemy(world, enemy, this.damageOf(hazard, resist) * share * HAZARD_RULES.enemyShare, type);
  }

  private inside(zone: HazardZone, x: number, y: number, radius: number): boolean {
    if (zone.shape === 'circle') return (x - zone.x) ** 2 + (y - zone.y) ** 2 <= (zone.radius + radius) ** 2;
    return x + radius >= zone.x && x - radius <= zone.x + zone.width && y + radius >= zone.y && y - radius <= zone.y + zone.height;
  }

  private inVines(x: number, y: number): boolean {
    const depth = this.vineDepth;
    const arena = this.arena;
    return x < depth || y < depth || x > arena.width - depth || y > arena.height - depth;
  }

  /** Damage, pushes, pulls, slows and heals on the player and the enemies. */
  private actOnBodies(world: World, dt: number): void {
    const now = world.elapsed;
    const player = world.player;
    const rules = HAZARD_RULES;

    for (const zone of this.zones) {
      if (now < zone.armedAt) continue;
      const def = HAZARDS[zone.hazard];
      switch (zone.hazard) {
        case 'slag-wave':
        case 'falling-ingot':
        case 'stamping-press':
        case 'lightning-strike': {
          if (zone.fired) break;
          zone.fired = true;
          world.emit({ type: 'hazardBurst', hazard: zone.hazard, x: zone.x + zone.width / 2, y: zone.y + zone.height / 2, radius: zone.radius });
          if (zone.shape === 'circle') {
            const hit = this.hurtCircle(world, zone.hazard, zone.x, zone.y, zone.radius, 1);
            if (zone.hazard === 'lightning-strike') this.arc(world, zone, hit);
          } else {
            this.hurtRect(world, zone);
          }
          break;
        }
        case 'molten-channel':
        case 'toxic-puddle':
        case 'acid-pool':
        case 'fungal-growth': {
          if (zone.hazard === 'acid-pool' && this.inside(zone, player.x, player.y, player.radius)) {
            this.armourShare = rules.acidArmourShare;
          }
          zone.tick -= dt;
          if (zone.tick > 0) break;
          zone.tick += rules.tickSeconds;
          const share = rules.tickSeconds;
          const type = def.damageType ?? 'Impact';
          if (this.inside(zone, player.x, player.y, player.radius)) hitPlayer(world, this.damageOf(zone.hazard) * share, type);
          for (const enemy of world.enemies.items) {
            if (!enemy.active || !this.inside(zone, enemy.x, enemy.y, enemy.radius)) continue;
            if (zone.hazard === 'acid-pool') buildStatus(world, enemy, -1, 'Corroded', rules.acidCorrodedPerSecond * share);
            // A Burning enemy burns fungal growth away.
            if (zone.hazard === 'fungal-growth' && hasStatus(enemy, 'Burning')) zone.endsAt = now;
            this.hurtEnemy(world, enemy, zone.hazard, share, type);
          }
          break;
        }
        case 'gravity-well': {
          const pull = (body: { x: number; y: number }, scale: number): void => {
            const dx = zone.x - body.x;
            const dy = zone.y - body.y;
            const distance = Math.hypot(dx, dy);
            if (distance > zone.radius || distance < 8) return;
            const speed = rules.gravityPull * (1 - distance / zone.radius) * scale * this.gravitySign;
            body.x += (dx / distance) * speed * dt;
            body.y += (dy / distance) * speed * dt;
          };
          pull(player, 1);
          for (const enemy of world.enemies.items) if (enemy.active) pull(enemy, 1);
          // Projectiles bend toward the well.
          for (const projectile of world.projectiles.items) {
            if (!projectile.active || projectile.kind !== 'straight') continue;
            const dx = zone.x - projectile.x;
            const dy = zone.y - projectile.y;
            const distance = Math.hypot(dx, dy);
            if (distance > zone.radius || distance < 8) continue;
            const bend = 2.5 * (1 - distance / zone.radius) * dt;
            const nx = projectile.dx + (dx / distance) * bend;
            const ny = projectile.dy + (dy / distance) * bend;
            const length = Math.hypot(nx, ny);
            projectile.dx = nx / length;
            projectile.dy = ny / length;
          }
          break;
        }
        case 'healing-bloom': {
          const heal = rules.bloomHeal * dt;
          if (this.inside(zone, player.x, player.y, player.radius) && player.health > 0) {
            player.health = Math.min(player.stats.maxHealth, player.health + heal);
          }
          for (const enemy of world.enemies.items) {
            if (enemy.active && this.inside(zone, enemy.x, enemy.y, enemy.radius)) {
              enemy.health = Math.min(enemy.maxHealth, enemy.health + heal);
            }
          }
          break;
        }
        default:
          break;
      }
    }

    // Conveyor belts push anyone standing on them.
    for (const belt of this.belts) {
      if (!belt.running) continue;
      const move = rules.beltSpeed * belt.sign * dt;
      const on = (body: { x: number; y: number }): boolean =>
        body.x >= belt.x && body.x <= belt.x + belt.width && body.y >= belt.y && body.y <= belt.y + belt.height;
      if (on(player)) player.x += move;
      for (const enemy of world.enemies.items) if (enemy.active && on(enemy)) enemy.x += move;
    }

    // Vines slow movement at the edges.
    if (this.flags.vines) {
      if (this.inVines(player.x, player.y)) {
        player.slowFactor = Math.min(player.slowFactor, rules.vineSlow);
        player.slowTimer = Math.max(player.slowTimer, 0.1);
      }
      for (const enemy of world.enemies.items) {
        if (!enemy.active || !this.inVines(enemy.x, enemy.y)) continue;
        enemy.slowFactor = Math.min(enemy.slowFactor, rules.vineSlow);
        enemy.slowTimer = Math.max(enemy.slowTimer, 0.1);
      }
    }

    // Thorn hedges cut whatever touches them.
    if (this.thornsUp) {
      this.thornTick -= dt;
      if (this.thornTick <= 0) {
        this.thornTick += rules.tickSeconds;
        const touches = (x: number, y: number, radius: number): boolean =>
          this.thorns.some((thorn) => (thorn.x - x) ** 2 + (thorn.y - y) ** 2 <= (thorn.radius + radius + rules.thornReach) ** 2);
        if (touches(player.x, player.y, player.radius)) hitPlayer(world, this.damageOf('thorn-hedge') * rules.tickSeconds, 'Slashing');
        for (const enemy of world.enemies.items) {
          if (enemy.active && touches(enemy.x, enemy.y, enemy.radius)) this.hurtEnemy(world, enemy, 'thorn-hedge', rules.tickSeconds, 'Slashing');
        }
      }
    }

    // Moving parts never leave a body inside a wall.
    if (this.belts.some((belt) => belt.running) || this.flags.gravity || this.flags.orrery) {
      pushOutOfObstacles(player, this.arena);
      clampToArena(player, this.arena);
      for (const enemy of world.enemies.items) {
        if (!enemy.active) continue;
        pushOutOfObstacles(enemy, this.arena);
        clampToArena(enemy, this.arena);
      }
    }
  }

  private thornTick = 0;

  private hurtRect(world: World, zone: HazardZone): void {
    const type = HAZARDS[zone.hazard].damageType ?? 'Impact';
    const player = world.player;
    if (this.inside(zone, player.x, player.y, player.radius)) hitPlayer(world, this.damageOf(zone.hazard), type);
    const hit: Enemy[] = [];
    for (const enemy of world.enemies.items) if (enemy.active && this.inside(zone, enemy.x, enemy.y, enemy.radius)) hit.push(enemy);
    for (const enemy of hit) this.hurtEnemy(world, enemy, zone.hazard, 1, type);
  }

  /** Lightning arcs from the strike to the nearest targets outside it (GDD 5.10). */
  private arc(world: World, zone: HazardZone, struck: readonly Enemy[]): void {
    const rules = HAZARD_RULES;
    const range = zone.radius + rules.lightningArcRange;
    const player = world.player;
    const candidates: Array<{ distance: number; enemy?: Enemy }> = [];
    const playerDistance = Math.hypot(player.x - zone.x, player.y - zone.y);
    if (playerDistance > zone.radius + player.radius && playerDistance <= range) candidates.push({ distance: playerDistance });
    for (const enemy of world.enemies.items) {
      if (!enemy.active || struck.includes(enemy)) continue;
      const distance = Math.hypot(enemy.x - zone.x, enemy.y - zone.y);
      if (distance <= range) candidates.push({ distance, enemy });
    }
    candidates.sort((a, b) => a.distance - b.distance || (a.enemy?.slot ?? -1) - (b.enemy?.slot ?? -1));
    for (const candidate of candidates.slice(0, rules.lightningArcs)) {
      const target = candidate.enemy ?? player;
      world.emit({ type: 'hazardArc', fromX: zone.x, fromY: zone.y, toX: target.x, toY: target.y });
      if (candidate.enemy) this.hurtEnemy(world, candidate.enemy, 'lightning-strike', rules.lightningArcShare, 'Electric');
      else hitPlayer(world, this.damageOf('lightning-strike') * rules.lightningArcShare, 'Electric');
    }
  }
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/** The round's arena: a copy whose obstacles and live area the hazards change. */
export function createRoundArena(def: ArenaDef): RoundArena {
  return {
    ...def,
    obstacles: def.obstacles.map((obstacle) => ({ ...obstacle })),
    bounds: def.bounds ?? { left: 0, top: 0, right: def.width, bottom: def.height },
  };
}
