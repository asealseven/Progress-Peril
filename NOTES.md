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

## Asset folders (after Milestone 1)

- **ART_PROMPTS.md, folders.** The manifest in `src/data/assets.ts` follows ART_PROMPTS.md. A key is `<group>.<file name>`. Groups and folders: `player` in `sprites/player`, `enemy` in `sprites/enemies`, `miniboss` in `sprites/minibosses`, `boss` in `sprites/bosses`, `weapon` in `icons/weapons`, `component` in `icons/components`, `relic` in `icons/relics`, `shopkeeper` in `portraits/shopkeepers`, `arena` in `arenas`, `card` in `cards`, `hub` in `hub`, `app` in `icons/app`. Every folder exists under `public/assets/`.
- **ART_PROMPTS.md, player key.** The player key changed from `character.the-inventor` to `player.the-inventor`, to match the `sprites/player` folder.
- **ART_PROMPTS.md, projectiles.** The file lists no projectile images. Projectiles stay code-drawn shapes (GDD 15.3). The manifest entry `projectile.player` has no file path.
- **ART_PROMPTS.md, app icon.** The 512 pixel web app icon lives at `public/assets/icons/app/app-icon.png`, and the web app manifest points there. A generated file under the same name replaces the placeholder. `public/icons/icon-192.png` (browser tab and home screen) and `public/icons/icon-maskable-512.png` (Android adaptive icon) stay code-drawn until someone resizes the generated icon into both files.
- **ART_PROMPTS.md, target sizes.** The file gives a target size per folder, such as 64 pixels tall for the player. Milestone 11 applies those sizes when image loading arrives. Placeholders keep the radii from CLAUDE.md.

## Milestone 2

Numbers named below sit in `WEAPON_RULES`, `KNOCKBACK_PIXELS` and `PERFORMANCE_LIMITS` in `src/data/tiers.ts`, for the Milestone 12 tuning pass.

### Effects and modifiers

- **GDD 7.18, "up" and "down" effects.** Three rules by stat kind. Scaling stats (Damage, Attack Speed, Range, Area, projectile speed, arc width, status duration, construct health, construct attack speed) change by the modifier size of the tier: Low is 10 per cent. Critical Chance adds the tier's own Critical Chance value: Low adds 5 points. Critical Damage adds the modifier size to the multiplier: Medium adds 0.20. Player Armour adds an Armour source at the tier's own value, stacked with diminishing returns (GDD 3.7).
- **GDD 7.14 step 3, source types.** Components form one source type, so component bonuses add. The Living Arsenal's adaptation uses a separate source type, so adaptation multiplies with component bonuses. A percentage factor never drops below 20 per cent.
- **GDD 7.14, flat bonuses.** No component in GDD 7.18 gives a flat bonus. The modifier stack supports flat bonuses for later content.
- **GDD 3.6, stat caps.** Player Armour caps at High (40 per cent). Weapon-level bonuses from components have no cap beyond 100 per cent Critical Chance. Caps for player-wide Damage, Attack Speed, Range and Area arrive with research in Milestone 6.
- **GDD 7.14, Knockback.** Weapons have no base Knockback. "Knockback up" adds a push in pixels per hit: Minimal 5, Low 10, Medium 20, High 35, Extreme 60. Sources add.
- **GDD 7.18, effects with no tier.** "Faster projectiles", "Area up" and "Range down" (Spray Nozzle) use Medium.
- **GDD 7.18, later milestones.** Sixteen components carry effects waiting for a later system: status build-up, spread, duration and reactions (Milestone 3), the Grand Calculus Engine (Milestone 3), Research Points and Specimens (Milestone 5). Each effect has `activeFrom` in `src/data/components.ts`. The debug menu lists them. Weapon status build-up ("Builds Bleeding", "Stun chance") waits for Milestone 3 too.
- **GDD 7.12, default components.** GDD names no default components per weapon. Weapons arrive with empty slots. Milestone 5 adds defaults by quality.

### Weapons

- **GDD 7.17, two damage types.** "Impact and Fire" and "Piercing and Electric" split weapon damage evenly. Each half runs through the damage order against Armour.
- **GDD 7.17, shapes.** Sweep: radius is Range, arc is 40 degrees plus 1 degree per Area pixel. Slam: a circle of Area radius at the target, up to Range away. Thrust: a line of Range length, half-width 10 plus half of Area. Cone: length is Range, arc is 20 degrees plus 0.6 per Area pixel. Aura: radius is half of Range plus Area. Orbit: radius is 75 per cent of Range up to 150 pixels, head radius 10 plus a quarter of Area, turns per second half of Attack Speed between 0.5 and 2, one hit per enemy per attack interval.
- **GDD 7.17, Area on projectiles.** Weapons with a blast (Field Cannon, Mortar, Siege Catapult, Firebomb Satchel, Alchemical Chain-Reactor) hit every enemy inside Area on impact. Other projectiles gain 0.2 pixels of radius per Area pixel.
- **GDD 7.16, Arcing.** Flight speed 420 pixels per second, with a minimum flight of 0.35 seconds. Arcing shots pass over obstacles. Blast shots land on a fixed point with no lead (Ballistic Tables adds lead in Milestone 3). A single-target shot (Area Minimal) follows its target to the landing, since a fixed point misses every moving enemy.
- **GDD 7.17, weapon counts.** Knife Bandolier: 3 knives across 24 degrees. Ballista: unlimited Penetration. Electromagnetic Repeater: Penetration 2, projectile speed times 1.6. Sawblade Launcher: 3 bounces within 220 pixels. Tesla Rod: 3 jumps within 160 pixels.
- **GDD 7.20, chain falloff.** Chain jumps and chain explosions keep 75 per cent of damage per generation. Depth limit 4. An enemy ignores further chain generations for 0.25 seconds after a chain hit. Chain explosions queue and resolve on a later step, 12 per step on PC and 6 on mobile.
- **GDD 7.17, Burning Mirror.** Damage rises 10 per cent per tick on one target, up to double.
- **GDD 7.17, zones.** Firebomb pools last 3 seconds and deal 25 per cent of weapon damage twice per second. Catapult rubble lasts 4 seconds and slows enemies to 60 per cent speed.
- **GDD 7.17, Alchemical Chain-Reactor.** A kill sets off an explosion of 60 per cent Area and 60 per cent damage, at the next chain generation.
- **GDD 7.17, constructs.** Clockwork Turret: 2 turrets per weapon, 40 Health, one deployment every 4 seconds, and a turret more than 450 pixels behind moves up. Companions: one per weapon, 60 Health, speed 230, leash of Range plus 60 pixels around the player. Spring Trap Layer: 6 traps per weapon, 70 pixels apart, 0.4 seconds to arm. Enemies do not attack constructs until Milestone 4.
- **GDD 7.17, Living Arsenal.** "Adapts each round": Damage up one Minimal step per completed round, capped at High, matching the Living Wood Frame.
- **GDD 7.15, defaults.** Ranged and Experimental weapons use Nearest. Weapons with the Arcing tag and Alchemical weapons use Clustered. Siege weapons use Strongest. A weapon with the Precise tag takes Marked enemies first, then follows its rule. Clustered counts enemies inside Area, with a 40 pixel minimum.
- **GDD 3.4, manual focus.** While held, each weapon targets the enemy in range closest to the focus direction. The hold rule is off during focus. Constructs, traps and companions ignore focus.

