# MIDJOURNEY.md: Midjourney prompts for Progress & Peril

The same 174 images as ART_PROMPTS.md, in the same order, rewritten for Midjourney. Each prompt is ready to paste. ART_PROMPTS.md stays the reference for file names and folders. When the list changes, ask Claude to rebuild this file from ART_PROMPTS.md.

## What changed for Midjourney

- The subject comes first. Midjourney weighs the opening words most, and the game names such as "Royal Footman" mean nothing to it, so prompts start with what to draw.
- Colours become a short palette phrase.
- Negatives move to `--no`. Midjourney ignores "no text" written in the prompt body.
- Story cards describe a scene. Quoted story text made Midjourney letter the words into the image.
- Component and relic prompts each describe a distinct object. The generic wording gave near-identical results.
- Boss phases 2 and 3 describe the figure in full and add `--oref` with the phase 1 image, since Midjourney reads each prompt on its own.
- Aspect ratios match the game: 1:1 sprites and icons, 3:4 shopkeepers, 3:2 arenas (2400 by 1600), 16:9 cards and the hub.

## Workflow

1. Set your Midjourney default version once and keep it for the whole set. Start with `--s 100` in your settings and change it only before the first approved image.
2. Generate `the-inventor.png` first, with no reference. Pick the best result and copy its image URL. Replace `<SPRITE_REF>` with that URL everywhere below.
3. Generate `crossbow.png` next, with the sprite reference. Replace `<ICON_REF>` with its URL.
4. Generate `keldrath.png` with no reference. Replace `<SCENE_REF>` with its URL.
5. For bosses, generate phase 1 first, then replace the matching `<..._PHASE_1>` placeholder with its URL, so phases 2 and 3 keep the same figure.
6. Explore in Draft or Relax mode, then run finals in standard mode. Fix small faults with Vary Region before rerolling.
7. Save under the exact file name shown, remove the background for sprites, icons and portraits, trim, resize to 512 pixels on the longest side (arenas about 2400 by 1600), compress, and place the file in the folder shown.

A find-and-replace in a text editor fills each placeholder in one step.

## Player

Folder: `sprites/player`. Parameters: `--ar 1:1`, no reference: this image becomes `SPRITE_REF`.

`the-inventor.png`

```
a young travelling inventor in a leather apron, brass goggles pushed up on the forehead, a satchel of tools, ink-stained sleeves, warm brown leather, parchment and gold palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects
```

## Enemies

Folder: `sprites/enemies`. Parameters: `--ar 1:1`, `--sref <SPRITE_REF>`.

`royal-footman.png`

```
a foot soldier in dented steel half-plate with a tall kite shield and a short sword, steel grey and ember orange cloth palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`royal-longbowman.png`

```
a lean archer in a padded gambeson and open helm, drawing a tall longbow, steel grey and ember orange cloth palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`royal-bastion.png`

```
a broad knight crouched behind a huge riveted iron tower shield, steel grey and ember orange cloth palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`clockwork-crawler.png`

```
a small spider-like machine of brass gears on six thin legs, one glowing eye, brass and dark iron palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`iron-sentinel.png`

```
a hulking riveted iron automaton with thick arms and a furnace glow in the chest, brass and dark iron palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`mechanist.png`

```
an engineer in a soot-stained coat with a large wrench and a crate of crawler parts, brass and dark iron palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`chemical-crawler.png`

```
a slimy crawling creature leaking acid, with bloated sacs on its back, sickly acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`regenerator.png`

```
a muscular pale experiment covered in stitches, fresh flesh knitting closed, sickly acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`volatile-specimen.png`

```
a hunched creature covered in glowing orange pustules, ready to burst, sickly acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`hunting-hound.png`

```
a lean wild hound with bristling fur, mid-lunge, moss green and earthy brown palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`ironback-beetle.png`

```
a giant beetle with a dark grey armoured shell and a front horn, moss green and earthy brown palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`spore-mother.png`

```
a squat fungal creature crowned with mushroom caps, releasing a cloud of spores, moss green and earthy brown palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`highwayman.png`

```
a masked bandit in a long coat with a short blade and a bag of stolen coins, worn leather brown and faded red palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`rogue-inventor.png`

```
a scruffy outlaw tinkerer holding an odd improvised weapon, a belt of traps at the waist, worn leather brown and faded red palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`mercenary-captain.png`

