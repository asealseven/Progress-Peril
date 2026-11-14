// The effects library drawn in code (GDD 15.3, 15.4): one hit spark, one
// burst and one trail per damage type (27 effects), explosions in three sizes,
// one effect per status reaction, ink splatters and attack shapes. Visual
// only. The simulation never reads these, and their randomness stays outside
// the run seed. The density setting scales particle counts (GDD 3.10).

import type Phaser from 'phaser';
import type { DamageType } from '../data/damageTypes';
import { DAMAGE_TYPE_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import type { Reaction } from '../data/statusEffects';

type ParticleShape = 'dot' | 'streak' | 'square' | 'shard' | 'bubble' | 'spark';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colour: number;
  shape: ParticleShape;
  /** Pixels per second squared. Negative values rise, as embers and bubbles do. */
  gravity: number;
}

/** How each damage type's particles look and move (GDD 15.4). */
interface TypeStyle {
  readonly shape: ParticleShape;
  readonly gravity: number;
  readonly speed: number;
  readonly life: number;
  readonly size: number;
}

export const TYPE_STYLES: Readonly<Record<DamageType, TypeStyle>> = {
  Slashing: { shape: 'streak', gravity: 0, speed: 230, life: 0.2, size: 3 },
  Piercing: { shape: 'streak', gravity: 0, speed: 280, life: 0.16, size: 2 },
  Impact: { shape: 'square', gravity: 160, speed: 170, life: 0.35, size: 3.5 },
  Fire: { shape: 'dot', gravity: -140, speed: 120, life: 0.5, size: 3.5 },
  Cold: { shape: 'shard', gravity: 90, speed: 150, life: 0.45, size: 4 },
  Electric: { shape: 'spark', gravity: 0, speed: 260, life: 0.18, size: 3 },
  Toxic: { shape: 'dot', gravity: 220, speed: 110, life: 0.45, size: 3 },
  Corrosive: { shape: 'bubble', gravity: -60, speed: 70, life: 0.6, size: 3.5 },
  Biological: { shape: 'dot', gravity: -15, speed: 60, life: 0.9, size: 2.5 },
};

/** Explosion sizes (GDD 15.4): small, medium and large by blast radius. */
export const EXPLOSION_SIZES = [
  { upTo: 50, rings: 1, particles: 8 },
  { upTo: 90, rings: 2, particles: 14 },
  { upTo: Infinity, rings: 3, particles: 22 },
] as const;

export function explosionSize(radius: number): 0 | 1 | 2 {
  if (radius <= EXPLOSION_SIZES[0].upTo) return 0;
  if (radius <= EXPLOSION_SIZES[1].upTo) return 1;
  return 2;
}

const INK = hexToNumber(PALETTE.ink);
const WHITE = 0xffffff;

function typeColour(type: DamageType): number {
  return hexToNumber(DAMAGE_TYPE_COLOURS[type]);
}

type Shape =
  | { kind: 'arc'; x: number; y: number; radius: number; start: number; end: number }
  | { kind: 'ring'; x: number; y: number; radius: number }
  | { kind: 'line'; points: number[]; width: number };

type TimedShape = Shape & { colour: number; life: number; maxLife: number };

const MAX_PARTICLES = 500;
const MAX_SHAPES = 80;
const DRAG = 3;

export class Effects {
  private readonly particles: Particle[] = [];
  private readonly shapes: TimedShape[] = [];
  /** Scales particle counts (GDD 3.10). 1 means full density. */
  density = 1;

  constructor(private readonly graphics: Phaser.GameObjects.Graphics) {}

