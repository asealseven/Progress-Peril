# Progress & Peril: Game Design Document

Version 1.0, ready to build. Generated from the Word file "Progress & Peril GDD v1.0.docx".

This file is the source of truth for every rule, name and number in the game. CLAUDE.md explains how to build the game from this file and refers to sections by number. ART_PROMPTS.md lists every image to generate.

Conventions used throughout:

- Status lines mark each section as Confirmed (decided by the designer), Proposed (a working rule, open to tuning) or Open.
- Five relative tiers describe most stats: Minimal, Low, Medium, High, Extreme. CLAUDE.md turns tiers into starting numbers.
- Checkbox lists in Section 16 show what has been designed: a ticked box means drafted or decided.

## Contents

- 1. Project overview
  - 1.1 Game concept
  - 1.2 Core design pillars
  - 1.3 Inspirations
- 2. World and setting
  - 2.1 The Age of Invention
  - 2.2 The five kingdoms
  - 2.3 Kingdom lore
  - 2.4 Campaign narrative
- 3. Core gameplay loop
  - 3.1 Basic gameplay cycle
  - 3.2 Player control
  - 3.3 Preparation phase
  - 3.4 Controls
  - 3.5 Input support
  - 3.6 Player statistics
  - 3.7 Player health and damage
  - 3.8 Player death and revival
  - 3.9 Difficulty settings
  - 3.10 Accessibility options
  - 3.11 Tutorial and onboarding
  - 3.12 Pause and game speed
- 4. Round and combat system
  - 4.1 Terminology
  - 4.2 Round progression
  - 4.3 Round duration
  - 4.4 Enemy spawning
  - 4.5 Combat difficulty
  - 4.6 Combat pacing
  - 4.7 Encounter director
  - 4.8 Enemy population limits
  - 4.9 Round completion
  - 4.10 Round structure decisions
  - 4.11 Threat costs and spawn budgets
  - 4.12 Difficulty scaling
- 5. Territory and campaign structure
  - 5.1 Campaign structure
  - 5.2 Territory visibility
  - 5.3 Territory arenas
  - 5.4 Territory events
  - 5.5 Campaign rewards
  - 5.6 Territory roster
  - 5.7 Territory selection
  - 5.8 Territory transition
  - 5.9 Arena designs
  - 5.10 Environmental hazards
  - 5.11 Territory events
  - 5.12 Kingdom Relics
- 6. Shop system
  - 6.1 Shop availability
  - 6.2 Shop types
  - 6.3 Shop inventory
  - 6.4 Shop purchases
  - 6.5 Shop rules
  - 6.6 Prices and stock
- 7. Weapon system
  - 7.1 Arsenal
  - 7.2 Weapon architecture
  - 7.3 Weapon families
  - 7.4 Component system
  - 7.5 Tag categories
  - 7.6 Weapon synergies
  - 7.7 Weapon quality
  - 7.8 Weapon upgrades
  - 7.9 Component replacement
  - 7.10 Weapon merging
  - 7.11 Example weapons
  - 7.12 Component slot rules
  - 7.13 Damage types
  - 7.14 Weapon statistics
  - 7.15 Targeting rules
  - 7.16 Projectile behaviour
  - 7.17 Initial weapon catalogue
  - 7.18 Component catalogue
  - 7.19 Synergy database
  - 7.20 Chain reactions
  - 7.21 Weapon performance limits
  - 7.22 Weapon upgrade costs
  - 7.23 Component recipes and merging
- 8. Scientific research system
  - 8.1 Research philosophy
  - 8.2 Research disciplines
  - 8.3 Research interface
  - 8.4 Research resources
  - 8.5 Enemy research rewards
  - 8.6 Cross-disciplinary discoveries
  - 8.7 Hidden discoveries
  - 8.8 Research mastery
  - 8.9 Research refunds
  - 8.10 Research rules
  - 8.11 Research costs
  - 8.12 Research tree
  - 8.13 Mastery thresholds
- 9. Enemy system
  - 9.1 Enemy families
  - 9.2 Enemy roles
  - 9.3 Enemy architecture
  - 9.4 Tactical AI
  - 9.5 Group intelligence
  - 9.6 Enemy personality
  - 9.7 Enemy adaptation
  - 9.8 Initial enemy roster
  - 9.9 Enemy status effects
  - 9.10 Enemy statistics
  - 9.11 Enemy properties, weaknesses and resistances
  - 9.12 Elite modifiers
  - 9.13 Champion modifiers
  - 9.14 Status-effect rules
  - 9.15 AI implementation
  - 9.16 Signature enemies
- 10. Boss system
  - 10.1 Boss concepts
  - 10.2 Boss design principles
  - 10.3 Boss roster
  - 10.4 Boss phase specifications
  - 10.5 Mini-boss roster
  - 10.6 Escorts and Convergence
- 11. Permanent progression
  - 11.1 The Grand Archive
  - 11.2 Permanent currencies
  - 11.3 AP reward proposals
  - 11.4 Permanent unlock categories
  - 11.5 Permanent upgrade limits
  - 11.6 Hybrid unlock philosophy
  - 11.7 Challenge rewards
  - 11.8 Respec system
  - 11.9 Progression philosophy
  - 11.10 Grand Archive catalogue
  - 11.11 Permanent upgrade costs
  - 11.12 Specialisations
  - 11.13 Achievement rewards
  - 11.14 Archive pacing
- 12. Character system
  - 12.1 Initial character concepts
  - 12.2 Character design principles
- 13. Endgame
  - 13.1 Campaign completion
  - 13.2 Endless mode
  - 13.3 Endless rotation
- 14. Reward system
  - 14.1 Gold drops
  - 14.2 Material and component drops
  - 14.3 Run economy estimate
- 15. Visual and user interface direction
  - 15.1 Visual identity
  - 15.2 Camera
  - 15.3 Animation
  - 15.4 Visual effects
  - 15.5 Screen flow
  - 15.6 Main menu: the Grand Archive hub
  - 15.7 Combat HUD
  - 15.8 Preparation screen
  - 15.9 Other screens
  - 15.10 Audio, music and sound effects
  - 15.11 Performance targets
  - 15.12 Platform requirements
  - 15.13 Save system
  - 15.14 Technical architecture
  - 15.15 Development stack
  - 15.16 Screen mockups
  - 15.17 Build pack for Claude Code
- 16. Areas not yet designed
  - 16.1 Core gameplay
  - 16.2 Weapon system
  - 16.3 Research system
  - 16.4 Enemies and bosses
  - 16.5 Campaign and world
  - 16.6 Economy
  - 16.7 Characters
  - 16.8 Presentation and technical design
- 17. Decisions requiring final confirmation
- 18. Development priorities
- 19. Overall design vision

**Tagline:** Every discovery has a consequence.

**Document status:** Ready to build  
**Version:** 1.0  
**Genre:** Top-down arena roguelike  
**Setting:** The Age of Invention  
**Platform:** PC and phone, in the browser  
**Purpose:** Personal project, built with Claude Code

## 1. PROJECT OVERVIEW

### 1.1 Game concept

Progress & Peril is a wave-based, top-down arena roguelike set in a medieval fantasy world experiencing a scientific revolution.

Players take control of characters who use scientific discoveries, engineering, chemistry, biology and experimental technology to create increasingly powerful weapons.

The world consists of five competing kingdoms, each specialising in different areas of science and technology.

Players fight increasingly dangerous enemies, collect resources, conduct research, build weapons and discover new technologies.

The central gameplay concept is:

**Weapons provide the foundation. Components change how they work. Research changes what they can become. Synergies make the whole arsenal extraordinary.**

The game should offer balanced gameplay while allowing particularly clever weapon and research combinations to scale to extraordinary levels.

### 1.2 Core design pillars

1.  **Scientific invention:** Research and experimentation are central to progression.

2.  **Weapon customisation:** Players construct and evolve weapons using interchangeable components.

3.  **Emergent combinations:** Different technologies and weapon components interact to create unexpected effects.

4.  **Tactical enemy encounters:** Enemies behave intelligently and work together.

5.  **Progression and discovery:** Every campaign contributes towards permanent knowledge.

6.  **Replayability:** Random territories, encounters, discoveries and character choices make campaigns different.

7.  **Escalating difficulty:** Combat becomes increasingly intense as the player progresses.

### 1.3 Inspirations

Initial inspirations include:

- Brotato – arena-based roguelike combat and build progression.

- Balatro – interesting combinations and interactions between systems.

Card-based gameplay has been shelved. The emphasis is on weapons, scientific research and component synergies.

## 2. WORLD AND SETTING

### 2.1 The Age of Invention

The game takes place in a medieval world undergoing a scientific revolution.

Traditional kingdoms are beginning to understand and exploit scientific principles that could transform warfare, medicine, engineering and industry.

Knights, castles and medieval armies coexist with experimental machines, chemical weapons, electricity, advanced metallurgy and biological inventions.

The aesthetic should combine medieval fantasy with early scientific experimentation.

Technology should feel inventive rather than futuristic. Guns should be relatively uncommon, with greater emphasis on mechanical launchers, cannons, crossbows, siege equipment and experimental weapons.

### 2.2 The five kingdoms

#### 1. The Crownlands of Keldrath

**Specialisation:** Metallurgy and engineering.

Focus areas:

- Metalworking.

- Armour and weapons.

- Durability.

- Penetration.

- Heavy machinery.

- Forging.

#### 2. The Principalities of Myrathis

**Specialisation:** Chemistry and experimental biology.

Focus areas:

- Explosives.

- Poison.

- Acids.

- Chemical reactions.

- Biological experiments.

- Mutations.

#### 3. The Free Cities of Merovant

**Specialisation:** Mechanics and automation.

Focus areas:

- Gears and mechanisms.

- Automated weapons.

- Turrets.

- Mechanical companions.

- Machinery.

- Robotics.

#### 4. The Republic of Orthelyn

**Specialisation:** Physics and mathematics.

Focus areas:

- Electricity.

- Magnetism.

- Heat.

- Gravity.

- Probability.

- Advanced calculations.

#### 5. The Commonwealth of Nymora

**Specialisation:** Biology and natural sciences.

Focus areas:

- Medicine.

- Regeneration.

- Genetics.

- Plants and fungi.

- Parasites.

- Organic technology.

**Status:** Names confirmed in version 0.7: Keldrath, Myrathis, Merovant, Orthelyn and Nymora. Lore appears in Section 2.3. Visual identities belong to Phase 5.

### 2.3 Kingdom lore

**Status: Names confirmed in version 0.7. Lore proposed.**

| Kingdom | Government | Lore                                                                                                                                                     | Home faction   |
|-------------|----------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| Keldrath    | Crownlands     | A crowned kingdom built on iron mines and foundries. The Iron Regent rules from the Great Foundry and arms every knight in forged plate.                     | Kingdom Armies     |
| Myrathis    | Principalities | A league of rival princes, each funding an alchemical court. Their laboratories trade in explosives, poisons and living experiments, and escapes are common. | Failed Experiments |
| Merovant    | Free Cities    | Self-governing trade cities run by guilds of clockmakers. Their assembly yards build machines faster than any council votes on them.                         | Clockwork Legions  |
| Orthelyn    | Republic       | A republic of scholars elected by examination. Their attempt to calculate the structure of reality tore a crack in the sky, and The Unmaking came through.   | Unknown            |
| Nymora      | Commonwealth   | A commonwealth of physicians, gardeners and breeders. Their gardens heal the sick and grow living tools, and their forests defend themselves.                | Wilds              |

### 2.4 Campaign narrative

**Status: Confirmed in version 0.7: light framing. Text proposed.** Story arrives through short illustrated text cards. No voiced dialogue. Every card is skippable.

**Premise.** The five kingdoms race to master the new sciences, and every kingdom hoards new findings. The Grand Archive, a guild of independent inventors, sends members to prove their inventions against each kingdom's champions and bring the knowledge home.

**Opening card, first campaign only:** Every kingdom guards its secrets behind steel, glass or gears. The Archive sends you with three weapons and an empty notebook. Return with knowledge, or not at all.

**Territory reveal cards:**

| Kingdom | Reveal text                                                                                     |
|-------------|-----------------------------------------------------------------------------------------------------|
| Keldrath    | The forges of Keldrath never cool. Keldrath's knights march in plate still warm from the anvil.     |
| Myrathis    | Smoke rises from a hundred laboratories in Myrathis. Something in the vats is awake.                |
| Merovant    | The Free Cities of Merovant run on gears and contracts. Tonight, the machines are working overtime. |
| Orthelyn    | The Republic of Orthelyn measured the sky and found a crack. Something on the other side noticed.   |
| Nymora      | The gardens of Nymora heal anyone who asks. The forests decide who leaves.                          |

**Endings.** The ending depends on the final boss, so each kingdom has one:

| Final kingdom | Ending text                                                                                                                                                   |
|-------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Keldrath          | The Iron Regent kneels, and the Great Foundry falls silent for the first time in a century. Keldrath's smiths now forge for the Archive.                          |
| Myrathis          | The Abomination dissolves back into the vat. The princes of Myrathis seal their laboratories, and the Archive inherits their notes, with a warning in the margin. |
| Merovant          | The Grand Automaton winds down mid-step. The Free Cities vote to open their assembly yards, and the machines start building bridges instead of armies.            |
| Orthelyn          | The Unmaking folds into a single point and vanishes. Orthelyn's scholars begin repairing the crack in the sky, and the Archive keeps one shard for study.         |
| Nymora            | The Spore Sovereign withers, and the forests of Nymora go quiet. The Commonwealth's healers return to their gardens, and the Archive plants the first seed.       |

- Endless mode shows a short card at each new loop: the kingdoms recover, and the Archive sends the inventor onward.

## 3. CORE GAMEPLAY LOOP

### 3.1 Basic gameplay cycle

The main gameplay loop is:

1.  Select a character.

2.  Begin a campaign in a randomly selected territory.

3.  Enter an arena and survive a round.

4.  Collect rewards.

5.  Enter the preparation phase.

6.  Research technologies and modify weapons.

7.  Optionally visit a shop.

8.  Start the next round.

9.  Defeat milestone mini-bosses and major bosses.

10. Discover the next territory.

11. Complete the campaign or continue into endless mode.

### 3.2 Player control

The following decisions have been established:

- The player manually controls movement.

- Combat largely plays itself during a round.

- The player remains within one arena during a territory.

- Preparation takes place between every round.

- The player starts the next round by pressing Start.

**Confirmed in version 0.3:**

- Attacks are automatic, with a manual focus input.

- No active special abilities.

- Dodging uses an Evasion stat only.

- Targeting is fully automatic.

Details appear in Section 3.4.

### 3.3 Preparation phase

Players can access preparation after every round.

Activities include:

- Scientific research.

- Weapon modification.

- Component replacement.

- Equipment management.

- Inventory management.

- Shop visits.

- Crafting and dismantling.

Preparation is untimed.

The player starts the next round whenever ready. No countdown runs.

### 3.4 Controls

**Status: Confirmed in version 0.3.** The target platforms are PC and mobile.

#### Attack control

**Decision: automatic attacks with a manual focus.**

- All three weapons attack automatically whenever a target enters range.

- The player holds a focus input to steer all weapons toward one direction or enemy. Releasing the input returns weapons to automatic targeting.

- Focus input: hold a mouse button on PC, the right stick on controller, a second touch on mobile.

- Constructs, traps and companions ignore focus.

- Focus stays optional. One-handed mobile players complete every encounter without focus.

#### Aiming and targeting

**Decision: fully automatic targeting.**

- Each weapon follows the targeting rule from its type and components (Section 7.15).

- Manual focus overrides targeting rules while held.

#### Special abilities

**Decision: no active abilities.**

- Every effect is passive and comes from weapons, components, research and character traits.

- Characters show identity through passive mechanics (Section 12.2).

#### Dodging

**Decision: Evasion stat only.**

- Evasion gives a chance to avoid a hit. No dodge input exists.

- Evasion caps at Medium (Section 3.6), so random outcomes never decide survival alone.

### 3.5 Input support

**Status: Proposed.** Layouts follow the control decisions in Section 3.4.

| Action          | Keyboard and mouse        | Controller              | Touch                                          |
|---------------------|-------------------------------|-----------------------------|----------------------------------------------------|
| Move                | WASD or arrow keys            | Left stick                  | Floating virtual joystick, left or right side      |
| Manual focus        | Hold a mouse button and point | Right stick                 | Hold a second touch on the free side of the screen |
| Pause               | Esc                           | Start                       | Pause button in the top corner                     |
| Start next round    | Enter                         | A on the preparation screen | Start button on the preparation screen             |
| Fast-forward toggle | Tab                           | Select                      | Speed button beside pause                          |

**Mobile requirements:**

- Horizontal screen orientation.

- Automatic save at the start of every preparation phase, so a phone call or app switch never costs a 25 to 35 minute run.

- Automatic pause when the app moves to the background.

- Touch targets meet platform minimum sizes. Preparation screens use drag and drop with a tap alternative.

- Lower limits for active enemies and effects on mobile (Sections 4.11 and 7.21).

### 3.6 Player statistics

**Status: Proposed.** All stats in this document use a five-step relative scale: Minimal, Low, Medium, High, Extreme. Prototype testing sets the numbers behind each step.

| Stat           | Effect                                                                    | Base | Cap | Main sources                                       |
|--------------------|-------------------------------------------------------------------------------|----------|---------|--------------------------------------------------------|
| Max Health         | Total health pool                                                             | Medium   | Extreme | Structures, Biology research, Archive upgrades         |
| Armour             | Reduces damage from each hit, with diminishing returns                        | Low      | High    | Metallic and Armoured components, Engineering research |
| Regeneration       | Restores health over time during combat                                       | Minimal  | Medium  | Biology research, Organic components                   |
| Evasion            | Chance to avoid a hit. The only dodge mechanic (Section 3.4)                  | Minimal  | Medium  | Light frames, Mathematics research                     |
| Adaptation         | Resistance to one damage type, built by taking hits of the type (Section 3.7) | Minimal  | Low     | Biology research                                       |
| Move Speed         | Movement speed                                                                | Medium   | High    | Light frames, Physics research                         |
| Pickup Radius      | Distance for collecting drops                                                 | Low      | High    | Magnetic components, Physics research                  |
| Damage             | Global damage modifier                                                        | Medium   | Extreme | Most components and research                           |
| Attack Speed       | Global attack rate modifier                                                   | Medium   | High    | Mechanisms, Engineering research                       |
| Critical Chance    | Chance for a critical hit                                                     | Low      | High    | Precise components, Mathematics research               |
| Critical Damage    | Extra damage on a critical hit                                                | Medium   | Extreme | Precise components, Marked status                      |
| Range              | Weapon reach and projectile distance                                          | Medium   | High    | Barrels, sights, Physics research                      |
| Area               | Size of explosions, sprays, auras and sweeps                                  | Medium   | High    | Volatile components, Chemistry research                |
| Status Potency     | Strength and duration of status effects, plus extra meter fill                | Low      | High    | Payloads, Chemistry and Biology research               |
| Construct Strength | Health and damage of turrets, traps and companions                            | Low      | Extreme | Mechanical components, Engineering research            |
| Research Yield     | Research Points gained                                                        | Medium   | High    | Research Notebook, the Scholar                         |
| Material Yield     | Materials gained from enemies                                                 | Medium   | High    | Specimen Jar, Archive upgrades                         |
| Fortune            | Odds of rare drops and probability effects                                    | Low      | High    | Mathematics research                                   |

- Stats apply to all three weapons unless a component limits the effect to one weapon.

- Caps stop any single stat from breaking encounters. Synergies and chain reactions provide the extraordinary scaling named in Section 1.1, not raw stats.

- Characters shift base values by one step at most, in line with Section 12.2.

### 3.7 Player health and damage

**Status: Proposed. Healing between rounds confirmed in version 0.3.**

- Damage sources: enemy contact, enemy projectiles, enemy area attacks and environmental hazards. Player weapons never damage the player.

- Order of resolution: Evasion check, then Armour reduction, then health loss.

- Armour reduces each hit by a percentage with diminishing returns, so stacking Armour never grants immunity.

- After a hit, the player gains a short invulnerability window. Contact damage from the same enemy waits for the window to end.

- Health shows as a bar plus a number. Low health triggers a screen-edge warning, with an accessibility toggle.

**Damage adaptation.** Confirmed in version 0.5. Damage adaptation replaces research affinity from Section 8.5.

- Each hit the player takes adds a Minimal step of resistance to the damage type of the hit.

- Resistance caps at Low per damage type. Immunology, Antitoxins and Adaptive Armour raise the gain or the cap (Section 8.12).

- The HUD shows one small icon per adapted damage type, filling toward the cap.

**Decision: adaptation resets at the start of each territory.** Confirmed in version 0.6.

- Each new kingdom brings new damage types, so adaptation keeps responding instead of becoming a flat bonus.

- Endless mode resets adaptation with each new territory.

**Decision: full heal after every round.**

- Health refills at the end of each round, before preparation begins.

- Regeneration and kill-based healing keep their value inside rounds, where boss rounds and late rounds run longest.

### 3.8 Player death and revival

**Status: Confirmed in version 0.3.**

- On death, the campaign ends and the results screen shows campaign statistics.

- Archive Points earned in completed rounds stay with the player.

- Hidden technologies found during the run enter the Grand Archive.

- Challenge progress counts.

**Decision: one revival per campaign, bought with Archive Points.**

- A permanent Grand Archive purchase grants one revival per campaign (Sections 11.4 and 11.5).

- The player revives at partial health with a short invulnerability window.

- The revival resets at the start of each campaign. Endless mode receives no extra revival.

**Decided in version 0.4:**

- **Cost:** 250 Archive Points, provisional until the Phase 3 economy pass. An early player earns about 50 Archive Points from a run ending in Territory 2 and about 165 from a full win, so the revival arrives after roughly four to six runs.

- **Challenge Tiers:** the revival works in Assist mode, Normal and Challenge Tiers 1 and 2. Tiers 3 to 5 disable the revival, which keeps top-tier campaigns as hard as Section 11.9 intends.

### 3.9 Difficulty settings

**Status: Confirmed in version 0.3.**

| Lever               | Effect                                            |
|-------------------------|-------------------------------------------------------|
| Enemy health            | Raises or lowers enemy Health by one step             |
| Enemy damage            | Raises or lowers enemy Damage by one step             |
| Threat budget           | Changes the spawn budget per round (Section 4.11)     |
| Elite and champion odds | Changes how often elites and champions appear         |
| Enemy tactics           | Raises the share of coordinated assaults and flanking |
| Rewards                 | Higher difficulty grants more Archive Points          |

