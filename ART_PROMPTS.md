# ART_PROMPTS.md: images for Progress & Peril

Every image in the game comes from an AI image generator, made from one fixed style so the art looks unified (GDD 15.1). The game runs on placeholder shapes until each file exists, so generate images in any order. CLAUDE.md explains the placeholders and the asset manifest.

The list holds 164 images. A playable game needs none of them, and the most visible first batch is the player, the enemies and the arenas.

## How to use this file

1. Paste the style prompt, then the prompt from the table, into the image generator.
2. Generate three or four versions and keep the best. Use the same model for every image.
3. Once a character image looks right, use the generator's image reference feature, where offered, with the chosen image as the style reference for later images.
4. For sprites, icons and portraits, remove the white background, trim the empty edges and save as a PNG with transparency.
5. Save each file under the exact name and folder below, inside `public/assets/`. The game picks the file up with no code change.
6. Keep the full-size originals elsewhere. Save game files at 512 pixels on the longest side for sprites and icons, and at full size for scenes.

## Style prompts

Use this style prompt for every sprite, icon and portrait:

> Hand-drawn ink illustration from a Renaissance inventor's notebook. Black ink linework of even weight, light cross-hatching for shading, flat muted watercolour fills. Seen from a top-down three-quarter angle, slightly above the subject. One subject, centred, fully visible. Plain flat white background. No text, no frame, no ground shadow.

Use this style prompt for arenas, story cards and the hub:

> Hand-drawn ink illustration from a Renaissance inventor's notebook. Black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment. No text, no frame, no border.

Colour hints in each prompt follow the kingdom and faction palettes in GDD 15.1.

## Player

Folder: `sprites/player`. Target size in the game: about 64 pixels tall.

| File | Prompt |
|---|---|
| `the-inventor.png` | The Inventor: a young travelling inventor in a leather apron, brass goggles pushed up on the forehead, a satchel of tools, ink-stained sleeves. Colours: warm brown leather, parchment and gold. |

## Enemies

Folder: `sprites/enemies`. Target size in the game: 48 to 96 pixels tall, by role.

| File | Prompt |
|---|---|
| `royal-footman.png` | Royal Footman: a foot soldier in dented steel half-plate with a tall kite shield and a short sword. Colours: steel grey with ember orange cloth. |
| `royal-longbowman.png` | Royal Longbowman: a lean archer in a padded gambeson and open helm, drawing a tall longbow. Colours: steel grey with ember orange cloth. |
| `royal-bastion.png` | Royal Bastion: a broad knight crouched behind a huge riveted iron tower shield. Colours: steel grey with ember orange cloth. |
| `clockwork-crawler.png` | Clockwork Crawler: a small spider-like machine of brass gears on six thin legs, one glowing eye. Colours: brass and dark iron. |
| `iron-sentinel.png` | Iron Sentinel: a hulking riveted iron automaton with thick arms and a furnace glow in the chest. Colours: brass and dark iron. |
| `mechanist.png` | Mechanist: an engineer in a soot-stained coat with a large wrench and a crate of crawler parts. Colours: brass and dark iron. |
| `chemical-crawler.png` | Chemical Crawler: a slimy crawling creature leaking acid, with bloated sacs on its back. Colours: sickly acid green and amber. |
| `regenerator.png` | Regenerator: a muscular pale experiment covered in stitches, fresh flesh knitting closed. Colours: sickly acid green and amber. |
| `volatile-specimen.png` | Volatile Specimen: a hunched creature covered in glowing orange pustules, ready to burst. Colours: sickly acid green and amber. |
| `hunting-hound.png` | Hunting Hound: a lean wild hound with bristling fur, mid-lunge. Colours: moss green and earthy brown. |
| `ironback-beetle.png` | Ironback Beetle: a giant beetle with a dark grey armoured shell and a front horn. Colours: moss green and earthy brown. |
| `spore-mother.png` | Spore Mother: a squat fungal creature crowned with mushroom caps, releasing a cloud of spores. Colours: moss green and earthy brown. |
| `highwayman.png` | Highwayman: a masked bandit in a long coat with a short blade and a bag of stolen coins. Colours: worn leather brown and faded red. |
| `rogue-inventor.png` | Rogue Inventor: a scruffy outlaw tinkerer holding an odd improvised weapon, a belt of traps at the waist. Colours: worn leather brown and faded red. |
| `mercenary-captain.png` | Mercenary Captain: a veteran mercenary in mismatched plate and a feathered hat, pointing to command. Colours: worn leather brown and faded red. |
| `anomaly.png` | Anomaly: a flickering geometric shape, half solid and half missing, like a tear in the air. Colours: violet and starlight white. |
| `ancient-guardian.png` | Ancient Guardian: a towering stone construct carved with star charts, glowing seams. Colours: violet and starlight white. |
| `the-unstable.png` | The Unstable: a crackling humanoid silhouette of light with loose stone fragments in orbit. Colours: violet and starlight white. |
| `forgeguard-knight.png` | Forgeguard Knight: a heavy knight in red-hot glowing plate armour carrying a forge hammer. Colours: steel grey with ember orange cloth. |
| `vat-chimera.png` | Vat Chimera: a patchwork creature stitched from several animals, glass tubes in its back. Colours: sickly acid green and amber. |
| `gear-lancer.png` | Gear Lancer: a clockwork cavalry machine on wheels with a long spinning brass lance. Colours: brass and dark iron. |
| `static-mote.png` | Static Mote: a small floating ball of yellow lightning inside a cracked glass shell. Colours: violet and starlight white. |
| `thornling.png` | Thornling: a small running sapling creature with thorny branches for arms. Colours: moss green and earthy brown. |