### Components

- **Copper Coil Housing.** Adds Electric damage worth 10 per cent of weapon damage.
- **Blackpowder Charge.** Explosion radius 30, half of weapon damage as Impact and Fire, to every enemy except the one hit.
- **Volatile Catalyst.** Kill explosion radius 30, half of weapon damage as Impact and Fire, at the next chain generation.
- **Leyden Jar Cell.** The arc deals half of weapon damage as Electric to the nearest enemy within 160 pixels.
- **Frost Salts.** The slow cuts speed to 70 per cent for 1.5 seconds.
- **Magnetite Slugs.** Enemies of radius 14 or less within 90 pixels move 24 pixels toward the hit point.
- **Grappling Line.** The first enemy hit by each attack moves 40 pixels toward the player.
- **Shrapnel Shells.** 8 fragments, 25 per cent of weapon damage each as Impact, 160 pixels of travel.
- **Ratchet Repeater and Multishot Rack.** Extra projectiles widen the fan by 8 degrees each. Extra Arcing shots land 36 pixels from the target point.
- **Magnetised Core and Gyroscopic Stabiliser.** Homing turn rates of 5 and 1.6 radians per second. The Stabiliser halves the fan angle.
- **Gear Train Accelerator.** Attack Speed up 5 per cent per attack, capped at 35 per cent, reset after 1.5 seconds with no attack.
- **Feedback Loop Gear.** Attack Speed up 5 per cent per kill for 3 seconds, capped at 35 per cent.
- **Prototype Overclock.** Each attack has a 5 per cent chance to jam the weapon for 1.5 seconds.
- **Tesla Capacitor.** Every 4 seconds: Medium damage (12) as Electric to the nearest enemy within 220 pixels, then 3 jumps.
- **Bayonet Mount.** Once per second: Low damage (7) as Piercing to an enemy within 26 pixels of the player's edge.
- **Smoke Canister.** Radius 90, 3 seconds, 8 seconds between releases. Enemies inside stand still and start no attack.
- **Healing Poultice Chamber.** 1 Health per kill.
- **Repair Kit Housing.** 3 per cent of construct Health per second.
- **Orbit Mount.** The weapon becomes an orbiting head with the weapon's damage. Multishot Rack adds a second head.
- **Spray Nozzle.** The weapon becomes a cone. Blast and burning pool no longer apply.

### Limits and screens

- **GDD 7.21, limits.** PC: 400 projectiles, 30 area effects, 6 constructs, 18 traps. Mobile: 250, 16, 6, 12. At the limit the oldest projectile ends, a new area effect refreshes the nearest matching one, and a new turret replaces the oldest.
- **GDD 15.9, character selection.** A plain screen shows the six starting weapons of The Inventor. Milestone 11 restyles the screen.
- **CLAUDE.md, debug menu.** F3 or a three-finger tap opens the debug overlay with three tools: Loadout (L), Spawn 10 (K) and Invincible (I). Loadout opens a menu to equip any weapon and component. Applying restarts the current round.
- **CLAUDE.md, folder layout.** New files: `src/data/tags.ts`, `src/data/effects.ts`, `src/sim/loadout.ts` (weapon instances, slot rules, resolution), `src/sim/world/attacks.ts`, `constructs.ts`, `zones.ts`, and the `DebugMenu` scene. Projectiles draw as code shapes, not textures.

## Milestone 3

Numbers named below sit in `DAMAGE_STEP`, `STATUS_RULES`, `REACTION_RULES` and `SYNERGY_RULES` in `src/data/tiers.ts`.

### Decisions you made

- **GDD 7.13 and 9.14, status sources.** Weapons dealing Fire, Cold, Electric, Toxic, Corrosive or Biological build their type's status at Low (20 per cent of a Normal meter per hit). The War Hammer builds Stunned and the Spring Trap Layer builds Bleeding at Low, as GDD 7.17 names them. Payload components add the tier GDD 7.18 lists. An added damage type, such as Electric from the Copper Coil Housing, builds its status too.
- **GDD 9.11, one damage step.** A weakness multiplies damage by 1.7. A resistance multiplies damage by 0.6. Immune means no damage and no status.
- **GDD 7.19, research synergies.** All seven work and have tests. They stay locked in normal play until Milestone 6. The debug menu has a toggle opening all seven.

### Status meters

- **GDD 9.14, hits building status.** Primary weapon hits build status: direct hits, blasts, sweeps, cone and aura ticks, construct hits. Burning pools, chain jumps and explosions from kills build none.
- **CLAUDE.md, Medium build-up.** Medium is one third of a meter, written as 33 per cent in CLAUDE.md, so three Medium hits fill a Normal meter.
- **GDD 9.14, drain.** A meter drains 10 per cent of its size per second after 1 second with no build-up. Slow weapons lose a little between hits. A fast weapon with a Medium payload triggers on the third hit.
- **GDD 9.14, Artificial enemies.** Burning build-up fills Overheated. Electrified build-up fills Short-circuited. Poisoned, Bleeding and Infected build nothing. Short-circuited is the eleventh status in code: GDD 9.14 names the effect inside the Electrified row.
- **GDD 3.6, Status Potency.** Base Low means no change. The stat multiplies meter fill, damage over time and duration once research raises it.
- **GDD 7.14 step 5 and 6, order.** The type step applies before Armour. Corroded and Piercing lower Armour by tier steps and stack.

### Status effects

- **Damage over time.** A triggered effect deals a share of the triggering weapon's damage per hit, spread over the duration in ticks of 0.5 seconds: Burning 100 per cent over 4 seconds, Poisoned 100 per cent over 5 seconds with no Armour, Bleeding 75 per cent over 4 seconds, Electrified 75 per cent over 4 seconds, Infected 75 per cent over 6 seconds. The weapon gets credit for the damage and the kill.
- **Bleeding.** Ticks twice as fast while the target moves.
- **Electrified.** Each tick has a 25 per cent chance to arc to an enemy within 160 pixels for the tick's damage.
- **Infected.** On death the infection moves to the nearest uninfected enemy within 160 pixels. Each move raises the chain generation, up to the depth limit (GDD 7.20).
- **Corroded.** 5 seconds. Armour down one tier step, two steps on Metallic enemies.
- **Frozen.** Each Cold build-up hit slows the target to 70 per cent for 1.5 seconds. A full meter freezes the target for 2 seconds: no movement and no attack.
- **Stunned.** A 1 second stop. The Stun meter grows by half after each stun.
- **Marked.** 6 seconds. Critical Chance against the target up by the Medium tier value, 10 points.
- **Overheated.** 5 seconds. Attack timers run at two thirds speed. Electric and Cold damage up 20 per cent.
- **Short-circuited.** A 1 second stop.

### Reactions