**Decision: Assist mode plus Challenge Tiers.**

- One base difficulty: Normal.

- Challenge Tiers: winning a campaign opens the next tier. Each tier adds one lever from the table above, up to five tiers. Higher tiers grant more Archive Points.

- Proposed tier order: enemy damage, threat budget, elite and champion odds, enemy health, enemy tactics.

- Assist mode: lower enemy damage and slower game speed. Players switch Assist mode on or off between campaigns. Assist runs earn reduced Archive Points.

- Fixed difficulty curves (Section 4.12) make Challenge Tiers the route to harder runs for strong players.

**Decided in version 0.4: Archive Point rates**

| Mode         | Archive Point rate | Notes                                |
|------------------|------------------------|------------------------------------------|
| Assist           | ×0.5                   | Assist wins do not open Challenge Tier 1 |
| Normal           | ×1.0                   | Base rates from Section 11.3             |
| Challenge Tier 1 | ×1.2                   |                                          |
| Challenge Tier 2 | ×1.4                   |                                          |
| Challenge Tier 3 | ×1.6                   | Revival disabled from this tier          |
| Challenge Tier 4 | ×1.8                   |                                          |
| Challenge Tier 5 | ×2.0                   |                                          |

- Rates apply to Archive Points from rounds, bosses and campaign completion.

- Archive Points from discoveries and challenges stay fixed in every mode, so experimentation pays the same for every player.

### 3.10 Accessibility options

**Status: Proposed.**

- Status effects and damage types use icons and shapes as well as colour. Three colour-blind palettes.

- Enemy projectiles carry a high-contrast outline with adjustable brightness.

- Toggles for screen shake, flashes, damage numbers and low-health warnings.

- A visual effects density slider, which also helps performance on mobile.

- Text size options and readable fonts for the research web and tooltips.

- Remappable controls on PC and controller. Movable and resizable touch controls on mobile.

- Left-handed and right-handed mobile layouts.

- Hold or toggle for manual focus and every other held input.

- Slower game speed through Assist mode (Section 3.9).

- Audio cues for elite arrivals, boss attacks and low health, with subtitles for spoken lines.

### 3.11 Tutorial and onboarding

**Status: Proposed.** The first campaign opens with a short guided trial called the Apprentice Trial. Each step teaches one system, then a normal campaign begins.

| Step      | Teaches                     | Content                                                              |
|---------------|---------------------------------|--------------------------------------------------------------------------|
| Round 1       | Movement and automatic combat   | One weapon, Swarmers only                                                |
| Preparation 1 | Components                      | Install one free component and see the stat change                       |
| Round 2       | Status effects and manual focus | Enemies weak to the installed payload, plus one priority target to focus |
| Preparation 2 | Research                        | Spend Research Points on one centre node of the research web             |
| Round 3       | Synergies                       | A second weapon arrives and triggers a cross-weapon synergy              |
| Preparation 3 | Shop                            | One free visit with fixed stock                                          |

- Progressive reveal: the outer research web, merging and Auxiliary slots appear once relevant.

- A Codex in the pause menu records every tag, synergy, enemy and status reaction seen so far.

- Tooltips show each tag with a consistent colour and icon, so players learn the synergy language through play.

- Players skip the trial after the first campaign.

### 3.12 Pause and game speed

**Status: Confirmed in version 0.3.**

- Pause works at any time during combat on every platform.

- The pause screen shows the full build: weapons, components, active synergies and research.

- Mobile pauses automatically when the app loses focus.

**Decision: pause plus a fast-forward toggle.**

- A toggle speeds up combat, aimed at clearing early rounds quickly.

- Round timings in Section 4.3 assume normal speed.

- Slower speeds come only through Assist mode (Section 3.9).

**Decided in version 0.4:**

- **Speed:** one setting at 1.5 times normal speed. A 30 second round takes 20 seconds. A single setting keeps telegraphs readable and holds mobile performance steady.

- **Boss rounds:** fast-forward switches off for mini-boss and boss rounds (Rounds 4, 7, 11, 14, 18 and 21) and returns for the next normal round. Evasion is the only defence besides movement, so boss telegraphs need full reaction time.

## 4. ROUND AND COMBAT SYSTEM

### 4.1 Terminology

The following distinction is proposed:

- **Campaign:** The complete run from beginning to completion.

- **Territory:** A kingdom or region containing one arena for seven rounds.

- **Round:** A complete combat encounter followed by preparation.

- **Enemy wave:** A group or batch of enemies spawned within a round.

- **Preparation phase:** The period between rounds.

This distinction is important because rounds contain multiple enemy waves.

### 4.2 Round progression

The campaign uses three territories of seven rounds each.

| Round | Encounter                                                 |
|-----------|---------------------------------------------------------------|
| 1 to 3    | Increasingly difficult encounters                             |
| 4         | Mini-boss                                                     |
| 5 to 6    | Advanced encounters                                           |
| 7         | Major boss with a mini-boss escort                            |
| 8 to 10   | New territory encounters                                      |
| 11        | Mini-boss                                                     |
| 12 to 13  | Advanced encounters                                           |
| 14        | Major boss with a mini-boss escort                            |
| 15 to 17  | New territory encounters                                      |
| 18        | Mini-boss                                                     |
| 19 to 20  | Advanced encounters                                           |
| 21        | Final boss: the third territory boss, with a mini-boss escort |

Each territory ends with a major boss fought alongside a mini-boss escort.

Confirmed in version 0.3 (Section 4.10).

### 4.3 Round duration

The target successful campaign length is 25–35 minutes.

Rounds gradually become longer as the player progresses.

Timing proposal for the 21-round campaign:

| Rounds | Target combat duration |
|------------|----------------------------|
| 1 to 7     | 30 to 45 seconds           |
| 8 to 14    | 40 to 60 seconds           |
| 15 to 21   | 50 to 75 seconds           |

These durations are provisional and need testing.

The total campaign duration should include:

- Combat.

- Preparation.

- Boss encounters.

- Territory transitions.

### 4.4 Enemy spawning

**Confirmed preference: Hybrid spawning.**

Enemies arrive through a mixture of:

- Continuous spawning.

- Short gaps between groups.

- Coordinated assaults.

- Larger enemy formations.

- Elite reinforcements.

- Special encounters.

An encounter director controls spawning.

It considers:

- Current round.

- Territory.

- Available enemy types.

- Enemy population.

- Previous encounters.

- Boss timing.

### 4.5 Combat difficulty

**Confirmed preference: Both quantity and strength increase.**

Three scaling systems:

1.  Quantity – more enemies and larger groups.

2.  Strength – stronger enemies, elites and improved abilities.

3.  Complexity – increasingly dangerous enemy combinations and tactics.

Combat should become more demanding without relying on enormous enemy health pools.

### 4.6 Combat pacing

**Confirmed preference: Balanced pressure.**

- Short gaps between enemy groups.

- Longer gaps before major assaults.

- Occasional environmental events.

- Increasingly large coordinated attacks.

- No excessively long periods of inactivity.

### 4.7 Encounter director

The encounter director controls:

- Spawn frequency.

- Enemy selection.

- Enemy formations.

- Group composition.

- Elite appearances.

- Boss timing.

- Active enemy limits.

- Threat budgets.

The director should challenge powerful builds without directly invalidating them.

### 4.8 Enemy population limits

Proposed technical systems:

- Total spawn budget.

- Maximum active enemy population.

- Threat budget.

- Distance-based AI update frequency.

- Spatial partitioning.

- Object pooling.

Exact limits remain to be determined through performance testing.

Relative limits per platform appear in Sections 4.11 and 7.21.

### 4.9 Round completion

A round does not end simply because its target duration expires.

The proposed process:

1.  Scheduled enemy spawning finishes.

2.  Remaining enemies must be defeated.

3.  Rewards are calculated and collected.

4.  Results are displayed.

5.  Preparation begins.

### 4.10 Round structure decisions

**Status: Confirmed in version 0.3.** Sections 4.1 to 4.3, 5.1, 5.3 and 13.1 follow these decisions.

- **Campaign length:** 21 rounds across three territories of seven rounds.

- **Mini-bosses:** the fourth round of each territory: Rounds 4, 11 and 18.

- **Territory bosses:** the seventh round of each territory: Rounds 7, 14 and 21. Each major boss fights alongside a mini-boss escort.

- **Final boss:** the third territory boss at Round 21 serves as the final boss. The finale varies with the third territory.

- **Preparation:** untimed. The player presses Start to begin the next round. No countdown runs.

**Time check.** The Section 4.3 timings give 14 to 21 minutes of combat across 21 rounds. Preparation at about 25 seconds per phase adds about 9 minutes. The total of 23 to 30 minutes leaves about 5 minutes for boss fights and transitions inside the 25 to 35 minute target. Untimed preparation means slow planners run past the target.

**Decided in version 0.4:**

- **Finale phase:** the Round 21 boss gains a final phase called Convergence. The boss adds one signature attack from each territory boss already defeated in the run, so the finale reflects the route taken. Each territory boss design needs one signature attack (Phase 4).

- **Finale rewards:** the final boss grants 40 Archive Points instead of 20 (Section 11.3). Players continuing into endless mode receive a free milestone shop with guaranteed Extraordinary stock.

- **Escort rewards:** escort mini-bosses grant bonus materials and mini-boss Research Points only. No Archive Points, no rare component roll and no extra free shop. The boss reward covers the round, which keeps the economy from doubling on boss rounds.

### 4.11 Threat costs and spawn budgets

**Status: Proposed.** Every enemy has a threat cost. The encounter director spends a threat budget each round. Budgets use multiples of the Round 1 budget.

| Threat tier | Budget units | Enemies                                                                                                                                              |
|-----------------|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| Minimal         | 1                | Clockwork Crawler, Static Mote, Thornling                                                                                                                |
| Low             | 2                | Royal Footman, Chemical Crawler, Hunting Hound, Highwayman                                                                                               |
| Medium          | 4                | Royal Longbowman, Royal Bastion, Mechanist, Regenerator, Volatile Specimen, Ironback Beetle, Rogue Inventor, Forgeguard Knight, Vat Chimera, Gear Lancer |
| High            | 8                | Iron Sentinel, Spore Mother, Mercenary Captain, Anomaly, The Unstable                                                                                    |
| Extreme         | 16               | Ancient Guardian                                                                                                                                         |

- Elites cost three times the base cost.

- Champions cost six times the base cost.

| Rounds | Budget (× Round 1)                  | Active enemy limit (PC / mobile) | Notes                            |
|------------|-----------------------------------------|--------------------------------------|--------------------------------------|
| 1 to 3     | 1 to 2                                  | Medium / Low                         | One faction, simple groups           |
| 4          | 2, plus mini-boss                       | Medium / Low                         | Escort groups only                   |
| 5 to 6     | 2.5 to 3                                | Medium / Low                         | First formations, first elites       |
| 7          | 2, plus boss and mini-boss escort       | High / Medium                        | Boss phases add scripted spawns      |
| 8 to 10    | 3.5 to 5                                | High / Medium                        | New territory roster, two factions   |
| 11         | 3, plus mini-boss                       | High / Medium                        | Mini-boss with elite escort          |
| 12 to 13   | 5.5 to 6.5                              | High / Medium                        | Mixed factions, flanking             |
| 14         | 3, plus boss and mini-boss escort       | High / Medium                        | Boss phases add scripted spawns      |
| 15 to 17   | 7 to 8.5                                | Extreme / High                       | Three factions, coordinated assaults |
| 18         | 4, plus mini-boss                       | Extreme / High                       | Mini-boss with elite escort          |
| 19 to 20   | 9 to 10                                 | Extreme / High                       | Champions, defensive networks        |
| 21         | 5, plus final boss and mini-boss escort | Extreme / High                       | Final boss phases                    |

- The director splits each round budget three ways: a steady trickle (about a third), group spawns (about half) and one closing assault (the remainder).

- When the active limit is full, the director holds spending until enemies die. Unspent budget never carries over to the next round.

- Spawn points sit outside the camera view, with a warning marker before large groups enter.

### 4.12 Difficulty scaling

**Status: Proposed. Director response confirmed in version 0.3.** Difficulty rises along the three axes from Section 4.5.

| Rounds             | Quantity          | Strength                                                                                          | Complexity                                   |
|------------------------|-----------------------|-------------------------------------------------------------------------------------------------------|--------------------------------------------------|
| Territory 1 (1 to 7)   | Budget ×1 to ×3       | Normal enemies. Elites from Round 5 at Low odds                                                       | One faction, then two. Basic formations, leaders |
| Territory 2 (8 to 14)  | Budget ×3.5 to ×6.5   | Enemy Health and Damage up one step. Elites at Medium odds                                            | Mixed factions, flanking, territory events       |
| Territory 3 (15 to 21) | Budget ×7 to ×10      | Enemy Health and Damage up two steps. Champions from Round 15 at Low odds. Elites carry two modifiers | Coordinated assaults, defensive networks         |
| Endless                | Budget ×10 and upward | Champions common. Elites carry three modifiers                                                        | All behaviours, overlapping events               |

**Decision: fixed curve.**

- The director ignores player power. Every run follows the same budget curve from Section 4.11.

- Run variety comes from territory order, faction mix and territory events.

- Challenge Tiers (Section 3.9) give strong players harder curves.

## 5. TERRITORY AND CAMPAIGN STRUCTURE

### 5.1 Campaign structure

**Target successful run:** 25–35 minutes.

The standard campaign contains:

- Three territories.

- Seven rounds per territory.

- Three mini-boss encounters.

- Three major boss encounters, each with a mini-boss escort.

- The third territory boss serves as the final boss at Round 21.

The first territory is randomly selected.

After defeating its boss, the next territory is randomly selected from the remaining kingdoms.

No territory repeats within the standard campaign.

### 5.2 Territory visibility

**Confirmed: Complete mystery.**

The player does not know which territory comes next.

The next territory is revealed only after the current territory boss has been defeated.

This encourages flexible builds and makes territory transitions exciting.

### 5.3 Territory arenas

The player remains in one arena throughout a seven-round territory.

The environment may change between rounds through:

- Environmental hazards.

- Weather or atmospheric effects.

- Destruction.

- Faction invasions.

- Biological growth.

- Mechanical activity.

After defeating the major boss, the player transitions to the next territory.

### 5.4 Territory events

Proposed events:

**Military Invasion**

- Another kingdom sends reinforcements.

- Mixed faction encounters.

**Containment Failure**

- Experimental creatures escape.

- Unusual biological and chemical enemies.

**Production Restart**

- Mechanical factories activate.

- Automated enemies begin spawning.

**Biological Bloom**

- Fungal growth spreads.

- New environmental hazards appear.

**Outlaw Ambush**

- Outlaws attack using traps and improvised weapons.

These events are proposed and require further balancing.

Section 5.11 assigns events to kingdoms and sets frequency.

### 5.5 Campaign rewards

Mini-bosses:

- Bonus materials.

- Chance of rare components.

- Free shop visit.

Major bosses:

- Unique territory reward.

- Free shop visit.

- Territory transition.

- New research opportunities.

Escort mini-bosses on boss rounds grant bonus materials and Research Points only (Section 4.10).

Kingdom Relics (Section 5.12) form the unique territory reward. Captured research (Section 5.8) provides the new research opportunity.

### 5.6 Territory roster

**Status: Proposed. Boss assignments and the Orthelyn boss confirmed in version 0.7.**

| Kingdom | Disciplines                    | Home faction   | Guest faction  | Signature enemy | Mini-boss       | Boss        |
|-------------|------------------------------------|--------------------|--------------------|---------------------|---------------------|-----------------|
| Keldrath    | Metallurgy and engineering         | Kingdom Armies     | Outlaws            | Forgeguard Knight   | Forge Marshal       | Iron Regent     |
| Myrathis    | Chemistry and experimental biology | Failed Experiments | Outlaws            | Vat Chimera         | Mad Alchemist       | Abomination     |
| Merovant    | Mechanics and automation           | Clockwork Legions  | Kingdom Armies     | Gear Lancer         | Siege Spider        | Grand Automaton |
| Orthelyn    | Physics and mathematics            | Unknown            | Clockwork Legions  | Static Mote         | Tesla Warden        | The Unmaking    |
| Nymora      | Biology and natural sciences       | Wilds              | Failed Experiments | Thornling           | Thornback Matriarch | Spore Sovereign |

**Faction mix per round:**

- Home faction: about 65 per cent of the threat budget. Guest faction: about 25 per cent.

- The last 10 per cent goes to Unknown incursions in Territory 3 and endless mode. Orthelyn uses Outlaws instead, since Unknown is the home faction there. Before Territory 3, the 10 per cent goes to the home faction.

- Territory events (Section 5.11) replace the mix for one round.

### 5.7 Territory selection

**Status: Proposed.**

- All five kingdoms are eligible in every campaign. Each campaign visits three.

- The first territory is random, with equal odds. The first campaign ever starts in Keldrath, where the Apprentice Trial runs (Section 3.11), because Kingdom Armies teach the basics clearly.

- Later territories come at random from unvisited kingdoms. No kingdom repeats within a campaign.

- Any kingdom serves as the final territory. The third kingdom's boss is the final boss (Section 4.10).

### 5.8 Territory transition

**Status: Proposed. Reveal timing confirmed in version 0.8.**

- Step 1. The boss falls. Remaining enemies flee and the round ends.

- Step 2. Rewards: Archive Points, boss gold and materials.

- Step 3. Relic choice: one of three Kingdom Relics from the beaten kingdom (Section 5.12).

- Step 4. Captured research: one free centre or inner node from the beaten kingdom's disciplines, if already discovered in the Grand Archive. Keldrath and Merovant give Engineering. Myrathis gives Chemistry or Biology. Orthelyn gives Physics or Mathematics. Nymora gives Biology.

- Step 5. Full heal, free milestone shop visit and preparation at the Archive's travelling workshop, a neutral screen with no hints about the next kingdom.

- Step 6. The player presses Start. The map of the five kingdoms appears and reveals the next kingdom with a story card (Section 2.4).

- Step 7. The player dismisses the card and the next round begins in the new arena.

**Decision: the next kingdom is revealed after preparation.** Preparation stays blind, so builds need to handle any kingdom. The Perfect Information node (Section 8.12) still previews shops, never the next kingdom.

### 5.9 Arena designs

**Status: Proposed.** Each kingdom has one arena. A central landmark changes the arena across the seven rounds. Hazards appear in Section 5.10.

#### Keldrath: the Great Foundry

A square foundry floor around a central crucible. Iron pillars give cover against ranged enemies.

| Rounds | Arena change                                                                                 |
|------------|--------------------------------------------------------------------------------------------------|
| 1 to 2     | Cold floor. Pillars block projectiles.                                                           |
| 3          | Molten channels open in lines across the floor.                                                  |
| 4          | Mini-boss round. Channels stay open.                                                             |
| 5 to 6     | The crucible tips and pours a slag wave across half the arena, with a warning.                   |
| 7          | The Iron Regent's throne platform rises in the centre. Cranes drop iron ingots during the fight. |

#### Myrathis: the Grand Laboratory

A round laboratory ringed by glass vats, with workbenches as low cover.

| Rounds | Arena change                                                                                    |
|------------|-----------------------------------------------------------------------------------------------------|
| 1 to 2     | Vats intact.                                                                                        |
| 3          | Vats leak. Toxic puddles appear near the edge.                                                      |
| 4          | Mini-boss round. The Mad Alchemist shatters vats as an attack.                                      |
| 5 to 6     | Volatile vats explode when hit by any attack, from enemies or the player, and join chain reactions. |
| 7          | The Abomination bursts from the central vat. Acid pools spread from the centre.                     |

#### Merovant: the Assembly Yards

A long factory floor crossed by conveyor belts, with stamping presses along the walls.

| Rounds | Arena change                                                                                                       |
|------------|------------------------------------------------------------------------------------------------------------------------|
| 1 to 2     | Belts idle.                                                                                                            |
| 3          | Belts start and push anyone standing on them.                                                                          |
| 4          | Mini-boss round. The Siege Spider climbs the walls.                                                                    |
| 5 to 6     | Presses stamp marked tiles. Belts reverse direction at intervals.                                                      |
| 7          | The Grand Automaton assembles on the central line. Belts carry spare parts to the boss until the player destroys them. |

#### Orthelyn: the Observatory Plaza

A round plaza around a giant orrery, open to the sky.

| Rounds | Arena change                                                       |
|------------|------------------------------------------------------------------------|
| 1 to 2     | Lightning rods idle. The plaza is fully open.                          |
| 3          | Lightning rods strike marked circles.                                  |
| 4          | Mini-boss round. The Tesla Warden powers the rods.                     |
| 5 to 6     | Gravity wells open. Orrery arms sweep the plaza and block projectiles. |
| 7          | The Unmaking erases plaza tiles, shrinking the arena in stages.        |

#### Nymora: the Overgrown Arboretum

A ruined greenhouse garden with hedges and fountains.

| Rounds | Arena change                                                                        |
|------------|-----------------------------------------------------------------------------------------|
| 1 to 2     | Garden paths clear.                                                                     |
| 3          | Vines spread from the edges and slow movement.                                          |
| 4          | Mini-boss round. The Thornback Matriarch charges through hedges.                        |
| 5 to 6     | Thorn hedges grow and split the arena into lanes. Healing blooms open.                  |
| 7          | The Spore Sovereign roots in the central fountain. Fungal growth spreads unless burned. |

### 5.10 Environmental hazards

**Status: Hazards hitting players and enemies confirmed in version 0.7. Catalogue proposed.**

- Hazards hit players and enemies alike. Luring enemies into hazards is a core tactic.

- Hazard damage carries a damage type and builds damage adaptation (Section 3.7).

- Every hazard warns before dealing damage, for at least the length of a boss telegraph.

- Hazard damage scales with territory, like enemy Damage.

- Champions and bosses resist hazard damage by one step, so luring helps without trivialising them.

