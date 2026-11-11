# CLAUDE.md: building Progress & Peril

## What you are building

Progress & Peril is a top-down arena roguelike in the spirit of Brotato, set in a medieval world in the middle of a scientific revolution. The player survives 21 timed rounds across three kingdoms, builds three weapons from interchangeable components, researches a 120-node science web and grows a permanent Grand Archive between runs.

This is a personal, non-commercial project for one player. The game runs in the browser on PC and on a phone, installs as a web app and plays offline.

**GDD.md is the source of truth.** Every rule, name, table and number lives there. This file explains how to turn GDD.md into a working game, one playable milestone at a time.

## Ground rules

1. Before each milestone, read every GDD section listed for the milestone. Section numbers below refer to GDD.md.
2. Use names exactly as written in GDD.md: weapons, components, enemies, nodes, relics, kingdoms, events.
3. Never invent new content such as extra weapons, enemies or research nodes. When GDD.md leaves a gap in a rule, choose the simplest rule consistent with nearby sections, record the choice in `NOTES.md` with the section number, and carry on.
4. Every milestone ends playable in the browser, with tests and type checks passing, before the next milestone starts.
5. After each milestone, update `PROGRESS.md` (done, known issues, next step) and make one git commit named `Milestone N: <title>`.
6. Ask the user before adding a runtime dependency not listed in this file, or before changing the folder layout.

## Stack

| Part | Choice |
|---|---|
| Language | TypeScript, `strict` mode, no `any` |
| Framework | Phaser 4, version 4.2 or later |
| Build tool | Vite |
| Tests | Vitest |
| Offline and install | `vite-plugin-pwa` |
| Sound effects | ZzFX, generated in code |
| Fonts | IM Fell English, Alegreya Sans and Caveat, self-hosted (for example through Fontsource packages) so the game works offline |

**Phaser 4 note.** Phaser 4 arrived in April 2026 with a new renderer. Standard APIs for scenes, sprites, text, tweens, input, cameras and loaders mostly carry over from Phaser 3. When an API remembered from Phaser 3 fails, check the Phaser 4 documentation and changelog instead of guessing. Do not use Phaser physics for combat: the simulation in `src/sim` handles movement, collisions and damage.

## Commands

Set up these scripts in `package.json` during Milestone 0:

```
npm run dev          # local development server
npm run dev:phone    # same server on the local network, for testing on a phone
npm run build        # production build into dist/
npm run preview      # serve the production build locally
npm run test         # Vitest, single run
npm run typecheck    # tsc --noEmit
```

## Folder layout

```
src/
  main.ts                Phaser game config and scene list
  data/                  Typed content copied from GDD.md tables, one file per table group
    tiers.ts             Tier names and the number tables in this file
    weapons.ts components.ts synergies.ts damageTypes.ts statusEffects.ts
    enemies.ts eliteModifiers.ts champions.ts bosses.ts miniBosses.ts
    research.ts relics.ts kingdoms.ts arenas.ts hazards.ts events.ts
    shop.ts economy.ts archive.ts specialisations.ts story.ts
    strings.ts           Every player-facing text
    assets.ts            Asset manifest: key, file path, placeholder description
  sim/                   Game rules in plain TypeScript. Never import Phaser here.
    rng.ts               Seeded random numbers
    run.ts               Run state: kingdoms, rounds, resources, weapons, relics
    world/               Fixed-step combat: entities, movement, grid, targeting,
                         projectiles, damage, status meters, reactions, chains, hazards
    modifiers.ts         Stat modifier stack and the damage order from GDD 7.14
    synergies.ts         Tag counting and synergy activation
    director.ts          Threat budgets, spawn groups, elites, champions, events
    ai.ts                Utility scoring, squads, attack tokens
    economy.ts           Gold, materials, prices, shop stock, upgrades, recipes
    research.ts          Research web rules, refunds, hidden node hints
    archive.ts           Grand Archive, mastery, specialisations, challenges
    save.ts              Save format, versions, migrations, export and import
  scenes/                Phaser scenes: draw state, read input, call the simulation
    Boot Hub CharacterSelect Combat Results Preparation Transition Victory Settings
  ui/                    Notebook-style UI pieces: panel, button, tab, tooltip, tag chip, card
  render/                Placeholder shapes, sprite loading with fallback, effects, telegraphs
  audio/                 ZzFX presets and music hooks
tests/                   Vitest tests for src/sim
public/assets/           Generated art and music (see ART_PROMPTS.md)
NOTES.md                 Gap decisions, with GDD section numbers
PROGRESS.md              Milestone status
```

