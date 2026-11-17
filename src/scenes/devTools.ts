// Dev tools switch. Players never see the debug overlay, the Test Lab or the
// art gallery. The dev server turns them on. On any build, ?dev in the address
// turns them on for that device and ?dev=0 turns them off again.

import type { EnemyId } from '../data/enemies';
import type { EnemyRank } from '../sim/world/types';

const STORAGE_KEY = 'progress-peril-dev-tools';

function readFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const requested = new URLSearchParams(window.location.search).get('dev');
  const off = requested === '0' || requested === 'off';
  try {
    if (requested !== null) {
      if (off) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, '1');
    }
    if (off) return false;
    return import.meta.env.DEV || window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return !off && (import.meta.env.DEV || requested !== null);
  }
}

/** True when the dev tools are on for this device. */
export const DEV_TOOLS = readFlag();

/** Who fights in a Test Lab round. */
export type TestEnemies = 'director' | 'quiet' | 'roster' | EnemyId;

/** A Test Lab round: Combat applies this after it builds the simulation. */
export interface TestSetup {
  readonly enemies: TestEnemies;
  readonly rank: EnemyRank;
  /** The round stays open after every enemy falls. */
  readonly hold: boolean;
  readonly invincible: boolean;
  /** Boss or mini-boss phase to jump to once it enters. 1 leaves it alone. */
  readonly bossPhase: number;
}
