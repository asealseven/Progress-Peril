// Movement helpers: arena bounds and solid obstacles.

import type { ArenaDef } from '../../data/arenas';

type Walls = Pick<ArenaDef, 'width' | 'height' | 'bounds' | 'obstacles'>;

interface Body {
  x: number;
  y: number;
  radius: number;
}

/** Keeps a body inside the arena walls. */
export function clampToArena(body: Body, arena: Walls): void {
  // Erased tiles shrink the live area (GDD 5.10).
  const left = arena.bounds?.left ?? 0;
  const top = arena.bounds?.top ?? 0;
  const right = arena.bounds?.right ?? arena.width;
  const bottom = arena.bounds?.bottom ?? arena.height;
  body.x = Math.min(right - body.radius, Math.max(left + body.radius, body.x));
  body.y = Math.min(bottom - body.radius, Math.max(top + body.radius, body.y));
}

/** Pushes a body out of every obstacle it overlaps. */
export function pushOutOfObstacles(body: Body, arena: Walls): void {
  for (const obstacle of arena.obstacles) {
    const dx = body.x - obstacle.x;
    const dy = body.y - obstacle.y;
    const minimum = body.radius + obstacle.radius;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq >= minimum * minimum) continue;
    const distance = Math.sqrt(distanceSq);
    if (distance < 1e-6) {
      // Dead centre: leave along a fixed axis so the result stays deterministic.
      body.x = obstacle.x + minimum;
      continue;
    }
    const scale = minimum / distance;
    body.x = obstacle.x + dx * scale;
    body.y = obstacle.y + dy * scale;
  }
}

/** True when the point sits inside an obstacle, with an optional margin. */
export function insideObstacle(x: number, y: number, margin: number, arena: Walls): boolean {
  for (const obstacle of arena.obstacles) {
    const dx = x - obstacle.x;
    const dy = y - obstacle.y;
    const minimum = obstacle.radius + margin;
    if (dx * dx + dy * dy < minimum * minimum) return true;
  }
  return false;
}

/**
 * First contact of a moving point with a circle.
 * The point starts at (x, y) and travels `length` along the unit vector (dx, dy).
 * Returns the distance travelled at contact, or -1 for no contact.
 */
export function sweepCircle(
  x: number,
  y: number,
  dx: number,
  dy: number,
  length: number,
  cx: number,
  cy: number,
  radius: number,
): number {
  const ox = cx - x;
  const oy = cy - y;
  if (ox * ox + oy * oy <= radius * radius) return 0;
  const along = ox * dx + oy * dy;
  if (along < 0) return -1;
  const perpendicularSq = ox * ox + oy * oy - along * along;
  const radiusSq = radius * radius;
  if (perpendicularSq > radiusSq) return -1;
  const contact = along - Math.sqrt(radiusSq - perpendicularSq);
  return contact <= length ? Math.max(0, contact) : -1;
}