- **"X hit".** A hit counts as a damage type when a damage part has the type, or when the hit builds the type's status. A Crossbow with Frost Salts makes Cold hits.
- **Shatter.** The Impact hit deals 100 per cent more (GDD 7.14 step 7). Frozen ends.
- **Steam Burst.** A burst of 60 pixels radius for half of weapon damage as Fire. Frozen and Burning end.
- **Toxic Fumes.** A cloud of 60 pixels radius for 3 seconds, dealing a quarter of weapon damage as Toxic per tick with no Armour. One cloud per enemy every 3 seconds.
- **Galvanic Surge.** Electric damage against the target up 35 per cent while Electrified and Corroded overlap.
- **Septic Wound.** While Bleeding and Infected overlap, the infection moves to a nearby enemy every 1.5 seconds, with no death needed.
- **Short Circuit.** The Electric hit deals 100 per cent more and stuns for 1 second. A stunned enemy sets off no second Short Circuit.
- **Calculated Strike.** The critical multiplier gains 0.35 for the hit. Marked ends.

### Synergies

- **GDD 7.19, requirements.** Internal and research synergies need every tag on one weapon. Cross-weapon synergies need one tag on each of two different weapons. "Melee weapon" and "Siege weapon" read the weapon family. A weapon takes part in each synergy once, so duplicates never stack.
- **Catalytic Mix.** "Three different status payloads" counts the different statuses the equipped weapons build, from payloads and from the weapons themselves.
- **Chemical Ballistics.** "Any Chemistry payload" means a payload component building Burning or Corroded, the statuses of the two Chemistry damage types.
- **Grand Calculus Engine.** The weapon counts as having one missing tag per synergy. Families and payloads stay as they are. The engine raises the chain depth limit from 4 to 5 for the weapon (GDD 7.20).
- **Reaction bonuses.** Thermal Shock (35 per cent) and Catalytic Mix (20 per cent) scale the reaction's own bonus. Both are synergies, one source type, so they add.
- **Conductive Strike.** One extra jump for Tesla Rod chains, Leyden Jar Cell arcs and Tesla Capacitor lightning.
- **Pressure Burst.** Radius times 1.2 for blasts, slams and the weapon's explosions.
- **Envenomed Edge.** Poisoned from the weapon ticks twice as fast on Bleeding enemies.
- **Flashpoint.** An enemy Burning from the weapon explodes on death: radius 30, half of weapon damage as Impact and Fire, at the next chain generation.
- **Clockwork Precision.** Turrets, companions and traps roll no critical hits by default. With the synergy they roll player Critical Chance.
- **Overgrowth.** An infection from the weapon moves to two enemies on death.
- **Steady Hand.** The weapon's first hit on each enemy is critical.
- **Galvanic Corrosion.** The Galvanic Surge bonus doubles to 70 per cent, and half of the Electric hit arcs to one enemy within 160 pixels.
- **Fungal Network.** A primary hit on an Infected enemy deals a quarter of its damage to other Infected enemies within 150 pixels.
- **Kill Zone.** A trap hit marks an enemy as trapped for 3 seconds. Turrets and companions pick trapped enemies first and deal 20 per cent more to them.
- **Ballistic Tables.** Arcing shots aim where the target will stand after the flight time. Area up 10 per cent for Arcing weapons.
- **Combined Arms.** A Melee weapon hit marks an enemy for 3 seconds. Siege weapons pick marked enemies first and deal 10 per cent more to them.
- **Magnetic Field.** Pickup Radius up 35 per cent. Metallic enemies within 200 pixels of the player move 20 per cent slower.
- **Chemical Ballistics.** A projectile drops a trail patch every 60 pixels: radius 18, 1 second, building the payload status at Minimal per tick.
- **Electromagnetic Launchers.** Penetration plus one and Range up 20 per cent.
- **Bioengineering.** Constructs regain 3 per cent Health per second. Damage up 5 per cent per completed round, capped at 35 per cent.
- **Conductive Toxins.** A chain jump to a Poisoned enemy costs no jump, up to 8 jumps per chain.
- **Recursive Artillery.** Each blast from the weapon queues one copy: 60 per cent radius, half damage, next chain generation. Copies make no copies.
- **Kinetic Probability.** A knockback stopped by a wall, an obstacle or another enemy adds the critical bonus to the hit.
- **Adaptive Armour.** Adaptation gain and cap double.

### Components now active

- **Spore Culture.** "Infection spreads on death" repeats the base rule for Infected, so the component adds build-up only.
- **Parasite Larvae.** An enemy Infected by the weapon releases a parasite on death. The parasite flies up to 420 pixels, homes on the nearest enemy and infects the first enemy touched, with no damage on contact.
- **Resonance Fork.** Damage up 20 per cent against Electrified and Frozen enemies, added to the component sum.
- **Reagent Recycler and Heat Sink Housing.** Status duration times 1.2. The Heat Sink bonus covers Burning only.
- **Frost Salts.** "Each hit also slows" matches the Frozen rule, so both set the same slow.

### Screens and limits

- **GDD 9.14, meter icons.** Each building or active status shows as a small pip above the enemy health bar, in the status colour. An active status fills its pip and adds a coloured outline. Icon shapes arrive in Milestone 11.
- **GDD 15.4, reactions.** A reaction shows its name above the enemy for one second, with a ring. Milestone 11 adds one unique effect per reaction.
- **GDD 15.7, tile glow.** A weapon tile pulses gold while its weapon takes part in an active synergy. The pause screen lists active synergies.
- **GDD 7.19, near misses.** The debug menu lists active synergies, synergies waiting for research and up to five near misses. The Workbench in Milestone 5 takes over this list.
- **GDD 7.20, visual merging.** Overlapping chain effects still draw one burst each. Merging arrives with the effects library in Milestone 11.
- **GDD 7.19, Codex.** Synergies enter the Codex in Milestone 9.
- **Test enemies.** `tests/helpers.ts` defines a plain target and an Artificial target for rules no enemy shows yet. They exist only in tests.
- **CLAUDE.md, folder layout.** New files: `src/data/statusEffects.ts`, `src/data/synergies.ts`, `src/sim/synergies.ts`, `src/sim/world/status.ts`.

## Milestone 4

GDD 4.4 to 4.12 and 9.1 to 9.16.

### Decisions you made

- **GDD 5.6 and 5.7, rosters before Milestone 7.** Territories 1, 2 and 3 use the Keldrath, Orthelyn and Nymora rosters, in that order. The three cover all six factions. The debug menu picks any kingdom roster for the current territory. Every territory plays in the Great Foundry placeholder.
- **GDD 4.10, boss rounds before Milestone 8.** Rounds 4, 7, 11, 14, 18 and 21 spend the reduced budget from GDD 4.11 with normal spawns and no boss.
- **Run length.** A run lasts 21 rounds. The debug menu jumps to any round.
- **GDD 9.13, constructs under attack.** Enemies keep chasing the player. Blasts, slams, pools, charges and shockwaves damage turrets and companions caught inside. A Siege Breaker champion walks to the nearest construct or trap and destroys the target on contact, before turning to the player.

### Enemy data (GDD 9.10, 9.11)

