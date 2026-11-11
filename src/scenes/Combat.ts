import Phaser from 'phaser';
import { DAMAGE_TYPE_COLOURS, KINGDOM_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import type { DamageTypeName } from '../data/palette';
import { SCREEN } from '../data/screen';
import { STRINGS, formatTime } from '../data/strings';
import { COMBAT } from '../data/tiers';
import { Effects } from '../render/effects';
import {
  PLAYER_KEY,
  PLAYER_PROJECTILE_KEY,
  PLAYER_TEXTURE_SIZE,
  PROJECTILE_TEXTURE_SIZE,
  enemyKey,
  enemyTextureSize,
  ensureEnemyTexture,
  ensurePlayerTexture,
  ensureProjectileTexture,
} from '../render/placeholders';
import { formatSeed } from '../sim/rng';
import { createWorldForRound, finishRound } from '../sim/run';
import type { RunState } from '../sim/run';
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

const DEPTH = {
  floor: 0,
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
  private projectileSprites: Array<Phaser.GameObjects.Image | undefined> = [];
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

  private lastHealthLabel = '';
  private lastTimerLabel = '';
  private debugVisible = false;

  constructor() {
    super('Combat');
  }

  init(data: CombatData): void {
    this.run = data.run;
  }

  create(): void {
    this.sim = createWorldForRound(this.run);
    this.accumulator = 0;
    this.paused = false;
    this.ended = false;
    this.clock = 0;
    this.lookX = 0;
    this.lookY = 0;
    this.scale1 = uiScale();
    this.enemySprites = [];
    this.projectileSprites = [];
    this.weaponLabels = [];
    this.pauseObjects = [];
    this.pauseButtons = [];
    this.pauseZone = undefined;
    this.lastHealthLabel = '';
    this.lastTimerLabel = '';
    this.debugVisible = false;

    const arena = this.sim.arena;
    const main = this.cameras.main;
    main.setBackgroundColor(PALETTE.ink);
    main.setBounds(0, 0, arena.width, arena.height);
    main.setZoom(isTouchPrimary() ? TOUCH_ZOOM : 1);
    main.centerOn(this.sim.player.x, this.sim.player.y);
    // A second camera draws the HUD, so world zoom and scroll never move it.
    this.uiCamera = this.cameras.add(0, 0, SCREEN.width, SCREEN.height);

    ensurePlayerTexture(this);
    ensureProjectileTexture(this);

    this.drawArena();
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
    keyboard?.addCapture('TAB,F3');
    this.input.on('pointerdown', this.onPointerDown, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.pauseOnHide, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.controls.destroy();
      keyboard?.off('keydown-ESC', this.togglePause, this);
      keyboard?.off('keydown-F3', this.toggleDebug, this);
      keyboard?.off('keydown-I', this.toggleInvincible, this);
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
    const arena = this.sim.arena;

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
      addText(this, centreX, 12 + 68 * s, STRINGS.hud.territory(arena.kingdom, arena.name), {
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
          weapon ? weapon.def.name : STRINGS.hud.emptySlot,
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

    // A parchment outline keeps HUD text readable over the arena.
    for (const text of [this.healthText, this.timerText, roundText, territoryText]) {
      text.setStroke(PALETTE.parchment, 5);
    }

    this.bannerText = this.inHud(
      addText(this, centreX, SCREEN.height / 2 - 120, '', { role: 'heading', size: 72 }),
    )
      .setOrigin(0.5)
      .setDepth(DEPTH.hudText)
      .setVisible(false);
    this.bannerText.setStroke(PALETTE.parchment, 8);

    this.debugText = this.inHud(
      addText(this, HUD_MARGIN, SCREEN.height - HUD_MARGIN, '', { size: 15 * s, weight: '500' }),
    )
      .setOrigin(0, 1)
      .setDepth(DEPTH.hudText)
      .setVisible(false);
    this.debugText.setBackgroundColor(PALETTE.parchment);

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
    const panelWidth = 460 * s;
    const panelHeight = 380 * s;

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

    const resume = new Button(this, centreX, centreY + 20 * s, {
      label: STRINGS.pause.resume,
      width: 320 * s,
      height: 64 * s,
      textSize: 28 * s,
      onClick: () => this.setPaused(false),
    });
    const quit = new Button(this, centreX, centreY + 106 * s, {
      label: STRINGS.pause.quit,
      width: 320 * s,
      height: 64 * s,
      textSize: 28 * s,
      onClick: () => this.scene.start('Boot'),
    });

    this.pauseObjects = [dim, panel, title, seed];
    this.pauseButtons = [resume, quit];
    [dim, panel, title, seed].forEach((object, index) => {
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
      this.controls.releaseJoystick();
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
  }

  private toggleInvincible(): void {
    if (this.debugVisible) this.sim.invincible = !this.sim.invincible;
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
      const input = this.controls.readMove();
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
    this.controls.releaseJoystick();
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
        default:
          break;
      }
    }
    this.sim.events.length = 0;
  }

  // --- Drawing ------------------------------------------------------------------

  private draw(frame: number): void {
    this.drawCamera(frame);
    this.drawPlayer();
    this.drawEnemies();
    this.drawProjectiles();
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
      const size = enemyTextureSize(enemy.def);
      sprite.setDisplaySize(size, size);

      // Wind-up pull-back, then a quick lunge (GDD 15.3).
      let offset = 0;
      if (enemy.action === 'windup') {
        const progress = 1 - enemy.actionTimer / COMBAT.enemyMeleeWindup;
        offset = -6 * progress;
        // Every enemy attack telegraph uses one crimson outline (GDD 15.1).
        telegraphs.lineStyle(3, DANGER, 0.55 + 0.45 * progress);
        telegraphs.strokeCircle(enemy.x, enemy.y, enemy.radius + 3 + enemy.range * progress);
      } else if (enemy.action === 'recover') {
        const sinceStrike = COMBAT.enemyMeleeRecover - enemy.actionTimer;
        offset = 9 * Math.max(0, 1 - sinceStrike / 0.15);
      }
      sprite.setPosition(enemy.x + enemy.faceX * offset, enemy.y + enemy.faceY * offset);
      sprite.setVisible(true);

      // White flash on hit (GDD 15.3).
      if (enemy.hitFlash > 0) {
        sprite.setTint(0xffffff);
        sprite.setTintMode(Phaser.TintModes.FILL);
      } else {
        sprite.setTint(0xffffff);
        sprite.setTintMode(Phaser.TintModes.MULTIPLY);
      }

      if (enemy.health < enemy.maxHealth) {
        const width = enemy.radius * 2 + 4;
        const left = enemy.x - width / 2;
        const top = enemy.y - enemy.radius - 10;
        bars.fillStyle(INK, 1);
        bars.fillRect(left - 1, top - 1, width + 2, 6);
        bars.fillStyle(PARCHMENT, 1);
        bars.fillRect(left, top, width * Math.max(0, enemy.health / enemy.maxHealth), 4);
      }
    }
  }

  private drawProjectiles(): void {
    const projectiles = this.sim.projectiles.items;
    for (let slot = 0; slot < projectiles.length; slot++) {
      const projectile = projectiles[slot];
      let sprite = this.projectileSprites[slot];
      if (!projectile || !projectile.active) {
        sprite?.setVisible(false);
        continue;
      }
      if (!sprite) {
        sprite = this.inWorld(this.add.image(0, 0, PLAYER_PROJECTILE_KEY))
          .setDisplaySize(PROJECTILE_TEXTURE_SIZE, PROJECTILE_TEXTURE_SIZE)
          .setDepth(DEPTH.projectile);
        this.projectileSprites[slot] = sprite;
      }
      sprite.setPosition(projectile.x, projectile.y).setVisible(true);
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
        const wait = Math.min(1, weapon.cooldown * weapon.stats.attacksPerSecond);
        hud.fillStyle(BRASS, 0.35);
        hud.fillRect(x, tile.y + tile.size * (1 - wait), tile.size, tile.size * wait);
      }
      hud.lineStyle(weapon ? 3 : 2, weapon ? INK : BRASS, weapon ? 1 : 0.7);
      hud.strokeRect(x, tile.y, tile.size, tile.size);
    }

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
      `Enemies ${sim.enemies.activeCount}  Projectiles ${sim.projectiles.activeCount}`,
      `Kills ${sim.stats.kills}  Shots ${sim.stats.shotsFired}  Hits taken ${sim.stats.hitsTaken}`,
      sim.invincible ? STRINGS.debug.invincibleOn : STRINGS.debug.invincibleOff,
    ];
    this.debugText.setText(lines.join('\n'));
  }
}