| Hazard       | Kingdom | Damage type | Effect                                                                 | Warning                    |
|------------------|-------------|-----------------|----------------------------------------------------------------------------|--------------------------------|
| Molten channel   | Keldrath    | Fire            | Damage over time while inside                                              | Glow brightens before opening  |
| Slag wave        | Keldrath    | Fire            | Heavy damage across half the arena                                         | Crucible tilts first           |
| Falling ingot    | Keldrath    | Impact          | Burst damage in a small circle                                             | Shadow on the floor            |
| Toxic puddle     | Myrathis    | Toxic           | Damage over time while inside                                              | Green pool                     |
| Volatile vat     | Myrathis    | Fire            | Explodes when hit. Joins chain reactions                                   | Vat bubbles near breaking      |
| Acid pool        | Myrathis    | Corrosive       | Damage over time. Lowers Armour                                            | Yellow pool                    |
| Conveyor belt    | Merovant    | None            | Pushes anyone standing on the belt                                         | Moving arrows                  |
| Stamping press   | Merovant    | Impact          | Heavy burst damage on one tile                                             | Tile flashes                   |
| Lightning strike | Orthelyn    | Electric        | Burst damage, arcs to nearby targets                                       | Marked circle crackles         |
| Gravity well     | Orthelyn    | None            | Pulls everything nearby, projectiles included                              | Distortion ring                |
| Erased tile      | Orthelyn    | None            | Enemies pushed off die. Players take damage and return to the nearest tile | Tile flickers before vanishing |
| Vine patch       | Nymora      | None            | Slows movement                                                             | Creeping green edge            |
| Thorn hedge      | Nymora      | Slashing        | Blocks movement and Straight projectiles. Contact damage                   | Hedge sprouts over a second    |
| Healing bloom    | Nymora      | None            | Heals anyone inside, enemies included                                      | Glowing flower                 |
| Fungal growth    | Nymora      | Biological      | Damage over time. Fire burns patches away                                  | Spreading spores               |

### 5.11 Territory events

**Status: Proposed.**

- Exactly one event per territory.

- The event starts with Round 2, 3, 5 or 6 of the territory, chosen at random, and lasts one round. Mini-boss and boss rounds never host events.

- Event odds: the kingdom's signature event 60 per cent, Military Invasion 20 per cent, Outlaw Ambush 20 per cent.

- Event rounds pay 25 per cent extra gold.

| Event           | Kingdom | Effect                                                                                                  |
|---------------------|-------------|-------------------------------------------------------------------------------------------------------------|
| Royal Muster        | Keldrath    | Lines of Forgeguard Knights march across the arena in formation behind Bastion shields.                     |
| Containment Failure | Myrathis    | Vats release Vat Chimeras and Chemical Crawlers.                                                            |
| Production Restart  | Merovant    | Factory doors open. Clockwork Crawlers and Gear Lancers pour in from every wall.                            |
| Rift Storm          | Orthelyn    | Rifts open across the plaza. Anomalies and Static Motes come through. Gravity wells move every few seconds. |
| Biological Bloom    | Nymora      | Fungal growth spreads across the arena. Thornlings sprout from every patch.                                 |
| Military Invasion   | Any         | Another kingdom sends reinforcements: a random home faction joins for the round.                            |
| Outlaw Ambush       | Any         | Outlaws attack with traps and improvised weapons, led by a Mercenary Captain.                               |

### 5.12 Kingdom Relics

**Status: Confirmed in version 0.7 as the unique territory reward. Relics proposed.**

- After each territory boss, the player picks one of the beaten kingdom's three relics.

- Relics last for the rest of the run, including endless mode. Relics take no slots.

- Repeat visits in endless mode offer only relics not yet taken. When none remain, the reward becomes a choice of three Rare or better components.

| Relic             | Kingdom | Effect                                                   |
|-----------------------|-------------|--------------------------------------------------------------|
| Regent's Crown        | Keldrath    | Armour up two steps                                          |
| Crucible Heart        | Keldrath    | Fire and Impact damage up, Medium                            |
| Royal Writ            | Keldrath    | Shop prices down 15 per cent for the rest of the run         |
| Mutagen Flask         | Myrathis    | Each round, one random stat gains a step for the round       |
| Abomination Gland     | Myrathis    | Damage adaptation cap up one step                            |
| Catalyst Stone        | Myrathis    | Status reaction damage up, High                              |
| Automaton Core        | Merovant    | Construct Strength up two steps                              |
| Gearwork Heart        | Merovant    | Attack Speed up, Medium                                      |
| Assembly Blueprints   | Merovant    | Workshop recipes cost half gold                              |
| Shard of the Unmaking | Orthelyn    | Each round, every weapon gains one random extra tag          |
| Probability Lens      | Orthelyn    | Fortune up two steps. Critical Chance up, Low                |
| Gravity Anchor        | Orthelyn    | Pickup Radius up, Extreme. Enemies near the player slow down |
| Sovereign Spore       | Nymora      | Infected spreads to two extra enemies on death               |
| Heartwood Seed        | Nymora      | Regeneration up two steps                                    |
| Bloom Crown           | Nymora      | Kills sometimes drop healing blooms                          |

## 6. SHOP SYSTEM

### 6.1 Shop availability

The player receives a free shop visit:

- After every mini-boss.

- After every major boss.

The player can also pay gold to visit a shop between ordinary rounds.

Shops are unavailable during combat.

### 6.2 Shop types

**Blacksmith**

- Conventional weapons.

- Weapon frames.

- Metal components.

- Mechanical mechanisms.

**Alchemist**

- Chemical components.

- Reagents.

- Explosive materials.

- Biological components.

**Royal Inventor**

- Advanced mechanisms.

- Experimental technology.

- Specialist equipment.

- Rare inventions.

### 6.3 Shop inventory

Two inventory systems:

- General rotating stock.

- Persistent specialist shop inventory.

Locked items may be displayed to show future goals.

Free milestone shops may offer better selection or specialist stock than paid visits.

### 6.4 Shop purchases

Research requirements must be fulfilled before purchasing advanced items.

The proposed sequence is:

1.  Permanent Grand Archive discovery.

2.  Current-run research unlock.

3.  Shop or crafting availability.

4.  Gold and material purchase.

**Confirmed in version 0.5:**

- Paid visits cost 20 gold (Section 6.5).

- Five items per paid visit, six per free visit.

- Rerolls start at 5 gold and rise by 5 per reroll in a visit.

- Every visit allows up to 100 purchases. Experimental items cap at 2 per visit, Extraordinary items at 1.

- Each shop keeps an independent inventory.

### 6.5 Shop rules

**Status: Purchase limits and separate inventories confirmed in version 0.5. Free visit access and price growth confirmed in version 0.6. Prices proposed.**

- Each shop (Blacksmith, Alchemist, Royal Inventor) keeps an independent inventory. Rerolls and purchases in one shop never change another.

- A paid visit costs 20 gold and opens one shop.

- Paid visits show 5 items. Free milestone visits show 6, with at least one Rare or better.

- Rerolls cost 5 gold, rising by 5 with each reroll in the same visit. Free rerolls from the Grand Archive apply first.

- Every visit, free or paid, allows up to 100 purchases while gold lasts. Rerolls restock every slot.

- High-ranking caps per visit: 2 Experimental items and 1 Extraordinary item. One rich visit never buys a whole Extraordinary build.

- Each shop holds one persistent specialist slot, kept across visits until bought (Section 6.3).

- Items the run has not researched yet show as locked, with the name of the opening node.

**Decision: free milestone visits open one shop of the player's choice.**

- Each free visit stays a real choice. Perfect Information (Section 8.12) previews all three shops before the choice.

**Decision: shop prices rise 20 per cent per territory.**

- Territory 1 uses base prices (Section 6.6). Territory 2 prices are 120 per cent of base. Territory 3 prices are 140 per cent.

- Endless mode adds a further 20 per cent with each new territory.

- Price growth covers weapons and components in shops. Visit fees, rerolls, workshop recipes, merges and weapon grades stay fixed.

- Gold choices stay tight as income grows.

### 6.6 Prices and stock

**Status: Proposed.** Prices below are Territory 1 base prices in gold. Section 6.5 sets growth by territory.

| Quality   | Component | Weapon |
|---------------|---------------|------------|
| Common        | 25            | 40         |
| Uncommon      | 45            | 70         |
| Rare          | 75            | 110        |
| Experimental  | 120           | 160        |
| Extraordinary | 180           | 220        |

Stock odds per slot, in per cent:

| Visit   | Common | Uncommon | Rare | Experimental | Extraordinary |
|-------------|------------|--------------|----------|------------------|-------------------|
| Territory 1 | 60         | 30           | 9        | 1                | 0                 |
| Territory 2 | 40         | 35           | 20       | 4                | 1                 |
| Territory 3 | 25         | 35           | 28       | 9                | 3                 |

- Free milestone visits use the odds of the next territory, plus one guaranteed Rare or better slot. Endless mode uses Territory 3 odds plus the free-visit bonus.

- Extraordinary items appear only after the matching outer node (Section 8.12).

| Shop       | Stock                                                                                                     |
|----------------|---------------------------------------------------------------------------------------------------------------|
| Blacksmith     | Melee, Ranged and Siege weapons. Structure and Mechanism components with Metallic, Heavy, Light or Blade tags |
| Alchemist      | Alchemical weapons. Payload components. Other components with Chemistry or Biology tags                       |
| Royal Inventor | Mechanical and Experimental weapons. Auxiliary components. Other components with Physics or Mathematics tags  |

## 7. WEAPON SYSTEM

### 7.1 Arsenal

**Confirmed: Three weapons per player.**

Each weapon has three standard component slots, plus a fourth Auxiliary slot opened through upgrades or merging.

Slot rules appear in Section 7.12.

There are no mandatory primary/support roles.

Players can use any combination of weapons.

### 7.2 Weapon architecture

A weapon consists of:

1.  Structure – frame, chassis or blade.

2.  Mechanism – delivery or operating mechanism.

3.  Payload – bolts, chemicals, explosives or other ammunition.

4.  Auxiliary – optional additional functionality.

### 7.3 Weapon families

Six working categories:

- Melee.

- Ranged.

- Siege.

- Mechanical.

- Alchemical.

- Experimental.

Categories can overlap.

### 7.4 Component system

Components modify:

- Damage.

- Attack speed.

- Range.

- Projectile behaviour.

- Critical chance.

- Status effects.

- Area of effect.

- Targeting.

- Special interactions.

Components carry tags that enable synergies.

### 7.5 Tag categories

**Intrinsic tags**

- Fundamental weapon characteristics.

**Component tags**

- Added by installed components.

**Temporary tags**

- Granted by buffs and temporary effects.

Research can specify which tag category is required.

### 7.6 Weapon synergies

Three types:

**Internal synergies**

- Interactions between components on one weapon.

**Cross-weapon synergies**

- Interactions between different equipped weapons.

**Research-created synergies**

- Technologies that enable new interactions.

### 7.7 Weapon quality

Proposed qualities:

- Common.

- Uncommon.

- Rare.

- Experimental.

- Extraordinary.

Rarity should not automatically determine overall power.

### 7.8 Weapon upgrades

Purchased upgrades are the main improvement method.

Research unlocks access to them.

Upgrade categories:

- Performance – damage.

- Efficiency – attack speed.

- Specialisation – critical chance, targeting and other attributes.

Grades I–IV have been proposed.

Exact costs, maximum upgrades and scaling remain to be confirmed.

Costs appear in Section 7.22.

### 7.9 Component replacement

When a component is replaced, the old component can be dismantled into materials.

Proposed scrap values:

| Quality   | Scrap return |
|---------------|------------------|
| Common        | 1                |
| Uncommon      | 2                |
| Rare          | 3                |
| Experimental  | 4                |
| Extraordinary | 5                |

The return should represent approximately 40–50% of the original material investment.

Section 7.23 sets recipe costs to match these returns.

### 7.10 Weapon merging

Optional merging system:

- Combine two copies of a weapon at a workshop.

- Improve base statistics.

- Potentially gain additional component slots at certain milestones.

- Choose which weapon survives.

- Retain the surviving weapon’s components.

- Scrap the other weapon.

Merging is not required to unlock higher-tier research.

### 7.11 Example weapons

**Electromagnetic Repeater**

- Physics and Engineering.

- Fast penetrating projectiles.

- Magnetic acceleration.

- Potential ricochet interactions.

**Alchemical Chain-Reactor**

- Chemistry and Mathematics.

- Volatile compounds.

- Reaction catalysts.

- Chain explosions.

**Living Arsenal**

- Biology and Engineering.

- Autonomous movement.

- Toxic secretion.

- Adaptive biological components.

### 7.12 Component slot rules

**Status: Proposed. Auxiliary slot confirmed in version 0.3.**

- Each weapon has three standard slots: Structure, Mechanism and Payload.

- Each component fits one slot type and lists the weapon families accepting the component. A Sweep Hinge fits Melee weapons only.

- Weapons arrive with default components in some slots. Default components scrap for no materials.

- Component swaps happen during preparation only. A removed component becomes scrap (Section 7.9).

- A weapon carries every tag from its installed components (Section 7.5).

**Decision: the Auxiliary slot opens through upgrades or merging.**

- The fourth slot opens at upgrade Grade III or at the first merge (Section 7.10), whichever comes first.

- Players who skip merging still reach the slot through upgrades.

- Early builds stay simple. Complexity grows as weapons improve.

### 7.13 Damage types

**Status: Proposed.** Nine damage types link weapons, status effects and enemy properties.

| Damage type | Discipline | Status effect                                  | Strong against               | Weak against            |
|-----------------|----------------|----------------------------------------------------|----------------------------------|-----------------------------|
| Slashing        | Engineering    | Bleeding                                           | Organic, unarmoured              | Armoured, Artificial        |
| Piercing        | Engineering    | None. Gains penetration                            | Single targets, lines of enemies | Shields, Stone              |
| Impact          | Engineering    | Stunned                                            | Armoured, Stone, Chitin shells   | Fast swarms                 |
| Fire            | Chemistry      | Burning. Overheated on Artificial enemies          | Organic, Fungal                  | Stone, Volatile             |
| Cold            | Physics        | Frozen                                             | Fast enemies, Volatile           | Heavy, Stone                |
| Electric        | Physics        | Electrified. Short-circuited on Artificial enemies | Metallic, Mechanical             | Stone, Fungal               |
| Toxic           | Biology        | Poisoned                                           | Organic, Beast                   | Artificial (immune), Fungal |
| Corrosive       | Chemistry      | Corroded                                           | Metallic, Armoured               | Unarmoured enemies          |
| Biological      | Biology        | Infected                                           | Groups of Organic enemies        | Artificial (immune)         |

- Explosive is a delivery tag, not a damage type. Explosions deal Impact and Fire damage in an area.

- Mathematics has no damage type. Mathematics works through Marked, critical hits and probability effects.

### 7.14 Weapon statistics

**Status: Proposed.** Every weapon has the stats below, rated on the five-step scale from Section 3.6.

| Stat        | Meaning                                              |
|-----------------|----------------------------------------------------------|
| Damage          | Damage per hit before modifiers                          |
| Attack Speed    | Attacks per second                                       |
| Range           | Distance at which the weapon engages                     |
| Area            | Size of the hit zone. Minimal means a single target      |
| Projectiles     | Projectiles or strikes per attack. Default one           |
| Penetration     | Enemies a projectile passes through. Default zero        |
| Critical Chance | Base chance for a critical hit                           |
| Status Build-up | Meter fill per hit for the payload status (Section 9.14) |
| Knockback       | Push force on hit                                        |

**Damage calculation order**

- Step 1. Weapon base damage.

- Step 2. Flat bonuses from components.

- Step 3. Percentage bonuses from components, research and the player Damage stat. Bonuses from the same source type add together. Bonuses from different source types multiply.

- Step 4. Critical multiplier on a successful roll.

- Step 5. Target resistance or weakness for the damage type.

- Step 6. Target Armour, reduced by Corroded and by Piercing damage.

- Step 7. Status reaction bonuses (Section 9.14).

Adding bonuses inside a source type keeps growth steady. Multiplying across source types rewards builds mixing components, research and synergies, in line with the core concept in Section 1.1.

### 7.15 Targeting rules

**Status: Proposed.**

| Rule       | Behaviour                                      | Default for                   |
|----------------|----------------------------------------------------|-----------------------------------|
| Nearest        | Closest enemy in range                             | Melee and Mechanical weapons      |
| Strongest      | Highest current health in range                    | Siege weapons                     |
| Clustered      | Point with the most enemies inside the weapon Area | Alchemical and Arcing weapons     |
| Highest threat | Highest threat cost, then nearest                  | Weapons with a Targeting Lens     |
| Marked first   | Marked enemies before any other target             | Weapons with the Precise tag      |
| Random         | Random enemy in range                              | Unstable and Experimental effects |

- Weapons hold a target until the target dies or leaves range, to stop rapid switching.

- Constructs use their own rule and ignore any player focus input.

- Manual focus (Section 3.4) overrides targeting rules while held.

### 7.16 Projectile behaviour

**Status: Proposed.**

| Behaviour | Description                                        | Source tags                                          |
|---------------|--------------------------------------------------------|----------------------------------------------------------|
| Straight      | Travels in a line to maximum range                     | Projectile                                               |
| Arcing        | Lands at a target point. Passes over walls and shields | Arcing, Siege                                            |
| Piercing      | Passes through a set number of enemies                 | Piercing, Magnetic                                       |
| Ricochet      | Bounces to a new enemy within a short distance         | Ricochet                                                 |
| Homing        | Curves toward a target                                 | Magnetic against Metallic enemies, Gyroscopic Stabiliser |
| Chain         | Jumps between enemies with no travel time              | Electric, Chain                                          |
| Beam          | Continuous line with damage per tick                   | Beam                                                     |
| Cone          | Short spray in a fan                                   | Spray                                                    |
| Aura          | Persistent zone around the player or a construct       | Aura                                                     |
| Orbit         | Circles the player                                     | Orbit                                                    |

- Projectiles collide with enemies and shields. Arena walls block Straight projectiles.

- Player projectiles never collide with each other.

- Each behaviour keeps a fixed visual style, so players read builds at a glance.

### 7.17 Initial weapon catalogue

**Status: Proposed.** A launch set of 24 weapons, four per family. Stats use the five-step scale. The three example weapons from Section 7.11 sit in the Alchemical and Experimental families. Each weapon appears at any quality. Quality changes stat steps and default components, not weapon identity.

#### Melee

| Weapon       | Damage | Speed | Range | Area | Tags, damage type and behaviour                                              |
|------------------|------------|-----------|-----------|----------|----------------------------------------------------------------------------------|
| Forged Longsword | Medium     | Medium    | Low       | Medium   | Blade, Metallic. Slashing. Wide sweep in front of the player. Engineering.       |
| War Hammer       | High       | Low       | Low       | Medium   | Blunt, Metallic, Heavy. Impact. Overhead slam with a Stun chance. Engineering.   |
| Pike             | Medium     | Medium    | Medium    | Low      | Polearm, Piercing. Piercing. Thrust hits every enemy along a line. Engineering.  |
| Gear Flail       | Low        | High      | Low       | High     | Blunt, Mechanical, Orbit. Impact. Spinning head circles the player. Engineering. |

#### Ranged

| Weapon         | Damage | Speed | Range | Area | Tags, damage type and behaviour                                     |
|--------------------|------------|-----------|-----------|----------|-------------------------------------------------------------------------|
| Crossbow           | High       | Low       | High      | Minimal  | Bolt, Projectile. Piercing. High Critical Chance. Engineering.          |
| Repeating Crossbow | Low        | High      | Medium    | Minimal  | Bolt, Projectile, Mechanical. Piercing. Rapid volleys. Engineering.     |
| Longbow            | Medium     | Medium    | High      | Minimal  | Arrow, Projectile, Arcing. Piercing. Arrows pass over shields. Physics. |
| Knife Bandolier    | Low        | High      | Medium    | Low      | Blade, Thrown. Slashing. Fan of three knives. Mathematics.              |

#### Siege

| Weapon     | Damage | Speed | Range | Area | Tags, damage type and behaviour                                          |
|----------------|------------|-----------|-----------|----------|------------------------------------------------------------------------------|
| Field Cannon   | Extreme    | Minimal   | High      | High     | Heavy, Explosive, Projectile. Impact and Fire. Large blast. Chemistry.       |
| Mortar         | High       | Low       | Extreme   | High     | Arcing, Explosive. Impact and Fire. Targets the densest group. Chemistry.    |
| Ballista       | High       | Low       | Extreme   | Low      | Bolt, Heavy, Piercing. Piercing. Long bolt through a full line. Engineering. |
| Siege Catapult | Extreme    | Minimal   | High      | Medium   | Heavy, Arcing. Impact. Boulders leave rubble, which slows enemies. Physics.  |

#### Mechanical

| Weapon        | Damage | Speed | Range | Area | Tags, damage type and behaviour                                                                          |
|-------------------|------------|-----------|-----------|----------|--------------------------------------------------------------------------------------------------------------|
| Clockwork Turret  | Low        | High      | Medium    | Minimal  | Construct, Projectile, Mechanical. Piercing. Deploys turrets near the player up to a limit. Engineering.     |
| Clockwork Hound   | Medium     | Medium    | Medium    | Low      | Construct, Companion, Mechanical, Metallic. Slashing. Chases and bites enemies near the player. Engineering. |
| Spring Trap Layer | High       | Low       | Low       | Low      | Trap, Mechanical, Blade. Slashing. Places snap traps along the player path. Builds Bleeding. Engineering.    |
| Sawblade Launcher | Medium     | Medium    | Medium    | Low      | Blade, Projectile, Ricochet, Mechanical. Slashing. Blades bounce between enemies. Engineering.               |

#### Alchemical

| Weapon               | Damage | Speed | Range | Area | Tags, damage type and behaviour                                                           |
|--------------------------|------------|-----------|-----------|----------|-----------------------------------------------------------------------------------------------|
| Firebomb Satchel         | Medium     | Low       | Medium    | Medium   | Thrown, Fire, Volatile. Fire. Flasks leave burning pools. Chemistry.                          |
| Acid Sprayer             | Low        | Extreme   | Low       | Medium   | Spray, Corrosive. Corrosive. Constant cone strips Armour. Chemistry.                          |
| Spore Censer             | Low        | High      | Low       | High     | Aura, Biological, Fungal. Biological. Spore cloud around the player builds Infected. Biology. |
| Alchemical Chain-Reactor | Medium     | Low       | Medium    | High     | Explosive, Volatile, Chain. Fire. Kills set off chain explosions. Chemistry and Mathematics.  |

#### Experimental

