import Phaser from 'phaser';
import { DAMAGE_TYPE_COLOURS, KINGDOM_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import type { DamageTypeName } from '../data/palette';
import { SCREEN } from '../data/screen';
import { STRINGS, formatTime } from '../data/strings';
import { ENEMY_RULES, PERFORMANCE_LIMITS } from '../data/tiers';
import { Effects } from '../render/effects';
import {
  PLAYER_KEY,
  PLAYER_TEXTURE_SIZE,
  enemyKey,
  enemyTextureSize,
  ensureEnemyTexture,
  ensurePlayerTexture,
} from '../render/placeholders';
import { formatSeed } from '../sim/rng';
import { createWorldForRound, finishRound, kingdomForRound } from '../sim/run';
import type { RunState } from '../sim/run';
import { auraRadius, currentAttackSpeed, orbitHeadRadius, orbitRadius } from '../sim/world/attacks';
import { hasShield, shieldBlocks, spawnGroup } from '../sim/world/enemies';
import { CHAMPION_TRAITS } from '../data/champions';
import { ELITE_MODIFIERS } from '../data/eliteModifiers';
import { ENEMY_LIST } from '../data/enemies';
import { territoryIndex } from '../data/rounds';
import { REACTION_DEFS, STATUS_DEFS, STATUS_EFFECTS } from '../data/statusEffects';
import { SYNERGIES } from '../data/synergies';
import { meterSize, trailStatuses } from '../sim/world/status';
import type { Enemy, EnemyRank, Hazard } from '../sim/world/types';
import type { World } from '../sim/world/world';
import { STEP_SECONDS } from '../sim/world/world';
import { Button } from '../ui/button';
import { addText } from '../ui/text';
import { CombatInput, JOYSTICK_RADIUS } from './input';
import { isTouchPrimary, uiScale } from './platform';

export interface CombatData {
  run: RunState;
}

const INK = hexToNumber(PALETTE.ink);
const PARCHMENT = hexToNumber(PALETTE.parchment);
const BRASS = hexToNumber(PALETTE.brass);
const DANGER = hexToNumber(PALETTE.danger);
const GOLD = hexToNumber(PALETTE.playerEffects);

/** Muted floor tones keep enemies and telegraphs the strongest shapes (GDD 15.1). */
const FLOOR = 0xddd2ba;
const FLOOR_LINE = 0xcbbfa5;
const PILLAR = 0x6b635a;

const SMOKE = 0xbfb8a8;
const STEEL = hexToNumber(DAMAGE_TYPE_COLOURS.Piercing);
/** Placeholder colours for material pickups. */
const MATERIAL_COLOURS = {
  Scrap: 0x8a8f96,
  Reagents: hexToNumber(DAMAGE_TYPE_COLOURS.Fire),
  Crystals: hexToNumber(DAMAGE_TYPE_COLOURS.Cold),
  Specimens: hexToNumber(DAMAGE_TYPE_COLOURS.Biological),
} as const;
const DEBUG_RANKS: readonly EnemyRank[] = ['normal', 'elite', 'champion'];
const WARNING_SECONDS = 1.5;
const MAX_CHAMPION_LABELS = 4;
const CREATURE = hexToNumber(DAMAGE_TYPE_COLOURS.Toxic);

const DEPTH = {
  floor: 0,
  under: 3,
  telegraph: 5,
  enemy: 10,
  player: 20,
  projectile: 25,
  effects: 30,
  bars: 35,
  hud: 100,
  hudText: 101,
  overlay: 200,
} as const;

/** Longest frame the simulation catches up on, milliseconds. */
const MAX_FRAME_MS = 100;
/** Camera look-ahead in the direction of movement, pixels (GDD 15.2). */
const LOOK_AHEAD = 70;
const LOOK_SMOOTHING = 4;
/** Mobile uses a slightly wider view than PC (GDD 15.2). */
const TOUCH_ZOOM = 0.85;
const LOW_HEALTH = 0.3;
const END_DELAY_MS = 1100;
const PIP_SIZE = 6;
const MAX_FLOATERS = 10;
const FLOATER_SECONDS = 1.1;
const HUD_MARGIN = 24;

/** The combat scene: owns one simulation, feeds input in, steps and draws. */
export class Combat extends Phaser.Scene {
  private run!: RunState;
  private sim!: World;
  private controls!: CombatInput;
  private effects!: Effects;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;

  private accumulator = 0;
  private paused = false;
  private ended = false;
  private clock = 0;
  private lookX = 0;
  private lookY = 0;
  private scale1 = 1;

  private playerSprite!: Phaser.GameObjects.Image;
  private enemySprites: Array<Phaser.GameObjects.Image | undefined> = [];
  /** Zones, auras and traps draw under enemies. Projectiles, constructs and beams draw over them. */
  private under!: Phaser.GameObjects.Graphics;
  private over!: Phaser.GameObjects.Graphics;
  private telegraphs!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;

  private healthText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private bannerText!: Phaser.GameObjects.Text;
  private debugText!: Phaser.GameObjects.Text;
  private weaponLabels: Phaser.GameObjects.Text[] = [];
  private pauseObjects: Phaser.GameObjects.GameObject[] = [];
  private pauseButtons: Button[] = [];
  private pauseZone?: Phaser.GameObjects.Zone;
  private debugButtons: Button[] = [];
  private focusPoint: { x: number; y: number } | undefined;
  /** Floating labels naming status reactions (GDD 15.4). */
  private floaters: Array<{ text: Phaser.GameObjects.Text; life: number }> = [];

  private lastHealthLabel = '';
  private lastTimerLabel = '';
  private debugVisible = false;
  /** Debug spawn tool: the enemy and rank picked. */
  private debugEnemy = 0;
  private debugRank = 0;
  private enemyButton?: Button;
  private rankButton?: Button;
  /** Markers where large groups enter soon (GDD 4.11). */
  private warnings: Array<{ x: number; y: number; life: number }> = [];
  private championLabels: Phaser.GameObjects.Text[] = [];
  private suppressedText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private lastGold = -1;

  constructor() {
    super('Combat');
  }

  init(data: CombatData): void {
    this.run = data.run;
  }

  create(): void {
    this.sim = createWorldForRound(this.run, isTouchPrimary() ? PERFORMANCE_LIMITS.mobile : PERFORMANCE_LIMITS.pc);
    this.accumulator = 0;
    this.paused = false;
    this.ended = false;
    this.clock = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.scale1 = uiScale();
    this.enemySprites = [];
    this.weaponLabels = [];
    this.debugButtons = [];
    this.focusPoint = undefined;
    this.floaters = [];
    this.pauseObjects = [];
    this.pauseButtons = [];
    this.pauseZone = undefined;
    this.lastHealthLabel = '';
    this.lastTimerLabel = '';
    this.debugVisible = false;
    this.warnings = [];
    this.lastGold = -1;
    this.championLabels = [];
    this.enemyButton = undefined;
    this.rankButton = undefined;

    const arena = this.sim.arena;
    const main = this.cameras.main;
    main.setBackgroundColor(PALETTE.ink);
    main.setBounds(0, 0, arena.width, arena.height);
    main.setZoom(isTouchPrimary() ? TOUCH_ZOOM : 1);
    main.centerOn(this.sim.player.x, this.sim.player.y);
    // A second camera draws the HUD, so world zoom and scroll never move it.
    this.uiCamera = this.cameras.add(0, 0, SCREEN.width, SCREEN.height);

    ensurePlayerTexture(this);

    this.drawArena();
    this.under = this.inWorld(this.add.graphics()).setDepth(DEPTH.under);
    this.over = this.inWorld(this.add.graphics()).setDepth(DEPTH.projectile);
    this.telegraphs = this.inWorld(this.add.graphics()).setDepth(DEPTH.telegraph);
    this.playerSprite = this.inWorld(this.add.image(0, 0, PLAYER_KEY))
      .setDisplaySize(PLAYER_TEXTURE_SIZE, PLAYER_TEXTURE_SIZE)
      .setDepth(DEPTH.player);
    this.effects = new Effects(this.inWorld(this.add.graphics()).setDepth(DEPTH.effects));
    this.bars = this.inWorld(this.add.graphics()).setDepth(DEPTH.bars);

    this.createHud();
    this.createPauseOverlay();
    this.setPaused(false);

    this.controls = new CombatInput(this);
    const keyboard = this.input.keyboard;
    keyboard?.on('keydown-ESC', this.togglePause, this);
    keyboard?.on('keydown-F3', this.toggleDebug, this);
    keyboard?.on('keydown-I', this.toggleInvincible, this);
    keyboard?.on('keydown-L', this.openLoadout, this);
    keyboard?.on('keydown-K', this.spawnTestEnemies, this);
    keyboard?.on('keydown-N', this.nextDebugEnemy, this);
    keyboard?.on('keydown-R', this.nextDebugRank, this);
    keyboard?.addCapture('TAB,F3');
    this.input.on('pointerdown', this.onPointerDown, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseOnHide, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.controls.destroy();
      keyboard?.off('keydown-ESC', this.togglePause, this);
      keyboard?.off('keydown-F3', this.toggleDebug, this);
      keyboard?.off('keydown-I', this.toggleInvincible, this);
      keyboard?.off('keydown-L', this.openLoadout, this);
      keyboard?.off('keydown-K', this.spawnTestEnemies, this);
      keyboard?.off('keydown-N', this.nextDebugEnemy, this);
      keyboard?.off('keydown-R', this.nextDebugRank, this);
      this.input.off('pointerdown', this.onPointerDown, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.pauseOnHide, this);
    });

    this.draw(0);
  }

  // --- Camera routing ---------------------------------------------------------

  /** World objects draw on the main camera only. */
  private inWorld<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.uiCamera.ignore(object);
    return object;
  }

  /** HUD objects draw on the interface camera only. */
  private inHud<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.cameras.main.ignore(object);
    return object;
  }

  // --- Setup --------------------------------------------------------------------

  /** Placeholder Great Foundry: a muted floor, the central crucible and iron pillars (GDD 5.9). */
  private drawArena(): void {
    const arena = this.sim.arena;
    const kingdom = hexToNumber(KINGDOM_COLOURS[arena.kingdom]);
    const floor = this.inWorld(this.add.graphics()).setDepth(DEPTH.floor);

    floor.fillStyle(FLOOR, 1);
    floor.fillRect(0, 0, arena.width, arena.height);
    floor.lineStyle(2, FLOOR_LINE, 1);
    for (let x = 200; x < arena.width; x += 200) floor.lineBetween(x, 0, x, arena.height);
    for (let y = 200; y < arena.height; y += 200) floor.lineBetween(0, y, arena.width, y);

    floor.lineStyle(10, INK, 1);
    floor.strokeRect(5, 5, arena.width - 10, arena.height - 10);
    floor.lineStyle(3, kingdom, 0.8);
    floor.strokeRect(16, 16, arena.width - 32, arena.height - 32);

    for (const obstacle of arena.obstacles) {
      if (obstacle.kind === 'landmark') {
        floor.fillStyle(PILLAR, 1);
        floor.fillCircle(obstacle.x, obstacle.y, obstacle.radius);
        floor.fillStyle(kingdom, 1);
        floor.fillCircle(obstacle.x, obstacle.y, obstacle.radius * 0.72);
        floor.lineStyle(4, INK, 1);
        floor.strokeCircle(obstacle.x, obstacle.y, obstacle.radius * 0.72);
        floor.strokeCircle(obstacle.x, obstacle.y, obstacle.radius);
      } else {
        floor.fillStyle(PILLAR, 1);
        floor.fillCircle(obstacle.x, obstacle.y, obstacle.radius);
        floor.lineStyle(3, INK, 1);
        floor.strokeCircle(obstacle.x, obstacle.y, obstacle.radius);
        floor.lineStyle(2, INK, 0.5);
        floor.strokeCircle(obstacle.x, obstacle.y, obstacle.radius * 0.6);
      }
    }
  }

  /** HUD layout from GDD 15.7. */
  private createHud(): void {
    const s = this.scale1;
    const centreX = SCREEN.width / 2;
    const territory = territoryIndex(this.sim.round) + 1;

    this.hud = this.inHud(this.add.graphics()).setDepth(DEPTH.hud);

    this.healthText = this.inHud(
      addText(this, HUD_MARGIN + 260 * s + 12, HUD_MARGIN - 2 + 11 * s, '', { size: 20 * s, weight: '700' }),
    )
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.hudText);

    const roundText = this.inHud(
      addText(this, centreX, 12, STRINGS.hud.round(this.sim.round), { role: 'heading', size: 30 * s }),
    )
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hudText);
    this.timerText = this.inHud(addText(this, centreX, 12 + 36 * s, '', { size: 24 * s, weight: '700' }))
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hudText);
    const territoryText = this.inHud(
      addText(this, centreX, 12 + 68 * s, STRINGS.hud.territory(territory, kingdomForRound(this.run)), {
        size: 15 * s,
        colour: PALETTE.brass,
        weight: '500',
      }),
    )
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hudText);

    // Weapon tiles, bottom centre. Three slots (GDD 7.8).
    const tile = this.tileLayout();
    for (let slot = 0; slot < 3; slot++) {
      const weapon = this.sim.weapons[slot];
      const label = this.inHud(
        addText(
          this,
          tile.x + slot * (tile.size + tile.gap) + tile.size / 2,
          tile.y + tile.size / 2,
          weapon ? weapon.resolved.def.name : STRINGS.hud.emptySlot,
          {
            size: 13 * s,
            weight: weapon ? '700' : '400',
            colour: weapon ? PALETTE.ink : PALETTE.brass,
            align: 'center',
            wrapWidth: tile.size - 8,
          },
        ),
      )
        .setOrigin(0.5)
        .setDepth(DEPTH.hudText);
      this.weaponLabels.push(label);
    }

    // Gold sits top right, left of the pause button on touch devices (GDD 15.7).
    const goldRight = SCREEN.width - HUD_MARGIN - (isTouchPrimary() ? 64 * s + 16 : 0);
    this.goldText = this.inHud(addText(this, goldRight, HUD_MARGIN - 4, '', { size: 22 * s, weight: '700' }))
      .setOrigin(1, 0)
      .setDepth(DEPTH.hudText);

    // A parchment outline keeps HUD text readable over the arena.
    for (const text of [this.healthText, this.timerText, roundText, territoryText, this.goldText]) {
      text.setStroke(PALETTE.parchment, 5);
    }

    this.bannerText = this.inHud(
      addText(this, centreX, SCREEN.height / 2 - 120, '', { role: 'heading', size: 72 }),
    )
      .setOrigin(0.5)
      .setDepth(DEPTH.hudText)
      .setVisible(false);
    this.bannerText.setStroke(PALETTE.parchment, 8);

    // The Unstable switches Auxiliary components off (GDD 9.11).
    const tiles = this.tileLayout();
    this.suppressedText = this.inHud(
      addText(this, centreX, tiles.y - 10, STRINGS.hud.suppressed, { size: 16 * s, weight: '700', colour: PALETTE.danger }),
    )
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.hudText)
      .setVisible(false);
    this.suppressedText.setStroke(PALETTE.parchment, 5);

    this.debugText = this.inHud(
      addText(this, HUD_MARGIN, SCREEN.height - HUD_MARGIN - 104 * s, '', { size: 14 * s, weight: '500' }),
    )
      .setOrigin(0, 1)
      .setDepth(DEPTH.hudText)
      .setVisible(false);
    this.debugText.setBackgroundColor(PALETTE.parchment);

    // Debug tools (CLAUDE.md "Testing"): loadout, spawn and invincibility.
    const tools: Array<[string, () => void]> = [
      [STRINGS.debug.loadout, () => this.openLoadout()],
      [STRINGS.debug.spawn, () => this.spawnTestEnemies()],
      [STRINGS.debug.invincible, () => this.toggleInvincible()],
    ];
    const toolWidth = 150 * s;
    const addTool = (label: string, x: number, y: number, width: number, onClick: () => void): Button => {
      const button = new Button(this, x, y, { label, width, height: 44 * s, textSize: 17 * s, onClick });
      button.setDepth(DEPTH.hudText).setVisible(false);
      for (const object of button.objects) this.inHud(object);
      this.debugButtons.push(button);
      return button;
    };
    const toolY = SCREEN.height - HUD_MARGIN - 22 * s;
    tools.forEach(([label, onClick], index) => {
      addTool(label, HUD_MARGIN + toolWidth / 2 + index * (toolWidth + 8), toolY, toolWidth, onClick);
    });
    // Spawn tool: pick any enemy and rank (N and R on a keyboard).
    const upperY = toolY - 50 * s;
    const enemyWidth = toolWidth * 2 + 8;
    this.enemyButton = addTool('', HUD_MARGIN + enemyWidth / 2, upperY, enemyWidth, () => this.nextDebugEnemy());
    this.rankButton = addTool('', HUD_MARGIN + enemyWidth + 8 + toolWidth / 2, upperY, toolWidth, () => this.nextDebugRank());
    this.refreshDebugTools();

    // Touch devices get a pause button in the top right corner (GDD 15.7).
    if (isTouchPrimary()) {
      const button = this.pauseButtonLayout();
      this.pauseZone = this.inHud(
        this.add.zone(button.x + button.size / 2, button.y + button.size / 2, button.size, button.size),
      ).setDepth(DEPTH.hudText);
      this.pauseZone.setInteractive();
      this.pauseZone.on('pointerup', () => {
        if (!this.paused) this.setPaused(true);
      });
    }
  }

  private tileLayout(): { x: number; y: number; size: number; gap: number } {
    const size = 68 * this.scale1;
    const gap = 10;
    const total = size * 3 + gap * 2;
    return { x: (SCREEN.width - total) / 2, y: SCREEN.height - 18 - size, size, gap };
  }

  private pauseButtonLayout(): { x: number; y: number; size: number } {
    // 64 logical pixels times the touch scale keeps the target above 44 screen pixels.
    const size = 64 * this.scale1;
    return { x: SCREEN.width - HUD_MARGIN - size, y: HUD_MARGIN - 6, size };
  }

  private createPauseOverlay(): void {
    const s = this.scale1;
    const centreX = SCREEN.width / 2;
    const centreY = SCREEN.height / 2;
    const panelWidth = 520 * s;
    const panelHeight = 430 * s;

    const dim = this.add.rectangle(centreX, centreY, SCREEN.width, SCREEN.height, INK, 0.6);
    dim.setInteractive();
    const panel = this.add.rectangle(centreX, centreY, panelWidth, panelHeight, PARCHMENT, 1);
    panel.setStrokeStyle(4, INK, 1);
    const title = addText(this, centreX, centreY - panelHeight / 2 + 50 * s, STRINGS.pause.title, {
      role: 'heading',
      size: 48 * s,
    }).setOrigin(0.5);
    const seed = addText(
      this,
      centreX,
      centreY - panelHeight / 2 + 104 * s,
      STRINGS.pause.seed(formatSeed(this.run.seed)),
      { role: 'hand', size: 28 * s, colour: PALETTE.brass },
    ).setOrigin(0.5);

    // The pause screen shows the active synergies of the build (GDD 3.12).
    const names = [...this.sim.synergies].map((id) => SYNERGIES[id]?.name ?? id);
    const synergies = addText(this, centreX, centreY - panelHeight / 2 + 134 * s, STRINGS.pause.synergies(names), {
      size: 16 * s,
      weight: '500',
      align: 'center',
      wrapWidth: panelWidth - 40,
    }).setOrigin(0.5, 0);

    const resume = new Button(this, centreX, centreY + 64 * s, {
      label: STRINGS.pause.resume,
      width: 320 * s,
      height: 64 * s,
      textSize: 28 * s,
      onClick: () => this.setPaused(false),
    });
    const quit = new Button(this, centreX, centreY + 146 * s, {
      label: STRINGS.pause.quit,
      width: 320 * s,
      height: 64 * s,
      textSize: 28 * s,
      onClick: () => this.scene.start('Boot'),
    });

    this.pauseObjects = [dim, panel, title, seed, synergies];
    this.pauseButtons = [resume, quit];
    [dim, panel, title, seed, synergies].forEach((object, index) => {
      this.inHud(object).setDepth(DEPTH.overlay + index);
    });
    for (const button of this.pauseButtons) {
      button.setDepth(DEPTH.overlay + 10);
      for (const object of button.objects) this.inHud(object);
    }
  }

  // --- Pause and debug ----------------------------------------------------------

  private setPaused(paused: boolean): void {
    if (this.ended && paused) return;
    this.paused = paused;
    if (this.controls) {
      this.controls.enabled = !paused;
      this.controls.releaseAll();
    }
    for (const object of this.pauseObjects) {
      (object as Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible).setVisible(paused);
    }
    for (const button of this.pauseButtons) button.setVisible(paused);
  }

  private togglePause(): void {
    this.setPaused(!this.paused);
  }

  /** The game pauses when the app moves to the background (GDD 3.5). */
  private pauseOnHide(): void {
    this.setPaused(true);
  }

  private toggleDebug(): void {
    this.debugVisible = !this.debugVisible;
    this.debugText.setVisible(this.debugVisible);
    for (const button of this.debugButtons) button.setVisible(this.debugVisible);
  }

  private toggleInvincible(): void {
    if (this.debugVisible) this.sim.invincible = !this.sim.invincible;
  }

  /** Debug tool: spawns a group of the picked enemy and rank outside the camera view. */
  private spawnTestEnemies(): void {
    if (!this.debugVisible || this.ended) return;
    const def = ENEMY_LIST[this.debugEnemy];
    const rank = DEBUG_RANKS[this.debugRank] ?? 'normal';
    if (def) spawnGroup(this.sim, def, rank === 'normal' ? 5 : 1, rank);
  }

  private nextDebugEnemy(): void {
    if (!this.debugVisible) return;
    this.debugEnemy = (this.debugEnemy + 1) % ENEMY_LIST.length;
    this.refreshDebugTools();
  }

  private nextDebugRank(): void {
    if (!this.debugVisible) return;
    this.debugRank = (this.debugRank + 1) % DEBUG_RANKS.length;
    this.refreshDebugTools();
  }

  private refreshDebugTools(): void {
    this.enemyButton?.setLabel(STRINGS.debug.spawnEnemy(ENEMY_LIST[this.debugEnemy]?.name ?? ''));
    this.rankButton?.setLabel(STRINGS.debug.spawnRank(DEBUG_RANKS[this.debugRank] ?? 'normal'));
  }

  /** Debug tool: opens the loadout menu over the paused round. */
  private openLoadout(): void {
    if (!this.debugVisible || this.ended) return;
    this.controls.releaseAll();
    this.scene.launch('DebugMenu', { run: this.run });
    this.scene.pause();
  }

  /** A three-finger tap opens the debug overlay on a phone. */
  private onPointerDown(): void {
    let touches = 0;
    for (const pointer of this.input.manager.pointers) {
      if (pointer.isDown && pointer.wasTouch) touches++;
    }
    if (touches >= 3) this.toggleDebug();
  }

  // --- Frame loop ---------------------------------------------------------------

  override update(_time: number, delta: number): void {
    if (this.controls.pausePressed()) this.togglePause();

    const frame = Math.min(delta, MAX_FRAME_MS) / 1000;
    if (!this.paused) {
      // Fixed time step: accumulate frame time and run whole steps (CLAUDE.md rule 2).
      this.accumulator += frame;
      const move = this.controls.readMove();
      const player = this.sim.player;
      this.focusPoint = this.ended ? undefined : this.controls.readFocus(this.cameras.main, player.x, player.y);
      const input = { ...move, focusX: this.focusPoint?.x, focusY: this.focusPoint?.y };
      while (this.accumulator >= STEP_SECONDS) {
        this.sim.step(input);
        this.accumulator -= STEP_SECONDS;
      }
      this.playEvents();
      this.clock += frame;
    }

    this.draw(this.paused ? 0 : frame);

    if (!this.ended && this.sim.phase !== 'running') this.endRound();
  }

  private endRound(): void {
    this.ended = true;
    this.controls.enabled = false;
    this.controls.releaseAll();
    this.focusPoint = undefined;
    const cleared = this.sim.phase === 'cleared';
    this.bannerText.setText(cleared ? STRINGS.hud.roundCleared : STRINGS.hud.defeated);
    this.bannerText.setColor(cleared ? PALETTE.ink : PALETTE.danger);
    this.bannerText.setVisible(true);
    this.time.delayedCall(END_DELAY_MS, () => {
      const result = finishRound(this.run, this.sim);
      this.scene.start('Results', { run: this.run, result });
    });
  }

  /** Turns simulation events into effects, then clears the list. */
  private playEvents(): void {
    for (const event of this.sim.events) {
      switch (event.type) {
        case 'enemyHit':
          this.effects.burst(
            event.x,
            event.y,
            hexToNumber(DAMAGE_TYPE_COLOURS[event.damageType]),
            event.critical ? 7 : 3,
            event.critical ? 190 : 130,
            event.critical ? 3.5 : 2.5,
            0.28,
          );
          break;
        case 'enemyKilled':
          this.effects.burst(event.x, event.y, INK, 10, 170, 3.5, 0.5);
          break;
        case 'projectileBlocked':
          this.effects.burst(event.x, event.y, GOLD, 3, 90, 2, 0.2);
          break;
        case 'playerHit':
          this.cameras.main.shake(110, 0.004);
          break;
        case 'sweep':
        case 'cone':
          this.effects.arc(event.x, event.y, event.radius, event.angle, event.arc, hexToNumber(DAMAGE_TYPE_COLOURS[event.damageType]));
          break;
        case 'slam':
          this.effects.ring(event.x, event.y, event.radius, hexToNumber(DAMAGE_TYPE_COLOURS[event.damageType]));
          break;
        case 'thrust':
          this.effects.line(
            [event.x1, event.y1, event.x2, event.y2],
            Math.max(4, event.halfWidth),
            hexToNumber(DAMAGE_TYPE_COLOURS[event.damageType]),
          );
          break;
        case 'explosion':
          this.effects.ring(event.x, event.y, event.radius, hexToNumber(DAMAGE_TYPE_COLOURS[event.damageType]));
          this.effects.burst(event.x, event.y, hexToNumber(DAMAGE_TYPE_COLOURS[event.damageType]), 8, 220, 3, 0.35);
          break;
        case 'chain':
          this.effects.lightning(event.points, hexToNumber(DAMAGE_TYPE_COLOURS[event.damageType]));
          break;
        case 'trapSnap':
          this.effects.ring(event.x, event.y, event.radius, GOLD, 0.2);
          break;
        case 'status':
          this.effects.burst(event.x, event.y, hexToNumber(STATUS_DEFS[event.status].colour), 6, 110, 3, 0.4);
          break;
        case 'reaction':
          this.effects.ring(event.x, event.y, 34, hexToNumber(REACTION_DEFS[event.reaction].colour), 0.35);
          this.showFloater(event.reaction, event.x, event.y);
          break;
        case 'spawnWarning':
          this.warnings.push({ x: event.x, y: event.y, life: WARNING_SECONDS });
          break;
        case 'enemyBlast':
          // Enemy blasts keep the crimson danger ring, with sparks in the damage colour (GDD 15.1).
          this.effects.ring(event.x, event.y, event.radius, DANGER, 0.3);
          this.effects.burst(event.x, event.y, hexToNumber(DAMAGE_TYPE_COLOURS[event.damageType]), 10, 240, 3, 0.4);
          break;
        case 'teleport':
          this.effects.line([event.x1, event.y1, event.x2, event.y2], 3, hexToNumber(DAMAGE_TYPE_COLOURS.Electric));
          this.effects.ring(event.x2, event.y2, 26, DANGER, 0.3);
          break;
        case 'repair':
          this.effects.line([event.x1, event.y1, event.x2, event.y2], 3, BRASS);
          this.effects.ring(event.x2, event.y2, 24, BRASS, 0.3);
          break;
        case 'goldStolen':
          this.showFloater(STRINGS.hud.goldStolen(event.amount), event.x, event.y);
          break;
        case 'goldReturned':
          this.showFloater(STRINGS.hud.goldReturned(event.amount), event.x, event.y);
          break;
        case 'pickup':
          this.effects.burst(event.x, event.y, event.kind === 'gold' ? GOLD : BRASS, event.kind === 'gold' ? 3 : 6, 90, 2, 0.25);
          break;
        case 'constructDestroyed':
          this.effects.burst(event.x, event.y, GOLD, 12, 200, 3.5, 0.5);
          break;
        case 'mutated':
          this.showFloater(ELITE_MODIFIERS[event.modifier].name, event.x, event.y);
          this.effects.ring(event.x, event.y, 30, hexToNumber(ELITE_MODIFIERS[event.modifier].colour), 0.4);
          break;
        default:
          break;
      }
    }
    this.sim.events.length = 0;
  }

  /** A short label rising from a point: reaction names, mutations and stolen gold (GDD 15.4). */
  private showFloater(label: string, x: number, y: number): void {
    let floater = this.floaters.find((entry) => entry.life <= 0);
    if (!floater) {
      if (this.floaters.length >= MAX_FLOATERS) return;
      const text = this.inWorld(addText(this, 0, 0, '', { role: 'hand', size: 24 }))
        .setOrigin(0.5)
        .setDepth(DEPTH.bars + 1);
      text.setStroke(PALETTE.parchment, 5);
      floater = { text, life: 0 };
      this.floaters.push(floater);
    }
    floater.life = FLOATER_SECONDS;
    floater.text.setText(label).setPosition(x, y - 30).setAlpha(1).setVisible(true);
  }

  private drawFloaters(frame: number): void {
    for (const floater of this.floaters) {
      if (floater.life <= 0) continue;
      floater.life -= frame;
      if (floater.life <= 0) {
        floater.text.setVisible(false);
        continue;
      }
      floater.text.y -= 26 * frame;
      floater.text.setAlpha(Math.min(1, floater.life / 0.3));
    }
  }

  // --- Drawing ------------------------------------------------------------------

  private draw(frame: number): void {
    this.drawCamera(frame);
    this.drawPlayer();
    this.drawEnemies();
    this.drawUnder();
    this.drawOver();
    this.drawFloaters(frame);
    this.drawWarnings(frame);
    this.effects.update(frame);
    this.drawHud();
    if (this.debugVisible) this.drawDebug();
  }

  /** The camera follows the player with a small look-ahead and stops at arena edges (GDD 15.2). */
  private drawCamera(frame: number): void {
    const player = this.sim.player;
    const speed = player.stats.moveSpeed || 1;
    const blend = 1 - Math.exp(-LOOK_SMOOTHING * frame);
    this.lookX += ((player.vx / speed) * LOOK_AHEAD - this.lookX) * blend;
    this.lookY += ((player.vy / speed) * LOOK_AHEAD - this.lookY) * blend;
    this.cameras.main.centerOn(player.x + this.lookX, player.y + this.lookY);
  }

  private drawPlayer(): void {
    const player = this.sim.player;
    this.playerSprite.setPosition(player.x, player.y);
    // The player blinks during the invulnerability window (GDD 3.7).
    const blink = player.invulnerable > 0 && Math.floor(this.clock * 20) % 2 === 0;
    this.playerSprite.setAlpha(blink ? 0.35 : 1);
    this.playerSprite.setVisible(player.health > 0);
  }

  private drawEnemies(): void {
    const telegraphs = this.telegraphs;
    const bars = this.bars;
    telegraphs.clear();
    bars.clear();

    let labels = 0;
    const enemies = this.sim.enemies.items;
    for (let slot = 0; slot < enemies.length; slot++) {
      const enemy = enemies[slot];
      let sprite = this.enemySprites[slot];
      if (!enemy || !enemy.active) {
        sprite?.setVisible(false);
        continue;
      }

      const key = enemyKey(enemy.def);
      if (!sprite) {
        ensureEnemyTexture(this, enemy.def);
        sprite = this.inWorld(this.add.image(0, 0, key)).setDepth(DEPTH.enemy);
        this.enemySprites[slot] = sprite;
      } else if (sprite.texture.key !== key) {
        ensureEnemyTexture(this, enemy.def);
        sprite.setTexture(key);
      }
      // Split copies draw smaller than their definition.
      const size = enemyTextureSize(enemy.def) * (enemy.radius / enemy.def.radius);
      sprite.setDisplaySize(size, size);

      // Wind-up pull-back, then a quick lunge (GDD 15.3).
      let offset = 0;
      if (enemy.action === 'windup' || enemy.action === 'cast') {
        const progress = Math.min(1, Math.max(0, 1 - enemy.actionTimer / enemy.actionDuration));
        offset = -6 * progress;
        this.drawTelegraph(enemy, progress);
      } else if (enemy.action === 'recover') {
        const sinceStrike = enemy.actionDuration - enemy.actionTimer;
        offset = 9 * Math.max(0, 1 - sinceStrike / 0.15);
      }
      sprite.setPosition(enemy.x + enemy.faceX * offset, enemy.y + enemy.faceY * offset);
      sprite.setVisible(true);
      // A sleeping Guardian and a stalled Lancer fade.
      sprite.setAlpha(enemy.action === 'dormant' ? 0.55 : enemy.action === 'stall' ? 0.7 : 1);

      // White flash on hit (GDD 15.3).
      if (enemy.hitFlash > 0) {
        sprite.setTint(0xffffff);
        sprite.setTintMode(Phaser.TintModes.FILL);
      } else {
        sprite.setTint(0xffffff);
        sprite.setTintMode(Phaser.TintModes.MULTIPLY);
      }

      this.drawRank(enemy);

      if (enemy.health < enemy.maxHealth) {
        const width = enemy.radius * 2 + 4;
        const left = enemy.x - width / 2;
        const top = enemy.y - enemy.radius - 10;
        bars.fillStyle(INK, 1);
        bars.fillRect(left - 1, top - 1, width + 2, 6);
        bars.fillStyle(PARCHMENT, 1);
        bars.fillRect(left, top, width * Math.max(0, enemy.health / enemy.maxHealth), 4);
      }

      // Status meters show as small pips above the health bar, so players see effects coming (GDD 9.14).
      // A triggered effect fills its pip and adds a coloured outline to the enemy (GDD 15.4).
      let pip = 0;
      let outlines = 0;
      for (let index = 0; index < STATUS_EFFECTS.length; index++) {
        const meter = enemy.statusMeter[index] ?? 0;
        const active = (enemy.statusActive[index] ?? 0) > 0;
        if (meter <= 0 && !active) continue;
        const status = STATUS_EFFECTS[index];
        if (!status) continue;
        const colour = hexToNumber(STATUS_DEFS[status].colour);
        const pipX = enemy.x - enemy.radius - 2 + pip * (PIP_SIZE + 2);
        const pipY = enemy.y - enemy.radius - 20;
        const fill = active ? 1 : Math.min(1, meter / meterSize(enemy, status));
        bars.fillStyle(INK, 1);
        bars.fillRect(pipX - 1, pipY - 1, PIP_SIZE + 2, PIP_SIZE + 2);
        bars.fillStyle(PARCHMENT, 1);
        bars.fillRect(pipX, pipY, PIP_SIZE, PIP_SIZE);
        bars.fillStyle(colour, 1);
        bars.fillRect(pipX, pipY + PIP_SIZE * (1 - fill), PIP_SIZE, PIP_SIZE * fill);
        pip++;
        if (active && outlines < 2) {
          bars.lineStyle(3, colour, 0.95);
          bars.strokeCircle(enemy.x, enemy.y, enemy.radius + 4 + outlines * 4);
          outlines++;
        }
      }

      // A champion shows its trait by name (GDD 9.13).
      if (enemy.rank === 'champion' && enemy.championTrait && labels < MAX_CHAMPION_LABELS) {
        let label = this.championLabels[labels];
        if (!label) {
          label = this.inWorld(addText(this, 0, 0, '', { role: 'hand', size: 20 }))
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.bars + 1);
          label.setStroke(PALETTE.parchment, 5);
          this.championLabels[labels] = label;
        }
        const text = STRINGS.hud.champion(CHAMPION_TRAITS[enemy.championTrait].name, enemy.def.name);
        if (label.text !== text) label.setText(text);
        label.setPosition(enemy.x, enemy.y - enemy.radius - 34).setVisible(true);
        labels++;
      }
    }
    for (let index = labels; index < this.championLabels.length; index++) this.championLabels[index]?.setVisible(false);
  }

  /** Every enemy attack telegraph uses one crimson outline (GDD 15.1). The shape follows the attack. */
  private drawTelegraph(enemy: Enemy, progress: number): void {
    const g = this.telegraphs;
    const alpha = 0.55 + 0.45 * progress;
    g.lineStyle(3, DANGER, alpha);

    if (enemy.action === 'cast') {
      switch (enemy.ability) {
        case 'mine':
          g.strokeCircle(enemy.aimX, enemy.aimY, ENEMY_RULES.mineBlastRadius * progress);
          g.lineBetween(enemy.x, enemy.y, enemy.aimX, enemy.aimY);
          break;
        case 'spores':
          g.strokeCircle(enemy.aimX, enemy.aimY, 14 + 10 * progress);
          g.lineBetween(enemy.x, enemy.y, enemy.aimX, enemy.aimY);
          break;
        case 'teleport':
          g.strokeCircle(enemy.aimX, enemy.aimY, enemy.radius + 10 * (1 - progress));
          break;
        default:
          g.lineStyle(3, BRASS, alpha);
          g.strokeCircle(enemy.x, enemy.y, enemy.radius + 6 + 8 * progress);
          break;
      }
      return;
    }

    const player = this.sim.player;
    switch (enemy.def.attack) {
      case 'ranged': {
        // A sight line toward the target.
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const length = Math.hypot(dx, dy) || 1;
        const reach = Math.min(length, enemy.range + 160);
        g.lineStyle(2 + 2 * progress, DANGER, alpha * 0.8);
        g.lineBetween(enemy.x, enemy.y, enemy.x + (dx / length) * reach, enemy.y + (dy / length) * reach);
        break;
      }
      case 'slam':
        g.fillStyle(DANGER, 0.12 + 0.18 * progress);
        g.fillCircle(enemy.aimX, enemy.aimY, ENEMY_RULES.slamRadius);
        g.strokeCircle(enemy.aimX, enemy.aimY, ENEMY_RULES.slamRadius);
        break;
      case 'detonate':
        g.fillStyle(DANGER, 0.12 + 0.2 * progress);
        g.fillCircle(enemy.x, enemy.y, ENEMY_RULES.detonateRadius);
        g.strokeCircle(enemy.x, enemy.y, ENEMY_RULES.detonateRadius);
        break;
      case 'charge': {
        // The lane of the dash.
        const dx = enemy.aimX - enemy.x;
        const dy = enemy.aimY - enemy.y;
        const length = Math.hypot(dx, dy) || 1;
        const nx = (-dy / length) * enemy.radius;
        const ny = (dx / length) * enemy.radius;
        g.fillStyle(DANGER, 0.1 + 0.15 * progress);
        g.fillPoints(
          [
            new Phaser.Math.Vector2(enemy.x + nx, enemy.y + ny),
            new Phaser.Math.Vector2(enemy.aimX + nx, enemy.aimY + ny),
            new Phaser.Math.Vector2(enemy.aimX - nx, enemy.aimY - ny),
            new Phaser.Math.Vector2(enemy.x - nx, enemy.y - ny),
          ],
          true,
        );
        g.lineBetween(enemy.x + nx, enemy.y + ny, enemy.aimX + nx, enemy.aimY + ny);
        g.lineBetween(enemy.x - nx, enemy.y - ny, enemy.aimX - nx, enemy.aimY - ny);
        break;
      }
      case 'shockwave':
        g.lineStyle(4 + 4 * progress, DANGER, alpha);
        g.strokeCircle(enemy.x, enemy.y, enemy.radius + 10 + 50 * progress);
        break;
      default:
        g.strokeCircle(enemy.x, enemy.y, enemy.radius + 3 + enemy.range * progress);
        break;
    }
  }

  /** Rank rings, modifier markers, shields and resistance marks (GDD 9.12, 9.13). */
  private drawRank(enemy: Enemy): void {
    const bars = this.bars;
    const { x, y, radius } = enemy;

    if (enemy.rank === 'elite') {
      bars.lineStyle(2, BRASS, 1);
      bars.strokeCircle(x, y, radius + 5);
    } else if (enemy.rank === 'champion') {
      bars.lineStyle(3, GOLD, 1);
      bars.strokeCircle(x, y, radius + 5);
      bars.lineStyle(2, GOLD, 0.7);
      bars.strokeCircle(x, y, radius + 10);
    }

    // One marker per elite modifier, under the enemy.
    const count = enemy.modifiers.length;
    for (let index = 0; index < count; index++) {
      const modifier = enemy.modifiers[index];
      if (!modifier) continue;
      const markX = x + (index - (count - 1) / 2) * 11;
      const markY = y + radius + 11;
      bars.fillStyle(INK, 1);
      bars.fillTriangle(markX - 6, markY - 5, markX + 6, markY - 5, markX, markY + 7);
      bars.fillStyle(hexToNumber(ELITE_MODIFIERS[modifier].colour), 1);
      bars.fillTriangle(markX - 4, markY - 4, markX + 4, markY - 4, markX, markY + 4.5);
    }

    // Tower shields and Shielded elites show the guarded arc.
    if (hasShield(enemy) && enemy.action !== 'dormant') {
      const facing = Math.atan2(enemy.faceY, enemy.faceX);
      const up = enemy.modifiers.includes('shielded') ? shieldBlocks(enemy, -enemy.faceX, -enemy.faceY) : true;
      bars.lineStyle(5, INK, up ? 1 : 0.3);
      bars.beginPath();
      bars.arc(x, y, radius + 7, facing - Math.PI / 3, facing + Math.PI / 3);
      bars.strokePath();
      bars.lineStyle(3, STEEL, up ? 1 : 0.3);
      bars.beginPath();
      bars.arc(x, y, radius + 7, facing - Math.PI / 3, facing + Math.PI / 3);
      bars.strokePath();
    }

    // The damage type resisted now: Anomalies, Resistant elites and Reactive Plating.
    const resisted = enemy.plateType ?? enemy.resistType;
    if (resisted) {
      bars.fillStyle(INK, 1);
      bars.fillCircle(x + radius, y - radius, 6);
      bars.fillStyle(hexToNumber(DAMAGE_TYPE_COLOURS[resisted]), 1);
      bars.fillCircle(x + radius, y - radius, 4);
    }

    if (enemy.carriedGold > 0) {
      bars.fillStyle(INK, 1);
      bars.fillCircle(x - radius, y - radius, 6);
      bars.fillStyle(GOLD, 1);
      bars.fillCircle(x - radius, y - radius, 4);
    }
  }

  /** Enemy area effects, drawn under enemies. Danger outlines mark them as hostile (GDD 15.1). */
  private drawHazard(g: Phaser.GameObjects.Graphics, hazard: Hazard): void {
    const fade = Math.min(1, hazard.timeLeft / 0.5);
    switch (hazard.kind) {
      case 'acid':
      case 'toxic':
      case 'burning': {
        const colour = hexToNumber(
          DAMAGE_TYPE_COLOURS[hazard.kind === 'acid' ? 'Corrosive' : hazard.kind === 'toxic' ? 'Toxic' : 'Fire'],
        );
        g.fillStyle(colour, 0.34 * fade);
        g.fillCircle(hazard.x, hazard.y, hazard.radius);
        g.lineStyle(2, DANGER, 0.75 * fade);
        g.strokeCircle(hazard.x, hazard.y, hazard.radius);
        break;
      }
      case 'spores': {
        const colour = hexToNumber(DAMAGE_TYPE_COLOURS.Biological);
        g.fillStyle(colour, (0.2 + 0.05 * Math.sin(this.clock * 4)) * fade);
        g.fillCircle(hazard.x, hazard.y, hazard.radius);
        g.lineStyle(2, DANGER, 0.6 * fade);
        g.strokeCircle(hazard.x, hazard.y, hazard.radius);
        break;
      }
      case 'pod': {
        const progress = 1 - hazard.timeLeft / hazard.duration;
        g.lineStyle(2, DANGER, 0.35 + 0.5 * progress);
        g.strokeCircle(hazard.x, hazard.y, ENEMY_RULES.sporeCloudRadius * progress);
        g.fillStyle(hexToNumber(DAMAGE_TYPE_COLOURS.Biological), 1);
        g.fillCircle(hazard.x, hazard.y, hazard.radius * (0.8 + 0.25 * progress));
        g.lineStyle(2, INK, 1);
        g.strokeCircle(hazard.x, hazard.y, hazard.radius * (0.8 + 0.25 * progress));
        break;
      }
      case 'mine': {
        const armed = hazard.arming <= 0;
        const blink = armed ? 0.5 + 0.5 * Math.sin(this.clock * 12) : 0.25;
        g.lineStyle(2, DANGER, armed ? 0.7 : 0.35);
        g.strokeCircle(hazard.x, hazard.y, ENEMY_RULES.mineTriggerRadius);
        g.fillStyle(INK, 1);
        g.fillCircle(hazard.x, hazard.y, hazard.radius);
        g.fillStyle(DANGER, blink);
        g.fillCircle(hazard.x, hazard.y, hazard.radius * 0.45);
        break;
      }
      case 'seed': {
        const progress = 1 - hazard.timeLeft / hazard.duration;
        g.fillStyle(hexToNumber(DAMAGE_TYPE_COLOURS.Toxic), 1);
        g.fillCircle(hazard.x, hazard.y, hazard.radius);
        g.lineStyle(2, INK, 1);
        g.strokeCircle(hazard.x, hazard.y, hazard.radius);
        g.lineStyle(2, DANGER, 0.8);
        g.beginPath();
        g.arc(hazard.x, hazard.y, hazard.radius + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        g.strokePath();
        break;
      }
      case 'shockwave':
        g.lineStyle(10, DANGER, 0.25 * fade + 0.2);
        g.strokeCircle(hazard.x, hazard.y, hazard.radius);
        g.lineStyle(3, DANGER, 0.9);
        g.strokeCircle(hazard.x, hazard.y, hazard.radius);
        break;
    }
  }

  /** Warning markers where large groups enter, with an arrow at the screen edge (GDD 4.11). */
  private drawWarnings(frame: number): void {
    if (this.warnings.length === 0) return;
    const g = this.telegraphs;
    const view = this.cameras.main.worldView;
    for (const warning of this.warnings) {
      warning.life -= frame;
      if (warning.life <= 0) continue;
      const pulse = 0.5 + 0.5 * Math.sin(this.clock * 14);
      g.lineStyle(4, DANGER, 0.5 + 0.5 * pulse);
      g.strokeCircle(warning.x, warning.y, 46 + 8 * pulse);
      g.lineBetween(warning.x, warning.y - 22, warning.x, warning.y + 6);
      g.fillStyle(DANGER, 1);
      g.fillCircle(warning.x, warning.y + 18, 4);
      // Off screen: an arrow on the edge of the view points at the entry.
      if (!view.contains(warning.x, warning.y)) {
        const edgeX = Math.min(view.right - 30, Math.max(view.x + 30, warning.x));
        const edgeY = Math.min(view.bottom - 30, Math.max(view.y + 30, warning.y));
        const angle = Math.atan2(warning.y - edgeY, warning.x - edgeX);
        g.fillStyle(DANGER, 0.6 + 0.4 * pulse);
        g.fillTriangle(
          edgeX + Math.cos(angle) * 18,
          edgeY + Math.sin(angle) * 18,
          edgeX + Math.cos(angle + 2.5) * 14,
          edgeY + Math.sin(angle + 2.5) * 14,
          edgeX + Math.cos(angle - 2.5) * 14,
          edgeY + Math.sin(angle - 2.5) * 14,
        );
      }
    }
    this.warnings = this.warnings.filter((warning) => warning.life > 0);
  }

  /** Area effects, auras and traps: drawn under enemies. */
  private drawUnder(): void {
    const g = this.under;
    const sim = this.sim;
    const player = sim.player;
    g.clear();

    for (const zone of sim.zones.items) {
      if (!zone.active) continue;
      const fade = Math.min(1, zone.timeLeft / 0.5);
      if (zone.kind === 'burning') {
        const fire = hexToNumber(DAMAGE_TYPE_COLOURS.Fire);
        g.fillStyle(fire, 0.28 * fade);
        g.fillCircle(zone.x, zone.y, zone.radius);
        g.lineStyle(2, fire, 0.8 * fade);
        g.strokeCircle(zone.x, zone.y, zone.radius);
      } else if (zone.kind === 'rubble') {
        g.fillStyle(PILLAR, 0.4 * fade);
        g.fillCircle(zone.x, zone.y, zone.radius);
        g.lineStyle(2, INK, 0.45 * fade);
        g.strokeCircle(zone.x, zone.y, zone.radius * 0.6);
        g.strokeCircle(zone.x, zone.y, zone.radius);
      } else if (zone.kind === 'fumes') {
        const toxic = hexToNumber(DAMAGE_TYPE_COLOURS.Toxic);
        g.fillStyle(toxic, 0.3 * fade);
        g.fillCircle(zone.x, zone.y, zone.radius);
        g.lineStyle(2, toxic, 0.8 * fade);
        g.strokeCircle(zone.x, zone.y, zone.radius);
      } else if (zone.kind === 'trail') {
        const status = trailStatuses(sim, zone.weaponIndex)[0];
        const colour = hexToNumber(status ? STATUS_DEFS[status].colour : DAMAGE_TYPE_COLOURS.Fire);
        g.fillStyle(colour, 0.4 * Math.min(1, zone.timeLeft / zone.duration + 0.2));
        g.fillCircle(zone.x, zone.y, zone.radius);
      } else {
        g.fillStyle(SMOKE, 0.6 * fade);
        g.fillCircle(zone.x, zone.y, zone.radius);
        g.lineStyle(2, INK, 0.25 * fade);
        g.strokeCircle(zone.x, zone.y, zone.radius);
      }
    }

    for (const hazard of sim.hazards.items) {
      if (hazard.active) this.drawHazard(g, hazard);
    }

    // Pickups: gold coins, material crates and component cogs (GDD 14.1, 14.2).
    for (const pickup of sim.pickups.items) {
      if (!pickup.active) continue;
      if (pickup.kind === 'gold') {
        const radius = Math.min(9, 4 + Math.sqrt(pickup.amount));
        g.fillStyle(GOLD, 1);
        g.fillCircle(pickup.x, pickup.y, radius);
        g.lineStyle(1.5, INK, 1);
        g.strokeCircle(pickup.x, pickup.y, radius);
      } else if (pickup.kind === 'material') {
        g.fillStyle(MATERIAL_COLOURS[pickup.material], 1);
        g.fillRect(pickup.x - 6, pickup.y - 6, 12, 12);
        g.lineStyle(1.5, INK, 1);
        g.strokeRect(pickup.x - 6, pickup.y - 6, 12, 12);
      } else {
        const pulse = 0.6 + 0.4 * Math.sin(this.clock * 6);
        g.lineStyle(3, GOLD, pulse);
        g.strokeCircle(pickup.x, pickup.y, 14);
        g.fillStyle(PARCHMENT, 1);
        g.fillTriangle(pickup.x - 9, pickup.y + 7, pickup.x + 9, pickup.y + 7, pickup.x, pickup.y - 9);
        g.lineStyle(2, INK, 1);
        g.strokeTriangle(pickup.x - 9, pickup.y + 7, pickup.x + 9, pickup.y + 7, pickup.x, pickup.y - 9);
      }
    }

    // A slowed player shows a cold ring: latched crawlers and spore clouds (GDD 9.11).
    if (player.slowTimer > 0 && player.health > 0) {
      g.lineStyle(3, hexToNumber(DAMAGE_TYPE_COLOURS.Cold), 0.9);
      g.strokeCircle(player.x, player.y, player.radius + 12);
    }

    for (const weapon of sim.weapons) {
      const resolved = weapon.resolved;
      if (resolved.delivery === 'aura') {
        const colour = hexToNumber(DAMAGE_TYPE_COLOURS[resolved.damageParts[0]?.type ?? 'Biological']);
        const radius = auraRadius(resolved);
        g.fillStyle(colour, 0.1 + 0.04 * Math.sin(this.clock * 5));
        g.fillCircle(player.x, player.y, radius);
        g.lineStyle(2, colour, 0.6);
        g.strokeCircle(player.x, player.y, radius);
      } else if (resolved.delivery === 'orbit') {
        g.lineStyle(1, GOLD, 0.25);
        g.strokeCircle(player.x, player.y, orbitRadius(resolved));
      }
    }

    for (const trap of sim.traps.items) {
      if (!trap.active) continue;
      const armed = trap.arming <= 0;
      g.fillStyle(GOLD, armed ? 0.9 : 0.35);
      g.fillTriangle(trap.x - 9, trap.y, trap.x, trap.y - 9, trap.x + 9, trap.y);
      g.fillTriangle(trap.x - 9, trap.y, trap.x, trap.y + 9, trap.x + 9, trap.y);
      g.lineStyle(2, INK, armed ? 1 : 0.4);
      g.strokeCircle(trap.x, trap.y, 11);
    }
  }

  /** Projectiles, constructs, orbit heads, beams and the focus reticle: drawn over enemies. */
  private drawOver(): void {
    const g = this.over;
    const sim = this.sim;
    const player = sim.player;
    g.clear();

    for (const construct of sim.constructs.items) {
      if (!construct.active) continue;
      const fill = construct.kind === 'creature' ? CREATURE : construct.kind === 'hound' ? BRASS : GOLD;
      if (construct.kind === 'turret') {
        g.fillStyle(PILLAR, 1);
        g.fillCircle(construct.x, construct.y, construct.radius + 3);
        g.lineStyle(5, INK, 1);
        g.lineBetween(
          construct.x,
          construct.y,
          construct.x + construct.faceX * (construct.radius + 9),
          construct.y + construct.faceY * (construct.radius + 9),
        );
      } else {
        // A snout shows where the companion is heading.
        g.fillStyle(INK, 1);
        g.fillCircle(construct.x + construct.faceX * construct.radius, construct.y + construct.faceY * construct.radius, 5);
      }
      g.fillStyle(fill, 1);
      g.fillCircle(construct.x, construct.y, construct.radius);
      g.lineStyle(3, INK, 1);
      g.strokeCircle(construct.x, construct.y, construct.radius);
      if (construct.health < construct.maxHealth) {
        const width = construct.radius * 2 + 4;
        g.fillStyle(INK, 1);
        g.fillRect(construct.x - width / 2 - 1, construct.y - construct.radius - 11, width + 2, 6);
        g.fillStyle(GOLD, 1);
        g.fillRect(construct.x - width / 2, construct.y - construct.radius - 10, width * (construct.health / construct.maxHealth), 4);
      }
    }

    for (const weapon of sim.weapons) {
      const resolved = weapon.resolved;
      if (resolved.delivery === 'orbit') {
        const radius = orbitRadius(resolved);
        const head = orbitHeadRadius(resolved);
        for (let index = 0; index < resolved.projectiles; index++) {
          const angle = weapon.orbitAngle + (index / resolved.projectiles) * Math.PI * 2;
          const x = player.x + Math.cos(angle) * radius;
          const y = player.y + Math.sin(angle) * radius;
          g.lineStyle(2, INK, 0.5);
          g.lineBetween(player.x, player.y, x, y);
          g.fillStyle(GOLD, 1);
          g.fillCircle(x, y, head);
          g.lineStyle(3, INK, 1);
          g.strokeCircle(x, y, head);
        }
      } else if (resolved.delivery === 'beam' && weapon.beamActive) {
        const colour = hexToNumber(DAMAGE_TYPE_COLOURS[resolved.damageParts[0]?.type ?? 'Fire']);
        // The beam thickens as the damage rises on one target.
        const width = 4 + Math.min(6, weapon.beamTicks * 0.6);
        g.lineStyle(width, colour, 0.85);
        g.lineBetween(player.x, player.y, weapon.beamX, weapon.beamY);
        g.lineStyle(Math.max(1.5, width * 0.3), PARCHMENT, 0.95);
        g.lineBetween(player.x, player.y, weapon.beamX, weapon.beamY);
      }
    }

    // Player projectiles lean warm gold (GDD 15.1).
    for (const projectile of sim.projectiles.items) {
      if (!projectile.active) continue;
      const radius = Math.max(3, projectile.radius);
      if (projectile.kind === 'arcing') {
        const progress = Math.min(1, projectile.elapsed / projectile.flight);
        const span = Math.hypot(projectile.targetX - projectile.startX, projectile.targetY - projectile.startY);
        const height = Math.sin(progress * Math.PI) * Math.min(140, 30 + span * 0.3);
        g.fillStyle(INK, 0.2);
        g.fillEllipse(projectile.x, projectile.y, radius * 2.4, radius * 1.4);
        g.fillStyle(GOLD, 1);
        g.fillCircle(projectile.x, projectile.y - height, radius + 1);
        g.lineStyle(2, INK, 1);
        g.strokeCircle(projectile.x, projectile.y - height, radius + 1);
        // A faint mark shows where the shot lands.
        g.lineStyle(1.5, GOLD, 0.5);
        g.strokeCircle(projectile.targetX, projectile.targetY, Math.max(8, projectile.blastRadius));
      } else {
        // A parasite shows in the Biological colour.
        const colour = projectile.parasite ? hexToNumber(DAMAGE_TYPE_COLOURS.Biological) : GOLD;
        g.lineStyle(Math.max(2, radius * 0.8), colour, 0.45);
        g.lineBetween(projectile.x - projectile.dx * 14, projectile.y - projectile.dy * 14, projectile.x, projectile.y);
        g.fillStyle(colour, 1);
        g.fillCircle(projectile.x, projectile.y, radius);
        g.lineStyle(1.5, INK, 1);
        g.strokeCircle(projectile.x, projectile.y, radius);
      }
    }

    // Enemy projectiles lean dark ink, with a crimson edge (GDD 15.1).
    for (const shot of sim.enemyShots.items) {
      if (!shot.active) continue;
      g.lineStyle(3, INK, 0.45);
      g.lineBetween(shot.x - shot.dx * 12, shot.y - shot.dy * 12, shot.x, shot.y);
      g.fillStyle(INK, 1);
      g.fillCircle(shot.x, shot.y, shot.radius);
      g.lineStyle(1.5, DANGER, 1);
      g.strokeCircle(shot.x, shot.y, shot.radius + 1);
    }

    // The focus point shows as a small brass reticle (GDD 15.7).
    const focus = this.focusPoint;
    if (focus) {
      g.lineStyle(3, BRASS, 1);
      g.strokeCircle(focus.x, focus.y, 12);
      g.lineBetween(focus.x - 20, focus.y, focus.x - 6, focus.y);
      g.lineBetween(focus.x + 6, focus.y, focus.x + 20, focus.y);
      g.lineBetween(focus.x, focus.y - 20, focus.x, focus.y - 6);
      g.lineBetween(focus.x, focus.y + 6, focus.x, focus.y + 20);
    }
  }

  private drawHud(): void {
    const s = this.scale1;
    const hud = this.hud;
    const sim = this.sim;
    const player = sim.player;
    hud.clear();

    // Health bar and number, top left.
    const barWidth = 260 * s;
    const barHeight = 22 * s;
    const share = Math.max(0, player.health / player.stats.maxHealth);
    const low = share <= LOW_HEALTH;
    hud.fillStyle(PARCHMENT, 0.9);
    hud.fillRect(HUD_MARGIN, HUD_MARGIN - 2, barWidth, barHeight);
    hud.fillStyle(low ? DANGER : INK, 1);
    hud.fillRect(HUD_MARGIN, HUD_MARGIN - 2, barWidth * share, barHeight);
    hud.lineStyle(3, INK, 1);
    hud.strokeRect(HUD_MARGIN, HUD_MARGIN - 2, barWidth, barHeight);

    const healthLabel = STRINGS.hud.health(Math.ceil(player.health), player.stats.maxHealth);
    if (healthLabel !== this.lastHealthLabel) {
      this.lastHealthLabel = healthLabel;
      this.healthText.setText(healthLabel);
    }

    // Adaptation icons under health: one per adapted damage type, filling toward the cap (GDD 3.7).
    let iconX = HUD_MARGIN + 10 * s;
    const iconY = HUD_MARGIN + barHeight + 16 * s;
    for (const [type, value] of Object.entries(player.adaptation)) {
      if (!value) continue;
      const colour = hexToNumber(DAMAGE_TYPE_COLOURS[type as DamageTypeName]);
      const fill = Math.min(1, value / player.stats.adaptationCap);
      hud.fillStyle(PARCHMENT, 0.9);
      hud.fillCircle(iconX, iconY, 9 * s);
      hud.fillStyle(colour, 1);
      hud.slice(iconX, iconY, 9 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill, false);
      hud.fillPath();
      hud.lineStyle(2, INK, 1);
      hud.strokeCircle(iconX, iconY, 9 * s);
      iconX += 26 * s;
    }

    // Round timer, top centre. At zero the round goes on until every enemy falls (GDD 4.9).
    let timerLabel: string;
    if (sim.timeLeft > 0) timerLabel = formatTime(sim.timeLeft);
    else if (sim.enemies.activeCount > 0) timerLabel = STRINGS.hud.cleanup(sim.enemies.activeCount);
    else timerLabel = formatTime(0);
    if (timerLabel !== this.lastTimerLabel) {
      this.lastTimerLabel = timerLabel;
      this.timerText.setText(timerLabel);
    }

    // Weapon tiles, bottom centre.
    const tile = this.tileLayout();
    for (let slot = 0; slot < 3; slot++) {
      const x = tile.x + slot * (tile.size + tile.gap);
      const weapon = sim.weapons[slot];
      hud.fillStyle(PARCHMENT, weapon ? 0.92 : 0.5);
      hud.fillRect(x, tile.y, tile.size, tile.size);
      if (weapon) {
        if (weapon.jamTimer > 0) {
          // A jammed weapon shows the danger colour until the jam clears.
          hud.fillStyle(DANGER, 0.4);
          hud.fillRect(x, tile.y, tile.size, tile.size);
        } else {
          const wait = Math.min(1, weapon.cooldown * currentAttackSpeed(sim, weapon));
          hud.fillStyle(BRASS, 0.35);
          hud.fillRect(x, tile.y + tile.size * (1 - wait), tile.size, tile.size * wait);
        }
      }
      hud.lineStyle(weapon ? 3 : 2, weapon ? INK : BRASS, weapon ? 1 : 0.7);
      hud.strokeRect(x, tile.y, tile.size, tile.size);
      // The Unstable switched this weapon's Auxiliary component off (GDD 9.11).
      if (weapon && sim.auxiliarySuppressed && weapon.full !== weapon.suppressed) {
        hud.lineStyle(4, DANGER, 0.9);
        hud.strokeRect(x + 3, tile.y + 3, tile.size - 6, tile.size - 6);
      }
      // Weapon tiles glow when a synergy is active (GDD 15.7).
      if (weapon && weapon.resolved.synergies.length > 0) {
        const pulse = 0.55 + 0.4 * (0.5 + 0.5 * Math.sin(this.clock * 4 + slot));
        hud.lineStyle(5, GOLD, pulse);
        hud.strokeRect(x - 5, tile.y - 5, tile.size + 10, tile.size + 10);
        hud.lineStyle(2, GOLD, pulse * 0.5);
        hud.strokeRect(x - 10, tile.y - 10, tile.size + 20, tile.size + 20);
      }
    }

    if (sim.gold !== this.lastGold) {
      this.lastGold = sim.gold;
      this.goldText.setText(STRINGS.prep.gold(sim.gold));
    }

    this.suppressedText.setVisible(
      sim.auxiliarySuppressed && sim.weapons.some((weapon) => weapon.full !== weapon.suppressed),
    );

    // Pause button on touch devices.
    if (this.pauseZone) {
      const button = this.pauseButtonLayout();
      hud.fillStyle(PARCHMENT, 0.9);
      hud.fillRect(button.x, button.y, button.size, button.size);
      hud.lineStyle(3, INK, 1);
      hud.strokeRect(button.x, button.y, button.size, button.size);
      hud.fillStyle(INK, 1);
      const barW = button.size * 0.14;
      const barH = button.size * 0.44;
      hud.fillRect(button.x + button.size * 0.32 - barW / 2, button.y + (button.size - barH) / 2, barW, barH);
      hud.fillRect(button.x + button.size * 0.68 - barW / 2, button.y + (button.size - barH) / 2, barW, barH);
    }

    // Floating joystick.
    const joystick = this.controls?.joystick;
    if (joystick?.active) {
      hud.fillStyle(PARCHMENT, 0.35);
      hud.fillCircle(joystick.baseX, joystick.baseY, JOYSTICK_RADIUS);
      hud.lineStyle(3, INK, 0.7);
      hud.strokeCircle(joystick.baseX, joystick.baseY, JOYSTICK_RADIUS);
      hud.fillStyle(BRASS, 0.9);
      hud.fillCircle(joystick.knobX, joystick.knobY, 30);
      hud.lineStyle(3, INK, 1);
      hud.strokeCircle(joystick.knobX, joystick.knobY, 30);
    }

    // Screen-edge warning at low health (GDD 15.7).
    if (low && player.health > 0) {
      const pulse = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(this.clock * 6));
      hud.lineStyle(14, DANGER, pulse);
      hud.strokeRect(7, 7, SCREEN.width - 14, SCREEN.height - 14);
    }
  }

  private drawDebug(): void {
    const sim = this.sim;
    const lines = [
      `${Math.round(this.game.loop.actualFps)} fps`,
      `Seed ${formatSeed(this.run.seed)}  Round ${sim.round}  Step ${sim.steps}`,
      `Enemies ${sim.enemies.activeCount} of ${sim.activeLimit}  Squads ${sim.squads.size}  Tokens ${sim.tokensHeld} of ${sim.tokenLimit}  Spawns left ${sim.spawnsLeft}`,
      `Projectiles ${sim.projectiles.activeCount}  Constructs ${sim.constructs.activeCount}  Traps ${sim.traps.activeCount}  Area effects ${sim.zones.activeCount}`,
      `Enemy shots ${sim.enemyShots.activeCount}  Hazards ${sim.hazards.activeCount}  Pickups ${sim.pickups.activeCount}  Roster ${kingdomForRound(this.run)}`,
      `Round loot: gold ${sim.loot.gold}, materials ${Object.values(sim.loot.materials).reduce((sum, value) => sum + value, 0)}, components ${sim.loot.components.length}`,
      `Kills ${sim.stats.kills}  Shots ${sim.stats.shotsFired}  Hits taken ${sim.stats.hitsTaken}`,
      sim.invincible ? STRINGS.debug.invincibleOn : STRINGS.debug.invincibleOff,
      // Economy logger (CLAUDE.md "Testing"): the last finished rounds.
      ...this.run.ledger
        .slice(-2)
        .map(
          (entry) =>
            `Round ${entry.round}: ${entry.kills} kills, gold +${entry.goldEarned} -${entry.goldSpent}, materials +${entry.materialsEarned} -${entry.materialsSpent}`,
        ),
    ];
    this.debugText.setText(lines.join('\n'));
  }
}
