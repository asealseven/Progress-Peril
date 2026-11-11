// Small effects drawn in code: hit sparks and ink splatters (GDD 15.3, 15.4).
// Visual only. The simulation never reads these, and their randomness stays
// outside the run seed. Milestone 11 builds the full effects library.

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

const MAX_PARTICLES = 400;
const DRAG = 3;

export class Effects {
  private readonly particles: Particle[] = [];
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

  update(dt: number): void {
    const graphics = this.graphics;
    graphics.clear();
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