## Mini-bosses

Folder: `sprites/minibosses`. Target size in the game: about 160 pixels tall.

| File | Prompt |
|---|---|
| `forge-marshal.png` | Forge Marshal of Keldrath: a towering knight commander with a flaming halberd and a war banner on the back. Colours: ember orange and soot black. |
| `mad-alchemist.png` | Mad Alchemist of Myrathis: a wild-haired alchemist in a stained robe juggling flasks of green, orange and yellow liquid. Colours: acid green and amber. |
| `siege-spider.png` | Siege Spider of Merovant: an eight-legged brass walking cannon with a mortar on its back. Colours: teal and polished brass. |
| `tesla-warden.png` | Tesla Warden of Orthelyn: a robed scholar-guard holding a staff topped with a crackling coil, small pylons at the feet. Colours: violet and starlight white. |
| `thornback-matriarch.png` | Thornback Matriarch of Nymora: a huge boar-like beast covered in a shell of thorns. Colours: moss green and gold. |

## Bosses

Folder: `sprites/bosses`. Target size in the game: about 260 pixels tall.

One image per phase. Keep phases 2 and 3 recognisably the same boss as phase 1, using phase 1 as the image reference.

| File | Prompt |
|---|---|
| `iron-regent-phase-1.png` | Iron Regent, phase 1: a crowned king in full ornate plate armour, sword and great shield. Colours: ember orange and soot black. Large and imposing. |
| `iron-regent-phase-2.png` | Iron Regent, phase 2: the same crowned king, armour glowing orange-hot, molten drips. Colours: ember orange and soot black. Large and imposing. |
| `iron-regent-phase-3.png` | Iron Regent, phase 3: the same king stripped of armour in a padded doublet, furious, swinging a war hammer. Colours: ember orange and soot black. Large and imposing. |
| `abomination-phase-1.png` | Abomination, phase 1: a large shifting creature of fused flesh with colour-shifting patches. Colours: acid green and amber. Large and imposing. |
| `abomination-phase-2.png` | Abomination, phase 2: the same creature grown larger, with extra limbs and glass vats fused to the body. Colours: acid green and amber. Large and imposing. |
| `abomination-phase-3.png` | Abomination, phase 3: the same creature melting and frenzied, a glowing core exposed in the chest. Colours: acid green and amber. Large and imposing. |
| `grand-automaton-phase-1.png` | Grand Automaton, phase 1: a giant clockwork war machine with a frontal shield and two turret arms. Colours: teal and polished brass. Large and imposing. |
| `grand-automaton-phase-2.png` | Grand Automaton, phase 2: the same machine overheating, steam venting from cracked plates. Colours: teal and polished brass. Large and imposing. |
| `grand-automaton-phase-3.png` | Grand Automaton, phase 3: the same machine damaged and missing armour, sparks flying, small crawlers pouring out. Colours: teal and polished brass. Large and imposing. |
| `the-unmaking-phase-1.png` | The Unmaking, phase 1: a tall figure made of empty space outlined in violet light, like a hole cut in the world. Colours: violet and starlight white. Large and imposing. |
| `the-unmaking-phase-2.png` | The Unmaking, phase 2: the same figure ringed by circles of null energy and floating debris. Colours: violet and starlight white. Large and imposing. |
| `the-unmaking-phase-3.png` | The Unmaking, phase 3: three identical copies of the same figure side by side. Colours: violet and starlight white. Large and imposing. |
| `spore-sovereign-phase-1.png` | Spore Sovereign, phase 1: a colossal fungal monarch rooted in a stone fountain, a crown of mushrooms. Colours: moss green and gold. Large and imposing. |
| `spore-sovereign-phase-2.png` | Spore Sovereign, phase 2: the same monarch pulled free, walking on legs of roots. Colours: moss green and gold. Large and imposing. |
| `spore-sovereign-phase-3.png` | Spore Sovereign, phase 3: the same monarch in full bloom, covered in glowing flowers. Colours: moss green and gold. Large and imposing. |