| Weapon               | Damage | Speed | Range | Area | Tags, damage type and behaviour                                                                                                |
|--------------------------|------------|-----------|-----------|----------|------------------------------------------------------------------------------------------------------------------------------------|
| Electromagnetic Repeater | Medium     | High      | High      | Minimal  | Projectile, Electric, Magnetic, Metallic. Piercing and Electric. Fast penetrating slugs. Physics and Engineering.                  |
| Living Arsenal           | Medium     | Medium    | Low       | Medium   | Companion, Biological, Organic, Toxic. Toxic. Autonomous creature, secretes toxins and adapts each round. Biology and Engineering. |
| Tesla Rod                | Low        | High      | Medium    | Low      | Electric, Chain, Conductive. Electric. Lightning arcs across several enemies. Physics.                                             |
| Burning Mirror           | Low        | Extreme   | High      | Minimal  | Beam, Fire, Precise. Fire. Focused sunbeam. Damage rises the longer the beam holds one target. Physics and Mathematics.            |

### 7.18 Component catalogue

**Status: Proposed.** A launch set of 60 components, 15 per slot type. “Fits” lists the weapon families accepting the component. “Quality” shows the lowest quality at which the component appears. Effects use the five-step scale.

#### Structure

| Component          | Tags            | Effect                                                  | Fits             | Quality   |
|------------------------|---------------------|-------------------------------------------------------------|----------------------|---------------|
| Tempered Steel Frame   | Metallic            | Damage up, Low                                              | All                  | Common        |
| Lightweight Frame      | Light               | Attack Speed up, Medium. Damage down, Low                   | All                  | Common        |
| Hardwood Stock         | Light               | Attack Speed up, Low. Knockback up, Low                     | Ranged, Siege        | Common        |
| Reinforced Barrel      | Metallic, Heavy     | Range up, Medium. Faster projectiles                        | Ranged, Siege        | Common        |
| Counterweight Assembly | Heavy               | Damage up, Medium. Attack Speed down, Low                   | Melee, Siege         | Uncommon      |
| Damascus Alloy         | Metallic, Blade     | Critical Chance up, Medium, on Slashing hits                | Melee                | Uncommon      |
| Copper Coil Housing    | Conductive          | Adds Electric damage, Low                                   | All                  | Uncommon      |
| Glass Reaction Vessel  | Volatile            | Payload Area up, Medium                                     | Alchemical, Siege    | Uncommon      |
| Chitin Plating         | Organic, Armoured   | Player Armour up, Low                                       | All                  | Uncommon      |
| Clockwork Chassis      | Mechanical          | Construct health up, Medium                                 | Mechanical           | Uncommon      |
| Heat Sink Housing      | Thermal             | Fire damage up, Low. Burning lasts longer                   | All                  | Uncommon      |
| Magnetised Core        | Magnetic, Metallic  | Projectiles curve toward Metallic enemies                   | Ranged, Experimental | Rare          |
| Precision-Ground Frame | Precise             | Critical Damage up, Medium                                  | Ranged, Siege        | Rare          |
| Living Wood Frame      | Organic, Biological | Damage up one Minimal step after each round, capped at High | All                  | Rare          |
| Meteoric Iron Frame    | Metallic, Anomalous | Damage up, High. Penetration plus one                       | All                  | Extraordinary |

#### Mechanism

| Component               | Tags              | Effect                                                        | Fits                  | Quality   |
|-----------------------------|-----------------------|-------------------------------------------------------------------|---------------------------|---------------|
| Torsion Spring              | Mechanical            | Attack Speed up, Medium                                           | Ranged, Siege, Mechanical | Common        |
| Piercing Rail               | Piercing              | Penetration plus one                                              | Ranged, Siege             | Common        |
| Sweep Hinge                 | Mechanical            | Melee arc width up, Medium                                        | Melee                     | Common        |
| Pneumatic Bellows           | Mechanical            | Faster projectiles. Knockback up, Medium                          | Ranged, Siege             | Common        |
| Ratchet Repeater            | Mechanical            | Every third attack fires one extra projectile                     | Ranged                    | Uncommon      |
| Multishot Rack              | Mechanical            | Projectiles plus one. Damage per projectile down, Low             | Ranged, Siege             | Uncommon      |
| Ricochet Deflector          | Ricochet              | Projectiles bounce once to a nearby enemy                         | Ranged, Mechanical        | Uncommon      |
| Spray Nozzle                | Spray                 | Converts single shots into a cone. Area up, Range down            | Alchemical                | Uncommon      |
| Targeting Lens              | Precise               | Targeting becomes Highest threat. Critical Chance up, Low         | Ranged, Siege             | Uncommon      |
| Self-Winding Escapement     | Mechanical            | Construct attack speed up, Medium                                 | Mechanical                | Uncommon      |
| Gear Train Accelerator      | Mechanical            | Attack Speed climbs during constant attacks, resets after a pause | Ranged, Mechanical        | Rare          |
| Nerve Fibre Trigger         | Biological, Organic   | Attack Speed up, High, while player health is below half          | All                       | Rare          |
| Electromagnetic Accelerator | Magnetic, Electric    | Projectile speed up, High. Damage up, Low. Adds the Electric tag  | Ranged, Experimental      | Experimental  |
| Orbit Mount                 | Orbit                 | The weapon orbits the player instead of attacking forward         | Melee, Ranged             | Experimental  |
| Perpetual Motion Engine     | Mechanical, Anomalous | Attack Speed up, High, with no drawback                           | All                       | Extraordinary |

#### Payload

| Component         | Tags                         | Effect                                                           | Fits                  | Quality   |
|-----------------------|----------------------------------|----------------------------------------------------------------------|---------------------------|---------------|
| Iron Bolts            | Metallic, Piercing               | Damage up, Low                                                       | Ranged, Siege, Mechanical | Common        |
| Barbed Heads          | Blade                            | Builds Bleeding, Low                                                 | Ranged, Melee             | Common        |
| Incendiary Oil        | Fire, Volatile                   | Builds Burning, Medium                                               | All                       | Common        |
| Venom Reservoir       | Toxic                            | Builds Poisoned, Medium                                              | All                       | Common        |
| Blackpowder Charge    | Explosive, Fire                  | Hits explode in a small area                                         | Ranged, Siege             | Uncommon      |
| Acid Vial             | Corrosive                        | Builds Corroded, Medium                                              | All                       | Uncommon      |
| Frost Salts           | Cold                             | Builds Frozen, Medium. Each hit also slows                           | All                       | Uncommon      |
| Leyden Jar Cell       | Electric, Conductive             | Builds Electrified, Medium. Arcs to one nearby enemy                 | All                       | Uncommon      |
| Spore Culture         | Biological, Fungal               | Builds Infected, Medium. Infection spreads on death                  | All                       | Uncommon      |
| Marking Chalk         | Precise                          | Builds Marked, Medium                                                | All                       | Uncommon      |
| Shrapnel Shells       | Impact, Explosive                | Explosions throw fragments in all directions                         | Siege                     | Rare          |
| Volatile Catalyst     | Volatile, Chain                  | Kills cause a small explosion, eligible for chain reactions          | Alchemical, Siege         | Rare          |
| Magnetite Slugs       | Magnetic, Metallic               | Impacts pull small enemies toward the hit point                      | Ranged, Siege             | Rare          |
| Parasite Larvae       | Biological, Parasite             | Infected enemies release a parasite on death, which seeks a new host | All                       | Experimental  |
| Philosopher's Reagent | Volatile, Toxic, Corrosive, Fire | Builds Burning, Poisoned and Corroded together, High                 | All                       | Extraordinary |

#### Auxiliary

| Component            | Tags               | Effect                                                                  | Fits      | Quality   |
|--------------------------|------------------------|-----------------------------------------------------------------------------|---------------|---------------|
| Telescopic Sight         | Precise                | Range up, Medium. Critical Damage up, Low                                   | Ranged, Siege | Common        |
| Bayonet Mount            | Blade                  | Adds a short stab against adjacent enemies                                  | Ranged        | Common        |
| Research Notebook        | Precise                | Kills with this weapon grant extra Research Points, Low                     | All           | Common        |
| Specimen Jar             | Biological             | Kills with this weapon grant extra Specimens, Low                           | All           | Uncommon      |
| Reagent Recycler         | Volatile               | Status duration up, Medium                                                  | All           | Uncommon      |
| Gyroscopic Stabiliser    | Mechanical             | Projectiles home slightly. Spread down                                      | Ranged, Siege | Uncommon      |
| Smoke Canister           | Volatile               | On taking damage, releases smoke. Enemies inside lose their target briefly  | All           | Uncommon      |
| Repair Kit Housing       | Mechanical             | Constructs repair over time                                                 | Mechanical    | Uncommon      |
| Tesla Capacitor          | Electric, Conductive   | Discharges a lightning chain every few seconds                              | All           | Rare          |
| Grappling Line           | Mechanical             | Pulls the first enemy hit toward the player                                 | Ranged, Melee | Rare          |
| Healing Poultice Chamber | Biological, Organic    | Kills restore a small amount of health                                      | All           | Rare          |
| Resonance Fork           | Precise, Conductive    | Bonus damage against Electrified and Frozen enemies                         | All           | Rare          |
| Feedback Loop Gear       | Mechanical, Precise    | Each kill raises Attack Speed briefly. Stacks up to a cap                   | All           | Rare          |
| Prototype Overclock      | Experimental, Volatile | Damage up, High. Attack Speed up, Medium. The weapon jams briefly at random | All           | Experimental  |
| Grand Calculus Engine    | Precise, Anomalous     | Counts as one extra matching tag for every synergy on this weapon           | All           | Extraordinary |

Quality spread: 15 Common, 24 Uncommon, 13 Rare, 4 Experimental, 4 Extraordinary.

### 7.19 Synergy database

**Status: Proposed.** Internal synergies need the tags on one weapon. Cross-weapon synergies need the tags spread across equipped weapons. Research synergies need a research node plus the tags.

| Synergy               | Type     | Requires                                                     | Effect                                                                    |
|---------------------------|--------------|------------------------------------------------------------------|-------------------------------------------------------------------------------|
| Conductive Strike         | Internal     | Electric + Metallic                                              | Electric chains jump to one extra enemy                                       |
| Pressure Burst            | Internal     | Explosive + Heavy                                                | Explosion Area up, Medium                                                     |
| Envenomed Edge            | Internal     | Toxic + Blade                                                    | Poisoned damage ticks faster on Bleeding enemies                              |
| Flashpoint                | Internal     | Fire + Volatile                                                  | Burning enemies explode on death                                              |
| Rail Shot                 | Internal     | Magnetic + Piercing                                              | Penetration plus two                                                          |
| Clockwork Precision       | Internal     | Mechanical + Precise                                             | Constructs inherit player Critical Chance                                     |
| Overgrowth                | Internal     | Organic + Biological                                             | Infected spreads to two enemies on death instead of one                       |
| Steady Hand               | Internal     | Precise + Heavy                                                  | The first hit on each enemy is a critical hit                                 |
| Galvanic Corrosion        | Cross-weapon | Corrosive weapon + Electric weapon                               | Galvanic Surge reactions deal double damage and arc to one nearby enemy       |
| Thermal Shock             | Cross-weapon | Fire weapon + Cold weapon                                        | Shatter and Steam Burst reactions deal Damage up, High                        |
| Fungal Network            | Cross-weapon | Two Biological weapons                                           | Damage to one Infected enemy spreads in part to other Infected enemies nearby |
| Kill Zone                 | Cross-weapon | Trap weapon + Construct weapon                                   | Constructs focus trapped enemies with Damage up, Medium                       |
| Ballistic Tables          | Cross-weapon | Precise weapon + Arcing weapon                                   | Arcing shots lead moving targets. Area up, Low                                |
| Combined Arms             | Cross-weapon | Melee weapon + Siege weapon                                      | Siege weapons target enemies recently hit by melee, with Damage up, Low       |
| Magnetic Field            | Cross-weapon | Two Magnetic weapons                                             | Pickup Radius up, High. Metallic enemies slow down near the player            |
| Catalytic Mix             | Cross-weapon | Three different status payloads                                  | Status reactions deal Damage up, Medium                                       |
| Chemical Ballistics       | Research     | Chemistry + Engineering node. Projectile + any Chemistry payload | Projectiles leave a short trail carrying the payload status                   |
| Electromagnetic Launchers | Research     | Physics + Engineering node. Magnetic + Projectile                | Projectiles gain Piercing and Range up, Medium                                |
| Bioengineering            | Research     | Biology + Engineering node. Construct + Organic                  | Constructs regenerate and grow stronger each round                            |
| Conductive Toxins         | Research     | Chemistry + Physics + Biology node. Toxic + Electric             | Poisoned enemies conduct Electric chains                                      |
| Recursive Artillery       | Research     | Engineering + Mathematics + Chemistry node. Siege + Explosive    | Each explosion triggers one smaller copy                                      |
| Kinetic Probability       | Research     | Physics + Mathematics node. Impact + Precise                     | Knockback into walls or enemies counts as a critical hit                      |
| Adaptive Armour           | Research     | Biology + Engineering node. Organic + Armoured                   | Damage adaptation gain and cap double (Section 3.7)                           |

- The build panel lists each synergy with its required tags and flags near misses, such as “one Electric tag from Conductive Strike”.

- Duplicate synergies never stack. Different synergies stack freely.

- A synergy enters the Codex the first time the synergy triggers.

### 7.20 Chain reactions

**Status: Proposed.** Chain reactions drive the extraordinary scaling in Section 1.1, so they need firm limits.

- A chain reaction is any effect triggered by another effect: explosions from kills, Electric arcs, Infection spread and Recursive Artillery copies.

- Each chain carries a generation count. Damage falls by a set share with each generation.

- A hard depth limit ends every chain. Research and the Grand Calculus Engine raise the limit in small steps.

- Each enemy takes damage from one chain generation at most within a short window, so one enemy never absorbs hundreds of hits at once.

- Chain events queue across frames instead of resolving in one frame. A per-frame cap protects frame rate on mobile.

- Overlapping chain effects merge visually: one large burst replaces dozens of small ones.

### 7.21 Weapon performance limits

**Status: Proposed.** Limits use relative tiers. Profiling on target devices sets the numbers.

| Limit                                  | PC  | Mobile | Behaviour at the limit                         |
|--------------------------------------------|---------|------------|----------------------------------------------------|
| Active player projectiles                  | Extreme | High       | Oldest projectiles fade out                        |
| Active area effects (pools, clouds, auras) | High    | Medium     | New effects merge into the nearest matching effect |
| Chain events per frame                     | High    | Medium     | Extra events wait for the next frame               |
| Active constructs                          | Medium  | Medium     | New constructs replace the oldest                  |
| Damage numbers on screen                   | High    | Low        | Small hits merge into totals                       |
| Particle density                           | High    | Medium     | Density scales down with no gameplay change        |

### 7.22 Weapon upgrade costs

**Status: Proposed.**

| Grade | Gold | Scrap | Research needed  | Also opens                |
|-----------|----------|-----------|----------------------|-------------------------------|
| I         | 25       | 2         | None                 |                               |
| II        | 50       | 4         | None                 |                               |
| III       | 90       | 6         | Any middle-ring node | Auxiliary slot (Section 7.12) |
| IV        | 140      | 8         | Any outer-ring node  |                               |

- Grades are bought in order. Grade IV is the maximum.

- Each grade grants one stat step in a category chosen at purchase: Performance (Damage), Efficiency (Attack Speed) or Specialisation (Critical Chance, Range, Area or Status Build-up).

- Upgrading all three weapons to Grade IV costs 915 gold, about 56 per cent of the gold from a winning run (Section 14.3). Full upgrades compete with components and shop visits.

- Upgrade prices never rise with territory.

- A merge keeps the grade of the surviving weapon.

### 7.23 Component recipes and merging

**Status: Proposed.** Players build components at the workshop during preparation. Common recipes are known from the start. Other recipes open with the node opening the component (Section 8.12). Extraordinary components come only from shops and boss rewards.

| Quality   | Gold      | Materials | Dismantle return (Section 7.9) |
|---------------|---------------|---------------|------------------------------------|
| Common        | 10            | 2             | 1                                  |
| Uncommon      | 20            | 4             | 2                                  |
| Rare          | 35            | 7             | 3                                  |
| Experimental  | 60            | 9             | 4                                  |
| Extraordinary | Not buildable | None          | 5                                  |

Dismantling returns 43 to 50 per cent of recipe materials, in line with Section 7.9. The first matching tag of a component sets the material type:

| Material | Tags                                                                        |
|--------------|---------------------------------------------------------------------------------|
| Scrap        | Metallic, Mechanical, Heavy, Light, Blade, Piercing, Ricochet, Orbit            |
| Reagents     | Fire, Volatile, Toxic, Corrosive, Explosive, Spray, Chain                       |
| Crystals     | Electric, Conductive, Magnetic, Cold, Precise, Thermal, Anomalous, Experimental |
| Specimens    | Biological, Organic, Fungal, Parasite, Armoured                                 |

- Building costs less gold than buying (Section 6.6) but uses materials.

- Merging two copies of a weapon (Section 7.10) costs 50 gold at the workshop.

## 8. SCIENTIFIC RESEARCH SYSTEM

### 8.1 Research philosophy

Research is one of the game’s defining systems.

The distinction:

**Permanent progression determines what humanity knows. Run-based research determines what the character manages to invent.**

The system has four progression layers:

1.  Permanent Grand Archive.

2.  Current-run scientific research.

3.  Weapon and equipment development.

4.  Experimental discoveries.

### 8.2 Research disciplines

Five disciplines:

#### Chemistry

- Combustion.

- Toxicology.

- Reactions.

#### Physics

- Electricity.

- Magnetism.

- Mechanics.

- Thermodynamics.

#### Biology

- Medicine.

- Genetics.

- Microbiology.

#### Engineering

- Machinery.

- Ballistics.

- Construction.

#### Mathematics

- Probability.

- Optimisation.

- Advanced Calculus.

Mathematics can connect to all other disciplines.

### 8.3 Research interface

The proposed interface is a radial/spiderweb research network.

- Five scientific disciplines occupy different regions.

- Basic research sits near the centre.

- Advanced research appears further out.

- Research paths branch and interconnect.

- Cross-disciplinary nodes connect different regions.

- Hidden discoveries may add new nodes.

Some research requires multiple disciplines.

These requirements use AND logic unless explicitly designed with alternative prerequisite routes.

### 8.4 Research resources

Research uses:

- Research Points.

- Components.

- Reagents.

- Crystals.

- Specimens.

Enemies primarily generate Research Points.

Gold is not a research currency.

Research costs in Section 8.11 use Research Points plus Scrap, Reagents, Crystals and Specimens.

### 8.5 Enemy research rewards

Illustrative rewards:

| Enemy rank   | RP |
|------------------|--------|
| Normal           | 1      |
| Elite            | 8      |
| Mini-boss        | 20     |
| Boss             | 50     |
| Champion         | 25     |
| Escort mini-boss | 20     |

Damage adaptation (Section 3.7) replaces research affinity. Confirmed in version 0.5.

### 8.6 Cross-disciplinary discoveries

Examples:

- Chemical Ballistics – Chemistry + Engineering.

- Electromagnetic Launchers – Physics + Engineering.

- Bioengineering – Biology + Engineering.

- Conductive Toxins – Chemistry + Physics + Biology.

- Recursive Artillery – Engineering + Mathematics + Chemistry.

- Adaptive Armour – Biology + Engineering.

- Kinetic Probability – Physics + Mathematics.

### 8.7 Hidden discoveries

Hidden discoveries can occur through:

- Research prerequisites.

- Specific component combinations.

- Combat interactions.

- Status-effect interactions.

- Unusual enemy interactions.

Once discovered, they enter the permanent Grand Archive.

They must still be researched during future runs before use.

### 8.8 Research mastery

Proposed mastery progression:

- Novice.

- Practitioner.

- Expert.

- Master.

- Grandmaster.

Mastery should unlock new research possibilities and mechanics, not just increasingly large stat bonuses.

Exact thresholds remain provisional.

Proposed thresholds appear in Section 8.13.

### 8.9 Research refunds

Current-run research reallocation has a 75% refund.

Confirmed in version 0.5 (Section 8.10).

### 8.10 Research rules

**Status: Confirmed in version 0.5.**

- Research happens during the preparation phase and completes instantly.

- A node needs three things: discovery in the Grand Archive (Section 11.10), every node listed under Requires, and the Research Point and material cost (Section 8.11).

- Cross-discipline nodes use AND logic: every listed node must be researched first.

- A researched node opens items in shops and recipes at the workshop for the rest of the run.

- Reallocation refunds 75 per cent of Research Points and materials, rounded down. Removing a node also removes every dependent node, each refunded at 75 per cent.

- Items already owned stay owned after a refund. The shop stops stocking them.

- Weapon Grade III needs any middle-ring node. Grade IV needs any outer-ring node (Section 7.22).

### 8.11 Research costs

**Status: Proposed.** Each discipline uses one material type. A winning run earns about 2,050 Research Points (Section 14.3), enough for about 25 of the 120 nodes. Each run explores a different slice of the tree.

| Ring         | Research Points | Materials                        |
|------------------|---------------------|--------------------------------------|
| Centre           | 15                  | None                                 |
| Inner            | 35                  | 1 of the discipline material         |
| Middle           | 70                  | 3 of the discipline material         |
| Outer            | 140                 | 6 of the discipline material         |
| Cross-discipline | 110                 | 3 of each linked discipline material |
| Hidden           | 110                 | 3 of each linked discipline material |

| Discipline | Material |
|----------------|--------------|
| Chemistry      | Reagents     |
| Physics        | Crystals     |
| Biology        | Specimens    |
| Engineering    | Scrap        |
| Mathematics    | Crystals     |

### 8.12 Research tree

**Status: Proposed.** 120 nodes: 18 per discipline across four rings (3 centre, 5 inner, 6 middle, 4 outer), plus 30 cross-discipline nodes, 10 of them hidden. Six weapons and all Common components need no research. Every other weapon and component opens through one node below.

#### Chemistry