- **Attack damage types.** GDD lists none. Royal Footman, Hunting Hound, Highwayman, Mercenary Captain: Slashing. Royal Longbowman, Clockwork Crawler, Gear Lancer, Thornling: Piercing. Royal Bastion, Iron Sentinel, Mechanist, Regenerator, Ironback Beetle, Rogue Inventor, Ancient Guardian, Forgeguard Knight: Impact. Chemical Crawler: Corrosive. Volatile Specimen, The Unstable: Fire. Spore Mother: Biological. Vat Chimera: Toxic. Anomaly, Static Mote: Electric.
- **Personalities (GDD 9.6).** GDD assigns none. Aggressive: Clockwork Crawler, Chemical Crawler, Regenerator, Ironback Beetle, Forgeguard Knight, Gear Lancer, Thornling. Defensive: Royal Bastion, Iron Sentinel. Cowardly: Mechanist, Rogue Inventor. Disciplined: Royal Footman, Royal Longbowman, Mercenary Captain. Territorial: Spore Mother, Ancient Guardian. Unstable: Volatile Specimen, Vat Chimera, Anomaly, The Unstable, Static Mote. Predatory: Hunting Hound, Highwayman.
- **Attack shapes.** Melee strike, ranged shot, charge, slam, detonation and shockwave. Each runs wind-up, strike and recovery behind a crimson telegraph in the shape of the attack. Ranged shots fly at 360 pixels per second and stop at obstacles. An enemy waits 0.4 seconds between two attacks.
- **Territory scaling.** Health and Damage move one tier step per territory, with 2.5 times per step past Extreme, as CLAUDE.md states. A Royal Footman has 35, 90 and 400 Health.
- **Speed steps.** A speed step past Extreme adds 20 per cent. A Swift Hunting Hound runs at 240 pixels per second, not 500.
- **Attack speed steps.** One step divides wind-up, recovery and the pause between attacks by 1.3.

### Signature behaviours (GDD 9.11)

- **Royal Footman.** In a squad led by a living Royal Bastion, footmen hold slots behind the Bastion until the player comes within 200 pixels of the Bastion.
- **Royal Longbowman.** Holds at 80 per cent of Range and backs away inside 45 per cent. With a living squad leader, archers start their wind-up only inside a 0.2 second window every 3.5 seconds, so shots arrive as a volley.
- **Royal Bastion.** A frontal projectile stops at the Bastion: no penetration and no ricochet past the shield. The Bastion takes the hit. The front covers 60 degrees each side of the facing. Shield carriers turn at 2.2 radians per second.
- **Clockwork Crawler.** Each hit slows the player by 15 per cent for 1.5 seconds. Stacks multiply down to 55 per cent speed.
- **Iron Sentinel.** Prefers Mechanists as wards. "Weak to Magnetic effects" means one damage step up from weapons with the Magnetic tag, with no stacking on a weakness to the damage type.
- **Mechanist.** Repairs the most damaged Mechanical ally within 280 pixels for 20 per cent of Health, every 4 seconds. Deploys 2 Clockwork Crawlers every 8 seconds, 6 per Mechanist per round. Summons cost no budget and respect the active limit.
- **Chemical Crawler.** Drops an acid patch every 60 pixels: radius 16, 2 seconds. The toxic pool on death: radius 55, 4 seconds. Pools tick every 0.5 seconds for half the owner's Damage.
- **Regenerator.** Heals 6 per cent of Health per second after 3 seconds without damage.
- **Volatile Specimen.** Detonates within 34 pixels after a 0.6 second fuse: radius 90. A specimen shot down bursts too. Enemy blasts deal three times their Damage to other enemies.
- **Hunting Hound.** Retreats for 1.6 seconds after each strike. Flanking comes from the Surround order below.
- **Ironback Beetle.** Charges from 300 pixels: 420 pixels at 360 pixels per second after a 0.7 second wind-up. Piercing hits on the front 120 degrees take the resistance step. Any hit on the rear 120 degrees takes the weakness step. A hit with no direction uses the line from the player.
- **Spore Mother.** Places a pod every 5 seconds, up to 260 pixels away. A pod bursts after 2.5 seconds into a cloud: radius 90, 5 seconds, player speed at 60 per cent. Pods are timed effects, not enemies.
- **Highwayman.** Dashes 230 pixels from 150 pixels away. Steals 5 gold per hit. The gold returns on death with no pickup. Gold income arrives in Milestone 5, so the run carries 0 gold until then.
- **Rogue Inventor.** Throws a mine onto the player's position every 6 seconds, up to 340 pixels: 1 second to arm, trigger radius 42, blast radius 80, 12 seconds of life. "Carries a random experimental weapon" sets the damage type of the Inventor's shots and mines to the type of one Experimental weapon from GDD 7.17, rolled at spawn.
- **Mercenary Captain.** Allies within 220 pixels gain Damage up, Low. A squad with a Captain takes the Surround order.
- **Anomaly.** Teleports every 4 seconds to a point 150 to 260 pixels from the player. Resists one damage type at a time, shown as a coloured dot, and moves to the next type every 4 seconds. The cycle skips Electric, the Anomaly's weakness.
- **Ancient Guardian.** Sleeps until the player comes within 260 pixels or a hit lands. A shockwave ring grows at 420 pixels per second to 900 pixels and hits each body once. Pillars and the crucible block the ring.
- **The Unstable.** Within 300 pixels of the player, every Auxiliary component stops working. Cross-weapon synergies stay active. "Shorter status durations" means half duration.
- **Forgeguard Knight.** Slam radius 70. Burning ground lasts 2.5 seconds.
- **Gear Lancer.** Charges from 340 pixels: 560 pixels at 520 pixels per second after a 0.8 second wind-up. A wall or obstacle hit stalls the Lancer for 2 seconds.
- **Static Mote.** Death burst radius 60. Bursts queue for the next step, so a cluster chains without recursion.
- **Thornling.** The seed sprouts after 4 seconds. A Thornling dying while Burning or from a Fire hit leaves no seed. A burning pool or a Fire explosion destroys a seed. A sprouted Thornling leaves no seed, so a round always ends. A round stays open while a seed waits.
- **Vat Chimera.** The modifier arrives at 50 per cent Health, once.

### Elites and champions (GDD 9.12, 9.13)

- **Elites.** One Health step, meters twice the size, one modifier in Territory 1 and two after. Regenerating: 2 per cent of Health per second, stopped by Burning and Corroded. Shielded: frontal projectiles deal no damage while the elite moves. The shield drops during the elite's own attack and while stopped. Electric shots, Arcing shots, blasts, beams and melee pass. Volatile: radius 80, 1.5 times Damage. Splitting: two copies at 40 per cent Health and 75 per cent size, with no modifiers. Copies never split. Magnetised: projectiles from Metallic weapons within 160 pixels turn toward the elite at 4 radians per second. Vampiric: 10 per cent of Health per hit. Resistant and Hardened roll their type and status at spawn. Hardened rolls from the nine effects outside Overheated and Short-circuited.
- **Champions.** Two Health steps, meters three times the size, two modifiers, one trait. Warlord: 4 escorts at 66 and 33 per cent Health, the cheapest enemy of the champion's faction. Purifier: every 6 seconds. Phase-Shifter: 15 per cent of Health lost inside 1 second moves the champion 320 pixels from the player. Reactive Plating: every 5 seconds the champion resists the type taken most since the last check. Overclocked: below 50 per cent Health. Juggernaut ignores Stunned, Short-circuited, knockback and every slow. Frozen still stops a Juggernaut.
- **Champion drops.** A rare component or a large Research Point reward waits for Milestones 5 and 6.

### AI (GDD 9.4, 9.5, 9.15)