## Weapon icons

Folder: `icons/weapons`. Target size in the game: 96 pixels.

Draw each weapon as a single object, seen from the side, not held by anyone.

| File | Prompt |
|---|---|
| `forged-longsword.png` | Forged Longsword: a long steel sword with a leather-wrapped grip, drawn as an item in a notebook. |
| `war-hammer.png` | War Hammer: a heavy iron war hammer, drawn as an item in a notebook. |
| `pike.png` | Pike: a long pike with a steel spearhead, drawn as an item in a notebook. |
| `gear-flail.png` | Gear Flail: a flail with a spiked gear for a head on a chain, drawn as an item in a notebook. |
| `crossbow.png` | Crossbow: a wooden crossbow with a loaded bolt, drawn as an item in a notebook. |
| `repeating-crossbow.png` | Repeating Crossbow: a crossbow with a box magazine and a crank, drawn as an item in a notebook. |
| `longbow.png` | Longbow: a tall yew longbow with a quiver of arrows, drawn as an item in a notebook. |
| `knife-bandolier.png` | Knife Bandolier: a leather bandolier of throwing knives, drawn as an item in a notebook. |
| `field-cannon.png` | Field Cannon: a small bronze field cannon on wooden wheels, drawn as an item in a notebook. |
| `mortar.png` | Mortar: a squat iron mortar tilted upward, drawn as an item in a notebook. |
| `ballista.png` | Ballista: a portable ballista firing a huge bolt, drawn as an item in a notebook. |
| `siege-catapult.png` | Siege Catapult: a compact catapult with a boulder in the bucket, drawn as an item in a notebook. |
| `clockwork-turret.png` | Clockwork Turret: a brass turret on a tripod with a wind-up key, drawn as an item in a notebook. |
| `clockwork-hound.png` | Clockwork Hound: a mechanical brass hound with a wind-up key, drawn as an item in a notebook. |
| `spring-trap-layer.png` | Spring Trap Layer: a box of jagged spring-loaded snap traps, drawn as an item in a notebook. |
| `sawblade-launcher.png` | Sawblade Launcher: a hand launcher loaded with a circular sawblade, drawn as an item in a notebook. |
| `firebomb-satchel.png` | Firebomb Satchel: a satchel of corked glass flasks filled with fire, drawn as an item in a notebook. |
| `acid-sprayer.png` | Acid Sprayer: a brass sprayer with a pressure tank of yellow acid, drawn as an item in a notebook. |
| `spore-censer.png` | Spore Censer: a swinging censer releasing green spores, drawn as an item in a notebook. |
| `alchemical-chain-reactor.png` | Alchemical Chain-Reactor: a cluster of linked glass bombs with fuses, drawn as an item in a notebook. |
| `electromagnetic-repeater.png` | Electromagnetic Repeater: a copper-coiled rifle-like launcher with glass capacitors, drawn as an item in a notebook. |
| `living-arsenal.png` | Living Arsenal: a small living creature with tendrils and armoured plates, half animal, half weapon, drawn as an item in a notebook. |
| `tesla-rod.png` | Tesla Rod: a staff topped with a copper coil throwing small sparks, drawn as an item in a notebook. |
| `burning-mirror.png` | Burning Mirror: a polished concave bronze mirror on a handle focusing a sunbeam, drawn as an item in a notebook. |