## Architecture rules

1. **Simulation apart from rendering.** `src/sim` holds every game rule and never imports Phaser. A scene owns one simulation instance, feeds input in, calls `step()` and draws the resulting state. All rules are testable without a browser.
2. **Fixed time step.** The simulation advances in steps of 1/60 second. The scene accumulates frame time and runs whole steps. Fast-forward (GDD 3.12) runs 1.5 times as many steps per frame. Pause stops stepping.
3. **Seeded randomness.** Each run has one seed, shown on the pause screen. Every random choice goes through `rng.ts`. The same seed and inputs give the same run.
4. **Content as data.** Copy every GDD table into `src/data` as typed constants. Keep GDD names and effect wording as fields, so tooltips use GDD text.
5. **Effects as descriptors.** Model component, relic, research node, specialisation and synergy effects as typed descriptors: stat modifiers, tag grants, triggers and conversions. One modifier system applies them, following the damage order in GDD 7.14. Write named handlers only for effects no descriptor fits, such as Orbit Mount or the Shard of the Unmaking.
6. **Pools and grid.** Enemies, projectiles and effects come from object pools. A uniform spatial grid answers neighbour and targeting queries (GDD 9.15).
7. **Synergies recalculate on Start.** Tags only change during preparation, so synergies recalculate when the player presses Start, plus whenever a relic changes tags.
8. **Assets through the manifest.** Every image and sound has a key in `src/data/assets.ts`. A missing file falls back to its placeholder and logs once, never crashes.
9. **Budgets.** Respect the performance targets and limits in GDD 15.11 and 7.21. An effect density setting (GDD 3.10) scales particles without changing gameplay.

## Turning tiers into numbers

GDD.md rates most stats on five tiers: Minimal, Low, Medium, High, Extreme. "One step" means moving to the next tier in the same row. Put these starting values in `src/data/tiers.ts`. Milestone 12 tunes them.

The game draws at a logical resolution of 1280 by 720 pixels, scaled to fit the screen. Distances below use logical pixels. Each arena measures 2400 by 1600 logical pixels.

| Stat | Minimal | Low | Medium | High | Extreme |
|---|---|---|---|---|---|
| Enemy Health, Territory 1 | 6 | 15 | 35 | 90 | 400 |
| Enemy Damage per hit | 2 | 4 | 7 | 12 | 20 |
| Enemy Speed, pixels per second | 40 | 70 | 100 | 140 | 200 |
| Enemy attack Range, pixels | 30 | 120 | 250 | 400 | 550 |
| Armour, damage reduction (enemies and player) | 0% | 10% | 25% | 40% | 60% |
| Weapon Damage per hit | 4 | 7 | 12 | 20 | 35 |
| Weapon Attack Speed, attacks per second | 0.4 | 0.7 | 1.1 | 1.8 | 3.0 |
| Weapon Range, pixels | 60 | 120 | 220 | 340 | 480 |
| Weapon Area radius, pixels (Minimal means single target) | 0 | 30 | 55 | 85 | 120 |
| Player Max Health | 60 | 90 | 120 | 160 | 220 |
| Player Move Speed, pixels per second | 140 | 170 | 200 | 240 | 280 |
| Regeneration, health per second | 0.2 | 0.5 | 1 | 2 | 3.5 |
| Evasion chance | 3% | 8% | 15% | 22% | 30% |
| Critical Chance | 2% | 5% | 10% | 20% | 35% |
| Critical Damage multiplier | 1.25 | 1.5 | 1.75 | 2.0 | 2.5 |
| Pickup Radius, pixels | 40 | 70 | 110 | 160 | 230 |
| Status Build-up per hit, share of a Normal enemy meter | 10% | 20% | 33% | 50% | 80% |
| Modifier size for "up" or "down" effects | 5% | 10% | 20% | 35% | 60% |

