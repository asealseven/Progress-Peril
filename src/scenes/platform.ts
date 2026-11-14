// Platform checks shared by scenes.

let coarse: MediaQueryList | undefined;

/** True on devices whose main pointer is a finger: phones and tablets. The query is made once. */
export function isTouchPrimary(): boolean {
  if (typeof window === 'undefined') return false;
  coarse ??= window.matchMedia('(pointer: coarse)');
  return coarse.matches;
}

/** Effect density scales down on phones, on top of the accessibility slider (GDD 15.4). */
export const MOBILE_EFFECT_SHARE = 0.6;

/**
 * Interface scale. A phone shows the 720 pixel tall game on a small screen,
 * so touch layouts enlarge text and touch targets (GDD 15.1, 3.5).
 */
export function uiScale(): number {
  return isTouchPrimary() ? 1.4 : 1;
}