| Node               | Ring | Requires                  | Effect                                                                 |
|------------------------|----------|-------------------------------|----------------------------------------------------------------------------|
| Applied Combustion     | Centre   | None                          | Fire damage up, Low. Opens Heat Sink Housing                               |
| Basic Toxicology       | Centre   | None                          | Toxic damage up, Low                                                       |
| Reaction Theory        | Centre   | None                          | Status reaction damage up, Low                                             |
| Blackpowder            | Inner    | Applied Combustion            | Opens Field Cannon and Blackpowder Charge                                  |
| Volatile Compounds     | Inner    | Applied Combustion            | Opens Firebomb Satchel and Glass Reaction Vessel                           |
| Corrosive Acids        | Inner    | Basic Toxicology              | Opens Acid Vial. Corrosive damage up, Low                                  |
| Fume Chemistry         | Inner    | Basic Toxicology              | Opens Smoke Canister. Toxic Fumes cloud size up, Medium                    |
| Catalysis              | Inner    | Reaction Theory               | Opens Reagent Recycler. Status Build-up up, Low                            |
| Incendiary Engineering | Middle   | Blackpowder                   | Burning lasts longer. Explosion Area up, Low                               |
| Shaped Charges         | Middle   | Blackpowder                   | Opens Mortar and Shrapnel Shells                                           |
| Concentrated Acids     | Middle   | Corrosive Acids               | Opens Acid Sprayer and Spray Nozzle. Corroded lowers Armour one extra step |
| Volatile Catalysts     | Middle   | Volatile Compounds, Catalysis | Opens Volatile Catalyst                                                    |
| Neurotoxins            | Middle   | Fume Chemistry                | Poisoned enemies also slow down                                            |
| Chain Kinetics         | Middle   | Catalysis                     | Chain reaction depth limit plus one                                        |
| Unstable Formulae      | Outer    | Volatile Catalysts            | Opens Prototype Overclock                                                  |
| Thermite               | Outer    | Incendiary Engineering        | Fire damage ignores Armour                                                 |
| Universal Solvent      | Outer    | Concentrated Acids            | Corroded enemies take Damage up, Low, from every source                    |
| Philosopher's Reagent  | Outer    | Neurotoxins, Chain Kinetics   | Philosopher's Reagent appears in free milestone shops                      |

#### Physics

| Node            | Ring | Requires                   | Effect                                                                 |
|---------------------|----------|--------------------------------|----------------------------------------------------------------------------|
| Static Electricity  | Centre   | None                           | Electric damage up, Low. Opens Copper Coil Housing                         |
| Lodestone Studies   | Centre   | None                           | Pickup Radius up, Low                                                      |
| Classical Mechanics | Centre   | None                           | Knockback up, Low. Faster projectiles                                      |
| Leyden Jars         | Inner    | Static Electricity             | Opens Leyden Jar Cell                                                      |
| Magnetic Fields     | Inner    | Lodestone Studies              | Magnetic projectiles home slightly. Pickup Radius up, Low                  |
| Gyroscopes          | Inner    | Classical Mechanics            | Opens Gyroscopic Stabiliser                                                |
| Leverage            | Inner    | Classical Mechanics            | Opens Siege Catapult                                                       |
| Thermodynamics      | Inner    | Classical Mechanics            | Opens Frost Salts. Cold damage up, Low                                     |
| Galvanism           | Middle   | Leyden Jars                    | Opens Tesla Rod and Tesla Capacitor                                        |
| Lodestone Cores     | Middle   | Magnetic Fields                | Opens Magnetised Core and Magnetite Slugs                                  |
| Resonance           | Middle   | Leyden Jars, Thermodynamics    | Opens Resonance Fork                                                       |
| Cryogenics          | Middle   | Thermodynamics                 | Frozen lasts longer. Shatter damage up, Medium                             |
| Optics              | Middle   | Gyroscopes                     | Range up, Low. Beam damage up, Low                                         |
| Ballistic Pendulum  | Middle   | Leverage                       | Arcing Area up, Low. Knockback into walls builds Stunned                   |
| Electromagnetism    | Outer    | Galvanism, Lodestone Cores     | Opens Electromagnetic Accelerator. Electric chains jump to one extra enemy |
| Absolute Zero       | Outer    | Cryogenics                     | Frozen enemies take Damage up, Medium                                      |
| Perpetual Motion    | Outer    | Ballistic Pendulum, Gyroscopes | Perpetual Motion Engine appears in free milestone shops                    |
| Gravity Studies     | Outer    | Lodestone Cores                | Area effects pull enemies toward the centre                                |

#### Biology

| Node           | Ring | Requires                      | Effect                                                              |
|--------------------|----------|-----------------------------------|-------------------------------------------------------------------------|
| Field Medicine     | Centre   | None                              | Regeneration up, Low                                                    |
| Natural History    | Centre   | None                              | Opens Specimen Jar. Specimen yield up, Low                              |
| Microbiology       | Centre   | None                              | Biological damage up, Low                                               |
| Anatomy            | Inner    | Field Medicine                    | Critical Damage up, Low, against Organic enemies. Bleeding lasts longer |
| Chitin Studies     | Inner    | Natural History                   | Opens Chitin Plating                                                    |
| Fungal Cultures    | Inner    | Microbiology                      | Opens Spore Censer and Spore Culture                                    |
| Venomology         | Inner    | Natural History                   | Poisoned damage up, Low                                                 |
| Immunology         | Inner    | Field Medicine                    | Damage adaptation gain up, Medium                                       |
| Herbal Remedies    | Middle   | Anatomy                           | Opens Healing Poultice Chamber                                          |
| Living Materials   | Middle   | Chitin Studies                    | Opens Living Wood Frame                                                 |
| Nervous Systems    | Middle   | Anatomy                           | Opens Nerve Fibre Trigger                                               |
| Contagion          | Middle   | Fungal Cultures                   | Infected spreads to one extra enemy on death                            |
| Selective Breeding | Middle   | Natural History                   | Companions gain Regeneration                                            |
| Antitoxins         | Middle   | Immunology                        | Damage adaptation cap up one step                                       |
| Parasitology       | Outer    | Contagion                         | Opens Parasite Larvae                                                   |
| Regeneration       | Outer    | Herbal Remedies, Antitoxins       | Regeneration doubles below half health                                  |
| Mutagenics         | Outer    | Living Materials, Nervous Systems | Each round, one Organic component gains a random stat step, up to High  |
| Symbiosis          | Outer    | Selective Breeding                | Companion and construct kills restore a small amount of health          |

#### Engineering

| Node             | Ring | Requires                     | Effect                                                      |
|----------------------|----------|----------------------------------|-----------------------------------------------------------------|
| Metalworking         | Centre   | None                             | Damage up, Low, for Metallic weapons                            |
| Machinery            | Centre   | None                             | Attack Speed up, Low, for Mechanical weapons                    |
| Ballistics           | Centre   | None                             | Range up, Low, for Projectile weapons                           |
| Forging              | Inner    | Metalworking                     | Opens Counterweight Assembly and Damascus Alloy                 |
| Repeating Mechanisms | Inner    | Machinery                        | Opens Repeating Crossbow and Ratchet Repeater                   |
| Clockwork            | Inner    | Machinery                        | Opens Gear Flail, Clockwork Chassis and Self-Winding Escapement |
| Spring Traps         | Inner    | Machinery                        | Opens Spring Trap Layer                                         |
| Ammunition Design    | Inner    | Ballistics                       | Opens Multishot Rack and Ricochet Deflector                     |
| Automata             | Middle   | Clockwork                        | Opens Clockwork Turret and Repair Kit Housing                   |
| Siege Engineering    | Middle   | Ballistics, Forging              | Opens Ballista. Siege damage up, Low                            |
| Sawmill Engineering  | Middle   | Repeating Mechanisms             | Opens Sawblade Launcher                                         |
| Gear Trains          | Middle   | Clockwork                        | Opens Gear Train Accelerator and Feedback Loop Gear             |
| Rope and Pulley      | Middle   | Spring Traps                     | Opens Grappling Line. Trap damage up, Low                       |
| Fortification        | Middle   | Forging                          | Player Armour up, Low                                           |
| Clockwork Companions | Outer    | Automata                         | Opens Clockwork Hound. Active construct limit plus one          |
| Orbital Mechanisms   | Outer    | Gear Trains                      | Opens Orbit Mount                                               |
| Masterwork Forging   | Outer    | Fortification, Siege Engineering | Weapon Grade IV grants one extra stat step                      |
| Meteoric Metallurgy  | Outer    | Fortification                    | Meteoric Iron Frame appears in free milestone shops             |

#### Mathematics

| Node              | Ring | Requires                          | Effect                                                              |
|-----------------------|----------|---------------------------------------|-------------------------------------------------------------------------|
| Probability           | Centre   | None                                  | Critical Chance up, Low                                                 |
| Geometry              | Centre   | None                                  | Area up, Low                                                            |
| Bookkeeping           | Centre   | None                                  | Research Yield up, Low                                                  |
| Statistics            | Inner    | Probability                           | Opens Marking Chalk. Marked lasts longer                                |
| Trigonometry          | Inner    | Geometry                              | Opens Targeting Lens. Arcing projectiles lead targets slightly          |
| Optimisation          | Inner    | Bookkeeping                           | The first reroll in each shop visit is free                             |
| Expected Value        | Inner    | Probability                           | Fortune up, Low                                                         |
| Precision Measurement | Inner    | Geometry                              | Critical Damage up, Low                                                 |
| Precision Grinding    | Middle   | Precision Measurement                 | Opens Precision-Ground Frame                                            |
| Risk Analysis         | Middle   | Statistics, Expected Value            | Critical hits on Marked enemies extend Marked                           |
| Compound Interest     | Middle   | Optimisation                          | Gain 5 per cent of unspent gold at the end of each round, up to 25 gold |
| Calculus of Motion    | Middle   | Trigonometry                          | All projectiles lead moving targets                                     |
| Combinatorics         | Middle   | Statistics                            | Each active synergy grants Damage up, Minimal                           |
| Efficient Research    | Middle   | Bookkeeping, Optimisation             | Research Point costs down 10 per cent                                   |
| Chaos Theory          | Outer    | Risk Analysis                         | Random effects roll twice and keep the better result                    |
| Infinite Series       | Outer    | Combinatorics, Calculus of Motion     | Chain reaction damage falls more slowly per generation                  |
| Grand Calculus        | Outer    | Combinatorics                         | Grand Calculus Engine appears in free milestone shops                   |
| Perfect Information   | Outer    | Efficient Research, Compound Interest | Free milestone visits preview the stock of all three shops              |

#### Cross-discipline nodes

The seven research synergies from Section 7.19 sit here, alongside the four weapons with two disciplines.

| Node                  | Disciplines                     | Requires                                     | Effect                                                 |
|---------------------------|-------------------------------------|--------------------------------------------------|------------------------------------------------------------|
| Chemical Ballistics       | Chemistry, Engineering              | Blackpowder, Ammunition Design                   | Research synergy (Section 7.19)                            |
| Electromagnetic Launchers | Physics, Engineering                | Lodestone Cores, Ammunition Design               | Research synergy. Opens Electromagnetic Repeater           |
| Bioengineering            | Biology, Engineering                | Living Materials, Automata                       | Research synergy. Opens Living Arsenal                     |
| Conductive Toxins         | Chemistry, Physics, Biology         | Fume Chemistry, Leyden Jars, Venomology          | Research synergy                                           |
| Recursive Artillery       | Engineering, Mathematics, Chemistry | Siege Engineering, Combinatorics, Shaped Charges | Research synergy                                           |
| Kinetic Probability       | Physics, Mathematics                | Ballistic Pendulum, Expected Value               | Research synergy                                           |
| Adaptive Armour           | Biology, Engineering                | Antitoxins, Fortification                        | Research synergy                                           |
| Volatile Arithmetic       | Chemistry, Mathematics              | Volatile Catalysts, Statistics                   | Opens Alchemical Chain-Reactor                             |
| Focused Optics            | Physics, Mathematics                | Optics, Trigonometry                             | Opens Burning Mirror                                       |
| Galvanic Chemistry        | Chemistry, Physics                  | Corrosive Acids, Leyden Jars                     | Galvanic Surge reactions arc to one extra enemy            |
| Thermal Engineering       | Physics, Engineering                | Thermodynamics, Forging                          | Fire and Cold weapons gain Attack Speed up, Low            |
| Medical Alchemy           | Chemistry, Biology                  | Catalysis, Herbal Remedies                       | Killing a Poisoned enemy restores a small amount of health |
| Pharmacology              | Chemistry, Biology                  | Venomology, Fume Chemistry                       | Poisoned and Infected meters fill faster                   |
| Clockwork Logic           | Engineering, Mathematics            | Automata, Statistics                             | Constructs use the Highest threat targeting rule           |
| Siege Mathematics         | Engineering, Mathematics            | Siege Engineering, Calculus of Motion            | Siege weapons gain Critical Chance up, Medium              |
| Explosive Ordnance        | Chemistry, Engineering              | Shaped Charges, Siege Engineering                | Siege explosions build Burning                             |
| Statistical Toxicology    | Chemistry, Mathematics              | Neurotoxins, Expected Value                      | Critical hits double Status Build-up                       |
| Field Surgery             | Biology, Mathematics                | Anatomy, Statistics                              | Critical Damage up, Medium, against Bleeding enemies       |
| Biomechanics              | Biology, Physics                    | Nervous Systems, Gyroscopes                      | Move Speed up, Low. Evasion up, Low                        |
| Bioelectricity            | Biology, Physics                    | Nervous Systems, Galvanism                       | Organic weapons build Electrified                          |

#### Hidden nodes

Hidden nodes stay off the research web until the player meets the condition in a run. The node then enters the Grand Archive for free and appears in every later run (Section 8.7).

| Node                 | Disciplines          | Condition                                                 | Effect                                                                                |
|--------------------------|--------------------------|---------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| Spontaneous Combustion   | Chemistry, Physics       | Trigger 50 Steam Burst reactions in one run                   | Each Burning trigger spreads Burning to one adjacent enemy                                |
| Lightning in a Bottle    | Physics, Chemistry       | Kill an elite with a Galvanic Surge reaction                  | Tesla Capacitor discharges twice as often                                                 |
| Living Battery           | Biology, Physics         | Win a round with Living Arsenal and Tesla Rod equipped        | Companions build Electrified on hit                                                       |
| Perpetual Reaction       | Chemistry, Mathematics   | Reach the chain reaction depth limit                          | Chain reaction depth limit plus one                                                       |
| Iron Lung                | Biology, Engineering     | Finish a round below a tenth of max health                    | Damage adaptation also applies to every other damage type at half strength                |
| Probability Storm        | Mathematics, Physics     | Land 10 critical hits within one second                       | Critical hits build Electrified                                                           |
| Fungal Machinery         | Biology, Engineering     | Defeat a Spore Mother with a construct                        | Constructs build Infected                                                                 |
| Absolute Precision       | Mathematics, Engineering | Defeat a mini-boss without taking damage                      | The first hit in each boss phase is a critical hit                                        |
| Anomalous Physics        | Physics, Mathematics     | Defeat The Unstable while Auxiliary components are suppressed | Auxiliary components ignore suppression                                                   |
| The Philosopher's Engine | All five disciplines     | Reach Expert mastery in all five disciplines                  | Each campaign starts with one random middle-ring node from the Archive already researched |

**Decision: a hint after a near miss.** Confirmed in version 0.6.

- A cryptic note appears in the Codex once the player meets half of a hidden condition, such as 25 of the 50 Steam Burst reactions for Spontaneous Combustion.

- Conditions with no halfway point, such as defeating a mini-boss without taking damage, give the hint after the first failed attempt.

- Hints keep the surprise while guiding curious players.

### 8.13 Mastery thresholds

**Status: Proposed.** Mastery is permanent and tracked per discipline. Researching a node in a run earns mastery points: centre 1, inner 2, middle 3, outer 5. Cross-discipline and hidden nodes give 2 to each linked discipline. A focused winning run earns about 30 points in the main discipline once its middle ring is discovered. Before then, a run earns at most 7 points per discipline from starting knowledge, or 13 with all five inner nodes discovered.

| Rank     | Points | Opens                                                                              |
|--------------|------------|----------------------------------------------------------------------------------------|
| Novice       | 0          | Centre and inner rings                                                                 |
| Practitioner | 13         | Middle-ring discovery in the Grand Archive                                             |
| Expert       | 60         | Outer-ring discovery. Experimental components of the discipline appear in shops        |
| Master       | 140        | A discipline mechanic: one rule change, listed below                                   |
| Grandmaster  | 280        | Discipline title, Archive decoration and one extra specialisation slot (Section 11.12) |

Practitioner sits at 13 points, the value of every centre and inner node in one discipline, so two runs always reach the rank on a fresh profile (confirmed after playtesting version 1.0). The Grand Archive shows each discipline's points to the next rank and the inner nodes still to discover.

| Discipline | Master mechanic                                                                |
|----------------|------------------------------------------------------------------------------------|
| Chemistry      | Status reactions build one further status of the player's choice                   |
| Physics        | Electric, Magnetic and Cold effects ignore Resistant elite modifiers               |
| Biology        | Organic enemies sometimes drop healing herbs on death                              |
| Engineering    | Constructs keep half their health between rounds and start the next round deployed |
| Mathematics    | Critical hits roll a second time for a chance at a double critical                 |

## 9. ENEMY SYSTEM

### 9.1 Enemy families

Six enemy families:

1.  Kingdom Armies.

2.  Clockwork Legions.

3.  Failed Experiments.

4.  Wilds.

5.  Outlaws.

6.  Unknown.

### 9.2 Enemy roles

Nine primary combat roles:

- Swarmer.

- Bruiser.

- Skirmisher.

- Ranged attacker.

- Tank.

- Support.

- Controller.

- Summoner.

- Specialist.

Enemies may have overlapping roles.

### 9.3 Enemy architecture

Every enemy has:

- Faction.

- Combat role.

- Behaviour profile.

- Scientific properties and tags.

- Abilities.

- Rank.

Ranks:

- Normal.

- Elite.

- Champion.

- Boss.

Scientific properties determine weaknesses and resistances.

Example:

**Iron Sentinel**

- Mechanical.

- Metallic.

- Armoured.

- Artificial.

- Resistant to some physical and chemical attacks.

- Vulnerable to electrical interference, corrosion and magnetic manipulation.

### 9.4 Tactical AI

Five-layer AI architecture:

1.  Physical simulation.

2.  Combat behaviour.

3.  Individual decision-making.

4.  Group intelligence.

5.  Tactical director.

Enemies use utility scoring to evaluate:

- Attack.

- Protect allies.

- Retreat.

- Regroup.

- Flank.

- Use abilities.

### 9.5 Group intelligence

Proposed group behaviours:

- Defensive formations.

- Surrounding and flanking.

- Coordinated assaults.

- Defensive networks.

- Territorial control.

Leaders and commanders can issue orders.

If the leader dies, the group continues but operates less effectively.

### 9.6 Enemy personality

Personality traits:

- Aggressive.

- Defensive.

- Cowardly.

- Disciplined.

- Territorial.

- Unstable.

- Predatory.

### 9.7 Enemy adaptation

Enemy adaptation should be rare and limited.

Enemies may temporarily respond to player damage patterns or behaviour.

They should not develop permanent immunity to the player’s build.

### 9.8 Initial enemy roster

#### Kingdom Armies

- Royal Footman.

- Royal Longbowman.

- Royal Bastion.

#### Clockwork Legions

- Clockwork Crawler.

- Iron Sentinel.

- Mechanist.

#### Failed Experiments

- Chemical Crawler.

- Regenerator.

- Volatile Specimen.

#### Wilds

- Hunting Hound.

- Ironback Beetle.

- Spore Mother.

#### Outlaws

- Highwayman.

- Rogue Inventor.

- Mercenary Captain.

#### Unknown

- Anomaly.

- Ancient Guardian.

- The Unstable.

These are initial enemy concepts, not final specifications.

### 9.9 Enemy status effects

Proposed effects:

- Burning.

- Poisoned.

- Corroded.

- Electrified.

- Frozen.

- Bleeding.

- Stunned.

- Infected.

- Marked.

- Overheated.

Mechanical enemies may have alternative effects such as overheating or short-circuiting.

Status stacking, duration, intensity and interaction rules remain to be designed.

Definitions, reactions and build-up meter rules appear in Section 9.14.

### 9.10 Enemy statistics

**Status: Proposed.** Stats use the five-step scale from Section 3.6 for Normal rank in Territory 1. Territory 2 raises Health and Damage by one step. Territory 3 raises both by two steps.

| Enemy         | Role             | Health | Damage | Speed | Range | Armour | Threat |
|-------------------|----------------------|------------|------------|-----------|-----------|------------|------------|
| Royal Footman     | Bruiser              | Medium     | Medium     | Medium    | Minimal   | Medium     | Low        |
| Royal Longbowman  | Ranged attacker      | Low        | Medium     | Medium    | High      | Low        | Medium     |
| Royal Bastion     | Tank, Support        | High       | Low        | Low       | Minimal   | High       | Medium     |
| Clockwork Crawler | Swarmer              | Minimal    | Low        | High      | Minimal   | Low        | Minimal    |
| Iron Sentinel     | Tank                 | High       | Medium     | Low       | Low       | Extreme    | High       |
| Mechanist         | Support, Summoner    | Low        | Low        | Medium    | Medium    | Low        | Medium     |
| Chemical Crawler  | Swarmer              | Low        | Low        | High      | Minimal   | Minimal    | Low        |
| Regenerator       | Bruiser              | High       | Medium     | Medium    | Minimal   | Low        | Medium     |
| Volatile Specimen | Specialist           | Low        | High       | Medium    | Low       | Minimal    | Medium     |
| Hunting Hound     | Skirmisher           | Low        | Medium     | Extreme   | Minimal   | Minimal    | Low        |
| Ironback Beetle   | Tank                 | High       | Low        | Low       | Minimal   | High       | Medium     |
| Spore Mother      | Summoner, Controller | Medium     | Low        | Minimal   | Medium    | Low        | High       |
| Highwayman        | Skirmisher           | Low        | Medium     | High      | Low       | Low        | Low        |
| Rogue Inventor    | Controller           | Low        | Medium     | Medium    | High      | Low        | Medium     |
| Mercenary Captain | Support, leader      | Medium     | High       | Medium    | Low       | Medium     | High       |
| Anomaly           | Specialist           | Medium     | Medium     | High      | Medium    | Minimal    | High       |
| Ancient Guardian  | Tank, Controller     | Extreme    | High       | Minimal   | Medium    | High       | Extreme    |
| The Unstable      | Specialist           | Medium     | High       | Medium    | Medium    | Low        | High       |
| Forgeguard Knight | Bruiser              | Medium     | High       | Low       | Minimal   | High       | Medium     |
| Vat Chimera       | Bruiser              | High       | Medium     | Medium    | Minimal   | Low        | Medium     |
| Gear Lancer       | Skirmisher           | Low        | High       | High      | Low       | Medium     | Medium     |
| Static Mote       | Swarmer              | Minimal    | Low        | Medium    | Minimal   | Minimal    | Minimal    |
| Thornling         | Swarmer              | Minimal    | Low        | High      | Minimal   | Low        | Minimal    |

### 9.11 Enemy properties, weaknesses and resistances

**Status: Proposed.** Weak means one damage step up. Resists means one step down. Immune means no damage and no status.

