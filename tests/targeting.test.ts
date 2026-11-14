import { describe, expect, it } from 'vitest';
import { selectTarget } from '../src/sim/world/targeting';
import { IDLE, arm, footmanAt, makeWorld, stepSeconds } from './helpers';

function setup() {
  const world = makeWorld({ armed: false, invincible: true });
  const near = footmanAt(world, 100, 0);
  const strong = footmanAt(world, 0, 200);
  const weak = footmanAt(world, -150, 0);
  const cluster = [footmanAt(world, 250, 250), footmanAt(world, 270, 240), footmanAt(world, 260, 270)];
  weak.health = 10;
  strong.health = strong.maxHealth = 500;
  world.step(IDLE);
  const query = (rule: Parameters<typeof selectTarget>[1]['rule'], extra = {}) =>
    selectTarget(world, { x: world.player.x, y: world.player.y, range: 480, rule, ...extra });
  return { world, near, strong, weak, cluster, query };
}

describe('targeting rules (GDD 7.15)', () => {
  it('Nearest: closest enemy in range', () => {
    const { near, query } = setup();
    expect(query('Nearest')).toBe(near);
  });

  it('Strongest: highest current health in range', () => {
    const { strong, query } = setup();
    expect(query('Strongest')).toBe(strong);
  });

  it('Clustered: the point with the most enemies inside the weapon Area', () => {
    const { cluster, query } = setup();
    expect(cluster).toContain(query('Clustered', { area: 55 }));
    // Area Minimal still looks at a small group.
    expect(cluster).toContain(query('Clustered', { area: 0 }));
  });

  it('Highest threat: highest threat cost, then nearest', () => {
    const { world, near, weak, query } = setup();
    expect(query('Highest threat')).toBe(near);
    weak.threat = 8;
    world.step(IDLE);
    expect(query('Highest threat')).toBe(weak);
  });

  it('Marked first: Marked enemies before any other target', () => {
    const { strong, near, query } = setup();
    expect(query('Marked first')).toBe(near);
    strong.marked = true;
    expect(query('Marked first')).toBe(strong);
    expect(query('Nearest', { markedFirst: true })).toBe(strong);
    expect(query('Nearest')).toBe(near);
  });

  it('Random: a random enemy in range, the same for the same seed', () => {
    const picks = new Set<number>();
    for (let i = 0; i < 40; i++) picks.add(setup().query('Random')!.slot);
    expect(picks.size).toBe(1);
    const { query } = setup();
    const varied = new Set<number>();
    for (let i = 0; i < 40; i++) varied.add(query('Random')!.slot);
    expect(varied.size).toBeGreaterThan(2);
  });

  it('ignores enemies out of range', () => {
    const { world } = setup();
    expect(selectTarget(world, { x: world.player.x, y: world.player.y, range: 50, rule: 'Nearest' })).toBeUndefined();
  });

  it('holds a target until the target dies or leaves range', () => {
    const world = makeWorld({ weapons: [arm('Crossbow')], invincible: true });
    const first = footmanAt(world, 300, 0);
    first.health = first.maxHealth = 1000;
    stepSeconds(world, 0.5);
    expect(world.weapons[0]!.targetId).toBe(first.id);
    const closer = footmanAt(world, -80, 0);
    stepSeconds(world, 3);
    expect(world.weapons[0]!.targetId).toBe(first.id);
    expect(closer.health).toBe(closer.maxHealth);
    // The target leaves range. The weapon switches.
    first.x += 400;
    stepSeconds(world, 2);
    expect(world.weapons[0]!.targetId).toBe(closer.id);
  });

  it('uses Highest threat with a Targeting Lens', () => {
    const world = makeWorld({ weapons: [arm('Crossbow', 'Targeting Lens')], invincible: true });
    const near = footmanAt(world, 100, 0);
    const dangerous = footmanAt(world, -250, 0);
    dangerous.threat = 16;
    stepSeconds(world, 1);
    expect(dangerous.health).toBeLessThan(dangerous.maxHealth);
    expect(near.health).toBe(near.maxHealth);
  });
});
