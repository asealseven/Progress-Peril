// The balance report (Milestone 12): several bot campaigns, averaged per
// territory, beside the GDD 14.3 economy estimate and the GDD 4.3 round
// lengths. Run with BALANCE=1 npm run test -- balance. Skipped otherwise.

import { describe, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { roundKind, territoryIndex } from '../src/data/rounds';
import { STARTING_WEAPONS } from '../src/data/weapons';
import { createArchive, createFullArchive } from '../src/sim/archive';
import { createRun, createWorldForRound, finishRound } from '../src/sim/run';
import { MAX_ROUND_STEPS, circleBot, prepare } from './bot';

const GDD_14_3 = [
  { kills: 255, gold: 337, research: 398, materials: 40, archive: 40 },
  { kills: 410, gold: 544, research: 672, materials: 70, archive: 40 },
  { kills: 539, gold: 753, research: 982, materials: 106, archive: 60 },
];

interface Tally {
  bought: number;
  summoned: number;
  gold: number;
  research: number;
  materials: number;
  archive: number;
  seconds: number;
  encounter: number[];
  mini: number[];
  boss: number[];
  aliveAtZero: number[];
  cleanup: number[];
}

const empty = (): Tally => ({ bought: 0, summoned: 0, gold: 0, research: 0, materials: 0, archive: 0, seconds: 0, encounter: [], mini: [], boss: [], aliveAtZero: [], cleanup: [] });
const mean = (values: readonly number[]): number => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);

describe.skipIf(!process.env.BALANCE)('balance report', () => {
  it('averages bot campaigns per territory', () => {
    const campaigns = Number(process.env.BALANCE_RUNS ?? 10);
    const totals = [empty(), empty(), empty()];
    let combat = 0;
    const endings: string[] = [];
    const byBoss: Record<string, number[]> = {};
    for (let index = 0; index < campaigns; index++) {
      const weapon = STARTING_WEAPONS[index % STARTING_WEAPONS.length]!;
      // Half the runs are later campaigns, so Territory 1 is not always Keldrath (GDD 5.7).
      // GDD 14.3 spends gold on Grades III and IV, which need middle and outer nodes discovered (GDD 11.10).
      // The report plays an experienced profile: every node discovered. BALANCE_FRESH=1 plays a new profile.
      const archive = process.env.BALANCE_FRESH ? createArchive() : createFullArchive();
      if (index % 2 === 1) archive.campaigns = 1;
      const run = createRun(1000 + index * 37, CHARACTERS.inventor, weapon, archive);
      while (run.status === 'active') {
        const world = createWorldForRound(run);
        // BALANCE_MORTAL=1 lets the bot die, to see where runs end.
        world.invincible = !process.env.BALANCE_MORTAL;
        const tally = totals[territoryIndex(run.round)]!;
        const archiveBefore = run.archive.earned;
        let steps = 0;
        let zeroSeen = false;
        while (world.phase === 'running') {
          world.step(circleBot(world));
          if (!zeroSeen && world.timeLeft <= 0 && roundKind(world.round) === 'encounter') {
            zeroSeen = true;
            tally.aliveAtZero.push(world.enemies.activeCount);
          }
          for (const event of world.events) {
            if (event.type === 'enemyKilled') {
              if (event.bought) tally.bought++;
              else tally.summoned++;
            }
          }
          world.events.length = 0;
          if (++steps > MAX_ROUND_STEPS * 3) {
            const alive = world.enemies.items
              .filter((enemy) => enemy.active)
              .map((enemy) => `${enemy.def.id} ${enemy.action} ${enemy.health.toFixed(0)}/${enemy.maxHealth.toFixed(0)} at ${enemy.x.toFixed(0)},${enemy.y.toFixed(0)} boss ${enemy.boss?.role ?? "-"} m${enemy.minion ? 1 : 0}l${enemy.noLegacy ? 1 : 0} sq${enemy.squad}`);
            throw new Error(`Campaign ${index}, round ${world.round} (${run.kingdoms.join(', ')}) did not end, player at ${world.player.x.toFixed(0)},${world.player.y.toFixed(0)}, weapons ${run.weapons.map((weapon) => weapon.def.name).join("+")}: ${alive.join('; ')}`);
          }
        }
        if (roundKind(world.round) === 'encounter') tally.cleanup.push(Math.max(0, world.elapsed - world.duration));
        const result = finishRound(run, world);
        const entry = run.ledger[run.ledger.length - 1]!;
        tally.gold += entry.goldEarned;
        tally.research += entry.researchEarned;
        tally.materials += entry.materialsEarned;
        tally.archive += run.archive.earned - archiveBefore;
        tally.seconds += result.seconds;
        combat += result.seconds;
        const kind = roundKind(result.round);
        (kind === 'encounter' ? tally.encounter : kind === 'mini-boss' ? tally.mini : tally.boss).push(result.seconds);
        if (kind !== 'encounter') {
          const key = `${kind === 'boss' ? 'boss' : 'mini'} ${run.kingdoms[territoryIndex(result.round)]} T${territoryIndex(result.round) + 1}`;
          (byBoss[key] ??= []).push(result.seconds);
        }
        if (run.status === 'active') prepare(run);
      }
      endings.push(run.status === 'dead' ? `died in Round ${run.round}` : 'won');
    }
    const lines = totals.map((tally, index) => {
      const target = GDD_14_3[index]!;
      const per = (value: number): string => (value / campaigns).toFixed(0);
      return [
        `Territory ${index + 1}:`,
        `  kills ${per(tally.bought)} bought + ${per(tally.summoned)} summoned (GDD ${target.kills})`,
        `  gold ${per(tally.gold)} (GDD ${target.gold}), research ${per(tally.research)} (GDD ${target.research}), materials ${per(tally.materials)} (GDD ${target.materials}), Archive Points ${per(tally.archive)} (GDD ${target.archive})`,
        `  combat ${(tally.seconds / campaigns / 60).toFixed(1)} min: encounter ${mean(tally.encounter).toFixed(0)} s, mini-boss ${mean(tally.mini).toFixed(0)} s, boss ${mean(tally.boss).toFixed(0)} s`,
        `  at the timer: ${mean(tally.aliveAtZero).toFixed(0)} enemies left, clean-up ${mean(tally.cleanup).toFixed(0)} s (worst ${Math.max(0, ...tally.cleanup).toFixed(0)} s)`,
      ].join('\n');
    });
    const bossLines = Object.entries(byBoss)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => `  ${key}: ${values.map((value) => value.toFixed(0)).join(', ')} s`);
    console.log([...bossLines, `Endings: ${endings.join(', ')}`, `${campaigns} campaigns, ${(combat / campaigns / 60).toFixed(1)} minutes of combat each`, ...lines].join('\n'));
  }, 3600000);
});