| Enemy         | Properties                             | Weak to                           | Resists                              | Signature behaviour                                                                             |
|-------------------|--------------------------------------------|---------------------------------------|------------------------------------------|-----------------------------------------------------------------------------------------------------|
| Royal Footman     | Human, Organic, Metallic                   | Corrosive, Electric                   | Slashing                                 | Holds shield lines behind a Bastion. Follows leader orders.                                         |
| Royal Longbowman  | Human, Organic                             | Fire, Slashing                        | None                                     | Keeps distance. Fires volleys on command.                                                           |
| Royal Bastion     | Human, Metallic, Armoured, Heavy           | Corrosive, Impact                     | Piercing, Slashing                       | Tower shield blocks frontal projectiles for allies behind.                                          |
| Clockwork Crawler | Artificial, Mechanical, Metallic           | Electric, Impact                      | Immune to Toxic and Biological           | Swarms in packs. Latches on and slows the player.                                                   |
| Iron Sentinel     | Artificial, Mechanical, Metallic, Armoured | Electric, Corrosive, Magnetic effects | Piercing, Slashing. Immune to Toxic      | Slow advance. Guards Mechanists.                                                                    |
| Mechanist         | Human, Organic                             | Slashing, Toxic                       | None                                     | Repairs mechanical allies. Deploys Clockwork Crawlers.                                              |
| Chemical Crawler  | Biological, Toxic, Volatile                | Fire, Cold                            | Toxic, Corrosive                         | Leaves an acid trail. Bursts into a toxic pool on death.                                            |
| Regenerator       | Biological, Organic, Regenerating          | Fire, Corrosive                       | Toxic, Slashing                          | Regenerates after a short time without damage. Burning and Corroded stop regeneration.              |
| Volatile Specimen | Biological, Volatile, Explosive            | Piercing, Cold                        | Fire                                     | Rushes the player and detonates. The blast hurts other enemies too.                                 |
| Hunting Hound     | Beast, Organic                             | Slashing, Fire                        | None                                     | Packs flank, strike, then retreat.                                                                  |
| Ironback Beetle   | Beast, Organic, Armoured                   | Impact, Toxic                         | Piercing from the front                  | Charges. The shell guards the front. The rear takes extra damage.                                   |
| Spore Mother      | Fungal, Organic, Biological                | Fire, Corrosive                       | Toxic, Biological                        | Spawns spore pods. Spreads slowing spore clouds.                                                    |
| Highwayman        | Human, Organic                             | Impact, Slashing                      | None                                     | Dashes in. Steals gold on hit and drops the gold on death.                                          |
| Rogue Inventor    | Human, Organic, Mechanical                 | Electric, Slashing                    | None                                     | Throws traps and mines. Carries a random experimental weapon.                                       |
| Mercenary Captain | Human, Metallic, Leader                    | Corrosive, Toxic                      | Slashing                                 | Commands Outlaws. Raises nearby ally damage. Orders flanks.                                         |
| Anomaly           | Anomalous, Unstable                        | Electric                              | Shifts on a visible cycle                | Teleports short distances. Resistance changes every few seconds.                                    |
| Ancient Guardian  | Anomalous, Stone, Construct                | Impact, Corrosive                     | Fire, Cold, Electric                     | Dormant until disturbed. Sends shockwaves across the arena.                                         |
| The Unstable      | Anomalous, Volatile, Unstable              | Cold                                  | Shorter status durations                 | Suppresses Auxiliary components on nearby player weapons.                                           |
| Forgeguard Knight | Human, Metallic, Armoured, Heavy, Thermal  | Cold, Corrosive                       | Fire, Slashing                           | Heated plate. Hammer slams leave burning ground for a short time.                                   |
| Vat Chimera       | Biological, Organic, Mutated               | Fire, Slashing                        | Toxic, Corrosive                         | Gains a random elite modifier at half health.                                                       |
| Gear Lancer       | Artificial, Mechanical, Metallic           | Electric, Impact                      | Piercing. Immune to Toxic and Biological | Winds up, then charges in a straight line. Stalls after hitting a wall.                             |
| Static Mote       | Anomalous, Electric, Conductive            | Impact, Cold                          | Electric                                 | Drifts in clusters. Bursts on death, arcing Electric damage to everything nearby, enemies included. |
| Thornling         | Organic, Plant                             | Fire, Slashing                        | Toxic                                    | Swarms the player. Leaves a seed on death, which sprouts again unless burned.                       |

Artificial enemies are immune to Poisoned, Bleeding and Infected. Section 9.14 lists the replacement effects.

### 9.12 Elite modifiers

**Status: Proposed.** Elites gain one Health step plus one modifier in Territory 1, two modifiers in Territories 2 and 3, and three in endless mode. Each modifier has a clear visual marker.

| Modifier | Effect                                | Counter                      |
|--------------|-------------------------------------------|----------------------------------|
| Armoured     | Armour up two steps                       | Corrosive, Impact                |
| Swift        | Speed and attack speed up one step        | Cold, Stun, traps                |
| Volatile     | Explodes on death                         | Range, knockback                 |
| Regenerating | Heals over time                           | Fire, Corrosive, burst damage    |
| Shielded     | Frontal shield blocks projectiles         | Arcing shots, flanking, Electric |
| Commanding   | Nearby allies gain Damage up, Low         | Focus fire, Marked               |
| Splitting    | Splits into two smaller copies on death   | Area damage                      |
| Resistant    | Resists one damage type, shown by an icon | A second damage type             |
| Hardened     | Immune to one status effect               | Mixed payloads                   |
| Magnetised   | Pulls Metallic projectiles off course     | Non-metallic weapons, melee      |
| Infectious   | Leaves a toxic pool on death              | Movement, Range                  |
| Vampiric     | Heals on each hit against the player      | Armour, Evasion                  |

### 9.13 Champion modifiers

**Status: Proposed.** Champions appear from Round 15, the start of Territory 3, with one active at a time. A champion gains two Health steps, two elite modifiers and one champion trait. Champions drop a rare component or a large Research Point reward.

| Trait        | Effect                                                                                                     |
|------------------|----------------------------------------------------------------------------------------------------------------|
| Warlord          | Summons an escort group at set health thresholds                                                               |
| Juggernaut       | Immune to Stun, knockback and slows                                                                            |
| Purifier         | Clears all status effects and empties all status meters every few seconds                                      |
| Phase-Shifter    | Teleports after taking a large burst of damage                                                                 |
| Reactive Plating | Gains resistance to the damage type taken most, for a short time. The only form of adaptation, per Section 9.7 |
| Siege Breaker    | Targets and destroys player constructs and traps first                                                         |
| Overclocked      | Speed and attack speed up two steps below half health                                                          |

### 9.14 Status-effect rules

**Status: Definitions and reactions proposed. Stacking model confirmed in version 0.3.**

| Effect  | Source                 | Behaviour                                        | Artificial enemies                |
|-------------|----------------------------|------------------------------------------------------|---------------------------------------|
| Burning     | Fire                       | Damage over time                                     | Become Overheated instead             |
| Poisoned    | Toxic                      | Damage over time, ignores Armour                     | Immune                                |
| Corroded    | Corrosive                  | Lowers Armour. Stronger against Metallic enemies     | Full effect                           |
| Electrified | Electric                   | Damage over time with a chance to arc                | Short-circuited instead: a brief stop |
| Frozen      | Cold                       | Each hit slows. A full meter freezes the target      | Full effect                           |
| Bleeding    | Slashing                   | Damage over time, faster while the target moves      | Immune                                |
| Stunned     | Impact                     | Brief stop. The Stun meter grows after each stun     | Full effect                           |
| Infected    | Biological                 | Damage over time. Spreads to a nearby enemy on death | Immune                                |
| Marked      | Precise                    | Critical Chance against the target up                | Full effect                           |
| Overheated  | Fire on Artificial enemies | Slower attacks. Extra Electric and Cold damage taken | Artificial only                       |

**Status reactions**

| Reaction      | Trigger                                                | Effect                                       |
|-------------------|------------------------------------------------------------|--------------------------------------------------|
| Shatter           | Impact hit on a Frozen enemy                               | Burst damage. Ends Frozen                        |
| Steam Burst       | Fire hit on a Frozen enemy, or Cold hit on a Burning enemy | Small area burst. Ends both effects              |
| Toxic Fumes       | Burning and Poisoned together                              | Poison cloud around the target                   |
| Galvanic Surge    | Electrified and Corroded together                          | Electric damage up against the target            |
| Septic Wound      | Bleeding and Infected together                             | Infection spreads faster                         |
| Short Circuit     | Electric hit on an Overheated enemy                        | Stun plus burst damage                           |
| Calculated Strike | Critical hit on a Marked enemy                             | Critical Damage up for the hit, then Marked ends |

**Decision: build-up meters.**

- Each status effect has its own meter on each enemy.

- Each hit with a status payload fills the meter by the weapon Status Build-up, raised by player Status Potency.

- A full meter triggers the effect at full strength for a set duration, then the meter empties.

- Hits during an active effect refill the meter. A second trigger refreshes the duration.

- Meters drain slowly when the enemy receives no build-up.

- Meter size grows with rank: Normal, Elite, Champion, Boss. Bosses resist through larger meters, not immunity.

- Health bars show meter icons, so players see effects coming.

- Tuning target: a Medium payload fills a Normal enemy meter in about three hits, so damage over time starts quickly.

### 9.15 AI implementation

**Status: Proposed.** Details for the five-layer architecture in Section 9.4.

- **Physical simulation:** movement with separation forces, so groups spread out instead of stacking. Simple avoidance around obstacles and hazards.

- **Combat behaviour:** each attack runs wind-up, strike and recovery. Every attack shows a telegraph before damage.

- **Individual decisions:** utility scoring, described below.

- **Group intelligence:** squads share a blackboard holding leader orders, formation slots and target data.

- **Tactical director:** the encounter director from Section 4.7 assigns squads to goals such as Surround, Pin or Protect.

**Utility scoring.** Each enemy scores six actions several times per second and picks the highest score.

| Action     | Main inputs                                      |
|----------------|------------------------------------------------------|
| Attack         | Distance to player, attack ready, attack tokens free |
| Protect allies | Ally health, ally role, own role (Tank or Support)   |
| Retreat        | Own health, nearby threat, personality               |
| Regroup        | Distance from squad, squad size, leader alive        |
| Flank          | Player facing, free flank slots, own speed           |
| Use ability    | Ability ready, ability conditions met, squad order   |

**Personality weights.** Personality multiplies the base score for each action.

| Personality | Attack                | Protect | Retreat | Regroup | Flank |
|-----------------|---------------------------|-------------|-------------|-------------|-----------|
| Aggressive      | High                      | Low         | Minimal     | Low         | Medium    |
| Defensive       | Low                       | High        | Medium      | High        | Minimal   |
| Cowardly        | Low                       | Minimal     | High        | Medium      | Low       |
| Disciplined     | Medium                    | Medium      | Low         | High        | High      |
| Territorial     | High near home zone       | Medium      | Low         | Medium      | Low       |
| Unstable        | Random                    | Random      | Random      | Random      | Random    |
| Predatory       | High against weak targets | Minimal     | Low         | Low         | High      |

**Fairness and performance rules**

- Attack tokens: a limited number of enemies attack the player at once, scaled by difficulty. Others circle, flank or wait. Damage stays readable without fewer enemies on screen.

- Update frequency by distance: enemies near the player update every frame, mid-range enemies every few frames, distant enemies a few times per second.

- A spatial grid handles neighbour checks and targeting queries.

- Object pooling covers enemies, projectiles and effects.

- Leader death: the squad keeps the last order, loses formation bonuses and switches to individual scoring with a Regroup bias.

### 9.16 Signature enemies

**Status: Confirmed in version 0.7: one signature enemy per kingdom, for 23 enemies in total. Stats proposed.** Sections 9.10, 9.11 and 4.11 include the five new enemies. Each signature enemy belongs to the kingdom's home faction and appears mainly in the home kingdom.

| Enemy         | Kingdom | Faction        | Design purpose                                                                  |
|-------------------|-------------|--------------------|-------------------------------------------------------------------------------------|
| Forgeguard Knight | Keldrath    | Kingdom Armies     | Heavy melee pressure. Teaches Cold and Corrosive counters to heated armour          |
| Vat Chimera       | Myrathis    | Failed Experiments | Unpredictable bruiser. Gains a random elite modifier at half health                 |
| Gear Lancer       | Merovant    | Clockwork Legions  | Line charges. Teaches sidestepping and wall baiting                                 |
| Static Mote       | Orthelyn    | Unknown            | Low-cost swarmer for Orthelyn's early rounds. Death bursts arc to everything nearby |
| Thornling         | Nymora      | Wilds              | Swarmer. Leaves seeds on death, which sprout again unless burned                    |

## 10. BOSS SYSTEM

### 10.1 Boss concepts

**Iron Regent**

- Armoured ruler reinforced by engineers.

**Abomination**

- Mutating biological creature.

- Changes resistances and attack patterns.

**Grand Automaton**

- Deploys mechanical enemies.

- Changes behaviour as components are destroyed.

**Spore Sovereign**

- Spreads fungal growth.

- Summons supporting creatures.

**The Unmaking**

- Manipulates the battlefield.

- Disrupts scientific effects.

### 10.2 Boss design principles

Bosses should have:

- Multiple phases.

- Recognisable attack patterns.

- Unique environmental mechanics.

- Meaningful rewards.

- Clear visual communication.

Bosses should test the player’s build without making a specific build mandatory.

Example Grand Automaton phases:

- Phase 1: Defensive systems.

- Around 70% health: Overload.

- Around 30% health: Emergency protocol.

Exact boss schedules and territory assignments remain to be confirmed.

Assignments and phases appear in Sections 10.3 to 10.6.

### 10.3 Boss roster

**Status: Assignments confirmed in version 0.7. Signature attacks proposed.** The Unmaking becomes the boss of Orthelyn. Each signature attack also feeds the Convergence phase (Section 4.10).

| Boss        | Kingdom | Signature attack                                                                | Main counters                                       |
|-----------------|-------------|-------------------------------------------------------------------------------------|---------------------------------------------------------|
| Iron Regent     | Keldrath    | Royal Decree: a hammer slam sending three shockwaves in a cone                      | Corrosive and Cold strip armour. Kill the engineers     |
| Abomination     | Myrathis    | Mutagenic Spew: a cone of bile leaving acid pools                                   | Mixed damage types. Fire on the exposed core            |
| Grand Automaton | Merovant    | Gatling Sweep: a rotating barrage from the arm turrets                              | Electric and Impact. Destroy arms and belts             |
| The Unmaking    | Orthelyn    | Null Field: an expanding ring suppressing synergies and Auxiliary components inside | Movement. Marked and critical hits reveal the real body |
| Spore Sovereign | Nymora      | Spore Burst: a ring of pods hatching Thornlings                                     | Fire and Area damage. Burn the fungal growth            |

### 10.4 Boss phase specifications

**Status: Proposed.** All territory bosses have Extreme Health and High Damage. Phase changes happen at 70 and 30 per cent health, with a short invulnerable transition.

#### Iron Regent

- **Phase 1. Court of Steel.** Sword sweeps and a shield charge. Two engineers repair the Regent's armour. Killing the engineers stops repairs.

- **Phase 2. Glowing Plate.** The armour heats up: Fire resistance, Cold weakness. Molten channels open around the throne.

- **Phase 3. Unbound.** The Regent sheds the armour, moves faster and uses Royal Decree often. Forgeguard Knights join.

#### Abomination

- **Phase 1. Adaptation.** Every few seconds the Abomination resists the damage type taken most, shown by colour. Mixed builds keep pressure up.

- **Phase 2. Overgrowth.** Grows extra limbs and spawns Chemical Crawlers from the vats.

- **Phase 3. Meltdown.** Frenzied attacks. After each Mutagenic Spew, the core sits exposed for a short window.

#### Grand Automaton

- **Phase 1. Defensive systems.** A frontal shield blocks projectiles. Arm turrets fire Gatling Sweeps. Destroying an arm removes the matching attack.

- **Phase 2. Overload.** Steam vents open around the body. The Automaton takes extra Electric and Cold damage.

- **Phase 3. Emergency protocol.** Releases swarms of Clockwork Crawlers and self-repairs from belt parts until the player destroys the belts.

#### The Unmaking

- **Phase 1. Displacement.** Teleports between plaza points and erases tiles.

- **Phase 2. Null and gravity.** Null Fields spread while gravity flips between pull and push.

- **Phase 3. Probability.** Splits into three copies. Only one takes damage. Marked and critical hits reveal the real body.

#### Spore Sovereign

- **Phase 1. Rooted.** Rooted in the fountain. Spreads fungal growth and fires Spore Bursts.

- **Phase 2. Uprooted.** Leaves the fountain and charges along vine paths.

- **Phase 3. Full Bloom.** Heals from fungal growth. Burning the growth stops the healing.

### 10.5 Mini-boss roster

**Status: Proposed.** One mini-boss per kingdom, fought on the fourth round of the territory and as an escort on boss rounds. Mini-bosses have High Health and two phases, changing at 50 per cent health.

| Mini-boss       | Kingdom | Attacks                                                                                                            | Counter                                   |
|---------------------|-------------|------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| Forge Marshal       | Keldrath    | Flaming halberd sweeps. Plants a war banner raising ally damage. Second phase sets the halberd alight for wider sweeps | Destroy the banner first                      |
| Mad Alchemist       | Myrathis    | Throws random flasks of fire, acid or poison. Second phase drinks a potion and mutates                                 | Range. Kill vat-born adds early               |
| Siege Spider        | Merovant    | Walking cannon. Lays mines and climbs walls to bombard. Second phase drops to the floor and charges                    | Electric. Clear mines with Area damage        |
| Tesla Warden        | Orthelyn    | Places pylons and chains lightning between them. Second phase overloads the rods                                       | Destroy pylons. Avoid standing between pylons |
| Thornback Matriarch | Nymora      | Charges through hedges and calls Thornlings. Second phase raises a thorn shell                                         | Attack the rear. Fire on the shell            |

### 10.6 Escorts and Convergence

**Status: Proposed. Escort timing confirmed in version 0.8.**

- The escort on each boss round is the mini-boss of the previous territory. In Territory 1, the escort is the kingdom's own mini-boss.

- Escorts have one Health step less than a normal mini-boss and use their full attack set.

- Convergence (Round 21): at 30 per cent health, the final boss gains the signature attacks of the two bosses beaten earlier in the run. Each borrowed attack keeps the original boss's colour, so players read the source.

**Decision: the escort fights from the start of the boss round.**

- Boss rounds open at full pressure. The escort's lower Health keeps the opening fair: focusing the escort first clears space for the boss fight.

- Boss and escort telegraphs use different colours, so players read both threats at once.

## 11. PERMANENT PROGRESSION

### 11.1 The Grand Archive

The Grand Archive is the permanent progression hub.

It stores scientific knowledge, inventions, discoveries and unlocks.

It contains six research areas:

1.  Chemistry.

2.  Physics.

3.  Biology.

4.  Engineering.

5.  Mathematics.

6.  Interdisciplinary Research.

### 11.2 Permanent currencies

| Currency         | Purpose           |
|----------------------|-----------------------|
| Archive Points (AP)  | Permanent progression |
| Research Points (RP) | Current-run research  |
| Gold                 | Shops and purchases   |
| Materials            | Crafting and upgrades |

### 11.3 AP reward proposals

| Activity                 | AP |
|------------------------------|--------|
| Complete ordinary round      | 2      |
| Defeat mini-boss             | 10     |
| Defeat territory boss        | 20     |
| Discover technology          | 3      |
| Discover hidden technology   | 8      |
| Complete campaign            | 25     |
| Complete challenge           | 5–20   |
| Defeat final boss (Round 21) | 40     |
| Defeat escort mini-boss      | 0      |

These values are provisional.

### 11.4 Permanent unlock categories

**Scientific knowledge**

- Research branches.

- Technologies.

- Interdisciplinary discoveries.

**Starting advantages**

- Starting gold.

- Starting Research Points.

- Health improvements.

- Research efficiency.

- Material collection.

- One revival per campaign (Section 3.8).

**Invention catalogue**

- Weapon frames.

- Component recipes.

- Specialist equipment.

- Experimental crafting.

**Character and world records**

- Characters.

- Starting loadouts.

- Enemy information.

- Cosmetics.

- Archive decorations.

### 11.5 Permanent upgrade limits

Proposed account-wide limits:

| Upgrade           | Maximum |
|-----------------------|-------------|
| Starting gold         | +30         |
| Starting RP           | +15         |
| Maximum health        | +5%         |
| Research efficiency   | +5%         |
| Material collection   | +5%         |
| Starting shop rerolls | +1          |
| Revivals per campaign | 1           |

These are provisional.

### 11.6 Hybrid unlock philosophy

Permanent unlocks are a mixture of:

- Archive purchases.

- Achievement rewards.

- Hidden discoveries.

Some unlocks are purchased using AP.

Others require specific challenges or discoveries.

### 11.7 Challenge rewards

Challenge rewards include gameplay content and cosmetics.

Examples:

**First Invention**

- Discover a cross-disciplinary technology.

- Reward: AP.

**Mechanical Menace**

- Defeat 500 mechanical enemies.

- Reward: Clockwork weapon skin and AP.

**Scientific Perfection**

- Discover five interdisciplinary technologies.

- Reward: Archive decoration and AP.

**Against All Odds**

- Defeat a boss with all three weapons at their base grade.

- Reward: Exclusive equipment and AP.

### 11.8 Respec system

**Confirmed: Hybrid respec system.**

Three purchase categories:

**Permanent discoveries**

- Cannot be refunded.

- Remain permanently unlocked.

**Optional specialisations**

- Can be reset.

- 100% AP refund. Confirmed in version 0.5.

- Free between campaigns.

**Permanent stat upgrades**

- Can be reset.

- 90% AP refund. Confirmed in version 0.5.

### 11.9 Progression philosophy

Permanent progression should:

- Increase available choices.

- Encourage experimentation.

- Reward mastery.

- Avoid excessive statistical power.

- Preserve campaign difficulty.

- Avoid mandatory grinding.

### 11.10 Grand Archive catalogue

**Status: Proposed.**

- Starting knowledge: all 15 centre nodes plus two inner nodes per discipline: Blackpowder, Volatile Compounds, Leyden Jars, Magnetic Fields, Anatomy, Chitin Studies, Forging, Repeating Mechanisms, Statistics and Trigonometry. 25 nodes in total.

- Every other node needs discovery with Archive Points, except hidden nodes.