  burst(x: number, y: number, colour: number, count: number, speed: number, size: number, life: number, shape: ParticleShape = 'dot', gravity = 0): void {
    // Fractional counts round by chance, so low density thins effects evenly.
    const scaled = count * this.density;
    const total = Math.floor(scaled) + (Math.random() < scaled % 1 ? 1 : 0);
    for (let i = 0; i < total; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life,
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.6),
        colour,
        shape,
        gravity,
      });
    }
  }

  private styled(x: number, y: number, type: DamageType, count: number, speedScale: number, lifeScale: number, sizeScale = 1): void {
    const style = TYPE_STYLES[type];
    this.burst(x, y, typeColour(type), count, style.speed * speedScale, style.size * sizeScale, style.life * lifeScale, style.shape, style.gravity);
  }

  /** The hit spark of a damage type. Critical hits add a white glint. */
  hit(x: number, y: number, type: DamageType, critical: boolean): void {
    this.styled(x, y, type, critical ? 7 : 3, critical ? 1.3 : 1, 1);
    if (critical) this.burst(x, y, WHITE, 2, 120, 3, 0.15, 'streak');
  }

  /** The burst of a damage type: status triggers and large hits. */
  typeBurst(x: number, y: number, type: DamageType, scale = 1): void {
    this.styled(x, y, type, 10 * scale, 1.2, 1.3, 1.1);
  }

  /** One trail puff behind a projectile of a damage type. */
  trail(x: number, y: number, type: DamageType): void {
    const style = TYPE_STYLES[type];
    this.burst(x, y, typeColour(type), 1, 20, style.size * 0.7, style.life * 0.8, style.shape === 'streak' || style.shape === 'spark' ? 'dot' : style.shape, style.gravity * 0.3);
  }

  /** An explosion in one of three sizes, tinted by damage type (GDD 15.4). */
  explosion(x: number, y: number, radius: number, type: DamageType): 0 | 1 | 2 {
    const size = explosionSize(radius);
    const tier = EXPLOSION_SIZES[size];
    const colour = typeColour(type);
    for (let ring = 0; ring < tier.rings; ring++) this.ring(x, y, radius * (1 - ring * 0.25), ring === 0 ? colour : INK, 0.3 + ring * 0.08);
    this.styled(x, y, type, tier.particles, 1.2 + size * 0.3, 1.2, 1 + size * 0.2);
    if (size === 2) this.burst(x, y, INK, 6, 180, 4, 0.6, 'square', 200);
    return size;
  }

  /** An ink splatter, for deaths (GDD 15.3). */
  splatter(x: number, y: number, radius: number): void {
    this.burst(x, y, INK, 6 + radius / 3, 120 + radius * 4, 2.5 + radius / 8, 0.45, 'dot', 60);
    this.addShape({ kind: 'ring', x, y, radius: radius * 0.8 }, INK, 0.22);
  }

  /** The unique effect of each status reaction (GDD 9.14, 15.4). */
  reaction(x: number, y: number, reaction: Reaction, colour: number): void {
    switch (reaction) {
      case 'Shatter':
        this.burst(x, y, colour, 14, 260, 5, 0.5, 'shard', 120);
        this.burst(x, y, WHITE, 6, 200, 3, 0.3, 'shard', 120);
        break;
      case 'Steam Burst':
        this.ring(x, y, 60, colour, 0.5);
        this.burst(x, y, 0xe8e4dc, 16, 90, 6, 0.9, 'bubble', -50);
        break;
      case 'Toxic Fumes':
        this.burst(x, y, colour, 18, 70, 6, 1.1, 'dot', -20);
        this.ring(x, y, 48, colour, 0.6);
        break;
      case 'Galvanic Surge':
        for (let arc = 0; arc < 4; arc++) {
          const angle = (arc / 4) * Math.PI * 2 + Math.random();
          this.lightning([x, y, x + Math.cos(angle) * 60, y + Math.sin(angle) * 60], colour, 0.2);
        }
        this.burst(x, y, colour, 8, 240, 3, 0.2, 'spark');
        break;
      case 'Septic Wound':
        this.burst(x, y, colour, 12, 50, 4, 0.9, 'dot', 40);
        this.ring(x, y, 22, colour, 0.5);
        break;
      case 'Short Circuit':
        this.ring(x, y, 40, colour, 0.25);
        this.ring(x, y, 26, INK, 0.35);
        this.burst(x, y, colour, 10, 300, 3, 0.15, 'spark');
        break;
      case 'Calculated Strike':
        this.line([x - 36, y - 36, x + 36, y + 36], 4, colour, 0.25);
        this.line([x + 36, y - 36, x - 36, y + 36], 4, colour, 0.25);
        this.ring(x, y, 30, colour, 0.3);
        break;
    }
  }

  private addShape(shape: Shape, colour: number, life: number): void {
    if (this.shapes.length >= MAX_SHAPES) this.shapes.shift();
    this.shapes.push({ ...shape, colour, life, maxLife: life });
  }

  /** A filled wedge, for sweeps and cones. Angles in radians. */
  arc(x: number, y: number, radius: number, angle: number, arc: number, colour: number, life = 0.18): void {
    this.addShape({ kind: 'arc', x, y, radius, start: angle - arc / 2, end: angle + arc / 2 }, colour, life);
  }

  /** An expanding ring, for slams, blasts and snaps. */
  ring(x: number, y: number, radius: number, colour: number, life = 0.28): void {
    this.addShape({ kind: 'ring', x, y, radius }, colour, life);
  }

  /** A straight line through points (x and y pairs), for thrusts. */
  line(points: readonly number[], width: number, colour: number, life = 0.14): void {
    this.addShape({ kind: 'line', points: [...points], width }, colour, life);
  }

  /** A jagged line through points, for lightning. */
  lightning(points: readonly number[], colour: number, life = 0.16): void {
    const jagged: number[] = [];
    for (let i = 0; i + 3 < points.length; i += 2) {
      const x1 = points[i] ?? 0;
      const y1 = points[i + 1] ?? 0;
      const x2 = points[i + 2] ?? 0;
      const y2 = points[i + 3] ?? 0;
      const length = Math.hypot(x2 - x1, y2 - y1) || 1;
      const segments = Math.max(2, Math.round(length / 28));
      jagged.push(x1, y1);
      for (let s = 1; s < segments; s++) {
        const t = s / segments;
        const offset = (Math.random() - 0.5) * 18;
        jagged.push(x1 + (x2 - x1) * t - ((y2 - y1) / length) * offset, y1 + (y2 - y1) * t + ((x2 - x1) / length) * offset);
      }
      if (i + 4 >= points.length) jagged.push(x2, y2);
    }
    this.addShape({ kind: 'line', points: jagged, width: 3 }, colour, life);
  }

  update(dt: number): void {
    const graphics = this.graphics;
    graphics.clear();

    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      if (!shape) continue;
      shape.life -= dt;
      if (shape.life <= 0) {
        this.shapes.splice(i, 1);
        continue;
      }
      const fade = shape.life / shape.maxLife;
      if (shape.kind === 'arc') {
        graphics.fillStyle(shape.colour, 0.45 * fade);
        graphics.slice(shape.x, shape.y, shape.radius, shape.start, shape.end, false);
        graphics.fillPath();
        graphics.lineStyle(2, shape.colour, 0.9 * fade);
        graphics.strokePath();
      } else if (shape.kind === 'ring') {
        const grow = 0.6 + 0.4 * (1 - fade);
        graphics.fillStyle(shape.colour, 0.3 * fade);
        graphics.fillCircle(shape.x, shape.y, shape.radius * grow);
        graphics.lineStyle(3, shape.colour, 0.9 * fade);
        graphics.strokeCircle(shape.x, shape.y, shape.radius * grow);
      } else {
        graphics.lineStyle(shape.width, shape.colour, 0.95 * fade);
        graphics.beginPath();
        graphics.moveTo(shape.points[0] ?? 0, shape.points[1] ?? 0);
        for (let p = 2; p + 1 < shape.points.length; p += 2) {
          graphics.lineTo(shape.points[p] ?? 0, shape.points[p + 1] ?? 0);
        }
        graphics.strokePath();
      }
    }

    const slow = Math.exp(-DRAG * dt);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      if (!particle) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      particle.vy += particle.gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= slow;
      particle.vy *= slow;
      const fade = particle.life / particle.maxLife;
      const alpha = Math.min(1, fade * 1.5);
      const size = particle.size * (0.5 + fade * 0.5);
      switch (particle.shape) {
        case 'streak':
        case 'spark': {
          const speed = Math.hypot(particle.vx, particle.vy) || 1;
          const length = size * 3;
          const ux = (particle.vx / speed) * length;
          const uy = (particle.vy / speed) * length;
          graphics.lineStyle(Math.max(1.5, size * 0.6), particle.colour, alpha);
          if (particle.shape === 'spark') {
            graphics.beginPath();
            graphics.moveTo(particle.x - ux, particle.y - uy);
            graphics.lineTo(particle.x - uy * 0.4, particle.y + ux * 0.4);
            graphics.lineTo(particle.x + ux, particle.y + uy);
            graphics.strokePath();
          } else {
            graphics.lineBetween(particle.x - ux, particle.y - uy, particle.x, particle.y);
          }
          break;
        }
        case 'square':
          graphics.fillStyle(particle.colour, alpha);
          graphics.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
          break;
        case 'shard':
          graphics.fillStyle(particle.colour, alpha);
          graphics.fillTriangle(particle.x, particle.y - size, particle.x + size * 0.5, particle.y, particle.x - size * 0.5, particle.y);
          graphics.fillTriangle(particle.x, particle.y + size, particle.x + size * 0.5, particle.y, particle.x - size * 0.5, particle.y);
          break;
        case 'bubble':
          graphics.lineStyle(1.5, particle.colour, alpha);
          graphics.strokeCircle(particle.x, particle.y, size);
          break;
        default:
          graphics.fillStyle(particle.colour, alpha);
          graphics.fillCircle(particle.x, particle.y, size);
      }
    }
  }
}
