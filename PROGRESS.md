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

### Milestone 4: Enemies and the encounter director

- All 23 enemies from GDD 9.8 and 9.16 with tier stats, properties, weaknesses, resistances and one signature behaviour each.
- Six attack shapes behind crimson telegraphs: strike, shot, charge, slam, detonation and shockwave.
- Enemy area effects: acid, toxic pools, burning ground, spore pods and clouds, mines, seeds and shockwave rings.
- Utility AI in `src/sim/ai.ts`: six scored actions, seven personalities, squads with leaders and orders, flank slots and attack tokens.
- Update frequency by distance. Separation and obstacle avoidance.
- All 12 elite modifiers and all 7 champion traits, with markers and champion name labels.
- Encounter director: faction mix by kingdom, threat gating, trickle, groups and assault, elites from Round 5, champions from Round 15, formations, warning markers, the active enemy limit and held spending.
- Territory scaling for enemy Health and Damage.
- A run lasts 21 rounds with the Keldrath, Orthelyn and Nymora rosters. Boss rounds spend their budget with no boss.
- Constructs take damage from area hits. Siege Breaker champions hunt constructs and traps.
- Debug tools: jump to any round, pick any kingdom roster, spawn any enemy at any rank.
- 365 tests. New: 58 for enemies, modifiers and traits, 25 for AI and population limits, 20 for round tables and the director, and a headless 21-round campaign on PC and mobile limits.

### Asset folders

- ART_PROMPTS.md sits in the repo root.
- The asset manifest and `public/assets/` follow the ART_PROMPTS.md folders. The app icon moved to `public/assets/icons/app/app-icon.png`.

## Known issues

- Phone checks ran in an emulated phone viewport with touch events. No test on a physical phone yet.
- Controller input has no automated test.
- No shop exists until Milestone 5. A run holds one weapon, so a player without debug tools falls near Round 5 or 6. Use F3, then L, to equip three weapons and jump to a round.
- Rounds run long. The test bot clears Rounds 1 to 3 in 37 to 177 seconds by starting weapon, against targets of 30 to 35 seconds. With three weapons and the Damage stand-in, Territory 3 rounds take 72 to 298 seconds against targets of 50 to 75. Milestone 12 tunes this.
- Kill counts differ from GDD 14.3: about 200, 650 and 720 per territory against 255, 410 and 539. Orthelyn and Nymora field many Minimal enemies. Milestone 12 tunes this.
- Every territory plays in the Great Foundry placeholder until Milestone 7. Vat Chimera and Gear Lancer appear only through the debug roster picker or the spawn tool.
- Rounds 4, 7, 11, 14, 18 and 21 hold no mini-boss or boss until Milestone 8.
- Gold stays at 0 until Milestone 5, so a Highwayman steals nothing in a normal run. Champion drops wait for Milestones 5 and 6.
- Guards in a Protect squad hold next to their ward. A player with one short weapon has to walk in to finish the round.
- No Cold weapon exists in GDD 7.17. Frozen comes from Frost Salts alone.
- A standing player gains nothing from the Spring Trap Layer.
- Weapons fire at targets behind pillars, and the pillar blocks Straight shots.
- The HUD covers the player in the top left arena corner.
- Status pips and modifier markers are small on a phone screen. Milestone 11 replaces them with icon shapes.
- The debug menu uses small arrow buttons on a phone.
- Headless Chromium draws about 30 frames per second with software rendering. The simulation step takes about 0.08 milliseconds. Frame rate on real hardware waits for Milestone 12.
- The asset manifest lists keys and paths. File loading with fallback arrives in Milestone 11. The app icon is the exception.
- No sound yet. ZzFX arrives in Milestone 11.

## Next step

Milestone 5: Preparation, shop and economy. Read GDD 3.3, 6.1 to 6.6, 7.8 to 7.10, 7.22, 7.23, 14.1 to 14.3 and 15.8.