## Component icons

Folder: `icons/components`. Target size in the game: 64 pixels.

Simple, readable silhouettes. The game adds slot and quality colours around each icon.

| File | Prompt |
|---|---|
| `tempered-steel-frame.png` | Tempered Steel Frame: a small structure part for a weapon, suggesting metallic. Drawn as a single item. |
| `lightweight-frame.png` | Lightweight Frame: a small structure part for a weapon, suggesting light. Drawn as a single item. |
| `hardwood-stock.png` | Hardwood Stock: a small structure part for a weapon, suggesting light. Drawn as a single item. |
| `reinforced-barrel.png` | Reinforced Barrel: a small structure part for a weapon, suggesting metallic, heavy. Drawn as a single item. |
| `counterweight-assembly.png` | Counterweight Assembly: a small structure part for a weapon, suggesting heavy. Drawn as a single item. |
| `damascus-alloy.png` | Damascus Alloy: a small structure part for a weapon, suggesting metallic, blade. Drawn as a single item. |
| `copper-coil-housing.png` | Copper Coil Housing: a small structure part for a weapon, suggesting conductive. Drawn as a single item. |
| `glass-reaction-vessel.png` | Glass Reaction Vessel: a small structure part for a weapon, suggesting volatile. Drawn as a single item. |
| `chitin-plating.png` | Chitin Plating: a small structure part for a weapon, suggesting organic, armoured. Drawn as a single item. |
| `clockwork-chassis.png` | Clockwork Chassis: a small structure part for a weapon, suggesting mechanical. Drawn as a single item. |
| `heat-sink-housing.png` | Heat Sink Housing: a small structure part for a weapon, suggesting thermal. Drawn as a single item. |
| `magnetised-core.png` | Magnetised Core: a small structure part for a weapon, suggesting magnetic, metallic. Drawn as a single item. |
| `precision-ground-frame.png` | Precision-Ground Frame: a small structure part for a weapon, suggesting precise. Drawn as a single item. |
| `living-wood-frame.png` | Living Wood Frame: a small structure part for a weapon, suggesting organic, biological. Drawn as a single item. |
| `meteoric-iron-frame.png` | Meteoric Iron Frame: a small structure part for a weapon, suggesting metallic, anomalous. Drawn as a single item. |
| `torsion-spring.png` | Torsion Spring: a small mechanism part for a weapon, suggesting mechanical. Drawn as a single item. |
| `piercing-rail.png` | Piercing Rail: a small mechanism part for a weapon, suggesting piercing. Drawn as a single item. |
| `sweep-hinge.png` | Sweep Hinge: a small mechanism part for a weapon, suggesting mechanical. Drawn as a single item. |
| `pneumatic-bellows.png` | Pneumatic Bellows: a small mechanism part for a weapon, suggesting mechanical. Drawn as a single item. |
| `ratchet-repeater.png` | Ratchet Repeater: a small mechanism part for a weapon, suggesting mechanical. Drawn as a single item. |
| `multishot-rack.png` | Multishot Rack: a small mechanism part for a weapon, suggesting mechanical. Drawn as a single item. |
| `ricochet-deflector.png` | Ricochet Deflector: a small mechanism part for a weapon, suggesting ricochet. Drawn as a single item. |
| `spray-nozzle.png` | Spray Nozzle: a small mechanism part for a weapon, suggesting spray. Drawn as a single item. |
| `targeting-lens.png` | Targeting Lens: a small mechanism part for a weapon, suggesting precise. Drawn as a single item. |
| `self-winding-escapement.png` | Self-Winding Escapement: a small mechanism part for a weapon, suggesting mechanical. Drawn as a single item. |
| `gear-train-accelerator.png` | Gear Train Accelerator: a small mechanism part for a weapon, suggesting mechanical. Drawn as a single item. |
| `nerve-fibre-trigger.png` | Nerve Fibre Trigger: a small mechanism part for a weapon, suggesting biological, organic. Drawn as a single item. |
| `electromagnetic-accelerator.png` | Electromagnetic Accelerator: a small mechanism part for a weapon, suggesting magnetic, electric. Drawn as a single item. |
| `orbit-mount.png` | Orbit Mount: a small mechanism part for a weapon, suggesting orbit. Drawn as a single item. |
| `perpetual-motion-engine.png` | Perpetual Motion Engine: a small mechanism part for a weapon, suggesting mechanical, anomalous. Drawn as a single item. |
| `iron-bolts.png` | Iron Bolts: a small payload part for a weapon, suggesting metallic, piercing. Drawn as a single item. |
| `barbed-heads.png` | Barbed Heads: a small payload part for a weapon, suggesting blade. Drawn as a single item. |
| `incendiary-oil.png` | Incendiary Oil: a small payload part for a weapon, suggesting fire, volatile. Drawn as a single item. |
| `venom-reservoir.png` | Venom Reservoir: a small payload part for a weapon, suggesting toxic. Drawn as a single item. |
| `blackpowder-charge.png` | Blackpowder Charge: a small payload part for a weapon, suggesting explosive, fire. Drawn as a single item. |
| `acid-vial.png` | Acid Vial: a small payload part for a weapon, suggesting corrosive. Drawn as a single item. |
| `frost-salts.png` | Frost Salts: a small payload part for a weapon, suggesting cold. Drawn as a single item. |
| `leyden-jar-cell.png` | Leyden Jar Cell: a small payload part for a weapon, suggesting electric, conductive. Drawn as a single item. |
| `spore-culture.png` | Spore Culture: a small payload part for a weapon, suggesting biological, fungal. Drawn as a single item. |
| `marking-chalk.png` | Marking Chalk: a small payload part for a weapon, suggesting precise. Drawn as a single item. |
| `shrapnel-shells.png` | Shrapnel Shells: a small payload part for a weapon, suggesting impact, explosive. Drawn as a single item. |
| `volatile-catalyst.png` | Volatile Catalyst: a small payload part for a weapon, suggesting volatile, chain. Drawn as a single item. |
| `magnetite-slugs.png` | Magnetite Slugs: a small payload part for a weapon, suggesting magnetic, metallic. Drawn as a single item. |
| `parasite-larvae.png` | Parasite Larvae: a small payload part for a weapon, suggesting biological, parasite. Drawn as a single item. |
| `philosophers-reagent.png` | Philosopher's Reagent: a small payload part for a weapon, suggesting volatile, toxic, corrosive, fire. Drawn as a single item. |
| `telescopic-sight.png` | Telescopic Sight: a small auxiliary part for a weapon, suggesting precise. Drawn as a single item. |
| `bayonet-mount.png` | Bayonet Mount: a small auxiliary part for a weapon, suggesting blade. Drawn as a single item. |
| `research-notebook.png` | Research Notebook: a small auxiliary part for a weapon, suggesting precise. Drawn as a single item. |
| `specimen-jar.png` | Specimen Jar: a small auxiliary part for a weapon, suggesting biological. Drawn as a single item. |
| `reagent-recycler.png` | Reagent Recycler: a small auxiliary part for a weapon, suggesting volatile. Drawn as a single item. |
| `gyroscopic-stabiliser.png` | Gyroscopic Stabiliser: a small auxiliary part for a weapon, suggesting mechanical. Drawn as a single item. |
| `smoke-canister.png` | Smoke Canister: a small auxiliary part for a weapon, suggesting volatile. Drawn as a single item. |
| `repair-kit-housing.png` | Repair Kit Housing: a small auxiliary part for a weapon, suggesting mechanical. Drawn as a single item. |
| `tesla-capacitor.png` | Tesla Capacitor: a small auxiliary part for a weapon, suggesting electric, conductive. Drawn as a single item. |
| `grappling-line.png` | Grappling Line: a small auxiliary part for a weapon, suggesting mechanical. Drawn as a single item. |
| `healing-poultice-chamber.png` | Healing Poultice Chamber: a small auxiliary part for a weapon, suggesting biological, organic. Drawn as a single item. |
| `resonance-fork.png` | Resonance Fork: a small auxiliary part for a weapon, suggesting precise, conductive. Drawn as a single item. |
| `feedback-loop-gear.png` | Feedback Loop Gear: a small auxiliary part for a weapon, suggesting mechanical, precise. Drawn as a single item. |
| `prototype-overclock.png` | Prototype Overclock: a small auxiliary part for a weapon, suggesting experimental, volatile. Drawn as a single item. |
| `grand-calculus-engine.png` | Grand Calculus Engine: a small auxiliary part for a weapon, suggesting precise, anomalous. Drawn as a single item. |

