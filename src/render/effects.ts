// Small effects drawn in code: hit sparks, ink splatters and attack shapes
// (GDD 15.3, 15.4). Visual only. The simulation never reads these, and their
// randomness stays outside the run seed. Milestone 11 builds the full library.

import type Phaser from 'phaser';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colour: number;
}

type Shape =
  | { kind: 'arc'; x: number; y: number; radius: number; start: number; end: number }
  | { kind: 'ring'; x: number; y: number; radius: number }
  | { kind: 'line'; points: number[]; width: number };

type TimedShape = Shape & { colour: number; life: number; maxLife: number };

const MAX_PARTICLES = 400;
const MAX_SHAPES = 80;
const DRAG = 3;

export class Effects {
  private readonly particles: Particle[] = [];
  private readonly shapes: TimedShape[] = [];
  /** Scales particle counts (GDD 3.10). 1 means full density. */
  density = 1;

  constructor(private readonly graphics: Phaser.GameObjects.Graphics) {}

  burst(x: number, y: number, colour: number, count: number, speed: number, size: number, life: number): void {
    const total = Math.round(count * this.density);
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
      });
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
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= slow;
      particle.vy *= slow;
      const fade = particle.life / particle.maxLife;
      graphics.fillStyle(particle.colour, Math.min(1, fade * 1.5));
      graphics.fillCircle(particle.x, particle.y, particle.size * (0.5 + fade * 0.5));
    }
  }
}