```
a veteran mercenary in mismatched plate and a feathered hat, pointing to command, worn leather brown and faded red palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`anomaly.png`

```
a flickering geometric shape, half solid and half missing, like a tear in the air, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`ancient-guardian.png`

```
a towering stone construct carved with star charts, glowing seams, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`the-unstable.png`

```
a crackling humanoid silhouette of light with loose stone fragments in orbit, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`forgeguard-knight.png`

```
a heavy knight in red-hot glowing plate armour carrying a forge hammer, steel grey and ember orange cloth palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`vat-chimera.png`

```
a patchwork creature stitched from several animals, glass tubes in its back, sickly acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`gear-lancer.png`

```
a clockwork cavalry machine on wheels with a long spinning brass lance, brass and dark iron palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`static-mote.png`

```
a small floating ball of yellow lightning inside a cracked glass shell, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`thornling.png`

```
a small running sapling creature with thorny branches for arms, moss green and earthy brown palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

## Mini-bosses

Folder: `sprites/minibosses`. Parameters: `--ar 1:1`, `--sref <SPRITE_REF>`.

`forge-marshal.png`

```
a towering knight commander with a flaming halberd and a war banner on the back, ember orange and soot black palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`mad-alchemist.png`

```
a wild-haired alchemist in a stained robe juggling flasks of green, orange and yellow liquid, acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`siege-spider.png`

```
an eight-legged brass walking cannon with a mortar on its back, teal and polished brass palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`tesla-warden.png`

```
a robed scholar-guard holding a staff topped with a crackling coil, small pylons at the feet, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`thornback-matriarch.png`

```
a huge boar-like beast covered in a shell of thorns, moss green and gold palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

## Bosses

Folder: `sprites/bosses`. Parameters: `--ar 1:1`, `--sref <SPRITE_REF>`.

`iron-regent-phase-1.png`

```
a crowned king in full ornate plate armour, sword and great shield, large and imposing, ember orange and soot black palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`iron-regent-phase-2.png`

```
a crowned king in ornate plate armour glowing orange-hot, molten metal dripping, large and imposing, ember orange and soot black palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF> --oref <IRON_REGENT_PHASE_1>
```

`iron-regent-phase-3.png`

```
a crowned king stripped of his armour, in a padded doublet, furious, swinging a war hammer, large and imposing, ember orange and soot black palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF> --oref <IRON_REGENT_PHASE_1>
```

`abomination-phase-1.png`

```
a large shifting creature of fused flesh with colour-shifting patches, large and imposing, acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`abomination-phase-2.png`

```
a huge shifting creature of fused flesh, grown larger, extra limbs and glass vats fused to the body, large and imposing, acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF> --oref <ABOMINATION_PHASE_1>
```

`abomination-phase-3.png`

```
a huge creature of fused flesh melting and frenzied, a glowing core exposed in the chest, large and imposing, acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF> --oref <ABOMINATION_PHASE_1>
```

`grand-automaton-phase-1.png`

```
a giant clockwork war machine with a frontal shield and two turret arms, large and imposing, teal and polished brass palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`grand-automaton-phase-2.png`

```
a giant clockwork war machine overheating, steam venting from cracked armour plates, large and imposing, teal and polished brass palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF> --oref <GRAND_AUTOMATON_PHASE_1>
```

`grand-automaton-phase-3.png`

```
a giant clockwork war machine damaged and missing armour plates, sparks flying, small crawler machines pouring out, large and imposing, teal and polished brass palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF> --oref <GRAND_AUTOMATON_PHASE_1>
```

`the-unmaking-phase-1.png`

```
a tall figure made of empty space outlined in violet light, like a hole cut in the world, large and imposing, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`the-unmaking-phase-2.png`

```
a tall figure made of empty space outlined in violet light, ringed by circles of null energy and floating debris, large and imposing, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF> --oref <THE_UNMAKING_PHASE_1>
```

`the-unmaking-phase-3.png`

```
three identical tall figures made of empty space outlined in violet light, standing side by side, large and imposing, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery --sref <SPRITE_REF> --oref <THE_UNMAKING_PHASE_1>
```

`spore-sovereign-phase-1.png`