## Relic icons

Folder: `icons/relics`. Target size in the game: 96 pixels.

| File | Prompt |
|---|---|
| `regents-crown.png` | Regent's Crown: a treasured relic of Keldrath, an ornate object. Colours: ember orange and soot black. |
| `crucible-heart.png` | Crucible Heart: a treasured relic of Keldrath, an ornate object. Colours: ember orange and soot black. |
| `royal-writ.png` | Royal Writ: a treasured relic of Keldrath, an ornate object. Colours: ember orange and soot black. |
| `mutagen-flask.png` | Mutagen Flask: a treasured relic of Myrathis, an ornate object. Colours: acid green and amber. |
| `abomination-gland.png` | Abomination Gland: a treasured relic of Myrathis, an ornate object. Colours: acid green and amber. |
| `catalyst-stone.png` | Catalyst Stone: a treasured relic of Myrathis, an ornate object. Colours: acid green and amber. |
| `automaton-core.png` | Automaton Core: a treasured relic of Merovant, an ornate object. Colours: teal and polished brass. |
| `gearwork-heart.png` | Gearwork Heart: a treasured relic of Merovant, an ornate object. Colours: teal and polished brass. |
| `assembly-blueprints.png` | Assembly Blueprints: a treasured relic of Merovant, an ornate object. Colours: teal and polished brass. |
| `shard-of-the-unmaking.png` | Shard of the Unmaking: a treasured relic of Orthelyn, an ornate object. Colours: violet and starlight white. |
| `probability-lens.png` | Probability Lens: a treasured relic of Orthelyn, an ornate object. Colours: violet and starlight white. |
| `gravity-anchor.png` | Gravity Anchor: a treasured relic of Orthelyn, an ornate object. Colours: violet and starlight white. |
| `sovereign-spore.png` | Sovereign Spore: a treasured relic of Nymora, an ornate object. Colours: moss green and gold. |
| `heartwood-seed.png` | Heartwood Seed: a treasured relic of Nymora, an ornate object. Colours: moss green and gold. |
| `bloom-crown.png` | Bloom Crown: a treasured relic of Nymora, an ornate object. Colours: moss green and gold. |

