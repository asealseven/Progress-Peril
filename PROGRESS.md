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

### Milestone 5: Preparation, shop and economy

- Preparation screen after every round: Workbench and Shop tabs, a resource bar and a Start button. Untimed.
- Workbench: three weapon cards with four sockets each, the Auxiliary padlock, the component tray, the weapon reserve, the recipe list and the synergy panel with near misses.
- Three shops with separate stock: Blacksmith, Alchemist and Royal Inventor. Paid visits at 20 gold with 5 items, free visits after Rounds 4, 7, 11, 14 and 18 with 6 items, rerolls from 5 gold, the specialist slot, the Experimental and Extraordinary caps, and prices rising 20 per cent per territory.
- Weapon quality, weapon grades I to IV with a stat step chosen at purchase, merging, the reserve and weapon dismantling.
- Recipes for every component below Extraordinary, and dismantling into four material types.
- Drops: gold, materials and components as pickups, collected through Pickup Radius and at round end.
- Gold in the combat HUD. Loot in the round results. An economy logger in the debug overlay.
- Specimen Jar works. Research Notebook waits for Milestone 6.
- 416 tests. New: 35 for prices, shops, grades, recipes and merging, 15 for drops and pickups, a seven-round Territory 1 loop with shop visits, and the 21-round campaign on the real economy.

### Milestone 6: Research

- All 120 nodes from GDD 8.12: 90 discipline nodes, 20 cross nodes and 10 hidden nodes, each with GDD effect wording and a typed effect.
- Costs by ring in points and materials, AND requirements, instant research, and refunds at 75 per cent with dependent nodes removed.
- Research opens weapons and components in shops and recipes. Grade III needs a middle-ring node, Grade IV an outer-ring node. Extraordinary components appear on free milestone visits after their outer node.
- 53 rule effects in the simulation: typed damage, statuses, reactions, chains, constructs, criticals, regeneration, Compound Interest, Mutagenics, Perfect Information and more.
- Research Points per kill, Research Yield and the Research Notebook. Champions drop a Rare component or 25 Research Points.
- Hidden nodes found by their GDD conditions, with ink smudge hints after a near miss.
- Captured research after Rounds 7 and 14. Mastery points per discipline and ranks from Novice to Grandmaster, kept in one Archive per session.
- Research tab: the web in five coloured sectors with rings, node states, linking lines, a node card with effect, cost, requirements, refund preview and capture, pan and zoom by mouse, pinch and buttons.
- Research Points in the preparation bar, the combat HUD and the round results, with hidden nodes found that round.
- Debug tools in preparation: +100 research and find all hidden nodes.
- 439 tests. New: 23 for research data, costs, requirements, refunds, gates, capture, mastery and hidden nodes. The campaign bot researches the cheapest node each phase.

### Milestone 7: Kingdoms, arenas and events

- Five kingdoms with lore, specialisations and focus areas from GDD 2.2 and 2.3.
- Five arenas: the Great Foundry, the Grand Laboratory, the Assembly Yards, the Observatory Plaza and the Overgrown Arboretum, with round-by-round changes from GDD 5.9.
- All 15 hazards from GDD 5.10. Each warns first, hits the player and enemies alike, carries its damage type, builds adaptation and scales with territory. Champions resist one step.
- Kingdom selection: the first campaign starts in Keldrath, later campaigns at random, three kingdoms per campaign with no repeats. The next kingdom stays hidden until Start after the boss.
- Seven territory events, one per territory in Round 2, 3, 5 or 6, at 60, 20 and 20 per cent. Event rosters, formations, the Military Invasion mix, the Mercenary Captain leading the ambush and 25 per cent extra gold.
- Transition scene: the opening card on the first campaign, the map of the five kingdoms with the route so far, and the reveal card.
- Event banner in combat, event gold on the results screen, an event picker in the debug menu.
- Asset manifest entries for the five arenas and eleven story cards.
- 465 tests. New: 26 for kingdom data, selection, events, arenas, every hazard type and a 21-round campaign through three random kingdoms.

### Asset folders

- ART_PROMPTS.md sits in the repo root.
- The asset manifest and `public/assets/` follow the ART_PROMPTS.md folders. The app icon moved to `public/assets/icons/app/app-icon.png`.

## Known issues

- Phone checks ran in an emulated phone viewport with touch events. No test on a physical phone yet.
- Controller input has no automated test. The preparation screen has no controller navigation yet.
- The Archive lives in memory. A reload resets mastery and hidden nodes until Milestone 9 adds saves.
- Absolute Precision and The Philosopher's Engine can be found, but their effects wait for Milestones 8 and 9.
- Node labels on the research web overlap at middle zoom. Milestone 11 revisits the layout.
- Cross nodes for disciplines with no shared border sit inside a third sector.
- Scrap limits weapon grades. Orthelyn and Nymora drop Crystals and Specimens, so the test bot ends a run with about 75 Crystals and 100 Specimens unused and no weapon at Grade IV. Dismantling and Scrap recipes help a player. Milestone 12 tunes this.
- Economy against GDD 14.3: Territory 1 earns about 200 gold against 337, with no mini-boss and no boss. Territories 2 and 3 earn about 750 and 830 against 544 and 753.
- Rounds run long. The test bot plays the campaign in 25 minutes of combat. Territory 3 rounds take 80 to 148 seconds against targets of 50 to 75.
- Boss and mini-boss arena parts wait for Milestone 8: the throne platform, the Abomination's vat, belts carrying parts, the Spore Sovereign and the Round 4 mini-boss actions.
- The relic choice in the territory transition waits for Milestone 8.
- Melee swings do not break volatile vats. Projectiles, explosions and blasts do.
- The campaign count for the first-campaign rule lives in memory until Milestone 9 adds saves.
- Rounds 4, 7, 11, 14, 18 and 21 hold no mini-boss or boss until Milestone 8. The free shop visits after those rounds already work.
- Preparation uses pick-then-place for components. Dragging on PC waits for Milestone 11.
- Preparation text runs 13 to 19 pixels on a 1280 pixel screen. A phone shows this small. Milestone 11 revisits the layout.
- Guards in a Protect squad hold next to their ward. A player with one short weapon has to walk in to finish the round.
- No Cold weapon exists in GDD 7.17. Frozen comes from Frost Salts alone.
- A standing player gains nothing from the Spring Trap Layer.
- Weapons fire at targets behind pillars, and the pillar blocks Straight shots.
- The HUD covers the player in the top left arena corner.
- Status pips and modifier markers are small on a phone screen. Milestone 11 replaces them with icon shapes.
- The debug menu uses small arrow buttons on a phone.
- Headless Chromium draws about 30 frames per second with software rendering. The simulation step takes about 0.14 milliseconds. Frame rate on real hardware waits for Milestone 12.
- The asset manifest lists keys and paths. File loading with fallback arrives in Milestone 11. The app icon is the exception.
- No sound yet. ZzFX arrives in Milestone 11.

## Next step

Milestone 8: Bosses, relics and endings. Read GDD 4.10, 5.12, 10.1 to 10.6 and 2.4.