- **Scoring.** Each enemy scores six actions 4 times per second. `src/sim/ai.ts` holds the base scores. Personality weights: Minimal 0.2, Low 0.6, Medium 1, High 1.5. Use ability has no column in GDD 9.15 and weighs Medium for every personality. Unstable rolls each weight anew at each decision.
- **Territorial and Predatory.** Territorial attack weight is High while the player stands within 420 pixels of the enemy's spawn point, and Low outside. Predatory attack weight is High while the player holds under 50 per cent Health, and Medium above.
- **Squads.** Each spawn group forms one squad. Trickle singles act alone. The leader is the member with the highest rank: named leader, then Support, then Tank. Orders: Protect for squads with guards and fragile allies, Surround for squads with a named leader or a majority of Skirmishers and Swarmers, Pin for the rest. An order multiplies the matching action by 1.6.
- **Leader death.** The squad keeps the order. Shield lines and volleys end. Regroup scores 1.5 times higher.
- **Flanking.** Eight slots sit 230 pixels around the player. A flanker takes the free slot furthest behind the player's facing, then attacks from there.
- **Attack tokens.** 6, 8 and 10 enemies attack at once in Territories 1, 2 and 3. Detonations, shockwaves and abilities need no token. Enemies without a token circle the player 90 pixels out.
- **Update frequency.** Within 700 pixels: every step. Within 1,100 pixels: every 4 steps. Beyond: every 15 steps. Movement runs every step on the last heading.
- **Avoidance.** Enemies slide round obstacles inside a 26 pixel margin. Hazard avoidance waits for the arena hazards of Milestone 7.
- **GDD 9.5, territorial control.** The Territorial personality covers the behaviour. No separate group rule exists.
- **GDD 9.7, adaptation.** Reactive Plating is the only form.

### Encounter director (GDD 4.4 to 4.12, 5.6)

- **Faction mix.** Rounds 1 to 4 field the home faction alone. The guest faction joins at Round 5 with 25 per cent. Incursions take 10 per cent in Territory 3. Each faction slot holds a purse. Each purchase comes from the slot with the most budget left.
- **Signature enemies.** A signature enemy appears in the home kingdom only.
- **Threat gating.** Minimal and Low enemies appear from Round 1, Medium from Round 2, High from Round 5, Extreme from Round 8.
- **Trickle.** Singles at even intervals up to 80 per cent of the round. Minimal enemies come in packs of 3. The cost cap is Medium in Territory 1 and High after.
- **Groups.** 2 to 8 groups between 15 and 70 per cent of the round. A group holds a core of one enemy type and, from Round 2, one or two other types from the same faction. Group size grows by 2 per territory.
- **Assault.** The remainder enters at 85 per cent of the round, as one group per purchase batch.
- **Elites.** From Round 5. Each enemy bought rolls 5 per cent in Territory 1 and 10 per cent after, when the budget covers three times the cost. "Low odds" and "Medium odds" use the Critical Chance tiers.
- **Champions.** From Round 15. Each group rolls 5 per cent. One champion per round at most. Champions come from enemies of Low threat or above.
- **Formations.** From Round 5, a group with a Tank or Support enters as a line with guards in front. From Round 12, groups of four or more enter as a pincer 40 per cent of the time, and the assault enters as a pincer. From Round 15 the assault enters from three sides.
- **Active limit.** PC: 120, 200 and 300 for Rounds 1 to 6, 7 to 14 and 15 to 21, from GDD 15.11. Mobile: 40, 60 and 100. GDD 15.11 gives no number for the mobile Low tier, so 40. At the limit the director holds the queue. An entry still held when the round timer ends stays unspent.
- **Warning marker.** A group of 5 or more shows a marker 1.5 seconds before entering, with an arrow at the screen edge.
- **Fixed curve.** `planRound` takes the round, the kingdom and the seed. Player power never enters.

### Tests and limits

- **Headless campaign.** The bot uses War Hammer, Mortar and Tesla Rod and takes no damage. No shop exists yet, so the test multiplies weapon Damage by 1, 2.5 and 6.25 per territory, the same factor as one enemy Health step. Milestone 5 replaces the stand-in with real purchases.
- **Budgets checked each step.** Active enemies, player projectiles, area effects, constructs, enemy hazards, enemy shots and attack tokens. Mean step time must stay under 2 milliseconds. The run measures about 0.08 milliseconds.
- **New pools.** Enemy hazards: 160 on PC, 80 on mobile. Enemy shots: 200 and 100. At the hazard limit the oldest effect of the same kind goes.
- **CLAUDE.md, folder layout.** New files: `src/data/eliteModifiers.ts`, `champions.ts` and `kingdoms.ts` from the layout, `src/sim/ai.ts` from the layout, and `src/sim/world/hazards.ts` and `traits.ts`.

## Milestone 5

GDD 3.3, 6.1 to 6.6, 7.8 to 7.10, 7.22, 7.23, 14.1 to 14.3 and 15.8. You asked for no questions on this milestone, so every entry below is a choice of mine. Each one is a small change to reverse.

### Research gates before Milestone 6

- **GDD 6.4, 6.6, 7.22, 7.23.** The research web arrives in Milestone 6. Until then every weapon, component and recipe is open, Extraordinary items appear in shops, and Grades III and IV need no research node. `lockedBy` in `src/sim/economy.ts` is the one gate. Shop cards and recipes already show "Needs <node>" when the gate names a node.
- **Research Notebook.** Research Points arrive in Milestone 6, so the component stays inactive until then. Specimen Jar works now.

### Preparation flow (GDD 3.3, 15.8)

- **Order of screens.** Combat, round results, preparation, combat. The first round starts straight after the starting weapon choice.
- **Tabs.** Workbench and Shop. The Shop tab stays visible between ordinary rounds, since a paid visit starts there. The Research tab arrives in Milestone 6.
- **Install and remove.** Pick a component in the tray, then pick a highlighted socket. Pick a filled socket with nothing selected to move the part back to the tray. This works with a mouse and with touch. Dragging on PC waits for Milestone 11.
- **GDD 7.9 and 7.12, removed components.** GDD 7.12 says a removed component becomes scrap. GDD 15.8 gives a tray holding every owned component. A removed or replaced component returns to the tray. Dismantling is a separate choice in the tray.
- **Tray.** Three lists: components sorted by slot type, the weapon reserve and the recipes. Six entries per page.
- **Controller.** Enter starts the round. Controller navigation of the preparation screen waits for Milestone 10.

### Shops (GDD 6.1 to 6.6)

- **Visits.** A paid visit costs 20 gold and opens one shop for the current preparation phase. Coming back to an open shop in the same phase costs nothing. A second shop costs another 20 gold. The stock rotates out when the phase ends.
- **Free visits.** Rounds 4, 7, 11, 14 and 18 grant one free visit, with no boss yet. The free visit opens one shop of the player's choice, shows 6 items, uses the odds of the next territory and holds one Rare or better item. Other doors cost 20 gold.
- **Specialist slot.** One Rare or better item from the next territory's odds. A reroll leaves the slot alone. A new item arrives at the first visit after a purchase.
- **Stock by shop.** Weapons follow GDD 6.6 by family. Payload components go to the Alchemist and Auxiliary components to the Royal Inventor. Structure and Mechanism components go to the Alchemist with a Fire, Toxic, Corrosive, Volatile, Explosive, Spray, Biological, Organic, Fungal or Parasite tag, to the Royal Inventor with an Electric, Conductive, Magnetic, Cold, Thermal, Anomalous, Precise or Experimental tag, and to the Blacksmith otherwise. Each component has one shop.
- **Slot contents.** A slot rolls a quality, then holds a component 65 per cent of the time and a weapon otherwise. A shop with nothing at the rolled quality steps down one quality. One visit avoids showing the same item twice.
- **Component quality.** A component always appears at the quality GDD 7.18 lists.
- **Caps.** The Experimental and Extraordinary caps count per shop visit and survive rerolls.
- **Keeper lines.** GDD 15.8 asks for short lines with no text. `src/data/strings.ts` holds four lines per keeper: greeting, purchase, reroll and no coin.