## Shopkeepers

Folder: `portraits/shopkeepers`. Target size in the game: about 220 pixels tall.

Waist-up portraits facing the viewer.

| File | Prompt |
|---|---|
| `blacksmith.png` | a gruff broad-shouldered blacksmith with a soot-stained leather apron and a hammer over one shoulder. Colours: ember orange and iron grey. |
| `alchemist.png` | a twitchy wiry alchemist in round green goggles holding a bubbling flask. Colours: acid green and amber. |
| `royal-inventor.png` | a pompous royal inventor in a velvet coat with a ruff collar and a brass monocle. Colours: violet and polished brass. |

## Arenas

Folder: `arenas`. Target size in the game: stretched to fill a 2400 by 1600 arena.

Use the scene style prompt. Generate in the widest format available. Keep the floor quiet and low in contrast so enemies stand out (GDD 15.1).

| File | Prompt |
|---|---|
| `keldrath.png` | Top-down three-quarter view of the Great Foundry, a square foundry floor around a central crucible. Iron pillars give cover against ranged enemies. Empty floor in the middle for combat, no characters. Muted colours with accents of ember orange and soot black. Wide format. |
| `myrathis.png` | Top-down three-quarter view of the Grand Laboratory, a round laboratory ringed by glass vats, with workbenches as low cover. Empty floor in the middle for combat, no characters. Muted colours with accents of acid green and amber. Wide format. |
| `merovant.png` | Top-down three-quarter view of the Assembly Yards, a long factory floor crossed by conveyor belts, with stamping presses along the walls. Empty floor in the middle for combat, no characters. Muted colours with accents of teal and polished brass. Wide format. |
| `orthelyn.png` | Top-down three-quarter view of the Observatory Plaza, a round plaza around a giant orrery, open to the sky. Empty floor in the middle for combat, no characters. Muted colours with accents of violet and starlight white. Wide format. |
| `nymora.png` | Top-down three-quarter view of the Overgrown Arboretum, a ruined greenhouse garden with hedges and fountains. Empty floor in the middle for combat, no characters. Muted colours with accents of moss green and gold. Wide format. |