```
a colossal fungal monarch rooted in a stone fountain, a crown of mushrooms, large and imposing, moss green and gold palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`spore-sovereign-phase-2.png`

```
a colossal fungal monarch with a crown of mushrooms, pulled free from a fountain and walking on legs of roots, large and imposing, moss green and gold palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF> --oref <SPORE_SOVEREIGN_PHASE_1>
```

`spore-sovereign-phase-3.png`

```
a colossal fungal monarch with a crown of mushrooms in full bloom, covered in glowing flowers, large and imposing, moss green and gold palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF> --oref <SPORE_SOVEREIGN_PHASE_1>
```

## Boss parts

Folder: `sprites/bosses`. Parameters: `--ar 1:1`, `--sref <SPRITE_REF>`.

`arm-turret.png`

```
a detached brass gatling arm with a rotating barrel cluster on a heavy shoulder joint, teal and polished brass palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`belt-motor.png`

```
a squat iron motor housing with a large flywheel and a drive belt, steam vents on top, teal and polished brass palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`war-banner.png`

```
a tall iron pole planted in the ground with a torn ember-orange banner bearing a hammer crest, ember orange and soot black palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`pylon.png`

```
a slender stone and copper pylon topped with a glass sphere of crackling light, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

## Constructs

Folder: `sprites/constructs`. Parameters: `--ar 1:1`, `--sref <SPRITE_REF>`.

`clockwork-turret.png`

```
a small brass turret on three splayed legs with a wind-up key on the back and a crossbow barrel, brass and warm gold palette, facing right, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`clockwork-hound.png`

```
a mechanical brass hound with visible gears in the chest, a wind-up key on the back and snapping steel jaws, brass and warm gold palette, facing right, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`living-arsenal.png`

```
a small agile beast with tendrils and armoured plates, half animal, half weapon, ready to pounce, magenta, moss green and warm gold palette, facing right, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`spring-trap.png`

```
an open steel snap trap with jagged teeth and a coiled spring, seen from above, dark iron and warm gold palette, facing right, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

## Weapon icons

Folder: `icons/weapons`. Parameters: `--ar 1:1`, `--sref <ICON_REF>`.

`forged-longsword.png`

```
a long steel sword with a leather-wrapped grip, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`war-hammer.png`

```
a heavy iron war hammer, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`pike.png`

```
a long pike with a steel spearhead, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`gear-flail.png`

```
a flail with a spiked gear for a head on a chain, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`crossbow.png`

```
a wooden crossbow with a loaded bolt, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`repeating-crossbow.png`

```
a crossbow with a box magazine and a crank, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`longbow.png`

```
a tall yew longbow with a quiver of arrows, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`knife-bandolier.png`

```
a leather bandolier of throwing knives, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`field-cannon.png`

```
a small bronze field cannon on wooden wheels, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`mortar.png`

```
a squat iron mortar tilted upward, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`ballista.png`

```
a portable ballista firing a huge bolt, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`siege-catapult.png`

```
a compact catapult with a boulder in the bucket, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`clockwork-turret.png`

```
a brass turret on a tripod with a wind-up key, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`clockwork-hound.png`

```
a mechanical brass hound with a wind-up key, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`spring-trap-layer.png`

```
a box of jagged spring-loaded snap traps, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`sawblade-launcher.png`

```
a hand launcher loaded with a circular sawblade, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`firebomb-satchel.png`

```
a satchel of corked glass flasks filled with fire, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`acid-sprayer.png`

```
a brass sprayer with a pressure tank of yellow acid, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`spore-censer.png`

```
a swinging censer releasing green spores, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`alchemical-chain-reactor.png`

```
a cluster of linked glass bombs with fuses, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`electromagnetic-repeater.png`

```
a copper-coiled rifle-like launcher with glass capacitors, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`living-arsenal.png`

```
a small living creature with tendrils and armoured plates, half animal, half weapon, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`tesla-rod.png`

```
a staff topped with a copper coil throwing small sparks, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`burning-mirror.png`

```
a polished concave bronze mirror on a handle focusing a sunbeam, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

## Component icons

Folder: `icons/components`. Parameters: `--ar 1:1`, `--sref <ICON_REF>`.

`tempered-steel-frame.png`

```
a sturdy weapon frame of blued tempered steel with riveted joints, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`lightweight-frame.png`

