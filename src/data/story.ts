// Story cards (GDD 2.4). Short text cards, every card skippable.

import type { KingdomName } from './palette';

export const STORY = {
  premise:
    "The five kingdoms race to master the new sciences, and every kingdom hoards new findings. The Grand Archive, a guild of independent inventors, sends members to prove their inventions against each kingdom's champions and bring the knowledge home.",
  /** First campaign only. */
  opening:
    'Every kingdom guards its secrets behind steel, glass or gears. The Archive sends you with three weapons and an empty notebook. Return with knowledge, or not at all.',
  reveal: {
    Keldrath: "The forges of Keldrath never cool. Keldrath's knights march in plate still warm from the anvil.",
    Myrathis: 'Smoke rises from a hundred laboratories in Myrathis. Something in the vats is awake.',
    Merovant: 'The Free Cities of Merovant run on gears and contracts. Tonight, the machines are working overtime.',
    Orthelyn: 'The Republic of Orthelyn measured the sky and found a crack. Something on the other side noticed.',
    Nymora: 'The gardens of Nymora heal anyone who asks. The forests decide who leaves.',
  } satisfies Record<KingdomName, string>,
  /** The ending follows the final boss's kingdom. Milestone 8 shows these. */
  ending: {
    Keldrath:
      "The Iron Regent kneels, and the Great Foundry falls silent for the first time in a century. Keldrath's smiths now forge for the Archive.",
    Myrathis:
      'The Abomination dissolves back into the vat. The princes of Myrathis seal their laboratories, and the Archive inherits their notes, with a warning in the margin.',
    Merovant:
      'The Grand Automaton winds down mid-step. The Free Cities vote to open their assembly yards, and the machines start building bridges instead of armies.',
    Orthelyn:
      "The Unmaking folds into a single point and vanishes. Orthelyn's scholars begin repairing the crack in the sky, and the Archive keeps one shard for study.",
    Nymora:
      "The Spore Sovereign withers, and the forests of Nymora go quiet. The Commonwealth's healers return to their gardens, and the Archive plants the first seed.",
  } satisfies Record<KingdomName, string>,
  /** Endless mode, each new loop (Milestone 10). */
  endlessLoop: 'The kingdoms recover, and the Archive sends the inventor onward.',
} as const;