Further starting values:

- **Armour** uses diminishing returns: the table values are targets at each tier, and stacked Armour approaches 75% without reaching the limit (GDD 3.7).
- **Damage adaptation** (GDD 3.7): each hit adds 0.5% resistance to the hit's damage type. The Low cap means 10%, and each extra cap step adds 5%.
- **Status meters** (GDD 9.14): Elite meters are twice the Normal size, Champion meters three times, Boss meters five times. Meters drain 10% per second without build-up.
- **Territory scaling** (GDD 9.10): Territory 2 shifts enemy Health and Damage up one tier, Territory 3 up two tiers. Above Extreme, multiply by 2.5 per step.
- **Elites and champions** (GDD 9.12 and 9.13): Health up one and two steps respectively, on top of territory scaling.
- **Mini-bosses**: 1,200 Health in Territory 1, times 2 in Territory 2 and 3.5 in Territory 3. Escorts have 70% of this.
- **Territory bosses**: 4,000 Health in Territory 1, times 2 in Territory 2 and 3.5 in Territory 3.
- **Threat budget**: Round 1 holds 40 threat units (GDD 14.3), then follows the multipliers in GDD 4.11.
- **Round lengths**: GDD 4.3. **Prices, drops, costs and rewards**: GDD 6.5, 6.6, 7.22, 7.23, 8.11, 11.3, 11.10 to 11.14 and 14.1 to 14.3 already give numbers. Use them as written.

## Placeholder art

Generated images arrive over time (ART_PROMPTS.md). Until each image exists, draw a placeholder in code, matching the screen mockups in GDD 15.16.

| Thing | Placeholder |
|---|---|
| Player | Parchment circle, ink outline, dashed gold ring |
| Enemies | Circle filled with the faction colour, ink outline, first letter of the name. Radius by role: Swarmer 10, most roles 14, Tank 22 |
| Mini-bosses and bosses | Circles of radius 36 and 56, kingdom colour, thick ink outline |
| Projectiles | Gold for the player, dark ink for enemies |
| Telegraphs | Crimson outline, dashed for escorts |
| Hazards | Shapes in the kingdom colour |

Colours:

| Name | Hex |
|---|---|
| Parchment | `#F3EBDA` |
| Ink | `#2A2118` |
| Brass | `#8C6A36` |
| Danger (enemy telegraphs) | `#B3262E` |
| Player effects | `#C8902A` |
| Kingdom Armies | `#A7AEB6` |
| Clockwork Legions | `#C9A24A` |
| Failed Experiments | `#9FD06A` |
| Wilds | `#6E8E4E` |
| Outlaws | `#8C6A46` |
| Unknown | `#9C86C9` |
| Keldrath, Myrathis, Merovant, Orthelyn, Nymora | `#D2642A`, `#6FA83A`, `#2F8A86`, `#6E4FA3`, `#4E7A3A` |
| Slashing, Piercing, Impact | `#D9DCE0`, `#9DB4C8`, `#C79A3A` |
| Fire, Cold, Electric | `#E07A2A`, `#7FD3E6`, `#F1DC5A` |
| Toxic, Corrosive, Biological | `#4FA34A`, `#B5D334`, `#C24A9A` |

Every damage type also has an icon shape (GDD 15.1). Draw shapes in code so colour-blind players read them.

**Asset keys and file names.** The file name of every generated image is the kebab-case form of the GDD name, in the folder ART_PROMPTS.md gives. For example, the Royal Footman lives at `public/assets/sprites/enemies/royal-footman.png` under the key `enemy.royal-footman`.

## Animation for generated art

Follow GDD 15.3. Each character and enemy is one image animated in code: bob and lean while moving, squash on steps, pull back and lunge to attack, white flash on hit, shrink and ink-splatter particles on death. Bosses swap to the image for each phase with a flash and a short shake.