```
a slender weapon frame of thin ash wood and light brass struts, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`hardwood-stock.png`

```
a polished oak weapon stock with brass end caps, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`reinforced-barrel.png`

```
a long iron barrel wrapped in reinforcing steel bands, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`counterweight-assembly.png`

```
a heavy iron counterweight block on a short lever arm, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`damascus-alloy.png`

```
a short ingot of rippled Damascus steel with wavy patterns, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`copper-coil-housing.png`

```
a weapon housing wound with tight copper coils and small glass insulators, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`glass-reaction-vessel.png`

```
a thick round glass vessel in a brass cage, swirling liquid inside, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`chitin-plating.png`

```
curved plates of glossy beetle chitin laced together with cord, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`clockwork-chassis.png`

```
an open brass chassis full of small gears and springs, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`heat-sink-housing.png`

```
a finned iron housing with heat shimmer and glowing orange edges, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`magnetised-core.png`

```
a dark iron core rod with iron filings clinging in curved lines, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`precision-ground-frame.png`

```
a precisely machined steel frame with engraved measuring marks, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`living-wood-frame.png`

```
a weapon frame grown from living wood, small green leaves sprouting, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`meteoric-iron-frame.png`

```
a frame of pitted black meteoric iron glinting with faint starry specks, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`torsion-spring.png`

```
a thick coiled torsion spring of dark steel, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`piercing-rail.png`

```
a narrow steel guide rail with a sharpened tip, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`sweep-hinge.png`

```
a broad brass hinge with a curved swinging arm, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`pneumatic-bellows.png`

```
small leather bellows with brass valves and a nozzle, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`ratchet-repeater.png`

```
a toothed brass ratchet wheel with a spring pawl, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`multishot-rack.png`

```
a rack holding three parallel loaded bolts side by side, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`ricochet-deflector.png`

```
an angled polished steel deflector plate on a swivel mount, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`spray-nozzle.png`

```
a flared brass spray nozzle with a small pressure valve, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`targeting-lens.png`

```
a brass-rimmed targeting lens with fine crosshairs etched on the glass, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`self-winding-escapement.png`

```
a clock escapement with a swinging balance wheel and a winding key, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`gear-train-accelerator.png`

```
a compact train of interlocking gears of rising sizes, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`nerve-fibre-trigger.png`

```
a trigger wrapped in pale living nerve fibres and tiny veins, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`electromagnetic-accelerator.png`

```
a short barrel ringed with copper coils and crackling sparks, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`orbit-mount.png`

```
a circular brass track with a small rider, like a planetary model, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`perpetual-motion-engine.png`

```
an impossible brass wheel engine with weighted arms turning forever, faint glow, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`iron-bolts.png`

```
a bundle of short iron crossbow bolts tied with twine, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`barbed-heads.png`

```
a handful of cruel barbed arrowheads, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`incendiary-oil.png`

```
a corked clay flask of amber oil with a cloth wick, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`venom-reservoir.png`

```
a small glass reservoir of green venom with a needle tip, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`blackpowder-charge.png`

```
a paper cartridge of black powder tied with a fuse, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`acid-vial.png`

```
a stoppered vial of bubbling lime-yellow acid, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`frost-salts.png`

```
a leather pouch spilling pale blue frost crystals, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`leyden-jar-cell.png`

```
a Leyden jar with a brass rod and a tiny spark at the top, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`spore-culture.png`

```
a sealed glass dish of glowing magenta fungal spores, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`marking-chalk.png`

```
a stick of bright marking chalk in a brass holder, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`shrapnel-shells.png`

```
a cluster of small iron shells scored into fragments, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`volatile-catalyst.png`

```
a glass ampoule of unstable glowing orange liquid, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`magnetite-slugs.png`

```
heavy dark magnetite slugs stuck together, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`parasite-larvae.png`

```
a glass vial of wriggling pale larvae, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`philosophers-reagent.png`

```
an ornate alchemical flask swirling with orange, green and yellow layers, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`telescopic-sight.png`

```
a brass telescopic sight with adjustment knobs, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`bayonet-mount.png`

```
a short steel bayonet on a clamp mount, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`research-notebook.png`

```
a small leather notebook strapped shut with a pencil tucked in, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`specimen-jar.png`

```
a corked specimen jar holding a pickled creature, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`reagent-recycler.png`