- Discovered nodes still need researching in each run (Section 8.10). Discoveries never refund (Section 11.8).

| Discovery          | Archive Points | Condition                          | Nodes | Total |
|------------------------|--------------------|----------------------------------------|-----------|-----------|
| Remaining inner nodes  | 20                 | None                                   | 15        | 300       |
| Middle nodes           | 40                 | Practitioner mastery in the discipline | 30        | 1,200     |
| Outer nodes            | 80                 | Expert mastery in the discipline       | 20        | 1,600     |
| Cross-discipline nodes | 60                 | Every required node discovered         | 20        | 1,200     |
| Hidden nodes           | Free               | Meet the condition in a run            | 10        | 0         |

### 11.11 Permanent upgrade costs

**Status: Proposed.** Version 0.5 raises the starting gold and Research Point limits in Section 11.5 to fit the 21-round economy. Respec refunds follow Section 11.8: 90 per cent for these upgrades.

| Upgrade                  | Steps      | Cost per step (Archive Points) | Total |
|------------------------------|----------------|------------------------------------|-----------|
| Starting gold +30            | 3 steps of +10 | 30, 60, 90                         | 180       |
| Starting Research Points +15 | 3 steps of +5  | 30, 60, 90                         | 180       |
| Maximum health +5%           | 5 steps of 1%  | 40, 60, 80, 100, 120               | 400       |
| Research efficiency +5%      | 5 steps of 1%  | 40, 60, 80, 100, 120               | 400       |
| Material collection +5%      | 5 steps of 1%  | 40, 60, 80, 100, 120               | 400       |
| Starting shop rerolls +1     | 1 step         | 150                                | 150       |
| Revival                      | 1 step         | 250                                | 250       |
| All upgrades                 |                |                                    | 1,960     |

### 11.12 Specialisations

**Status: Proposed.** Section 11.8 lists optional specialisations without defining them.

- Ten specialisations, two per discipline. Each costs 100 Archive Points.

- Players equip up to two per campaign, or three after reaching Grandmaster in any discipline (Section 8.13).

- Swaps between campaigns are free, with a full refund (Section 11.8).

- Each specialisation pairs a bonus with a drawback, so builds change shape instead of growing stronger.

| Specialisation | Discipline | Bonus                                            | Drawback                  |
|--------------------|----------------|------------------------------------------------------|-------------------------------|
| Pyrotechnist       | Chemistry      | Fire damage up, Medium                               | Cold damage down, Low         |
| Toxicologist       | Chemistry      | Poisoned and Corroded meters fill faster             | Direct hit damage down, Low   |
| Electrician        | Physics        | Electric chains jump to one extra enemy              | Max Health down, Low          |
| Kineticist         | Physics        | Knockback and projectile speed up, Medium            | Area down, Low                |
| Field Medic        | Biology        | Regeneration up, Medium                              | Damage down, Low              |
| Naturalist         | Biology        | Specimen yield up, Medium                            | Gold drops down, Low          |
| Mechanic           | Engineering    | Construct Strength up, Medium                        | Player Attack Speed down, Low |
| Siegewright        | Engineering    | Siege damage up, Medium                              | Move Speed down, Low          |
| Gambler            | Mathematics    | Critical Chance and Fortune up, Medium               | Armour down, Low              |
| Accountant         | Mathematics    | Shop prices down 10 per cent. Research Yield up, Low | Damage down, Low              |

### 11.13 Achievement rewards

**Status: Proposed.** Section 11.3 sets challenge rewards at 5 to 20 Archive Points.

| Band | Archive Points | Example from Section 11.7 |
|----------|--------------------|-------------------------------|
| Easy     | 5                  | First Invention               |
| Medium   | 10                 | Mechanical Menace             |
| Hard     | 15                 | Scientific Perfection         |
| Extreme  | 20                 | Against All Odds              |

- Cosmetic and gameplay rewards stay as listed in Section 11.7.

- Challenge Archive Points never scale with Challenge Tiers (Section 3.9).

### 11.14 Archive pacing

**Status: Proposed.**

| Archive content | Archive Points |
|---------------------|--------------------|
| Node discovery      | 4,300              |
| Permanent upgrades  | 1,960              |
| Specialisations     | 1,000              |
| Full Archive        | 7,260              |

- A Normal win earns about 165 Archive Points plus discoveries. A loss around Round 10 earns about 50.

- With Challenge Tier rates, an average of 90 to 130 Archive Points per run completes the Archive in about 55 to 80 runs: roughly 23 to 47 hours at 25 to 35 minutes per run.

- Every run earns enough for at least one discovery, so each session adds new options.

## 12. CHARACTER SYSTEM

### 12.1 Initial character concepts

**The Engineer**

- Engineering-focused.

- Starts with a mechanical component.

- Specialises in machinery and automation.

**The Alchemist**

- Chemistry-focused.

- Starts with a chemical weapon.

- Specialises in reactions and status effects.

**The Scholar**

- Mathematics-focused.

- Starts with improved research opportunities.

- Specialises in research efficiency and probability.

These are conceptual characters.

### 12.2 Character design principles

Each character should have:

- A unique starting bonus.

- A special gameplay mechanic.

- A weakness or limitation.

- An associated mastery challenge.

- A distinct visual identity.

Characters should change playstyles rather than simply provide stronger statistics.

## 13. ENDGAME

### 13.1 Campaign completion

The standard campaign ends at Round 21.

The player defeats the final boss and receives:

- AP.

- Permanent discoveries.

- Achievement progress.

- Campaign statistics.

- Character progression.

The final boss adds a Convergence phase. Players continuing into endless mode receive a free milestone shop with guaranteed Extraordinary stock (Section 4.10).

### 13.2 Endless mode

After defeating the final boss, players can choose to:

- End the campaign.

- Continue into endless mode.

Endless mode retains the player’s current build.

It introduces:

- Remaining territories.

- Increasing enemy populations.

- Stronger enemy combinations.

- Advanced elite modifiers.

- More complicated boss encounters.

- Experimental discoveries.

Territories are shuffled after the remaining territory pool has been exhausted.

Rotation rules appear in Section 13.3.

The goal becomes surviving as long as possible.

### 13.3 Endless rotation

**Status: Proposed. Records confirmed in version 0.8.**

- Order: the two unvisited kingdoms in random order, then all five reshuffled for each loop. A kingdom never follows itself across loops.

- Each endless territory keeps the seven-round structure: a mini-boss on the fourth round, a boss with an escort on the seventh.

- Each completed loop of five raises enemy Health and Damage by one step on top of Territory 3 levels.

- Endless bosses gain a Convergence phase with the signature attacks of the two most recently beaten bosses.

- Relics follow Section 5.12. Shop prices rise 20 per cent with each new territory (Section 6.5).

- Archive Points use normal round and boss rates. Endless mode pays no campaign completion bonus.

- The run ends on death. The Grand Archive records the furthest round reached for each character.

**Decision: personal bests only, for now.** No servers, and endless mode works offline on mobile. Online leaderboards stay a candidate for a later update.

## 14. REWARD SYSTEM

Enemies can provide:

- Gold.

- Research Points.

- Components.

- Reagents.

- Crystals.

- Specimens.

Rewards should be connected to enemy faction and scientific properties.

Special combat interactions may produce:

- Research samples.

- Hidden discoveries.

- Rare materials.

- Experimental components.

Exact drop rates and reward quantities remain unconfirmed.

Proposed values appear in Sections 14.1 to 14.3.

### 14.1 Gold drops

**Status: Proposed.**

| Source                               | Gold |
|------------------------------------------|----------|
| Normal enemy                             | 1        |
| Elite                                    | 4        |
| Champion                                 | 12       |
| Mini-boss                                | 20       |
| Escort mini-boss                         | 0        |
| Territory boss, including the final boss | 40       |

- Gold drops as pickups, collected through Pickup Radius.

- Uncollected gold flies to the player when the round ends.

### 14.2 Material and component drops

**Status: Proposed.**

| Source       | Materials                            | Components                             |
|------------------|------------------------------------------|--------------------------------------------|
| Normal enemy     | 6 per cent chance of 1                   | None                                       |
| Elite            | 1, plus a 25 per cent chance of a second | 5 per cent chance                          |
| Champion         | 3                                        | One Rare or better                         |
| Mini-boss        | 4                                        | 25 per cent chance of a Rare (Section 5.5) |
| Escort mini-boss | 4                                        | None                                       |
| Territory boss   | 8                                        | Unique territory reward (Section 5.5)      |

| Faction        | Material types  |
|--------------------|---------------------|
| Kingdom Armies     | Scrap               |
| Clockwork Legions  | Scrap, Crystals     |
| Failed Experiments | Reagents, Specimens |
| Wilds              | Specimens           |
| Outlaws            | Scrap, Reagents     |
| Unknown            | Crystals            |

### 14.3 Run economy estimate

**Status: Proposed.** Model assumptions: a Round 1 threat budget of 40 units, the budget curve from Section 4.11, average kill costs rising by territory and two champions in Territory 3. Values exclude Archive upgrades.

| Stage        | Kills | Gold | Research Points | Materials | Archive Points |
|------------------|-----------|----------|---------------------|---------------|--------------------|
| Territory 1      | 255       | 337      | 398                 | 40            | 40                 |
| Territory 2      | 410       | 544      | 672                 | 70            | 40                 |
| Territory 3      | 539       | 753      | 982                 | 106           | 60                 |
| Winning run      | 1,204     | 1,634    | 2,052               | 216           | 165                |
| Loss at Round 10 | 425       | 538      | 639                 | 63            | 46                 |

Winning-run Archive Points include the 25 for campaign completion. Typical gold spending in a winning run:

| Spending                                                        | Gold                          |
|---------------------------------------------------------------------|-----------------------------------|
| Weapon grades: two weapons to Grade IV, one to Grade III            | 775                               |
| Eight components bought across three territories, with price growth | About 490                         |
| Six components built                                                | About 120                         |
| Six paid shop visits plus rerolls                                   | About 200                         |
| One merge                                                           | 50                                |
| Total                                                               | About 1,635, against 1,634 earned |

- Research: about 25 nodes for about 1,635 Research Points, leaving room for refunds and reallocation.

- Materials: typical demand sits near 150 per run against a supply of about 216. The surplus covers mismatched material types.

## 15. VISUAL AND USER INTERFACE DIRECTION

Visual direction confirmed in version 0.9. Details appear in Sections 15.1 to 15.4.

The proposed aesthetic combines:

- Medieval fantasy.

- Early scientific experimentation.

- Brass, iron and parchment.

- Scientific instruments.

- Mechanical details.

- Handwritten research notes.

- Experimental laboratory equipment.

Potential interfaces include:

1.  Main menu.

2.  Character selection.

3.  Campaign overview.

4.  Arena HUD.

5.  Round results.

6.  Preparation screen.

7.  Grand Archive.

8.  Weapon workshop.

9.  Shop interface.

10. Inventory.

11. Bestiary.

12. Campaign victory screen.

13. Endless mode interface.

A consistent design system should be established before detailed UI implementation.

Section 15.1 sets the core design system: palettes, damage type colours, typography and line weights.

### 15.1 Visual identity

**Status: Art style, camera and interface theme confirmed in version 0.9. AI-generated art confirmed in version 1.0. Details proposed.**

- **Art style:** hand-drawn 2D. Ink linework with flat colour fills and light cross-hatching for shade, like illustrations in an inventor's notebook.

- **Art source:** AI-generated images, made from one fixed style prompt for consistency (ART_PROMPTS.md in the build pack, Section 15.17). Until each image exists, the game draws a simple placeholder shape in the faction or damage type colour.

- **Line weights at 1080p:** 3 pixels for characters and enemies, 2 pixels for props and arena detail, 4 pixels for bosses. The style prompt asks for these weights so generated images match.

- **Interface theme:** the Inventor's Notebook. Parchment panels, ink sketches, brass fittings and wax seals. Weapons and components appear as annotated blueprints.

- **Readability first:** arena floors stay muted and low in contrast. Enemies, projectiles and telegraphs carry the strongest colours and darkest outlines.

- **Danger colour:** every enemy attack telegraph uses one crimson outline, so players learn one warning colour. Escort telegraphs use the same crimson with a dashed edge (Section 10.6).

- **Player colour:** player projectiles and effects lean warm gold, so players separate their own attacks from enemy fire.

**Kingdom palettes.** Each kingdom has a primary colour, an accent and a signature material. Arenas, story cards, relics and music themes follow these.

| Kingdom | Primary  | Accent      | Material             |
|-------------|--------------|-----------------|--------------------------|
| Keldrath    | Ember orange | Soot black      | Iron and forge fire      |
| Myrathis    | Acid green   | Amber           | Glass and copper tubing  |
| Merovant    | Teal         | Polished brass  | Gears and lacquered wood |
| Orthelyn    | Violet       | Starlight white | Marble and lenses        |
| Nymora      | Moss green   | Gold            | Living wood and petals   |

**Damage types and status effects.** Each damage type has one colour and one icon shape. Status meters use the same pair. Shapes keep the code readable for colour-blind players (Section 3.10).

| Damage type | Colour      | Icon shape |
|-----------------|-----------------|----------------|
| Slashing        | Silver white    | Crescent       |
| Piercing        | Pale steel blue | Arrowhead      |
| Impact          | Ochre           | Starburst      |
| Fire            | Orange          | Flame          |
| Cold            | Ice cyan        | Snowflake      |
| Electric        | Yellow          | Zigzag         |
| Toxic           | Green           | Droplet        |
| Corrosive       | Lime            | Bubbles        |
| Biological      | Magenta         | Spore cluster  |

**Typography.** All three typefaces use the free SIL Open Font License.

- Headings: IM Fell English, an old-style printed face.

- Body text, tooltips and numbers: Alegreya Sans, for clear reading at small sizes on mobile.

- Handwritten notes in the research web and Codex: Caveat, used sparingly.

- Minimum text size on mobile: 14 points for body text, 12 points for secondary labels.

### 15.2 Camera

**Status: Top-down three-quarter view confirmed in version 0.9. Behaviour proposed.**

- The camera looks down at a three-quarter angle. Characters show their faces and fronts, and floors stay readable.

- The camera follows the player with a small look-ahead in the direction of movement.

- Arenas are larger than the screen. The camera stops at arena edges, so the player never sees past the walls.

- Mobile uses a slightly wider view than PC to make up for the smaller screen.

- Boss rounds widen the view so every telegraph stays on screen.

- Screen shake stays small and switches off in the accessibility settings (Section 3.10).

- Mobile layouts respect safe areas around notches and rounded corners.

### 15.3 Animation

**Status: Proposed for AI-generated art.** Each character and enemy is one generated image, brought to life in code. No frame-by-frame drawing.

- **Idle and movement:** a gentle bob, a lean toward the direction of travel and a slight squash on each step, all from tweens in code.

- **Attacks:** a wind-up pull-back, a quick lunge and a crimson telegraph drawn in code (Section 15.1).

- **Hit reactions:** a white flash and a small knockback.

- **Deaths:** the sprite shrinks and fades while ink-splatter particles burst out.

- **Bosses:** one image per phase, swapped at each phase change with a flash and a short shake.

- **Weapons:** melee swings use an arc drawn in code. Projectiles are small generated sprites or code-drawn shapes.

### 15.4 Visual effects

**Status: Proposed.** A shared effects library keeps the workload small.

- Effects drawn in code with particles and simple shapes, tinted by damage type: one hit spark, one burst and one trail per damage type, 27 effects in total.

- Explosions in three sizes, tinted by damage type.

- Status meters show as small icons above enemy health bars. Triggered effects add a coloured outline to the enemy.

- Status reactions (Section 9.14) each have one unique effect, 7 in total.

- Synergy activation shows a brief ink flourish around the weapon tile in the HUD.

- Effect density scales down on mobile and with the accessibility slider, with no change to gameplay (Section 7.21).

### 15.5 Screen flow

**Status: Proposed.** The 13 interfaces listed above map to the screens below. Mockups of the key screens sit on a design canvas (Section 15.16).

| Screen          | Covers                                                          | Section |
|---------------------|---------------------------------------------------------------------|-------------|
| Grand Archive hub   | Main menu, Grand Archive, Codex (bestiary), challenges              | 15.6        |
| Character selection | Character choice before a campaign                                  | 15.9        |
| Combat HUD          | Arena HUD, event banners, boss bars                                 | 15.7        |
| Round results       | Short summary after each round                                      | 15.9        |
| Preparation         | Workbench (weapon workshop and inventory), Research, Shop           | 15.8        |
| Transition          | Relic choice, captured research, kingdom reveal (campaign overview) | 15.9        |
| Victory             | Ending card, statistics, endless mode choice                        | 15.9        |
| Pause               | Build summary, settings, quit                                       | 15.9        |

### 15.6 Main menu: the Grand Archive hub

**Status: Proposed.** The main menu is a single hand-drawn illustration of the Archive's library hall. Each object is a hotspot. Mobile adds a list menu along the side for quick access.

| Hotspot     | Opens                                                                          |
|-----------------|------------------------------------------------------------------------------------|
| Map table       | New campaign: character selection, then the first territory                        |
| Continue seal   | Resume a saved run. Shown only when a run exists                                   |
| Archive shelves | Grand Archive: discoveries, permanent upgrades, specialisations                    |
| Lectern         | Codex: enemies, synergies, status reactions, relics, lore and endings found so far |
| Trophy cabinet  | Challenges, mastery ranks and endless personal bests                               |
| Desk lamp       | Settings and accessibility                                                         |

### 15.7 Combat HUD

**Status: Proposed.** The HUD stays lean and keeps the centre of the screen clear.

| Element                | PC position | Mobile position             | Notes                                  |
|----------------------------|-----------------|---------------------------------|--------------------------------------------|
| Health bar and number      | Top left        | Top left                        | Screen-edge warning at low health          |
| Adaptation icons           | Under health    | Under health                    | One icon per adapted damage type           |
| Round, timer and territory | Top centre      | Top centre                      | Event icon appears beside the round        |
| Boss and escort bars       | Under the round | Under the round                 | Phase marks at 70 and 30 per cent          |
| Gold and Research Points   | Top right       | Top right, left of pause        | Materials show in preparation only         |
| Weapon tiles               | Bottom centre   | Bottom centre, smaller          | Glow when a synergy is active              |
| Pause and fast-forward     | Esc and Tab     | Buttons in the top right corner | Fast-forward greys out on boss rounds      |
| Movement                   | Keyboard        | Floating joystick, left half    | Left and right swap in settings            |
| Manual focus               | Mouse           | Second touch, right half        | Focus point shown as a small brass reticle |

### 15.8 Preparation screen

**Status: Proposed.** One screen with three tabs, a resource bar and a large Start button. The Shop tab appears only during shop visits.

#### Workbench tab (weapon workshop and inventory)

- Three weapons appear as blueprint cards. Each card shows sockets for Structure, Mechanism, Payload and Auxiliary. The Auxiliary socket shows a padlock until Grade III or the first merge.

- Owned components sit in a tray along the bottom. The tray holds every owned component with no limit, sorted by slot type.

- Drag a component onto a socket on PC. Tap the component, then the socket, on mobile.

- A synergy panel on the right lists active synergies and near misses, such as “one Electric tag from Conductive Strike”.

- Each weapon card has buttons for Upgrade (with grade cost), Merge and Dismantle. Recipes open in a drawer from the tray.

#### Research tab

- The research web is a circle split into five coloured discipline sectors, with rings from centre to outer edge. Cross-discipline nodes sit on the borders between sectors.

- Node states: undiscovered (hidden), Archive only (dashed outline), discovered (ink outline), available (glowing), researched (filled), and blocked by requirements (greyed with linking lines).

- Archive only: an undiscovered node, other than a hidden node, whose required nodes are all discovered. The web shows the node one step beyond the known tree. Its card shows the effect, the Archive Point price and the mastery rank needed, with progress, and says to buy the node in the Grand Archive. Research stays closed until the discovery.

- Selecting a node opens a card with the effect, cost and requirements. A second press researches the node, instantly.

- Hidden nodes appear as ink smudges once a hint exists (Section 8.12).

- Pan and zoom with the mouse on PC, pinch and drag on mobile.

#### Shop tab

- Free visits start with a choice of shop: three doors with the keepers' portraits.

- The shop shows the keeper, 5 or 6 item cards, the specialist slot and a reroll lever with the current price.

- Locked items show the name of the opening node.

- Each keeper has a personality and short lines for purchases and rerolls: a gruff blacksmith, a twitchy alchemist and a pompous royal inventor.

### 15.9 Other screens

**Status: Proposed.**

| Screen          | Content                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------|
| Character selection | Character portraits around the map table, with starting weapon, trait and mastery rank                 |
| Round results       | Two-second summary of kills, gold and Research Points. Skippable. Shown before preparation             |
| Relic choice        | Three relic cards in the beaten kingdom's palette                                                      |
| Kingdom reveal      | The map of the five kingdoms with the route drawn in ink, then the story card (Section 2.4)            |
| Pause               | Full build summary, seed number, settings and quit                                                     |
| Victory             | Ending card, run statistics, Archive Point tally, then the choice to end or continue into endless mode |
| Endless overlay     | Loop counter and the personal best for the character                                                   |

### 15.10 Audio, music and sound effects

**Status: Code-generated effects and free music confirmed in version 1.0. Details proposed.**

- **Direction:** period instruments such as lute, hurdy-gurdy, recorder and war drums, mixed with mechanical percussion: clock ticks, gears, bellows and steam.

- **Adaptive music:** each kingdom theme has three layers (calm, combat, peak). Layers fade in and out with the threat on screen.

- **Boss themes:** one per boss. The Convergence phase blends the motifs of the three kingdoms visited in the run.

- **Menus:** a quiet Archive theme with page turns and a ticking clock.

- **Sound effects:** one attack sound set per weapon family, one hit sound per damage type, one voice set per enemy faction, and paper, quill and brass sounds for the interface.

- **Mixing:** at most 8 copies of one sound at once, with priority for telegraphs and boss attacks. Music ducks under boss telegraphs.

- **Production:** sound effects come from code, using ZzFX, a tiny sound generator. Music arrives in a later build from free libraries such as OpenGameArt.org and Incompetech. Until then, every music hook stays silent.

| Kingdom | Theme instruments                              |
|-------------|----------------------------------------------------|
| Keldrath    | Brass, anvils and war drums                        |
| Myrathis    | Glass harmonica, harpsichord and bubbling textures |
| Merovant    | Music box, accordion and clock ticks               |
| Orthelyn    | Organ, choir and bell tones                        |
| Nymora      | Wooden flutes, harp and hand percussion            |

