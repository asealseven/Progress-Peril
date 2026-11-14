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

### Milestone 8: Bosses, relics and endings

- Five territory bosses with three phases each: Iron Regent, Abomination, Grand Automaton, The Unmaking and Spore Sovereign, with their signature attacks and phase mechanics from GDD 10.4.
- Five mini-bosses with two phases on Rounds 4, 11 and 18: Forge Marshal, Mad Alchemist, Siege Spider, Tesla Warden and Thornback Matriarch.
- Escorts from the start of every boss round: the previous territory's mini-boss, or the kingdom's own in Territory 1.
- Boss parts: engineers, arm turrets, belt motors, a war banner, pylons and The Unmaking's copies.
- Convergence on Round 21: the final boss borrows the signature attacks of the bosses beaten earlier, drawn in their kingdom colours.
- Telegraphs before every boss attack: crimson for bosses, dashed for escorts. Boss and escort bars with phase marks. Boss rounds zoom out.
- Boss rewards, the boss ending the round, and the Absolute Precision hidden node.
- All 15 Kingdom Relics with their effects, and the relic choice after each territory boss.
- Victory scene with the five endings from GDD 2.4.
- 486 tests. New: 21 for boss data, round plans, entry, phases, telegraphs, rewards, Convergence, The Unmaking's copies, the Automaton's arms, the Null Field, every boss beatable, Absolute Precision and relics.

### Milestone 9: Grand Archive and saves

- The Grand Archive hub replaces the title flow: map table, continue seal, Archive shelves, lectern, trophy cabinet and desk lamp, with a side list on phones.
- Archive Points for rounds, mini-bosses, bosses, the final boss, the campaign, new technology, hidden technology and challenges.
- Discoveries from the GDD 11.10 starting knowledge, with mastery and requirement conditions, in six research areas.
- All seven permanent upgrades with the 90 per cent respec, including the revival.
- All ten specialisations with bonuses and drawbacks, two slots or three after Grandmaster, full refunds.
- Mastery ranks with the Expert shop rule and the five Master mechanics.
- The four GDD challenges, the Codex of enemies, synergies, reactions, relics, lore and endings, and the trophy cabinet.
- Saves: three profiles, run autosave at preparation, Archive saves after every round, a backup copy, versions with migrations, export as a file or a code, import on another device, persistent storage.
- Checked in the browser: progress survives a reload, and an exported code moves the save to a second browser.
- 512 tests. New: 26 for the catalogue totals, discovery conditions, upgrades and respec, specialisations, Archive Points, the revival, mastery, challenges, the Codex and saves.

### Milestone 10: Modes, options and tutorial

- Challenge Tiers 1 to 5 with the five GDD levers in order, Archive Point rates from 1.2 to 2, a new tier on each win, no revival from Tier 3.
- Assist mode: enemy Damage one step lower, game speed at 0.8, half Archive Points, no tier unlock.
- Mode bar on the character screen: Assist toggle, tier arrows, rate and levers.
- Endless mode after a won campaign: the two unseen kingdoms first, then loops of five with no repeat at the joins, Health and Damage up a step per loop, Territory 3 shop odds plus the free-visit bonus, an Extraordinary component in the entry shop, bosses borrowing two attacks, relics then three Rare or better components, records per character.
- Fast-forward at 1.5 times on Tab, controller Select or a touch button, encounter rounds only, remembered between rounds.
- Pause screen with the seed, weapons and components, synergies, research, relics and mode.
- Settings in three tabs. Options: screen shake, flashes, damage numbers, low health warning, effect density, colour-blind palettes, text size, readable font, enemy shot outline, audio cues, subtitles, trial. Controls: hold or toggle focus, handedness, joystick size, fixed or floating joystick, keyboard and controller remapping. Saves: profiles and transfer.
- Settings save at once in save version 2, with a migration from version 1.
- The Apprentice Trial on the first campaign: Swarmers in Round 1, a free Incendiary Oil, weak enemies and an elite priority target in Round 2, Research Points and a synergy weapon for Round 3, then a fixed free shop visit.
- Checked in the browser on desktop and an emulated phone: settings survive a reload and reach combat (remapped keys, fast-forward, joystick size and side).
- 531 tests. New: 19 for tiers, rates, Assist, the revival, tier unlocks, endless rotation, loop scaling, borrowed bosses, component rewards, records, the trial and settings saves.