```
a little copper still with looping tubes and a drip flask, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`gyroscopic-stabiliser.png`

```
a brass gyroscope in nested rings, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`smoke-canister.png`

```
a tin canister with grey smoke curling from a vent, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`repair-kit-housing.png`

```
a hinged tool case with a wrench, screws and oil can, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`tesla-capacitor.png`

```
a stacked tesla capacitor with copper plates and arcing sparks, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`grappling-line.png`

```
a coiled rope with an iron grappling hook, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`healing-poultice-chamber.png`

```
a brass chamber holding herb poultices, green steam rising, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`resonance-fork.png`

```
a large tuning fork of brass with visible vibration lines, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`feedback-loop-gear.png`

```
a gear with a looping track of tiny gears around its rim, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`prototype-overclock.png`

```
a rattling prototype gauge with a needle in the red, loose screws, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`grand-calculus-engine.png`

```
an ornate calculating engine of numbered brass drums and dials, a small weapon part, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

## Relic icons

Folder: `icons/relics`. Parameters: `--ar 1:1`, `--sref <ICON_REF>`.

`regents-crown.png`

```
an ornate iron crown set with ember-red stones, treasured relic, ember orange and soot black palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`crucible-heart.png`

```
a small glowing crucible shaped like a heart, molten metal inside, treasured relic, ember orange and soot black palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`royal-writ.png`

```
a rolled royal decree with a heavy wax seal and ribbon, treasured relic, ember orange and soot black palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`mutagen-flask.png`

```
a twisted glass flask of shifting green mutagen, treasured relic, acid green and amber palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`abomination-gland.png`

```
a pulsing organic gland in a glass jar, treasured relic, acid green and amber palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`catalyst-stone.png`

```
a faceted amber stone with liquid swirling inside, treasured relic, acid green and amber palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`automaton-core.png`

```
a spherical brass automaton core with a glowing teal centre, treasured relic, teal and polished brass palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`gearwork-heart.png`

```
a heart built of interlocking brass gears, treasured relic, teal and polished brass palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`assembly-blueprints.png`

```
a roll of blueprints tied with string, gear diagrams showing, treasured relic, teal and polished brass palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`shard-of-the-unmaking.png`

```
a jagged shard of empty violet void edged with white light, treasured relic, violet and starlight white palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`probability-lens.png`

```
a lens in a silver frame showing several faint overlapping images, treasured relic, violet and starlight white palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`gravity-anchor.png`

```
a small heavy anchor of dark stone with orbiting pebbles, treasured relic, violet and starlight white palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`sovereign-spore.png`

```
a large golden spore pod with tendrils, treasured relic, moss green and gold palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`heartwood-seed.png`

```
a seed of glowing heartwood with a green sprout, treasured relic, moss green and gold palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

`bloom-crown.png`

```
a crown woven from living flowers and golden petals, treasured relic, moss green and gold palette, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```

## Shopkeepers

Folder: `portraits/shopkeepers`. Parameters: `--ar 3:4`, `--sref <SPRITE_REF>`.

`blacksmith.png`

```
a gruff broad-shouldered blacksmith with a soot-stained leather apron and a hammer over one shoulder, ember orange and iron grey palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 3:4 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`alchemist.png`