### Weapons (GDD 7.8, 7.10, 7.17, 7.22)

- **Grades.** A weapon starts with no grade. Grades I to IV cost 25, 50, 90 and 140 gold with 2, 4, 6 and 8 Scrap, so three weapons cost 915 gold, as GDD 7.22 states.
- **One stat step.** A grade moves the weapon's base tier one step in the chosen stat: Damage, Attack Speed, Critical Chance, Range, Area or Status Build-up. A Crossbow at Damage High deals 20, then 35. Past Extreme each step multiplies by the ratio of the last two tiers: 1.75 for Damage. Critical Chance moves to the next tier value, then adds 15 points per step. Status Build-up multiplies the meter fill by 1.6 per step and shows only for weapons building a status.
- **Quality.** Each weapon appears at any quality. Common: nothing extra. Uncommon: one default component. Rare: one stat step and one default component. Experimental: one stat step and two default components. Extraordinary: two stat steps and two default components. Stat steps roll from Damage, Attack Speed and Range. Default components are Common parts fitting the family. They scrap for no materials and leave with the weapon.
- **Merging.** 50 gold. The weapon whose Merge button you press survives with its components and grade. The other copy goes, and its non-default components return to the tray. Each merge adds Damage up, Low. The first merge opens the Auxiliary slot.
- **Reserve.** A weapon bought with three slots full waits in the reserve. Any reserve weapon swaps into a slot.
- **Weapon dismantling.** Returns the scrap value of the weapon's quality, 1 to 5, in the material of its first matching tag. The last equipped weapon stays.

### Drops (GDD 14.1, 14.2)

- **Pickups.** Gold, materials and components fall where an enemy dies. A pickup inside Pickup Radius flies to the player at 520 pixels per second. Gold within 26 pixels of another gold pickup joins the pile. Everything left flies to the player when the round ends.
- **Limits.** 300 pickups on PC and 150 on mobile. At the limit a drop goes straight to the player.
- **Material type.** Each material drop picks one of the faction's types at random.
- **Component drops.** An elite's 5 per cent drop rolls its quality from the territory's stock odds. A champion's drop rolls Rare or Experimental. Extraordinary never drops, as GDD 7.23 states.
- **No double drops.** Split copies and sprouted Thornlings drop nothing.
- **Specimen Jar.** "Extra Specimens, Low" means a 10 per cent chance of one Specimen per kill with the weapon.
- **Mini-boss and boss rewards.** Gold, materials and reward rolls for bosses wait for Milestone 8.
- **HUD.** Gold shows top right in combat. Materials show in preparation only, as GDD 15.7 states.

### Balance changes

- **Regenerating elites.** 1 per cent of Health per second, down from 2. A Territory 3 elite beetle healed 50 Health per second and stalled a round.
- **Mechanist repair.** 12 per cent of Health per repair, down from 20. Two Mechanists out-healed the test bot on one Iron Sentinel.

### Tests

- **Headless campaign.** The Milestone 4 Damage stand-in is gone. The bot buys grades in Damage, visits one shop per phase when a free visit waits or gold reaches 80, buys a weapon for a free slot, then every affordable component, and fits components into free sockets. The bot hunts the weakest enemy within 500 pixels, so Mechanists fall before the Sentinel they mend.
- **Economy against GDD 14.3.** The run prints kills, gold and materials per territory. Seed 2026: 198, 662 and 883 kills against 255, 410 and 539. 204, 748 and 829 gold against 337, 544 and 753. 14, 83 and 109 materials against 40, 70 and 106. Territory 1 runs low with no mini-boss and no boss. Territories 2 and 3 run high on swarms of Minimal enemies. Milestone 12 tunes this.
- **CLAUDE.md, folder layout.** New files from the layout: `src/data/economy.ts`, `src/data/shop.ts`, `src/sim/economy.ts` and the `Preparation` scene. One file outside the layout: `src/sim/world/loot.ts`.

## Milestone 6

Every choice below is mine and easy to reverse. Each names its GDD section.

### Archive before Milestone 9 (GDD 8.10, 11.10)

- **Discovery.** Every node except the ten hidden nodes counts as discovered until Milestone 9 adds Archive Points and discovery costs. `STARTING_KNOWLEDGE` already lists the GDD 11.10 starting set for that milestone.
- **One Archive per session.** The title flow keeps one Archive in memory, so mastery, hints and hidden nodes carry from run to run. A reload clears it until Milestone 9 adds saves.

### Research Points (GDD 8.5)

- **No pickup.** Research Points go straight to the notebook on a kill. Research Yield and the Research Notebook multiply the reward. Fractions stay in the total. The bar and the HUD round down.
- **Champions (GDD 9.13).** "A rare component or a large Research Point reward": an even roll per champion. The Research Point side pays 25, the component side pays the normal 1.

### Costs (GDD 8.11)

- **Materials by discipline.** Chemistry pays Reagents, Physics and Mathematics pay Crystals, Engineering pays Scrap, Biology pays Specimens. A cross node pays the ring amount once per linked discipline, so a Physics and Mathematics node costs 6 Crystals.
- **Efficient Research.** Point costs times 0.9, rounded up.

### Rules (GDD 8.10)

- **Grade gates.** An outer-ring node also opens Grade III, since an outer node sits past the middle ring.
- **Refunds.** 75 per cent of each removed node's payment, rounded down per node and per material. Captured nodes refund nothing. Mastery stays earned, and a node pays mastery once per run.
- **Captured research (GDD 5.8).** One capture waits after Round 7 and after Round 14. It offers centre and inner nodes from the beaten kingdom's disciplines whose requirements are met. Keldrath and Merovant offer Engineering, Myrathis offers Chemistry and Biology, Orthelyn offers Physics and Mathematics, Nymora offers Biology.
- **Shops.** Extraordinary components appear only on free milestone visits after their node. The specialist slot never rolls Extraordinary. Other locked items stay in stock and show the node's name.

### Node effects (GDD 8.12)

- **Numbers with no GDD value**, all in `RESEARCH_RULES`: Compound Interest 5 per cent of gold up to 25. Longer statuses one Medium step. Neurotoxins slow to 80 per cent speed. Gravity Studies pulls 14 pixels. Knockback into walls stuns at Medium build-up. Calculus of Motion leads by half the travel time. Chain falloff 0.85 per generation with Chain Kinetics. A small heal is 1 health. Burning spreads within 70 pixels. Granted builds run at Low.
- **Knockback.** Research knockback scales a weapon's own knockback. A weapon with no knockback gains none.
- **Fortune.** Raises drop odds by the same share.
- **Chaos Theory.** Covers critical, Evasion, drop and jam rolls.
- **Mutagenics.** After each round one Organic component gains a step in Damage, Attack Speed or Range, at most three steps per component, so Minimal reaches High.
- **Waiting effects.** Absolute Precision needs boss phases (Milestone 8). The Philosopher's Engine effect needs Archive saves (Milestone 9). Both nodes exist and can be found.
- **Tesla Capacitor.** The first discharge comes at a quarter of the interval, so a short test sees one. Lightning in a Bottle halves the interval.