### Milestone 11: Presentation

- Asset manifest for all 164 images in ART_PROMPTS.md, boss images per phase included. A build step lists the files in public/assets, Boot loads them under their keys, and every missing file keeps its placeholder. A new file reloads the dev server and replaces its placeholder with no code change.
- Images where they exist: player, enemies, mini-bosses, bosses by phase, arenas, weapon and component icons on cards, chips, sockets and HUD tiles, relic cards, shopkeepers, story and ending cards, and the hub hall. Placeholders: blueprint glyphs per weapon family, socket shapes per slot, wax seals for relics, doors for keepers.
- The nine damage type icon shapes from GDD 15.1, drawn in code, on status meters, adaptation icons and weapon cards. Damage numbers edged in the damage type colour.
- Effects library: hit spark, burst and trail per damage type, explosions in three sizes, one effect per status reaction, ink splatters, and an ink flourish on synergy tiles at round start.
- Code animation: bob, lean and squash while moving, wind-up and lunge, white hit flash, shrink and fade on death, boss image swap per phase.
- ZzFX sounds: hits per damage type, attacks per weapon family, voices per faction, deaths, pickups, clicks, page turns, quill, purchases, research, telegraphs, boss attacks and phases, explosions, reactions, round start and end. A mixer keeps 8 copies per sound with priority for telegraphs and boss attacks. Audio starts on the first input.
- Music hooks: three layers per kingdom fading with the threat on screen, boss themes, a Convergence theme and the Archive menu theme. Music ducks under boss telegraphs. Missing files stay silent.
- Audio cues for elite arrivals, boss attacks and low health, with captions when subtitles are on. Sound effect and music volume settings.
- Screens: event seal beside the round, endless loop counter and personal best, fast-forward greyed on boss rounds, Settings from the pause screen, a two-second skippable round summary, the Archive Point tally on Victory, the character portrait with mastery rank, keeper portraits in the shop, drag-and-drop components on PC, notebook dialogs for save codes.
- Checked in the browser on desktop and an emulated phone. Eight test images replaced their placeholders with no code change, then came out again.
- 545 tests. New: 14 for the manifest against ART_PROMPTS.md, the mixer limits, music layers, icon shapes, effect styles and explosion sizes.

### Milestone 12: Balance and polish

- Balance report (`BALANCE=1 npm run test -- balance`): bot campaigns averaged per territory beside GDD 14.3 and GDD 4.3, with boss times by boss, enemies left at the timer and clean-up length. `BALANCE_RUNS`, `BALANCE_FRESH` and `BALANCE_MORTAL` change the runs. The bot now focuses bosses and their parts, circles cover, and dodges.
- Economy against GDD 14.3 over 12 experienced-profile campaigns: gold 1,542 against 1,634, Research Points 1,981 against 2,052, materials 197 against 216, bought kills 1,105 against 1,204. Every total sits 4 to 12 per cent under the estimate.
- Bot combat time: 24.5 minutes per campaign, from 27.8 before. Encounters 53, 64 and 80 seconds per territory. Bosses 108, 70 and 64 seconds.
- Tuning in `tiers.ts`: Weapon Damage 5/9/15/25/44, Weapon Attack Speed 0.45/0.8/1.25/2.0/3.3, Enemy Health Extreme 220, territory boss Health 3,200. The director lands its last spawns by 70 per cent of the timer and leans toward costlier enemies in Territories 2 and 3.
- Summoned enemies drop nothing. Boss summons stay at 10 or under. Full Bloom heals from 8 patches at most, at half the old rate.
- Soft-locks fixed: dormant Ancient Guardians wake at the timer, retreating enemies close in during the clean-up, enemies pinned between obstacles detour, and overtime ends any round in 70 seconds of clean-up at most.
- Performance: the arena floor bakes into one texture, status icons come from baked textures, phones run effects at 60 per cent density with a 300 particle cap, and images load behind the title.
- Offline: a duplicate precache entry stopped the service worker from caching anything, so offline play failed. Fixed and checked: 18 files cached, and the game reloads and plays with the network off on an emulated phone.
- Download: 2.3 MB before art and music.
- 545 tests pass. Hard-coded expectations now follow the new tier values.