### 15.11 Performance targets

**Status: Proposed.** Starting budgets for the relative tiers in Sections 4.11 and 7.21, measured in a desktop browser and a phone browser.

| Target                            | PC                           | Mobile                                |
|---------------------------------------|----------------------------------|-------------------------------------------|
| Frame rate                            | 60 frames per second at 1080p    | 60 frames per second, 30 in battery saver |
| Reference hardware                    | Your own PC in a current browser | Your own phone in a current browser       |
| Active enemies: Medium, High, Extreme | 120, 200, 300                    | 60, 100, 150                              |
| Active player projectiles             | 1,500                            | 600                                       |
| Time from menu to combat              | Under 5 seconds                  | Under 5 seconds                           |
| Memory                                | Under 2 GB                       | Under 1.5 GB                              |
| Download size before music            | Under 40 MB                      | Under 40 MB                               |

### 15.12 Platform requirements

**Status: Confirmed in version 1.0.** Progress & Peril is a personal, non-commercial project, built with Claude Code for one player.

- The game runs in a current desktop browser on PC and in the phone browser.

- The game installs from the browser as a web app and plays offline after the first load.

- Phones play in horizontal orientation. A rotate prompt appears in vertical orientation.

- Controllers work through the browser's gamepad support.

- No app stores, accounts, servers, analytics or data collection.

- Achievements live inside the game as challenges (Section 11.7), with no platform achievements.

- The game runs locally during development and from any free static web host for phone play.

### 15.13 Save system

**Status: Proposed. Personal-use rules confirmed in version 1.0.**

- Saves live in the browser's local storage on each device. Nothing leaves the device.

- Three player profiles. Each profile holds one active run and the Grand Archive.

- The run saves automatically at the start of every preparation phase (Section 3.5). Quitting mid-round returns the player to the last preparation phase.

- The Grand Archive saves after every round and at the end of every run.

- Each save keeps the previous version as a backup.

- Saves carry a version number. Updates convert older saves automatically.

- An export button in Settings produces a save file and a copyable save code. Importing either on another device moves progress between PC and phone.

- The game asks the browser for persistent storage, so the browser keeps saves when space runs low.

### 15.14 Technical architecture

**Status: Proposed.**

- **Data-driven content:** weapons, components, synergies, research nodes, enemies, relics, events and shop odds live in typed data files, so balance changes need no logic changes.

- **Simulation apart from rendering:** game rules live in plain TypeScript modules with no Phaser imports, so automated tests run them without a browser. Phaser scenes draw the state and pass input in.

- **Seeded runs:** every run uses a seed shown in the pause menu. Seeds reproduce bugs and allow daily challenge runs later.

- **Fixed time step:** the combat simulation runs at 60 steps per second. Fast-forward runs more steps per frame.

- **Pooling and spatial grid:** enemies, projectiles and effects come from object pools. A spatial grid handles neighbour and targeting queries (Section 9.15).

- **Synergy evaluation:** tags only change during preparation, so synergies recalculate when the player presses Start, never during combat.

- **Chain reactions:** an event queue spreads chain effects across frames (Section 7.20).

- **Localisation:** all text lives in string tables from day one. English first.

- **Debug tools:** a spawn console, invincibility and an economy logger tracking gold, Research Points and materials per round, for comparison with the model in Section 14.3.

- **Asset manifest:** every image and sound has a key in one manifest file. Missing files fall back to placeholders, so generated art drops in later with no code changes.

### 15.15 Development stack

**Status: Confirmed in version 1.0.**

| Part       | Choice                                                                                                                             |
|----------------|----------------------------------------------------------------------------------------------------------------------------------------|
| Language       | TypeScript in strict mode                                                                                                              |
| Game framework | Phaser 4, version 4.2 or later. Phaser 4 arrived in April 2026 with a new renderer. Most standard Phaser APIs carry over from Phaser 3 |
| Build tool     | Vite, with a web app plugin for offline play and installation                                                                          |
| Tests          | Vitest for the simulation modules                                                                                                      |
| Sound effects  | ZzFX, generated in code                                                                                                                |
| Builder        | Claude Code, working from the build pack (Section 15.17)                                                                               |

### 15.16 Screen mockups

**Status: Proposed.** Mockups of six key screens sit on a design canvas: the Grand Archive hub, the combat HUD on PC and mobile, the Workbench, the Research web and the Shop.

Design canvas: [Progress & Peril screen mockups](https://claude.ai/artifact/KcYPYHjJgqwYdaVEbeLUMH)

### 15.17 Build pack for Claude Code

**Status: Confirmed in version 1.0.** Three Markdown files sit beside this document. Place all three in the root folder of the game project.

| File       | Purpose                                                                                                                                                                               |
|----------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| GDD.md         | This full design document in Markdown, the source of truth for every rule and number                                                                                                      |
| CLAUDE.md      | The build guide: stack, commands, folder layout, coding rules, numbers for the relative tiers and a 13-milestone build plan with done criteria. Claude Code reads this file automatically |
| ART_PROMPTS.md | The style prompt, technical rules and one prompt per image, with the file name the game expects                                                                                           |

To start, open the empty project folder in Claude Code and ask for Milestone 0 from CLAUDE.md.

## 16. AREAS NOT YET DESIGNED

The following areas have not been developed sufficiently and should be treated as open design work.

### 16.1 Core gameplay

- ☑ Exact automatic combat mechanics. Decided in Section 3.4.

- ☑ Manual versus automatic aiming. Decided in Section 3.4.

- ☑ Special ability controls. Decided in Section 3.4.

- ☑ Dodging and movement abilities. Decided in Section 3.4.

- ☑ Player health and damage systems. Drafted in Section 3.7.

- ☑ Player death and revival rules. Decided in Section 3.8.

- ☑ Difficulty settings. Decided in Section 3.9.

- ☑ Accessibility options. Drafted in Section 3.10.

- ☑ Tutorial and onboarding. Drafted in Section 3.11.

- ☑ Pause and game-speed controls. Decided in Section 3.12.

### 16.2 Weapon system

- ☑ Complete initial weapon catalogue. Drafted in Section 7.17.

- ☑ Exact component catalogue. Drafted in Section 7.18.

- ☑ Component crafting recipes. Drafted in Section 7.23.

- ☑ Weapon statistics and formulas. Drafted in Section 7.14.

- ☑ Targeting rules. Drafted in Section 7.15.

- ☑ Projectile physics. Drafted in Section 7.16.

- ☑ Weapon animation and visual effects. Drafted in Sections 15.3 and 15.4.

- ☑ Detailed synergy database. Drafted in Section 7.19.

- ☑ Chain-reaction implementation. Drafted in Section 7.20.

- ☑ Exact weapon upgrade costs. Drafted in Section 7.22.

- ☑ Final component slot rules. Decided in Section 7.12.

- ☐ Weapon balancing and performance limits. Performance limits drafted in Section 7.21. Balancing needs a prototype.

### 16.3 Research system

- ☑ Complete research tree. Drafted in Section 8.12.

- ☑ Individual research node costs. Drafted in Section 8.11.

- ☑ Research time and interface behaviour. Instant research decided in Section 8.10. Interface layout belongs to Phase 5.

- ☑ Exact research material requirements. Drafted in Section 8.11.

- ☑ Mastery thresholds. Drafted in Section 8.13.

- ☑ Research refund implementation. Decided in Section 8.10.

- ☑ Hidden discovery conditions. Drafted in Section 8.12.

- ☑ Permanent discovery catalogue. Drafted in Section 11.10.

- ☐ Research balancing across all five disciplines. Each discipline has 18 nodes. Balance needs a prototype.

### 16.4 Enemies and bosses

- ☑ Full enemy statistics. Drafted in Sections 9.10 and 9.11.

- ☑ Enemy animations. Drafted in Section 15.3.

- ☑ Attack ranges and damage. Drafted in Section 9.10.

- ☑ AI implementation details. Drafted in Section 9.15.

- ☑ Enemy spawn budgets. Drafted in Section 4.11.

- ☑ Elite modifiers. Drafted in Section 9.12.

- ☑ Champion modifiers. Drafted in Section 9.13.

- ☑ Full boss roster. Drafted in Sections 10.3 and 10.5.

- ☑ Boss phase specifications. Drafted in Section 10.4.

- ☑ Status-effect stacking rules. Decided in Section 9.14.

- ☑ Enemy drop tables. Drafted in Section 14.2.

- ☑ Enemy difficulty scaling formulas. Drafted as relative tiers in Section 4.12.

### 16.5 Campaign and world

- ☑ Final territory names and lore. Names in Section 2.2. Lore in Section 2.3.

- ☑ Starting territory selection rules. Drafted in Section 5.7.

- ☑ Exact territory transition sequence. Drafted in Section 5.8.

- ☑ Territory-specific arena designs. Drafted in Section 5.9.

- ☑ Environmental hazard catalogue. Drafted in Section 5.10.

- ☑ Territory event frequency. Drafted in Section 5.11.

- ☑ Territory boss assignments. Decided in Section 10.3.

- ☑ Whether all five territories are available in every campaign. Yes. Section 5.7.

- ☑ Endless mode territory rotation rules. Drafted in Section 13.3.

- ☑ Campaign narrative and ending. Drafted in Section 2.4.

### 16.6 Economy

- ☑ Final AP rewards. Section 11.3 values kept. Pacing in Section 11.14.

- ☑ Final AP purchase costs. Drafted in Sections 11.10 to 11.12.

- ☑ Gold economy. Drafted in Sections 14.1 and 14.3.

- ☑ Material drop rates. Drafted in Section 14.2.

- ☑ Shop visit fee. Drafted in Section 6.5.

- ☑ Shop inventory generation. Drafted in Section 6.6.

- ☑ Shop reroll costs. Drafted in Section 6.5.

- ☑ Free shop inventory rules. Drafted in Sections 6.5 and 6.6.

- ☑ Crafting costs. Drafted in Section 7.23.

- ☑ Dismantling values. Section 7.9 values kept. Recipes match in Section 7.23.

- ☑ Permanent upgrade balancing. Drafted in Section 11.11.

- ☑ Achievement reward values. Drafted in Section 11.13.

### 16.7 Characters

- ☐ Final character roster.

- ☐ Character statistics.

- ☐ Character abilities.

- ☐ Starting weapon selection.

- ☐ Character weaknesses.

- ☐ Character unlock requirements.

- ☐ Character mastery system.

- ☐ Character cosmetics.

### 16.8 Presentation and technical design

- ☑ Main menu. Drafted in Section 15.6, with a mockup.

- ☑ HUD. Drafted in Section 15.7, with PC and mobile mockups.

- ☑ Research interface mockups. Drafted in Section 15.8, with a mockup.

- ☑ Weapon workshop interface. Drafted in Section 15.8, with a mockup.

- ☑ Shop interface. Drafted in Section 15.8, with a mockup.

- ☑ Audio direction. Drafted in Section 15.10.

- ☑ Music. Drafted in Section 15.10.

- ☑ Sound effects. Drafted in Section 15.10.

- ☑ Visual effects. Drafted in Section 15.4.

- ☑ Camera behaviour. Decided in Section 15.2.

- ☑ Performance targets. Drafted in Section 15.11.

- ☑ Platform requirements. Decided in Section 15.12.

- ☑ Save system. Drafted in Section 15.13.

- ☑ Input support. Drafted in Section 3.5.

- ☑ Accessibility. See Section 3.10.

- ☑ Technical architecture. Drafted in Section 15.14.

- ☑ Development engine selection. Decided in Section 15.15.

## 17. DECISIONS REQUIRING FINAL CONFIRMATION

These are particularly important because some have been discussed as suggestions but not explicitly approved.

| Decision                                       | Current status                                                           |
|----------------------------------------------------|------------------------------------------------------------------------------|
| Three weapons per player                           | Confirmed                                                                    |
| Three standard component slots                     | Confirmed                                                                    |
| Fourth auxiliary slot                              | Confirmed. Opens through upgrades or merging (7.12)                          |
| Manual movement                                    | Confirmed                                                                    |
| Automatic attacks                                  | Confirmed. Automatic, with a manual focus (3.4)                              |
| Player-controlled special abilities                | Confirmed. No active abilities (3.4)                                         |
| Free shop after mini-bosses and bosses             | Confirmed                                                                    |
| Paid shop between ordinary rounds                  | Confirmed                                                                    |
| Boss replaces mini-boss at Round 10                | Replaced. Each territory boss fights with a mini-boss escort (4.10)          |
| Twenty-round standard campaign                     | Replaced. 21-round campaign (4.10)                                           |
| Two territories per campaign                       | Replaced. Three territories of seven rounds (4.10)                           |
| Target campaign duration 25–35 minutes             | Confirmed                                                                    |
| Random territory selection                         | Confirmed                                                                    |
| No territory repeats within a campaign             | Proposed                                                                     |
| Complete mystery territory reveal                  | Confirmed                                                                    |
| Endless mode after campaign                        | Confirmed                                                                    |
| Hybrid enemy spawning                              | Confirmed                                                                    |
| Quantity and strength scaling                      | Confirmed                                                                    |
| Gradually longer rounds                            | Confirmed                                                                    |
| Balanced combat pressure                           | Confirmed                                                                    |
| Untimed preparation                                | Confirmed. The player presses Start (4.10)                                   |
| Hybrid permanent progression                       | Confirmed                                                                    |
| Both cosmetic and gameplay challenge rewards       | Confirmed                                                                    |
| Hybrid Grand Archive respec                        | Confirmed                                                                    |
| Target platforms: PC and mobile                    | Confirmed                                                                    |
| Dodging method                                     | Confirmed. Evasion stat only (3.4)                                           |
| Aiming and targeting                               | Confirmed. Fully automatic (3.4)                                             |
| Healing between rounds                             | Confirmed. Full heal (3.7)                                                   |
| Death and revival                                  | Confirmed. One revival bought with Archive Points (3.8)                      |
| Difficulty structure                               | Confirmed. Assist mode plus Challenge Tiers (3.9)                            |
| Game speed controls                                | Confirmed. Pause plus fast-forward toggle (3.12)                             |
| Final boss identity                                | Confirmed. Third territory boss at Round 21 (4.10)                           |
| Director response to player power                  | Confirmed. Fixed curve (4.12)                                                |
| Status-effect stacking model                       | Confirmed. Build-up meters (9.14)                                            |
| Revival cost and Challenge Tier use                | Confirmed. 250 AP, Assist to Challenge Tier 2 (3.8)                          |
| Archive Point rates for Assist and Challenge Tiers | Confirmed. Assist ×0.5, tiers ×1.2 to ×2.0 (3.9)                             |
| Fast-forward speed and boss rounds                 | Confirmed. 1.5 times speed, off on boss rounds (3.12)                        |
| Finale extras and escort rewards                   | Confirmed. Convergence phase, escorts give no AP (4.10)                      |
| Instant research                                   | Confirmed (8.10)                                                             |
| Research reallocation refund of 75 per cent        | Confirmed (8.9)                                                              |
| Respec refunds of 100 and 90 per cent              | Confirmed (11.8)                                                             |
| Shop purchase limits                               | Confirmed. Up to 100 per visit, caps on Experimental and Extraordinary (6.5) |
| Separate shop inventories                          | Confirmed (6.5)                                                              |
| Damage adaptation replaces research affinity       | Confirmed (3.7)                                                              |
| When damage adaptation resets                      | Confirmed. Each territory (3.7)                                              |
| Free visit access                                  | Confirmed. One shop of choice (6.5)                                          |
| Shop price growth                                  | Confirmed. 20 per cent per territory (6.5)                                   |
| Hints for hidden nodes                             | Confirmed. Hint after a near miss (8.12)                                     |
| Kingdom names                                      | Confirmed. Keldrath, Myrathis, Merovant, Orthelyn, Nymora (2.2)              |
| Orthelyn boss                                      | Confirmed. The Unmaking (10.3)                                               |
| Enemy roster size                                  | Confirmed. 23 enemies, one signature enemy per kingdom (9.16)                |
| Unique territory reward                            | Confirmed. Kingdom Relics (5.12)                                             |
| Story depth                                        | Confirmed. Light framing (2.4)                                               |
| Hazard targets                                     | Confirmed. Players and enemies (5.10)                                        |
| When the next kingdom is revealed                  | Confirmed. After preparation (5.8)                                           |
| When the escort joins                              | Confirmed. From the start of the boss round (10.6)                           |
| Endless records                                    | Confirmed for now. Personal bests only (13.3)                                |
| Art style                                          | Confirmed. Hand-drawn 2D (15.1)                                              |
| Camera                                             | Confirmed. Top-down three-quarter view (15.2)                                |
| Interface theme                                    | Confirmed. Inventor's Notebook (15.1)                                        |
| Team                                               | Confirmed. Solo developer                                                    |
| Development stack                                  | Confirmed. TypeScript, Phaser 4 and Vite (15.15)                             |
| Launch order                                       | Removed. Personal project played in the browser (15.12)                      |
| Project purpose                                    | Confirmed. Personal and non-commercial, built with Claude Code               |
| Art source                                         | Confirmed. AI-generated images (15.1)                                        |
| Audio source                                       | Confirmed. Code-generated effects, free music later (15.10)                  |
| Commercial features                                | Replaced with personal-use rules (15.12, 15.13)                              |
| Design document format                             | Confirmed. Word file plus Markdown build pack (15.17)                        |

## 18. DEVELOPMENT PRIORITIES

The recommended order for continuing design work is:

#### Phase 1 – Finalise the core gameplay

**Status:** Drafted in version 0.2. Decisions confirmed in versions 0.3 and 0.4.

- Confirm player controls.

- Finalise round structure.

- Establish player statistics.

- Define combat and survival mechanics.

#### Phase 2 – Build the combat foundation

**Status:** Drafted in version 0.2. Decisions confirmed in versions 0.3 and 0.4.

- Finalise initial weapons.

- Define components.

- Establish enemy statistics.

- Develop enemy spawning and AI.

#### Phase 3 – Complete scientific progression

**Status:** Drafted in version 0.5. Decisions confirmed in version 0.6.

- Design the full research tree.

- Finalise the Grand Archive.

- Define research costs.

- Complete the permanent economy.

#### Phase 4 – Complete campaign design

**Status:** Drafted in version 0.7. Decisions confirmed in version 0.8.

- Finalise territory structure.

- Design all territory bosses.

- Establish campaign rewards.

- Complete endless mode.

#### Phase 5 – Interface and presentation

**Status:** Drafted in version 0.9, with screen mockups. Decisions confirmed in version 1.0.

- Establish visual identity.

- Design the main menu.

- Design the HUD.

- Design preparation and research screens.

- Design shop and inventory screens.

#### Phase 6 – Balance and implementation

**Status:** The build plan lives in CLAUDE.md in the build pack (Section 15.17).

- Prototype combat.

- Test weapon combinations.

- Test enemy scaling.

- Balance economy.

- Test campaign length.

- Optimise performance.

## 19. OVERALL DESIGN VISION

Progress & Peril is intended to be a roguelike where scientific creativity is just as important as combat skill.

Players should not simply collect increasingly powerful weapons. They should understand how components interact, discover new technologies and create combinations that fundamentally change how their arsenal works.

The world should feel alive, with five competing kingdoms, different scientific identities and increasingly dangerous experimental technologies.

Every campaign should offer a different journey. Random territories, research opportunities, enemy encounters and hidden discoveries should encourage experimentation.

Permanent progression should expand what players can invent without removing the challenge of individual campaigns.

The ultimate aim is to create a game where players regularly discover combinations they didn’t expect, build weapons they couldn’t have imagined at the beginning of a run, and push their inventions to increasingly extraordinary limits.

**Progress & Peril**

*Every discovery has a consequence.*

**Document note:** This is a consolidated working design document, not a final technical specification. Confirmed decisions are distinguished from proposed mechanics and open questions. All numerical balancing values remain provisional until tested in a playable prototype.

**Version 0.2 note:** Adds Phase 1 and Phase 2 drafts in Sections 3.4 to 3.12, 4.10 to 4.12, 7.12 to 7.21 and 9.10 to 9.15. Stats use relative tiers.

**Version 0.3 note:** Records 15 design decisions and replaces the option lists with final rules. The campaign moves to 21 rounds across three territories, with shorter rounds in Section 4.3. Sections 3.2, 3.3, 4.1 to 4.4, 5.1, 5.3, 7.1, 11.4, 11.5 and 13.1 follow the decisions. Section 17 lists four follow-up questions.

**Version 0.4 note:** Settles the four follow-up questions: revival cost and tier limits, Archive Point rates, fast-forward rules, and finale and escort rewards. Sections 5.5, 11.3 and 13.1 follow these decisions.

**Version 0.5 note:** Drafts Phase 3: research rules, costs and a 120-node tree (Sections 8.10 to 8.13), shop rules and prices (6.5 and 6.6), upgrade costs and recipes (7.22 and 7.23), the Grand Archive economy (11.10 to 11.14) and drops (14.1 to 14.3). Damage adaptation replaces research affinity. Starting gold and Research Point limits in Section 11.5 rise to fit the 21-round economy.

**Version 0.6 note:** Confirms the four Phase 3 decisions: damage adaptation resets each territory, free visits open one shop of choice, shop prices rise 20 per cent per territory, and hidden nodes give a hint after a near miss.

**Version 0.7 note:** Drafts Phase 4. The kingdoms take their final names. New sections cover lore and story (2.3 and 2.4), the territory roster, selection, transitions, arenas, hazards, events and Kingdom Relics (5.6 to 5.12), five signature enemies (9.16), bosses, mini-bosses and escorts (10.3 to 10.6) and endless rotation (13.3). The Unmaking becomes the boss of Orthelyn.

**Version 0.8 note:** Confirms the three Phase 4 decisions: the next kingdom appears after preparation, escorts fight from the start of boss rounds, and endless mode keeps personal bests only for now.

**Version 0.9 note:** Drafts Phase 5 and the rest of Section 16.8 in Sections 15.1 to 15.16: visual identity, camera, animation, effects, screens, HUD, preparation, audio, performance, platforms, saves, architecture and engine options. Mockups of six key screens sit on a design canvas linked in Section 15.16.

**Version 1.0 note:** Ready to build. Progress & Peril becomes a personal project, built with Claude Code as a browser game in TypeScript with Phaser 4 and Vite. Art comes from AI-generated images, sound effects from code. Personal-use rules replace the commercial parts of Section 15. A Markdown build pack (GDD.md, CLAUDE.md and ART_PROMPTS.md) accompanies this document.