### Hidden node hints (GDD 8.12)

- **Near misses.** Half the Steam Bursts. An elite standing in a Galvanic Surge. One of Living Arsenal and Tesla Rod. Chain generation 2. Below 20 per cent health at round end. Five criticals inside one second. A Spore Mother or The Unstable killed the other way. One discipline at Expert for The Philosopher's Engine.

### Research web (GDD 15.8)

- **Sector order.** Chemistry, Engineering, Biology, Physics, Mathematics around the circle. Each neighbouring pair shares two cross nodes, so 10 of 20 cross nodes sit on a shared border. The rest sit at the mean angle of their disciplines.
- **Rings.** Centre, inner, middle and outer rings inside each sector. Cross nodes on a band outside the rings. Hidden smudges on the outermost band.
- **Sector colours.** Chemistry green, Physics yellow, Mathematics violet, Engineering copper, Biology magenta. GDD 15.1 lists no discipline colours.
- **States.** Available nodes glow gold. Researched nodes fill with their discipline colours. Blocked nodes grey out. Captured choices carry a crimson ring. Labels show from zoom 0.85, and the picked node's label always shows.
- **Controls.** Drag pans, the wheel and a pinch zoom, and three buttons zoom for players with neither. A second press on a picked node researches it, or takes it as captured research when a capture waits.

### Tests

- **Campaign bot.** Researches the cheapest available node until points run out, and takes the first capture. Seed 2026 ends with 55 nodes. Research Points per round run 20 in Round 1, 109 in Round 8, 172 in Round 21.
- **Folder layout.** New files from the layout: `src/data/research.ts`, `src/sim/research.ts` and `src/sim/archive.ts`. One file outside the layout: `src/ui/researchWeb.ts`, a UI piece.

## Milestone 7

Every choice below is mine and easy to reverse. Each names its GDD section.

### Kingdom selection (GDD 5.1, 5.2, 5.7, 5.8)

- **When the kingdom is chosen.** The run picks each kingdom at its reveal, from the run seed. Round 1 reveals before combat. Rounds 8 and 15 reveal when you press Start after preparation, so preparation stays blind.
- **First campaign.** The Archive counts campaigns started. The first ever starts in Keldrath and shows the opening card. The count lives in memory until Milestone 9 adds saves.
- **Unrevealed rounds.** Debug tools and lookups for a territory not yet revealed fall back to the last kingdom known.

### Territory events (GDD 5.4, 5.6, 5.11)

- **Planning.** The event and its round are planned at the kingdom reveal.
- **Event rosters.** Royal Muster sends Forgeguard Knights and Royal Bastions in line formation. Containment Failure sends Vat Chimeras and Chemical Crawlers. Production Restart sends Clockwork Crawlers and Gear Lancers in a ring from every wall. Rift Storm sends Anomalies and Static Motes. Outlaw Ambush sends Highwaymen, Rogue Inventors and Mercenary Captains, with one Captain at the head of the first group. Event enemies skip the round gates, since the event names them.
- **Biological Bloom.** Keeps the Wilds mix. Fungal growth spreads every 3 seconds, and each new patch sprouts one Thornling outside the threat budget.
- **Military Invasion.** The invader is a random home faction of another kingdom, never the event kingdom's own home or guest faction. The invader takes 35 per cent of the budget, the guest and incursion shares together. Invaders from Medium-threat enemies up.
- **Containment Failure.** Enemies enter from the usual spawn points, not from the vats.
- **Gold.** The 25 per cent bonus comes at the end of the round, rounded, and shows on the results screen.

### Arenas (GDD 5.3, 5.9)

- **Changes stay on.** A change starts in its round and lasts to the end of the territory. Round 7 in Orthelyn has lightning, gravity wells, orrery arms and erased tiles together.
- **Boss parts.** The throne platform, the Abomination's vat, the belts carrying parts, the Spore Sovereign and the mini-boss actions in Round 4 wait for Milestone 8. Round 7 hazards that need no boss already run: falling ingots, spreading acid, erased tiles and fungal growth.
- **Shapes.** Every solid shape is a circle. Workbenches are low cover: they block movement and let projectiles pass. Thorn hedges are lines of circles with gaps at both ends and the middle.
- **Layout.** Keldrath: two channel lines with a crossing by the crucible. Myrathis: 12 vats on a ring, 8 puddles inside it, 4 workbenches. Merovant: two long belts pushing in opposite directions, 12 press tiles along the top and bottom walls, 4 machines. Orthelyn: the orrery, 6 rods, 200-pixel tiles. Nymora: 3 fountains, 4 short hedges, 4 thorn lines.

### Hazards (GDD 5.10)

- **Warning.** 1.5 seconds for every hazard, the boss telegraph length Milestone 8 uses. A slag wave warns for 3 seconds.
- **Damage.** On the enemy Damage row, shifted one step per territory. Damage over time deals the tier per second in half-second ticks: molten channel Medium, toxic puddle Low, acid pool Low, fungal growth Low, thorn contact Low. Bursts: slag wave Extreme, falling ingot High, stamping press Extreme, volatile vat High, lightning High with arcs at half, erased tile High. Hazard damage to the player uses the normal invulnerability window.
- **Resistance.** Champions take hazard damage one tier lower. Bosses join this rule in Milestone 8.
- **Timers.** Slag wave every 16 seconds on a random half. One ingot every 2.5 seconds near the player. Three presses every 4 seconds. Two lightning strikes every 3.5 seconds, one near the player. Acid every 4 seconds, spreading out from the centre. A healing bloom every 6 seconds for 8 seconds at 4 health per second. Fungal growth every 3 seconds, at most 24 patches.
- **Belts.** Push at 90 pixels per second. In Rounds 5 to 7 they reverse every 8 seconds.
- **Gravity wells.** Two wells, 260-pixel radius, pulling up to 110 pixels per second at the centre and bending Straight projectiles. Rift Storm moves them every 5 seconds.
- **Orrery arms.** Two arms of 6 circles, turning slowly. They block projectiles and push bodies.
- **Erased tiles.** One ring of tiles every 14 seconds, two rings at most, so the plaza keeps 2000 by 1200 pixels at the first stage and 1600 by 800 at the second. Enemies outside die. A player outside takes High damage and returns to the edge. Knockback past the edge kills an enemy.
- **Vines.** Slow to 60 per cent. They grow from 80 to 260 pixels deep over 40 seconds.
- **Volatile vats.** Projectiles, enemy shots, explosions and enemy blasts break vats. Melee swings do not. A vat blast reaches vats within 220 pixels one step later.
- **Acid.** Halves the player's Armour while inside and builds Corroded on enemies at 30 per cent of a meter per second.
- **Fungal growth.** Fire explosions, Fire enemy blasts and Burning enemies standing in a patch burn it away.
- **Thorn hedges.** Sprout over the warning, then block.
- **Hazard kills.** Count as kills with no weapon credit and drop normal loot.