## Audio

- Generate every sound effect with ZzFX presets in `src/audio/sfx.ts`: one hit sound per damage type, one attack sound per weapon family, enemy death, player hurt, pickups, interface clicks, page turns, purchases, research, telegraph warnings, round start and round end.
- Play at most 8 copies of one sound at once, with priority for telegraphs and boss attacks (GDD 15.10).
- Music hooks for each kingdom have three layers: calm, combat and peak. Files go in `public/assets/music/<kingdom>/` as `calm.ogg`, `combat.ogg` and `peak.ogg`. Missing files stay silent.
- Browsers block sound until the first tap or key press. Start audio on the first input.

## Phone, offline and saves

- Scale the 1280 by 720 game to fit the screen. Phones play in horizontal orientation, with a rotate prompt in vertical orientation.
- Touch controls follow GDD 3.5 and 15.7: a floating joystick on the left half, focus by holding on the right half, touch targets at least 44 pixels.
- `vite-plugin-pwa` precaches the build and fonts, with a manifest for installation in horizontal orientation.
- Test on a phone with `npm run dev:phone` and the local network address. Installation and offline play need HTTPS, so deploy `dist/` to a free static host such as GitHub Pages, Netlify or Cloudflare Pages for the phone install.
- Saves follow GDD 15.13: JSON in browser local storage, one backup copy, a version number with migrations, export as a file and as a copyable code, import on another device. Call `navigator.storage.persist()` on first save.

## Testing

- Unit tests in `tests/` cover: the damage order (GDD 7.14), Armour returns, status meters and reactions (GDD 9.14), every synergy (GDD 7.19), chain limits (GDD 7.20), threat budget spending (GDD 4.11), prices and price growth (GDD 6.5 and 6.6), upgrade and recipe costs (GDD 7.22 and 7.23), research rules and refunds (GDD 8.10), Archive costs (GDD 11.10 and 11.11) and save migrations.
- A headless run test plays a full 21-round campaign in the simulation with a simple bot: circle the arena, buy the first affordable item, research the cheapest available node. The test fails on any crash and prints the economy per round for comparison with GDD 14.3.
- A debug overlay (F3 on PC, three-finger tap on phone) shows frame rate, entity counts, seed and the economy logger, and offers spawn, invincibility and jump-to-round tools.

## Characters

GDD 16.7 has no character roster yet. Until the user designs characters, the game has one: **The Inventor**, with every base stat from GDD 3.6 and a free choice of one starting weapon from the six with no research: Forged Longsword, War Hammer, Pike, Crossbow, Longbow and Knife Bandolier. Keep character data in its own file so new characters slot in later.

## Build plan

Work through the milestones in order. Each lists the GDD sections to read and the test for being done.

### Milestone 0: Project setup
- Read: this file, GDD 15.1, 15.14, 15.15.
- Build: Vite, TypeScript, Phaser 4, Vitest, the web app plugin, the npm scripts, self-hosted fonts, a Boot scene showing "Progress & Peril" on parchment, and empty `NOTES.md` and `PROGRESS.md` files.
- Done when: the title screen shows on PC and phone, `npm run test` and `npm run typecheck` pass, `npm run build` succeeds.

### Milestone 1: First playable combat
- Read: GDD 3.1 to 3.7, 4.1 to 4.3, 7.15, 15.2, 15.7.
- Build: the simulation core with fixed steps, a placeholder Keldrath arena, player movement on keyboard, gamepad and touch, the camera, the Crossbow attacking the nearest enemy, Royal Footmen chasing the player, damage, health, death, the round timer, round end and a results screen.
- Done when: three rounds play in a row on PC and phone, the player dies at zero health, tests cover damage and the timer.

### Milestone 2: Weapons and components
- Read: GDD 3.4, 7.1 to 7.18.
- Build: all 24 weapons with tier stats, every behaviour in GDD 7.16, slot rules including the Auxiliary slot, all 60 components as effect descriptors, tags, targeting rules and manual focus.
- Done when: a debug menu equips any weapon and component, every behaviour shows on screen, tests cover modifiers.