### Asset folders

- ART_PROMPTS.md sits in the repo root.
- The asset manifest and `public/assets/` follow the ART_PROMPTS.md folders. The app icon moved to `public/assets/icons/app/app-icon.png`.

## Known issues

- No real phone check yet. Headless Chromium renders in software at about 20 frames per second in a heavy round, and every draw call counts as script time there, so these numbers do not predict a phone. Open the debug overlay (F3, or a three-finger tap) on your phone to read the frame rate.
- Difficulty has no human playtest. The bot dies by Round 4 to 7 when it can be hit, mostly to the first mini-boss, but it dodges far worse than a person. Enemy Damage stays at the CLAUDE.md values.
- A full campaign by a person likely runs 30 to 35 minutes: about 22 to 25 minutes of combat plus preparation. That sits at the top of the GDD 5.1 target.
- Sounds are untuned. Headless checks cannot hear them.
- With all 164 images, the download grows past 2.3 MB. Arenas, cards and the hub as large PNG files could approach the 40 MB budget in GDD 15.11.

- Phone checks ran in an emulated phone viewport with touch events. No test on a physical phone yet.
- Controller input has no automated test. The preparation screen has no controller navigation yet.
- Absolute Precision and The Philosopher's Engine can be found, but their effects wait for Milestones 8 and 9.
- Cross nodes for disciplines with no shared border sit inside a third sector.
- A new profile cannot reach weapon Grades III and IV: they need middle and outer nodes, which the Archive discovers over several campaigns (GDD 11.10). The balance report plays an experienced profile, as GDD 14.3 assumes.
- The hub is a placeholder of coloured boxes until the hub illustration exists. On phones the side list covers part of the hall.
- Challenge cosmetics and the Grandmaster decoration have no design yet.
- Melee swings do not break volatile vats. Projectiles, explosions and blasts do.
- Preparation text runs 13 to 19 pixels on a 1280 pixel screen. A phone shows this small. Milestone 11 revisits the layout.
- Guards in a Protect squad hold next to their ward. A player with one short weapon has to walk in to finish the round.
- No Cold weapon exists in GDD 7.17. Frozen comes from Frost Salts alone.
- A standing player gains nothing from the Spring Trap Layer.
- Weapons fire at targets behind pillars, and the pillar blocks Straight shots.
- The HUD covers the player in the top left arena corner.
- The debug menu uses small arrow buttons on a phone.
- Colour-blind palettes recolour damage types only. Faction and kingdom colours stay.
- Text size and the readable font cover the research web, item cards and tooltips, as GDD 3.10 lists. Other screens keep fixed sizes.
- Node labels on the research web overlap at middle zoom.
- Boss bars and labels sit large on a phone screen.
- Boss images by phase, music files and the hub illustration are untested with real art. Boss and menu music paths are a gap decision (NOTES.md).
- The round summary moves on after two seconds, so the detailed table is brief. Campaign totals stay on the final results and Victory screens.
- Character traits: GDD 16.7 has none, so the portrait shows the highest mastery rank and the endless best.
- Controller remapping has no automated test. Remapped keys must not clash: the game does not check.
- The pause screen has no Codex button. The Codex lives in the Grand Archive.

## Next step

All 12 milestones are built. Next: deploy `dist/` to a static host, install on your phone, play a campaign, and read the frame rate in the debug overlay. Then add generated art and music from ART_PROMPTS.md and retune with the balance report.
