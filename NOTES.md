# NOTES.md

Gap decisions. Each entry names the GDD section, the gap and the rule chosen.

## Milestone 0

- **GDD 15.1, colours.** CLAUDE.md gives the hex values. They live in `src/data/palette.ts`.
- **GDD 15.2, safe areas.** The game container sits inside the CSS safe-area insets, so the canvas never draws under a notch.
- **GDD 3.5, horizontal orientation.** A CSS overlay shows the rotate prompt on touch devices in vertical orientation. The web app manifest requests landscape.
- **GDD 15.12, hosting.** The build uses relative paths, so the same `dist/` works at a domain root and under a GitHub Pages sub-path.
- **CLAUDE.md, folder layout.** `src/data` gains three small files not named in the layout: `palette.ts`, `fonts.ts` and `screen.ts`. Each holds constants from CLAUDE.md tables.

## Milestone 1

- **GDD 3.6, global stats.** Damage, Attack Speed, Range and Area have base Medium as global modifiers. Base Medium means no change to weapon numbers. Milestone 2 adds the modifier stack.
- **GDD 3.7, Armour returns.** Each Armour source converts to points: `points = r / (0.75 - r)`. Points add, then convert back: `reduction = 0.75 * points / (points + 1)`. One source keeps its tier value. Stacked sources approach 75 per cent.
- **GDD 3.7, adaptation in the hit order.** Adaptation applies after Armour: Evasion check, Armour, adaptation, health loss. Evaded hits build no adaptation.
- **GDD 3.7, invulnerability window.** 0.5 seconds. A strike landing inside the window deals no damage.
- **GDD 4.9, round end.** The timer counts down the target duration while the director spawns. At zero the round continues until every enemy falls. The HUD then shows the number of enemies left.
- **GDD 4.11, Milestone 1 director.** One enemy type. The budget splits into a trickle (a third), groups of three to five (half) and one closing assault at 85 per cent of the round. Budget left over by one share moves to the next share. No active enemy limit and no warning marker yet. Milestone 4 replaces this plan.
- **GDD 4.11, spawn points.** Enemies spawn at a random arena point at least 900 pixels from the player, outside the camera view. The distance limit relaxes when the arena has no such point.
- **GDD 5.9, Great Foundry shape.** GDD says a square floor. CLAUDE.md sets every arena at 2400 by 1600 pixels, and CLAUDE.md wins for code structure. The placeholder has a central crucible and six iron pillars, all solid circles.
- **GDD 7.14 step 6, Piercing damage.** GDD gives no amount for the Armour cut. Piercing damage lowers target Armour by one tier step. Values between tiers move along the tier scale. Crossbow against a Royal Footman: 20 damage, Armour 25 to 10 per cent, 18 per hit.
- **GDD 7.14 step 5, weakness and resistance.** The damage function takes a type multiplier. Milestone 3 sets the numbers. Milestone 1 passes 1.
- **GDD 7.15, Ranged default.** The table names no default rule for the Ranged family. The Crossbow uses Nearest, as CLAUDE.md Milestone 1 states. Range checks measure to the target's near edge.
- **GDD 7.16, Straight projectiles.** Speed 700 pixels per second, radius 4. A bolt travels the weapon Range and stops at the first enemy, obstacle or wall. Weapons fire with no line-of-sight check, so pillars block some bolts.
- **GDD 7.17, Crossbow "High Critical Chance".** The Crossbow uses the High tier (20 per cent) in place of the player's base Critical Chance.
- **GDD 9.10, enemy attack type.** GDD lists no damage type for enemy attacks. The Royal Footman deals Slashing.
- **GDD 9.10, enemy Range.** Range measures from the enemy's edge to the player's edge. A Royal Footman winds up for 0.45 seconds once in range, strikes if the player is still in range, then pauses 0.9 seconds.
- **GDD 15.2, camera.** Look-ahead of 70 pixels in the direction of movement. Touch devices use zoom 0.85 for the wider view.
- **GDD 15.7, HUD on touch.** Text and touch targets scale by 1.4 on touch devices. The pause button measures 90 logical pixels, above 44 screen pixels on a phone.
- **GDD 15.7, health bar colour.** Ink fill on parchment. The bar turns Danger crimson at 30 per cent health, together with the screen-edge warning.
- **GDD 15.14, seeds.** `?seed=ABC123` in the address starts a run with the given seed.
- **CLAUDE.md, Milestone 1 scope.** The run ends after Round 3 with a results screen, since Round 4 needs the mini-boss from Milestone 8. `PLAYABLE_ROUNDS` in `src/sim/run.ts` holds the limit.
- **CLAUDE.md, folder layout.** New small files: `src/data/rounds.ts` (GDD 4.2, 4.3, 4.11 tables), `src/data/characters.ts`, `src/scenes/input.ts`, `src/scenes/platform.ts`. Combat values with no GDD number sit in `COMBAT` in `src/data/tiers.ts`.
