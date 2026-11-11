# PROGRESS.md

## Done

### Milestone 0: Project setup

- Vite, TypeScript in strict mode, Phaser 4.2.1, Vitest and `vite-plugin-pwa`.
- npm scripts: `dev`, `dev:phone`, `build`, `preview`, `test`, `typecheck`.
- Self-hosted fonts through Fontsource: IM Fell English, Alegreya Sans, Caveat.
- Boot scene with the title on parchment.
- Web app manifest, service worker precache, landscape orientation, rotate prompt.
- GitHub Actions workflow: typecheck, test and build on every push, deploy to GitHub Pages from `main`.

### Milestone 1: First playable combat

- Simulation core in `src/sim` with no Phaser imports: fixed 1/60 second steps, seeded random numbers, object pools, spatial grid.
- Tier tables from CLAUDE.md in `src/data/tiers.ts`.
- Placeholder Great Foundry: 2400 by 1600 pixels, central crucible, six iron pillars.
- The Inventor with the Crossbow. Nearest targeting with target hold. Straight bolts blocked by obstacles.
- Royal Footmen: chase, crowd separation, wind-up with a crimson telegraph, strike, recovery.
- Damage order from GDD 7.14, Armour returns, Evasion, invulnerability window, regeneration, damage adaptation.
- Round timer, threat budget, spawn plan, round end per GDD 4.9, full heal between rounds.
- Scenes: Boot, Combat, Results. Three rounds in a row, then a closing results screen. Death ends the run with campaign statistics.
- Input: WASD and arrow keys, controller left stick and D-pad, floating touch joystick on the left half.
- Camera follow with look-ahead, arena edge clamp, wider view on touch.
- HUD: health bar and number, adaptation icons, round, timer, territory, three weapon tiles, low-health warning, touch pause button.
- Pause screen with the seed. Esc, controller Start, pause button and app backgrounding all pause.
- Debug overlay on F3 or a three-finger tap: frame rate, counts, seed, invincibility toggle on I.
- 59 tests: random numbers, tiers, Armour, damage order, player hits, timer, round end, movement, targeting, projectiles, enemy attacks, budget, headless three-round run, determinism.

### Milestone 2: Weapons and components

- All 24 weapons from GDD 7.17 with tier stats, tags, damage types and targeting defaults.
- Every behaviour in GDD 7.16: Straight, Arcing, Piercing, Ricochet, Homing, Chain, Beam, Cone, Aura and Orbit. Melee sweeps, slams and thrusts. Blasts, burning pools and rubble.
- Constructs: turrets, the Clockwork Hound, the Living Arsenal creature and snap traps.
- All 60 components from GDD 7.18 as typed effect descriptors. 44 work in full now. 16 hold effects for Milestones 3 and 5, listed in the debug menu.
- One modifier stack: flat bonuses, then percentages added inside a source type and multiplied across source types.
- Slot rules: one component per slot type, family fit, the Auxiliary slot at Grade III or the first merge, scrap values.
- Six targeting rules with target hold. Manual focus on a held mouse button, a second touch on the right half and the controller's right stick, with a brass reticle.
- Chain explosions with generation falloff, a depth limit and a per-step queue. Performance limits for projectiles, area effects, constructs and traps.
- Character selection screen with the six starting weapons.
- Debug tools on F3 or a three-finger tap: Loadout menu for any weapon and component, Spawn 10 and Invincible.
- 194 tests. New: catalogue checks against GDD counts, modifiers, slot rules, every weapon, every behaviour, targeting rules, focus, 29 component tests and a headless three-round run with each starting weapon.

### Milestone 3: Damage types, status effects and synergies

- Weaknesses, resistances and immunities from GDD 9.11 in the damage order.
- Build-up meters per status per enemy: fill, trigger, empty, refresh, drain and rank sizes.
- Eleven statuses: Burning, Poisoned, Corroded, Electrified, Frozen, Bleeding, Stunned, Infected, Marked, Overheated and Short-circuited, with the Artificial enemy rules.
- Seven reactions: Shatter, Steam Burst, Toxic Fumes, Galvanic Surge, Septic Wound, Short Circuit and Calculated Strike.
- All 23 synergies with their effects. The seven research synergies stay locked until Milestone 6, with a debug toggle.
- Synergies recalculate at round start. Near misses and locked synergies come back with the report.
- Chain reactions cover kill explosions, Electric arcs, infection spread and Recursive Artillery copies, with generation falloff, a depth limit and a per-step queue.
- 14 more components work in full: every status payload, Reagent Recycler, Resonance Fork, Parasite Larvae and the Grand Calculus Engine. Research Notebook and Specimen Jar wait for Milestone 5.
- Screens: status pips and outlines on enemies, reaction names, gold glow on weapon tiles with an active synergy, synergy list on the pause screen and in the debug menu.
- 267 tests. New: 40 for statuses, reactions and chain limits, 33 for synergies.

### Asset folders

- ART_PROMPTS.md sits in the repo root.
- The asset manifest and `public/assets/` follow the ART_PROMPTS.md folders. The app icon moved to `public/assets/icons/app/app-icon.png`.

## Known issues

- Phone checks ran in an emulated phone viewport with touch events. No test on a physical phone yet.
- Controller input has no automated test.
- Rounds run long. A test bot clears Rounds 1 to 3 in 42 to 188 seconds by starting weapon, against targets of 30 to 35 seconds. War Hammer: 42, 52, 60. Pike: 45, 54, 66. Crossbow: 68, 101, 130. Longbow: 78, 110, 147. Knife Bandolier: 84, 113, 141. Forged Longsword: 102, 154, 188. A run still holds one weapon of three, with no shop yet.
- Royal Footmen resist Slashing, so the Forged Longsword and Knife Bandolier now run 40 to 65 per cent slower than in Milestone 2. Milestone 4 adds enemies weak to Slashing.
- Only Royal Footmen exist. Artificial enemy rules, Overheated, Short-circuited and Short Circuit run in tests only until Milestone 4.
- No Cold weapon exists in GDD 7.17. Frozen comes from Frost Salts alone.
- Enemies ignore constructs and traps until Milestone 4.
- A standing player gains nothing from the Spring Trap Layer.
- Weapons fire at targets behind pillars, and the pillar blocks Straight shots.
- The HUD covers the player in the top left arena corner.
- Status pips are small on a phone screen. Milestone 11 replaces them with icon shapes.
- The debug menu uses small arrow buttons on a phone.
- The asset manifest lists keys and paths. File loading with fallback arrives in Milestone 11. The app icon is the exception.
- No sound yet. ZzFX arrives in Milestone 11.

## Next step

Milestone 4: Enemies and the encounter director. Read GDD 4.4 to 4.12 and 9.1 to 9.16.