## Story cards

Folder: `cards`. Target size in the game: full screen, 16:9.

Use the scene style prompt.

| File | Prompt |
|---|---|
| `opening.png` | The Grand Archive's inventor setting out at dawn with three weapons and an empty notebook, five kingdoms on the horizon. Wide format. |
| `reveal-keldrath.png` | Illustration for this story text: "The forges of Keldrath never cool. Keldrath's knights march in plate still warm from the anvil." Colours: ember orange and soot black. Wide format. |
| `reveal-myrathis.png` | Illustration for this story text: "Smoke rises from a hundred laboratories in Myrathis. Something in the vats is awake." Colours: acid green and amber. Wide format. |
| `reveal-merovant.png` | Illustration for this story text: "The Free Cities of Merovant run on gears and contracts. Tonight, the machines are working overtime." Colours: teal and polished brass. Wide format. |
| `reveal-orthelyn.png` | Illustration for this story text: "The Republic of Orthelyn measured the sky and found a crack. Something on the other side noticed." Colours: violet and starlight white. Wide format. |
| `reveal-nymora.png` | Illustration for this story text: "The gardens of Nymora heal anyone who asks. The forests decide who leaves." Colours: moss green and gold. Wide format. |
| `ending-keldrath.png` | Illustration for this ending: "The Iron Regent kneels, and the Great Foundry falls silent for the first time in a century. Keldrath's smiths now forge for the Archive." Colours: ember orange and soot black. Wide format. |
| `ending-myrathis.png` | Illustration for this ending: "The Abomination dissolves back into the vat. The princes of Myrathis seal their laboratories, and the Archive inherits their notes, with a warning in the margin." Colours: acid green and amber. Wide format. |
| `ending-merovant.png` | Illustration for this ending: "The Grand Automaton winds down mid-step. The Free Cities vote to open their assembly yards, and the machines start building bridges instead of armies." Colours: teal and polished brass. Wide format. |
| `ending-orthelyn.png` | Illustration for this ending: "The Unmaking folds into a single point and vanishes. Orthelyn's scholars begin repairing the crack in the sky, and the Archive keeps one shard for study." Colours: violet and starlight white. Wide format. |
| `ending-nymora.png` | Illustration for this ending: "The Spore Sovereign withers, and the forests of Nymora go quiet. The Commonwealth's healers return to their gardens, and the Archive plants the first seed." Colours: moss green and gold. Wide format. |

## Grand Archive hub

Folder: `hub`. Target size in the game: full screen, 16:9.

Use the scene style prompt. The game places buttons over each object (GDD 15.6).

| File | Prompt |
|---|---|
| `grand-archive.png` | Interior of a grand library hall of inventors: gothic arches, tall bookshelves on both sides, a large map table in the centre showing five kingdoms, a lectern with an open book on the left, a glass trophy cabinet on the right, a brass desk lamp in the corner. Warm parchment tones with brass accents. Wide format. |

## App icon

Folder: `icons/app`. Target size in the game: 512 pixels square.

| File | Prompt |
|---|---|
| `app-icon.png` | A brass gear crossed with a quill pen over a glass flask, bold and simple, centred on a parchment-coloured circle. |

