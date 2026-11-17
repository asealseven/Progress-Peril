import Phaser from 'phaser';
import { ASSET_FOLDERS, IMAGE_ASSETS, assetKey, bossAssetKey, constructAssetKey, miniBossAssetKey, partAssetKey } from '../data/assets';
import type { AssetEntry, AssetGroup } from '../data/assets';
import { BOSS_LIST, BOSS_PARTS } from '../data/bosses';
import type { BossPartId } from '../data/bosses';
import { COMPONENT_LIST } from '../data/components';
import { ENEMY_LIST } from '../data/enemies';
import { FONTS } from '../data/fonts';
import { MINI_BOSS_LIST } from '../data/miniBosses';
import { FACTION_COLOURS, KINGDOM_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import { RELIC_LIST } from '../data/relics';
import { SCREEN } from '../data/screen';
import { SHOP_IDS } from '../data/shop';
import { STRINGS } from '../data/strings';
import { COMBAT } from '../data/tiers';
import { WEAPON_LIST } from '../data/weapons';
import { SPRITE_IMAGE_SCALE, fitImage, hasImage } from '../render/images';
import { PLAYER_TEXTURE_SIZE } from '../render/placeholders';
import { Button } from '../ui/button';
import { drawPageFrame } from '../ui/frame';
import { componentIcon, keeperIcon, relicIcon, weaponIcon } from '../ui/icons';
import { addText } from '../ui/text';
import { DEV_TOOLS } from './devTools';

const GROUPS = Object.keys(ASSET_FOLDERS) as AssetGroup[];
const GROUP_NAMES: Readonly<Record<AssetGroup, string>> = {
  player: 'Player',
  enemy: 'Enemies',
  miniboss: 'Mini-bosses',
  boss: 'Bosses',
  part: 'Boss parts',
  construct: 'Constructs',
  weapon: 'Weapons',
  component: 'Components',
  relic: 'Relics',
  shopkeeper: 'Shopkeepers',
  arena: 'Arenas',
  card: 'Cards',
  hub: 'Hub',
  app: 'App icon',
};

/** Sprites move in the arena and get the code animation (GDD 15.3). */
const SPRITE_GROUPS: ReadonlySet<AssetGroup> = new Set(['player', 'enemy', 'miniboss', 'boss', 'part', 'construct']);

const COLUMNS = 6;
const ROWS = 3;
const PER_PAGE = COLUMNS * ROWS;
const CELL_W = 190;
const CELL_H = 140;
const CELL_GAP = 8;
const GRID_LEFT = (SCREEN.width - (COLUMNS * CELL_W + (COLUMNS - 1) * CELL_GAP)) / 2;
const GRID_TOP = 196;
const THUMB = 76;
const PANEL = 0xe9dfc8;
const INK = hexToNumber(PALETTE.ink);
const ART_COLOUR = 0x4e7a3a;
const DANGER = hexToNumber(PALETTE.danger);

const STAGE = { x: 50, y: 110, w: 620, h: 520 } as const;
const STAGE_SPRITE = 320;
const SWATCH = { x: 700, y: 420, w: 530, h: 150 } as const;

// Code animation (GDD 15.3), the same numbers as the Combat scene.
const STEP_RATE = 12;
const BOB_HEIGHT = 3;
const SQUASH = 0.06;
const LEAN = 0.12;
const MODE_SECONDS = 1.6;
const SPLATTER_DOTS = 12;

const ANIMATIONS = ['All', 'Idle', 'Walk', 'Attack', 'Hit', 'Death', 'Phase'] as const;
type Animation = (typeof ANIMATIONS)[number];
const BACKDROPS: ReadonlyArray<readonly [string, number]> = [
  ['Arena floor', 0xddd2ba],
  ['Parchment', hexToNumber(PALETTE.parchment)],
  ['Dark ink', INK],
  ['Mid grey', 0x8f877a],
];

/** Facts about one manifest image, for its tile and its preview. */
interface ArtInfo {
  readonly entry: AssetEntry;
  readonly group: AssetGroup;
  readonly name: string;
  /** Logical size in the arena, before the generated-art scale. Sprites only. */
  readonly gameSize?: number;
  readonly colour: number;
  readonly letter: string;
  /** Other images that swap in for this one: a boss's phase images. */
  readonly phaseKeys?: readonly string[];
  readonly drawIcon?: (scene: Phaser.Scene, x: number, y: number, size: number) => Phaser.GameObjects.GameObject[];
}

function groupOf(entry: AssetEntry): AssetGroup {
  return entry.key.slice(0, entry.key.indexOf('.')) as AssetGroup;
}

function describe(entry: AssetEntry): ArtInfo {
  const group = groupOf(entry);
  const name = entry.key.slice(entry.key.indexOf('.') + 1);
  const base = { entry, group, name, colour: hexToNumber(PALETTE.brass), letter: name.charAt(0).toUpperCase() };
  const outline = 3;
  switch (group) {
    case 'player':
      return { ...base, gameSize: PLAYER_TEXTURE_SIZE, colour: hexToNumber(PALETTE.parchment) };
    case 'enemy': {
      const def = ENEMY_LIST.find((item) => assetKey('enemy', item.name) === entry.key);
      if (!def) break;
      return { ...base, name: def.name, gameSize: (def.radius + outline) * 2, colour: hexToNumber(FACTION_COLOURS[def.faction]), letter: def.name.charAt(0) };
    }
    case 'miniboss': {
      const def = MINI_BOSS_LIST.find((item) => miniBossAssetKey(item.id) === entry.key);
      if (!def) break;
      return { ...base, name: def.name, gameSize: (def.body.radius + 5) * 2, colour: hexToNumber(KINGDOM_COLOURS[def.kingdom]), letter: def.name.charAt(0) };
    }
    case 'boss': {
      const def = BOSS_LIST.find((item) => item.phases.some((_, index) => bossAssetKey(item.id, index + 1) === entry.key));
      if (!def) break;
      const phase = def.phases.findIndex((_, index) => bossAssetKey(def.id, index + 1) === entry.key) + 1;
      return {
        ...base,
        name: `${def.name}, phase ${phase}: ${def.phases[phase - 1]?.name ?? ''}`,
        gameSize: (def.body.radius + 5) * 2,
        colour: hexToNumber(KINGDOM_COLOURS[def.kingdom]),
        letter: def.name.replace(/^The /, '').charAt(0),
        phaseKeys: def.phases.map((_, index) => bossAssetKey(def.id, index + 1)),
      };
    }
    case 'part': {
      const id = (Object.keys(BOSS_PARTS) as BossPartId[]).find((item) => partAssetKey(item) === entry.key);
      if (!id) break;
      const def = BOSS_PARTS[id];
      return { ...base, name: def.name, gameSize: (def.radius + outline) * 2, colour: hexToNumber(FACTION_COLOURS[def.faction]), letter: def.name.charAt(0) };
    }
    case 'construct': {
      const trap = entry.key === constructAssetKey('trap');
      return { ...base, gameSize: trap ? 28 / SPRITE_IMAGE_SCALE : 28, colour: hexToNumber(PALETTE.playerEffects) };
    }
    case 'weapon': {
      const def = WEAPON_LIST.find((item) => assetKey('weapon', item.name) === entry.key);
      if (def) return { ...base, name: def.name, drawIcon: (scene, x, y, size) => weaponIcon(scene, def, x, y, size) };
      break;
    }
    case 'component': {
      const def = COMPONENT_LIST.find((item) => assetKey('component', item.name) === entry.key);
      if (def) return { ...base, name: def.name, drawIcon: (scene, x, y, size) => componentIcon(scene, def, x, y, size) };
      break;
    }
    case 'relic': {
      const def = RELIC_LIST.find((item) => assetKey('relic', item.name) === entry.key);
      if (def) return { ...base, name: def.name, drawIcon: (scene, x, y, size) => relicIcon(scene, def, x, y, size) };
      break;
    }
    case 'shopkeeper': {
      const id = SHOP_IDS.find((item) => assetKey('shopkeeper', item) === entry.key);
      if (id) return { ...base, drawIcon: (scene, x, y, size) => keeperIcon(scene, id, x, y, size * 0.8, size) };
      break;
    }
    default:
      break;
  }
  return base;
}

const ART: readonly ArtInfo[] = IMAGE_ASSETS.map(describe);

function artIn(group: AssetGroup): ArtInfo[] {
  return ART.filter((info) => info.group === group);
}

/** Where the gallery was left, so a return keeps the place. */
const view = {
  group: 'enemy' as AssetGroup,
  page: 0,
  selected: undefined as string | undefined,
  animation: 0,
  backdrop: 0,
};

/** One animated image in the preview: the big stage copy or the in-game size copy. */
interface Actor {
  readonly image: Phaser.GameObjects.Image;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** Scale from logical pixels in the arena to pixels on this screen. */
  readonly zoom: number;
  /** The entry's own texture, shown outside the Phase animation. */
  readonly texture: string;
  scaleX: number;
  scaleY: number;
}

/**
 * Dev tools only: every image in the asset manifest, with its art or its
 * placeholder, and a preview playing the code animation (GDD 15.3) at stage
 * size and at in-game size. New art shows here after a reload.
 */
export class ArtGallery extends Phaser.Scene {
  private actors: Actor[] = [];
  private splatter: Phaser.GameObjects.Graphics | undefined;
  private clock = 0;
  private info: ArtInfo | undefined;
  private lastPhaseCycle = -1;

  constructor() {
    super('ArtGallery');
  }

  create(): void {
    if (!DEV_TOOLS) {
      this.scene.start('Hub');
      return;
    }
    this.actors = [];
    this.splatter = undefined;
    this.clock = 0;
    this.lastPhaseCycle = -1;
    this.info = view.selected ? ART.find((item) => item.entry.key === view.selected) : undefined;
    this.cameras.main.setBackgroundColor(PALETTE.parchment);
    drawPageFrame(this.add.graphics(), SCREEN.width, SCREEN.height, 14);

    const found = ART.filter((item) => hasImage(item.entry.key)).length;
    addText(this, SCREEN.width / 2, 40, STRINGS.gallery.title, { role: 'heading', size: 36 }).setOrigin(0.5);
    addText(this, SCREEN.width / 2, 74, STRINGS.gallery.found(found, ART.length), { size: 16, weight: '700', colour: PALETTE.brass }).setOrigin(0.5);

    if (this.info) this.drawPreview(this.info);
    else this.drawGrid();

    const keyboard = this.input.keyboard;
    const back = (): void => {
      if (view.selected) this.redraw(() => (view.selected = undefined));
      else this.scene.start('TestLab');
    };
    const move = (direction: number) => (): void => this.step(direction);
    const left = move(-1);
    const right = move(1);
    keyboard?.on('keydown-ESC', back);
    keyboard?.on('keydown-LEFT', left);
    keyboard?.on('keydown-RIGHT', right);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      keyboard?.off('keydown-ESC', back);
      keyboard?.off('keydown-LEFT', left);
      keyboard?.off('keydown-RIGHT', right);
    });
  }

  private redraw(change: () => void): void {
    change();
    this.scene.restart();
  }

  /** Arrow keys: the next page in the grid, the next image in the preview. */
  private step(direction: number): void {
    const items = artIn(view.group);
    if (view.selected) {
      const index = items.findIndex((item) => item.entry.key === view.selected);
      const next = items[(index + direction + items.length) % items.length];
      this.redraw(() => (view.selected = next?.entry.key));
      return;
    }
    const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    this.redraw(() => (view.page = (view.page + direction + pages) % pages));
  }

  // --- Grid ----------------------------------------------------------------------

  private drawGrid(): void {
    // Group tabs, two rows of seven.
    const tabW = 164;
    const tabGap = 6;
    const perRow = Math.ceil(GROUPS.length / 2);
    const tabsLeft = (SCREEN.width - (perRow * tabW + (perRow - 1) * tabGap)) / 2;
    GROUPS.forEach((group, index) => {
      const items = artIn(group);
      const have = items.filter((item) => hasImage(item.entry.key)).length;
      const column = index % perRow;
      const row = Math.floor(index / perRow);
      new Button(this, tabsLeft + tabW / 2 + column * (tabW + tabGap), 112 + row * 40, {
        label: `${GROUP_NAMES[group]} ${STRINGS.gallery.groupFound(have, items.length)}`,
        width: tabW,
        height: 34,
        textSize: 14,
        selected: group === view.group,
        onClick: () => this.redraw(() => ((view.group = group), (view.page = 0))),
      });
    });

    const items = artIn(view.group);
    const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
    view.page = Math.min(view.page, pages - 1);
    items.slice(view.page * PER_PAGE, (view.page + 1) * PER_PAGE).forEach((info, index) => {
      const column = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);
      this.drawTile(info, GRID_LEFT + column * (CELL_W + CELL_GAP), GRID_TOP + row * (CELL_H + CELL_GAP));
    });

    const y = 668;
    new Button(this, 200, y, { label: STRINGS.gallery.previous, width: 160, height: 44, textSize: 18, enabled: pages > 1, onClick: () => this.step(-1) });
    addText(this, 380, y, STRINGS.gallery.page(view.page + 1, pages), { size: 16, colour: PALETTE.brass, weight: '700' }).setOrigin(0.5);
    new Button(this, 560, y, { label: STRINGS.gallery.next, width: 160, height: 44, textSize: 18, enabled: pages > 1, onClick: () => this.step(1) });
    addText(this, 660, y, STRINGS.gallery.hint, { size: 13, wrapWidth: 420, colour: PALETTE.brass }).setOrigin(0, 0.5);
    new Button(this, 1170, y, { label: STRINGS.gallery.back, width: 120, height: 44, textSize: 18, onClick: () => this.scene.start('TestLab') });
  }

  private drawTile(info: ArtInfo, x: number, y: number): void {
    const present = hasImage(info.entry.key);
    const panel = this.add.rectangle(x, y, CELL_W, CELL_H, PANEL, 1).setOrigin(0);
    panel.setStrokeStyle(2, INK, 1);
    panel.setInteractive({ useHandCursor: true });
    panel.on('pointerup', () => this.redraw(() => ((view.selected = info.entry.key), (view.animation = 0))));
    this.add.rectangle(x, y, CELL_W, 6, present ? ART_COLOUR : DANGER, 1).setOrigin(0);
    addText(this, x + 6, y + 10, present ? STRINGS.gallery.art : STRINGS.gallery.placeholder, {
      size: 12,
      weight: '700',
      colour: present ? '#4E7A3A' : PALETTE.danger,
    });
    this.drawThumb(info, x + CELL_W / 2, y + 70, THUMB);
    addText(this, x + CELL_W / 2, y + CELL_H - 8, info.name, { size: 13, weight: '500', align: 'center', wrapWidth: CELL_W - 10 }).setOrigin(0.5, 1);
  }

  /** The art, an item icon from the UI kit, or a placeholder drawn here. */
  private drawThumb(info: ArtInfo, x: number, y: number, size: number): void {
    const key = info.entry.key;
    if (info.drawIcon) {
      info.drawIcon(this, x, y, size);
      return;
    }
    if (hasImage(key)) {
      fitImage(this.add.image(x, y, key), size);
      return;
    }
    if (SPRITE_GROUPS.has(info.group)) {
      fitImage(this.add.image(x, y, this.placeholderTexture(info, key)), size * 0.8);
      return;
    }
    const box = this.add.rectangle(x, y, size * 1.6, size * 0.9, 0xd8ccb0, 1);
    box.setStrokeStyle(2, INK, 0.6);
    addText(this, x, y, STRINGS.gallery.placeholder, { size: 12, colour: PALETTE.brass }).setOrigin(0.5);
  }

  /** A canvas circle in the faction or kingdom colour, ink outline and first letter. */
  private placeholderTexture(info: ArtInfo, imageKey: string): string {
    const key = `gallery-placeholder.${imageKey}`;
    if (this.textures.exists(key)) return key;
    const pixels = 192;
    const texture = this.textures.createCanvas(key, pixels, pixels);
    if (!texture) return key;
    const context = texture.getContext();
    const centre = pixels / 2;
    context.beginPath();
    context.arc(centre, centre, centre - 8, 0, Math.PI * 2);
    context.fillStyle = `#${info.colour.toString(16).padStart(6, '0')}`;
    context.fill();
    context.lineWidth = 10;
    context.strokeStyle = PALETTE.ink;
    context.stroke();
    if (info.group === 'player') {
      context.setLineDash([16, 12]);
      context.lineWidth = 5;
      context.strokeStyle = PALETTE.playerEffects;
      context.beginPath();
      context.arc(centre, centre, centre - 2, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    } else {
      context.fillStyle = PALETTE.ink;
      context.font = `700 ${Math.round(pixels * 0.45)}px "${FONTS.body}", sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(info.letter, centre, centre + 4);
    }
    texture.refresh();
    return key;
  }

  /** The texture to draw for a key: its art, or the placeholder. */
  private textureFor(info: ArtInfo, key: string): string {
    return hasImage(key) ? key : this.placeholderTexture(info, key);
  }

  // --- Preview ---------------------------------------------------------------------

  private drawPreview(info: ArtInfo): void {
    const key = info.entry.key;
    const present = hasImage(key);
    const sprite = SPRITE_GROUPS.has(info.group);
    const backdrop = BACKDROPS[view.backdrop % BACKDROPS.length] ?? BACKDROPS[0];
    const stage = this.add.rectangle(STAGE.x, STAGE.y, STAGE.w, STAGE.h, backdrop?.[1] ?? 0xddd2ba, 1).setOrigin(0);
    stage.setStrokeStyle(3, INK, 1);
    const centreX = STAGE.x + STAGE.w / 2;
    const centreY = STAGE.y + STAGE.h / 2;

    if (sprite && info.gameSize) {
      const texture = this.textureFor(info, key);
      // The big copy keeps the in-game proportions between art and placeholder.
      const gameSize = present ? info.gameSize * SPRITE_IMAGE_SCALE : info.gameSize;
      this.addActor(texture, centreX, centreY, STAGE_SPRITE, STAGE_SPRITE / gameSize);
      this.splatter = this.add.graphics();
      this.drawSwatch(info, texture, gameSize);
    } else if (info.drawIcon && !present) {
      info.drawIcon(this, centreX, centreY, 320);
    } else if (present) {
      fitImage(this.add.image(centreX, centreY, key), STAGE.w - 40, STAGE.h - 40);
    } else {
      addText(this, centreX, centreY, info.entry.placeholder, { size: 20, align: 'center', wrapWidth: STAGE.w - 80, colour: PALETTE.brass }).setOrigin(0.5);
    }

    // Facts about the file.
    const right = 700;
    addText(this, right, 112, info.name, { role: 'heading', size: 26, wrapWidth: 530 });
    const texture = present ? this.textures.get(key).getSourceImage() : undefined;
    const lines = [
      `${present ? STRINGS.gallery.art : STRINGS.gallery.placeholder}`,
      STRINGS.gallery.key(key),
      info.entry.path ? STRINGS.gallery.path(info.entry.path) : '',
      texture ? STRINGS.gallery.size(texture.width, texture.height) : STRINGS.gallery.placeholderNote(info.entry.placeholder),
    ].filter((line) => line.length > 0);
    addText(this, right, 156, lines.join('\n'), { size: 15, wrapWidth: 530, colour: PALETTE.ink });

    // Controls.
    const animations = this.animationsFor(info);
    const animation = animations[view.animation % animations.length] ?? 'All';
    if (sprite) {
      new Button(this, right + 130, 340, {
        label: STRINGS.gallery.animation(animation),
        width: 260,
        height: 44,
        textSize: 17,
        onClick: () => this.redraw(() => (view.animation = (view.animation + 1) % animations.length)),
      });
    }
    new Button(this, right + (sprite ? 400 : 130), 340, {
      label: STRINGS.gallery.backdrop(backdrop?.[0] ?? ''),
      width: 260,
      height: 44,
      textSize: 17,
      onClick: () => this.redraw(() => (view.backdrop = (view.backdrop + 1) % BACKDROPS.length)),
    });

    const y = 668;
    new Button(this, 200, y, { label: STRINGS.gallery.previous, width: 160, height: 44, textSize: 18, onClick: () => this.step(-1) });
    new Button(this, 380, y, { label: STRINGS.gallery.next, width: 160, height: 44, textSize: 18, onClick: () => this.step(1) });
    new Button(this, 1150, y, { label: STRINGS.gallery.close, width: 140, height: 44, textSize: 18, onClick: () => this.redraw(() => (view.selected = undefined)) });
  }

  /** The arena floor at true size, with the player beside the sprite for scale. */
  private drawSwatch(info: ArtInfo, texture: string, gameSize: number): void {
    const floor = this.add.rectangle(SWATCH.x, SWATCH.y, SWATCH.w, SWATCH.h, 0xddd2ba, 1).setOrigin(0);
    floor.setStrokeStyle(2, INK, 1);
    addText(this, SWATCH.x + 8, SWATCH.y + 6, STRINGS.gallery.inGame, { size: 13, weight: '700', colour: PALETTE.brass });
    const midY = SWATCH.y + SWATCH.h / 2 + 8;
    this.addActor(texture, SWATCH.x + SWATCH.w * 0.62, midY, gameSize, 1);
    if (info.group !== 'player') {
      const player = ART.find((item) => item.group === 'player');
      if (player) {
        const playerKey = player.entry.key;
        const playerSize = hasImage(playerKey) ? PLAYER_TEXTURE_SIZE * SPRITE_IMAGE_SCALE : PLAYER_TEXTURE_SIZE;
        fitImage(this.add.image(SWATCH.x + SWATCH.w * 0.3, midY, this.textureFor(player, playerKey)), playerSize);
      }
    }
    // A reference ring at the collision size of a Normal enemy.
    this.add.circle(SWATCH.x + SWATCH.w * 0.9, midY, COMBAT.playerRadius).setStrokeStyle(1, INK, 0.3);
  }

  private addActor(texture: string, x: number, y: number, size: number, zoom: number): void {
    const image = fitImage(this.add.image(x, y, texture), size);
    this.actors.push({ image, x, y, size, zoom, texture, scaleX: image.scaleX, scaleY: image.scaleY });
  }

  private animationsFor(info: ArtInfo): readonly Animation[] {
    return info.phaseKeys ? ANIMATIONS : ANIMATIONS.filter((name) => name !== 'Phase');
  }

  // --- Code animation ----------------------------------------------------------------

  override update(_time: number, delta: number): void {
    const info = this.info;
    if (!info || this.actors.length === 0) return;
    this.clock += delta / 1000;
    const animations = this.animationsFor(info);
    let animation = animations[view.animation % animations.length] ?? 'All';
    let t = this.clock;
    if (animation === 'All') {
      const playable = animations.filter((name) => name !== 'All');
      const index = Math.floor(this.clock / MODE_SECONDS) % playable.length;
      animation = playable[index] ?? 'Idle';
      t = this.clock % MODE_SECONDS;
    }
    this.splatter?.clear();
    if (animation === 'Phase') this.swapPhase(info, t);
    else for (const actor of this.actors) if (actor.image.texture.key !== actor.texture) this.setTexture(actor, actor.texture);
    for (const actor of this.actors) this.animate(actor, animation, t);
  }

  private animate(actor: Actor, animation: Animation, t: number): void {
    const { image, zoom } = actor;
    let x = actor.x;
    let y = actor.y;
    let rotation = 0;
    let squash = 0;
    let scale = 1;
    let alpha = 1;
    let flash = false;
    switch (animation) {
      case 'Walk': {
        // A gentle bob, a lean toward the direction of travel and a squash on each step.
        const vx = Math.cos(t * 2);
        const moving = Math.abs(vx);
        const step = t * STEP_RATE;
        x += Math.sin(t * 2) * 40 * Math.min(zoom, 2);
        y += -Math.abs(Math.sin(step)) * BOB_HEIGHT * moving * zoom;
        squash = Math.abs(Math.cos(step)) * SQUASH * moving;
        rotation = vx * LEAN;
        break;
      }
      case 'Attack': {
        // Wind-up pull-back, then a quick lunge.
        const cycleT = t % 1.2;
        const offset = cycleT < 0.7 ? -6 * (cycleT / 0.7) : cycleT < 0.85 ? 9 * (1 - (cycleT - 0.7) / 0.15) : 0;
        x += offset * zoom;
        break;
      }
      case 'Hit':
        flash = t % 0.6 < 0.12;
        break;
      case 'Death': {
        // Shrink, then ink splatter, then the image returns for the next loop.
        const progress = t % MODE_SECONDS;
        const shrink = Math.min(1, progress / 0.35);
        scale = 1 - shrink;
        alpha = 1 - shrink;
        if (progress < 1.1) this.drawSplatter(actor, Math.min(1, progress / 1.1));
        break;
      }
      case 'Phase':
        flash = t % MODE_SECONDS < 0.18;
        break;
      default:
        y += Math.sin(t * 2) * 0.8 * zoom;
        break;
    }
    image.setPosition(x, y);
    image.setRotation(rotation);
    image.setScale(actor.scaleX * scale * (1 + squash * 0.6), actor.scaleY * scale * (1 - squash));
    image.setAlpha(alpha);
    image.setTint(0xffffff);
    image.setTintMode(flash ? Phaser.TintModes.FILL : Phaser.TintModes.MULTIPLY);
  }

  private drawSplatter(actor: Actor, progress: number): void {
    const g = this.splatter;
    if (!g) return;
    const reach = actor.scaleX * actor.image.width * 0.6;
    g.fillStyle(INK, 1 - progress);
    for (let dot = 0; dot < SPLATTER_DOTS; dot++) {
      const angle = (dot / SPLATTER_DOTS) * Math.PI * 2 + (dot % 3) * 0.4;
      const distance = reach * (0.3 + progress * (0.7 + (dot % 4) * 0.15));
      g.fillCircle(actor.x + Math.cos(angle) * distance, actor.y + Math.sin(angle) * distance, Math.max(1.5, reach * 0.06 * (1 + (dot % 2))));
    }
  }

  /** Bosses swap to the image of each phase with a flash and a short shake (GDD 15.3). */
  private swapPhase(info: ArtInfo, t: number): void {
    const keys = info.phaseKeys;
    if (!keys) return;
    const cycle = Math.floor(this.clock / MODE_SECONDS);
    if (cycle === this.lastPhaseCycle || t > 0.05) return;
    this.lastPhaseCycle = cycle;
    const key = keys[cycle % keys.length];
    if (!key) return;
    const texture = this.textureFor(info, key);
    for (const actor of this.actors) this.setTexture(actor, texture);
    this.cameras.main.shake(200, 0.004);
  }

  /** Swaps an actor's image and fits the new one to the same box. */
  private setTexture(actor: Actor, texture: string): void {
    actor.image.setTexture(texture);
    fitImage(actor.image, actor.size);
    actor.scaleX = actor.image.scaleX;
    actor.scaleY = actor.image.scaleY;
  }
}
