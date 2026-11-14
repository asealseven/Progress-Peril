# Progress & Peril

*The Age of Invention. Every discovery has a consequence.*

Progress & Peril is a top-down arena roguelike set in a medieval world in the middle of a scientific revolution. You play an inventor from the Grand Archive, a guild of independent scientists. Five kingdoms race to master the new sciences and hoard every finding. The Archive sends you to prove your inventions against each kingdom's champions and bring the knowledge home.

Play in the browser on PC or phone: **https://asealseven.github.io/Progress-Peril/**

## A campaign

A campaign runs 21 timed rounds across three kingdoms, seven rounds each, in about 25 to 35 minutes.

- Round 4 of each kingdom brings a mini-boss.
- Round 7 brings the kingdom's boss, with a mini-boss as escort.
- The boss of the third kingdom is the final boss. In its last phase, Convergence, the boss borrows signature attacks from the bosses you beat earlier.
- The next kingdom stays secret until you beat the current boss.

Between rounds you prepare: fit components, upgrade weapons, research new sciences and visit shops. Preparation has no timer. You press Start when ready.

## The five kingdoms

| Kingdom | Science | Enemies | Boss |
|---|---|---|---|
| The Crownlands of Keldrath | Metallurgy and engineering | Kingdom Armies, Outlaws | Iron Regent |
| The Principalities of Myrathis | Chemistry and experimental biology | Failed Experiments, Outlaws | Abomination |
| The Free Cities of Merovant | Mechanics and automation | Clockwork Legions, Kingdom Armies | Grand Automaton |
| The Republic of Orthelyn | Physics and mathematics | Unknown, Clockwork Legions | The Unmaking |
| The Commonwealth of Nymora | Biology and natural sciences | Wilds, Failed Experiments | Spore Sovereign |

Each kingdom fights in its own arena with its own hazards: molten channels in the Great Foundry, volatile vats in the Grand Laboratory, conveyor belts and stamping presses in the Assembly Yards, lightning and gravity wells around the Observatory orrery, thorn hedges and fungal growth in the Overgrown Arboretum. Hazards hurt enemies as well as you. Random events, such as an outlaw ambush or a military invasion from another kingdom, shake up a round now and then.

## Combat

You move. Your weapons fire on their own at the nearest threat. Hold focus to point every weapon at one spot, such as a boss, a healer or a priority target. Enemies show a crimson outline before every attack, so you read and dodge each strike.

Twenty-three enemy types fill six factions, from swarming Clockwork Crawlers to Ancient Guardians who sleep until disturbed. Elites carry extra modifiers, and champions arrive in the last kingdom with traits of their own.

## Your arsenal

You carry up to three weapons from 24, across six families: Melee, Ranged, Siege, Mechanical, Alchemical and Experimental. Each weapon has four sockets:

- **Structure**, such as a Tempered Steel Frame
- **Mechanism**, such as a Torsion Spring
- **Payload**, such as Incendiary Oil
- **Auxiliary**, which opens at Grade III or after a merge

Sixty components fill those sockets. Every weapon and component carries tags, and the right mix of tags triggers one of 23 synergies, inside one weapon or across two. A weapon tile glows in combat while a synergy runs.

Nine damage types build up status meters on enemies: Burning, Poisoned, Corroded, Electrified, Frozen and more. Two statuses on one enemy set off a reaction, such as Shatter when an Impact hit lands on a Frozen enemy, or a Galvanic Surge from Corrosive and Electric together. Chains of explosions follow from the right build.

## Research and shops

Kills earn gold, materials and Research Points.

- **Research**: a web of 120 nodes across five sciences, Chemistry, Physics, Mathematics, Engineering and Biology. Research happens at once and adds new items to the shops, new recipes and new rules. Ten hidden nodes appear only once you meet their conditions.
- **Shops**: a gruff blacksmith, a twitchy alchemist and a pompous royal inventor each keep separate stock. Beat a mini-boss or boss for a free visit.
- **Workbench**: build components from recipes, dismantle the ones you do not need, merge two copies of a weapon and buy weapon grades.
- **Kingdom Relics**: after each boss, choose one relic from the beaten kingdom.

## The Grand Archive

Between campaigns you return to the Grand Archive, the main menu. Archive Points from every run pay for:

- New research nodes, so later campaigns reach deeper into the web
- Permanent upgrades, such as starting gold or one revival per campaign
- Ten specialisations, each with a bonus and a drawback
- Mastery ranks in each science

The Codex records every enemy, synergy, reaction, relic and ending you have seen. The trophy cabinet holds challenges and your endless records.

## Ways to play

- **Apprentice Trial**: the first campaign opens with three guided rounds to teach movement, components, status effects, research, synergies and shops.
- **Challenge Tiers 1 to 5**: each tier makes enemies stronger in one more way and pays more Archive Points. Winning opens the next tier.
- **Assist mode**: slower game speed and softer enemy hits, at half the Archive Points.
- **Endless mode**: after a win, keep your build and carry on through every kingdom again, with enemies growing stronger each loop.
- **Fast-forward**: speed up normal rounds by half again.

## Controls

| | PC | Controller | Phone |
|---|---|---|---|
| Move | WASD or arrow keys | Left stick | Drag on the left half |
| Focus fire | Hold a mouse button | Right stick | Hold the right half |
| Pause | Esc | Start | Pause button |
| Fast-forward | Tab | Select | Button under pause |

Every key and button remaps in Settings. Phones play held sideways.

## Accessibility

- Colour-blind palettes, plus a shape for every damage type and status
- Toggles for screen shake, flashes, damage numbers and the low-health warning
- An effect density slider
- Larger text and a more readable font
- A brighter outline on enemy shots
- Hold or toggle focus, a left-handed layout and a fixed, resizable joystick
- Audio cues with captions for elites, boss attacks and low health

## Install on a phone

Open the link above in Chrome on Android or Safari on iPhone, then choose **Add to Home Screen**. Launch the game once while online. From then on the game plays offline.

## Saves

Progress saves in the browser across three profiles, with a backup copy. Settings has an export as a file or a save code, so you move progress to another device.

## For development

The game is built with TypeScript, Phaser 4 and Vite, with sound from ZzFX.

- `GDD.md`: the design document and source of truth
- `CLAUDE.md`: the build guide and milestone plan
- `ART_PROMPTS.md`: one prompt per image, with the file name and folder in `public/assets/`
- `PROGRESS.md` and `NOTES.md`: milestone status and design decisions

```bash
npm install
npm run dev
```

`npm run test` runs the tests, `npm run build` builds into `dist/`, and every push to `main` publishes the site to GitHub Pages.