```
a twitchy wiry alchemist in round green goggles holding a bubbling flask, acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 3:4 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

`royal-inventor.png`

```
a pompous royal inventor in a velvet coat with a ruff collar and a brass monocle, violet and polished brass palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, even black ink linework, light cross-hatching, flat muted watercolour fills, top-down three-quarter view from slightly above, single subject centred and fully visible, plain flat white background --ar 3:4 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <SPRITE_REF>
```

## Arenas

Folder: `arenas`. Parameters: `--ar 3:2`, `--sref <SCENE_REF>`.

`keldrath.png`

```
top-down three-quarter view of a great square foundry floor around a central molten crucible, iron pillars spaced around the hall, open empty stone floor in the centre, muted tones with ember orange and soot black accents, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 3:2 --no text, letters, words, labels, frame, border, characters, people
```

`myrathis.png`

```
top-down three-quarter view of a round alchemy laboratory ringed by tall glass vats, wooden workbenches along the edges, open empty tiled floor in the centre, muted tones with acid green and amber accents, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 3:2 --no text, letters, words, labels, frame, border, characters, people --sref <SCENE_REF>
```

`merovant.png`

```
top-down three-quarter view of a long factory floor crossed by two conveyor belts, stamping presses along the walls, open empty floor between them, muted tones with teal and polished brass accents, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 3:2 --no text, letters, words, labels, frame, border, characters, people --sref <SCENE_REF>
```

`orthelyn.png`

```
top-down three-quarter view of a round marble plaza around a giant brass orrery, lightning rods at the edges, open to the night sky, open empty floor around the orrery, muted tones with violet and starlight white accents, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 3:2 --no text, letters, words, labels, frame, border, characters, people --sref <SCENE_REF>
```

`nymora.png`

```
top-down three-quarter view of a ruined greenhouse garden, low hedges and stone fountains, overgrown glass ribs above, open empty lawn in the centre, muted tones with moss green and gold accents, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 3:2 --no text, letters, words, labels, frame, border, characters, people --sref <SCENE_REF>
```

## Story cards

Folder: `cards`. Parameters: `--ar 16:9`, `--sref <SCENE_REF>`.

`opening.png`

```
a young inventor setting out at dawn on a road with three weapons and an empty notebook, five distant kingdoms on the horizon, warm sunrise, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`reveal-keldrath.png`

```
knights in plate armour marching out of a huge forge city, furnaces glowing, sparks in the air, ember orange and soot black palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`reveal-myrathis.png`

```
a skyline of laboratories with smoking chimneys, a giant glass vat glowing with something awake inside, acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`reveal-merovant.png`

```
a city of gears and towers at night, mechanical workers marching through lit assembly halls, teal and polished brass palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`reveal-orthelyn.png`

```
scholars at a great observatory pointing telescopes at a glowing crack in the night sky, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`reveal-nymora.png`

```
lush healing gardens at the edge of a dark watchful forest, tall trees leaning in, moss green and gold palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`ending-keldrath.png`

```
a crowned armoured king kneeling in a silent cold foundry, smiths lowering their hammers, ember orange and soot black palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`ending-myrathis.png`

```
a monstrous creature dissolving into a vat, princes sealing laboratory doors, an inventor holding a stack of notes, acid green and amber palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`ending-merovant.png`

```
a giant clockwork war machine frozen mid-step, workers building a bridge beside it, teal and polished brass palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`ending-orthelyn.png`

```
a figure of empty space folding into a single point of light, scholars mending a crack in the sky, violet and starlight white palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`kingdom-map.png`

```
a hand-drawn map of five kingdoms on parchment seen from above, a forge kingdom in the west, a laboratory kingdom in the south-west, a city of gears in the north, an observatory republic in the east, a forest commonwealth in the south-east, ink coastlines, small landmark sketches, empty roads between them, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border, characters, people --sref <SCENE_REF>
```

`endless-loop.png`

```
a lone inventor walking a long winding road past five distant kingdoms at dusk, journey continuing, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

`ending-nymora.png`

```
a withered fungal monarch in a quiet forest, healers returning to gardens, an inventor planting a seed, moss green and gold palette, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border --sref <SCENE_REF>
```

## Grand Archive hub

Folder: `hub`. Parameters: `--ar 16:9`, `--sref <SCENE_REF>`.

`grand-archive.png`

```
interior of a grand library hall of inventors, gothic arches, tall bookshelves on both sides, a large map table in the centre, a lectern with an open book on the left, a glass trophy cabinet on the right, a brass desk lamp in the corner, warm parchment tones with brass accents, hand-drawn ink and watercolour illustration from a Renaissance inventor's notebook, black ink linework, light cross-hatching, flat muted watercolour washes on aged parchment --ar 16:9 --no text, letters, words, labels, frame, border, characters, people --sref <SCENE_REF>
```

## App icon

Folder: `icons/app`. Parameters: `--ar 1:1`, `--sref <ICON_REF>`.

`app-icon.png`

```
A brass gear crossed with a quill pen over a glass flask, bold and simple, centred on a parchment-coloured circle, single object, item study from a Renaissance inventor's notebook, hand-drawn ink and watercolour, even black ink linework, light cross-hatching, flat muted watercolour fills, three-quarter view, centred, plain flat white background --ar 1:1 --no text, letters, words, frame, border, ground shadow, scenery, multiple subjects --sref <ICON_REF>
```