### Milestone 3: Damage types, status effects and synergies
- Read: GDD 7.13, 7.14, 7.19, 7.20, 9.14.
- Build: nine damage types, build-up meters, all status effects and reactions, all 23 synergies and chain reactions with limits.
- Done when: tests cover every reaction and synergy, and the HUD weapon tiles glow when a synergy is active.

### Milestone 4: Enemies and the encounter director
- Read: GDD 4.4 to 4.12, 9.1 to 9.16.
- Build: all 23 enemies with roles and signature behaviours, utility AI with squads and attack tokens, threat costs and budgets, spawn groups, elites, champions, scaling and population limits.
- Done when: the headless 21-round run stays within the performance budgets, and tests cover budget spending.

### Milestone 5: Preparation, shop and economy
- Read: GDD 3.3, 6.1 to 6.6, 7.8 to 7.10, 7.22, 7.23, 14.1 to 14.3, 15.8.
- Build: the preparation scene with Workbench and Shop tabs, three shops with separate stock, prices, price growth, rerolls, caps and the specialist slot, weapon grades, recipes, dismantling, merging, gold and material drops, full heal and the Start button.
- Done when: a full Territory 1 loop of seven rounds with shop visits plays from start to end.

### Milestone 6: Research
- Read: GDD 8.1 to 8.13, 15.8.
- Build: the research web with all 120 nodes, costs, instant research, refunds, items opening in shops and recipes, hidden nodes with hints, captured research and mastery points.
- Done when: research opens items in shops and recipes, and tests cover rules and refunds.

### Milestone 7: Kingdoms, arenas and events
- Read: GDD 2.2 to 2.4, 5.1 to 5.11.
- Build: five kingdoms with home and guest factions, five arenas with round-by-round changes, all hazards hitting players and enemies, territory events, selection rules, the transition sequence with the reveal after preparation, and story cards.
- Done when: a 21-round campaign runs through three random kingdoms.

### Milestone 8: Bosses, relics and endings
- Read: GDD 4.10, 5.12, 10.1 to 10.6, 2.4.
- Build: five mini-bosses, five bosses with phases and signature attacks, escorts from the start of boss rounds, the Convergence phase, Kingdom Relics and the five endings.
- Done when: a debug jump reaches each boss, each boss is beatable, and Convergence uses the right borrowed attacks.

### Milestone 9: Grand Archive and saves
- Read: GDD 3.8, 8.13, 11.1 to 11.14, 15.6, 15.13.
- Build: the Grand Archive hub, Archive Points, discoveries, permanent upgrades, specialisations, mastery ranks, challenges, the revival, the Codex, saves, backups, export and import.
- Done when: progress survives a reload, and an exported save moves between two browsers.

### Milestone 10: Modes, options and tutorial
- Read: GDD 3.9 to 3.12, 13.1 to 13.3.
- Build: Assist mode, Challenge Tiers and Archive Point rates, endless mode rotation and records, fast-forward, the pause screen with the seed, every accessibility option, settings and the Apprentice Trial.
- Done when: every setting persists and works on the phone.

### Milestone 11: Presentation
- Read: GDD 15.1 to 15.10.
- Build: the final HUD and screens in the notebook style, damage colours and icon shapes, the effects library, code animation, telegraphs, ZzFX sounds, music hooks and image loading through the manifest.
- Done when: every screen matches GDD 15.5 to 15.9 with placeholders, and placing any generated image in `public/assets` replaces the placeholder with no code change.

### Milestone 12: Balance and polish
- Read: GDD 5.1, 14.3, 15.11, 16.
- Build: compare the economy logger with GDD 14.3, tune `tiers.ts`, bring a campaign into 25 to 35 minutes, profile on the phone, check installation and offline play.
- Done when: a full campaign on the phone holds the target frame rate and fits the time target.

## Reference

- Screen mockups for the user's reference live on a private design canvas linked in GDD 15.16. Build screens from the written specs in GDD 15.
- When GDD.md and this file disagree, GDD.md wins for game rules and this file wins for code structure.
