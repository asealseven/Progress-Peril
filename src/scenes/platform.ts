// Platform checks shared by scenes.

/** True on devices whose main pointer is a finger: phones and tablets. */
export function isTouchPrimary(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

/**
 * Interface scale. A phone shows the 720 pixel tall game on a small screen,
 * so touch layouts enlarge text and touch targets (GDD 15.1, 3.5).
 */
export function uiScale(): number {
  return isTouchPrimary() ? 1.4 : 1;
}