### Story and transition (GDD 2.4, 5.8)

- **Transition order.** Steps 1 to 5 run through the results and preparation screens. The relic choice in step 3 waits for Milestone 8. Step 6 is the Transition scene: the map with the route so far, beaten kingdoms crossed out, a ring closing on the new kingdom, and its reveal card.
- **Map.** Kingdom positions on the map are mine. The GDD gives no geography.
- **Folder layout.** New files from the layout: `src/data/hazards.ts`, `src/data/events.ts`, `src/data/story.ts` and the `Transition` scene. Two files outside it: `src/sim/world/environment.ts` (arena changes and hazards) and `src/render/environment.ts` (their placeholders).

## Milestone 8

Every choice below is mine and easy to reverse. Each names its GDD section.

### Boss bodies (GDD 10.3 to 10.5)

- **Health.** The CLAUDE.md numbers: bosses 4000, 8000 and 14000. Mini-bosses 1200, 2400 and 4200. Escorts 70 per cent of a mini-boss.
- **Damage.** Bosses on the High row, mini-bosses on the Medium row, both shifted one step per territory. Heavy attacks deal 1.6 times the row value.
- **Body stats.** Weaknesses and resistances follow the GDD counters: the Iron Regent is weak to Corrosive and Cold, the Grand Automaton to Electric and Impact, the Spore Sovereign and the Thornback Matriarch to Fire, the Siege Spider to Electric. The Abomination and The Unmaking start with none.
- **Status meters.** Bosses use the Boss size, five times Normal. Mini-bosses and escorts use the Champion size. Bosses ignore knockback but not Stunned, since bosses resist through larger meters (GDD 9.14).
- **Entry.** Bosses and escorts enter 2 seconds into the round, the boss above the arena centre and the escort to one side. The Spore Sovereign takes the central fountain's place, so every weapon reaches it.
- **Attacks.** Every boss attack warns for 1.5 seconds, the same length as the hazard warnings. Attacks come every 3.2, 2.6 and 2 seconds by phase. Escorts attack 1.4 times slower.
- **Phases.** 70 and 30 per cent for bosses, 50 for mini-bosses. A 1.5-second transition takes no damage. Absolute Precision makes the first hit after each transition a critical hit.

### Boss mechanics (GDD 10.4)

- **Iron Regent.** The engineers are Mechanists. While one lives, the Regent sheds Corroded every 4 seconds. Glowing Plate opens six molten circles around the throne. Unbound drops Armour to 0, moves 1.5 times faster and brings 3 Forgeguard Knights.
- **Abomination.** Every 4 seconds it resists the type it took most since the last check. Overgrowth sends 3 Chemical Crawlers from the vats every 9 seconds. In Meltdown the core stays exposed for 3 seconds after each Mutagenic Spew: 1.5 times damage taken, Fire weak.
- **Grand Automaton.** The frontal shield turns slowly, like a Royal Bastion's. Two arm turrets ride on the body. Two belt motors stand at the belt ends. A destroyed motor stops its belt. Emergency protocol sends 6 Clockwork Crawlers every 8 seconds and repairs 0.3 per cent of health per second per living motor.
- **The Unmaking.** Displacement teleports to a plaza point at least 320 pixels from the player. The Null Field switches synergies and Auxiliary components off for 4 seconds when the ring catches the player. Gravity flips every 4 seconds in phase 2. In Probability two copies take no damage. Every 7 seconds the real body swaps places with a copy. Marked or a critical hit on the real body shows a gold ring for 4 seconds.
- **Spore Sovereign.** Spore Burst rings the boss with 6 Thornling seeds, which Fire burns. Full Bloom heals 0.02 per cent of health per second for each fungal patch.
- **Convergence.** Phase 3 of the Round 21 boss adds the signature attacks of the bosses beaten earlier to the rotation. Each keeps its original attack shape, cast from the final boss.

### Mini-bosses (GDD 10.5)

- **Forge Marshal.** One war banner at a time, with 10 per cent of the Marshal's health. Allies within 420 pixels deal 25 per cent more damage.
- **Mad Alchemist.** Flasks leave burning ground, acid or a toxic pool. Shatter Vat breaks the vat nearest the player, volatile or not, and two Chemical Crawlers climb out. Away from Myrathis the crawlers appear beside the Alchemist. The potion makes it 1.35 times faster, 1.25 times stronger and 1.2 times larger.
- **Siege Spider.** Lays 3 mines. Climbs the nearest wall for 6 seconds and bombards twice as often.
- **Tesla Warden.** Up to 3 pylons. Lightning chains from the Warden through each pylon. Overload strikes every rod in Orthelyn, or four circles around the player elsewhere.
- **Thornback Matriarch.** The hedge charge passes through solid shapes. The thorn shell turns every frontal hit but Fire, and rear hits count as weak.

### Rewards and round end (GDD 4.10, 5.5, 14.1, 14.2)

- **Round end.** When the boss falls, other enemies leave with no loot, unspent spawns are dropped and the round ends.
- **Rewards.** As written: boss 40 gold, 8 materials, 50 Research Points. Mini-boss 20 gold, 4 materials, 20 Research Points and a 25 per cent chance of a Rare component. Escort 4 materials and 20 Research Points. Parts drop nothing.
- **Absolute Precision.** "Without taking damage" means no damage taken between the mini-boss's entry and its death. Escorts do not count.

### Relics (GDD 5.12)

- **When.** After the Round 7 and Round 14 bosses, on the results screen before preparation. The final boss offers none until endless mode exists.
- **Steps.** "Up two steps" moves the base tier along its row. Fortune and Construct Strength have no number row, so each step adds 20 per cent.
- **Construct Strength.** Multiplies construct health and construct hit damage.
- **Mutagen Flask.** One of Max Health, Armour, Regeneration, Evasion, Move Speed, Pickup Radius, Critical Chance and Critical Damage gains a step for the round. The HUD names it.
- **Shard of the Unmaking.** A random tag the weapon lacks, for the round only. Synergies count it.
- **Gravity Anchor.** Enemies within 180 pixels move at 75 per cent speed.
- **Bloom Crown.** "Sometimes" means 4 per cent of kills. Each bloom lasts 6 seconds.
- **Royal Writ.** Takes 15 per cent off item prices rolled after the relic. Reroll and visit fees stay.
- **Typed damage.** Crucible Heart raises the Fire and Impact share of a weapon's damage, like the typed research nodes.

### Screens (GDD 10.6, 15.2, 15.7)

- **Telegraphs.** Boss crimson, escort crimson and dashed, borrowed attacks in the original boss's kingdom colour.
- **Bars.** The boss bar sits under the round with phase marks, the escort bar under it. Boss rounds zoom out to 85 per cent.
- **Victory.** A new scene after Round 21: the ending of the final kingdom, the route, the campaign statistics and the relics.
- **Folder layout.** New files from the layout: `src/data/bosses.ts`, `src/data/miniBosses.ts`, `src/data/relics.ts` and the `Victory` scene. Two files outside it: `src/sim/world/bosses.ts` (the boss controller) and `src/render/bosses.ts` (boss placeholders and telegraphs).
