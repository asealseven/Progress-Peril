// Boss placeholders and telegraphs (GDD 10.6, 15.1, CLAUDE.md "Placeholder
// art"): mini-bosses and bosses are circles of radius 36 and 56 in the
// kingdom colour with a thick ink outline. Boss telegraphs are crimson,
// escort telegraphs crimson and dashed, borrowed Convergence attacks keep the
// original boss's kingdom colour.

import type Phaser from 'phaser';
import { bossAssetKey, miniBossAssetKey, partAssetKey } from '../data/assets';
import { BOSSES, BOSS_RULES } from '../data/bosses';
import { hasImage } from './images';
import type { EnemyDef } from '../data/enemies';
import { FONTS } from '../data/fonts';
import { MINI_BOSSES } from '../data/miniBosses';
import { DAMAGE_TYPE_COLOURS, KINGDOM_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import type { KingdomName } from '../data/palette';
import type { BossBody, BossTelegraph } from '../sim/world/bosses';

const INK = hexToNumber(PALETTE.ink);
const DANGER = hexToNumber(PALETTE.danger);
const GOLD = hexToNumber(PALETTE.playerEffects);
const BOSS_OUTLINE = 6;
const DETAIL = 2;

/** The kingdom a boss body belongs to. Parts take their boss's kingdom. */
export function bossKingdom(body: BossBody): KingdomName {
  const owner = body.owner ?? body;
  if (owner.bossId) return BOSSES[owner.bossId].kingdom;
  if (owner.miniId) return MINI_BOSSES[owner.miniId].kingdom;
  return 'Keldrath';
}

/**
 * The generated image for a boss body in its current phase (ART_PROMPTS.md,
 * GDD 15.3). A missing phase image falls back to the latest earlier phase.
 * Undefined when no image exists, so the placeholder circle draws.
 */
export function bossImageKey(body: BossBody): string | undefined {
  // Arm turrets, belt motors, war banners and pylons have images of their own (ART_PROMPTS.md).
  if (body.partId && body.partId !== 'unmaking-copy') {
    const key = partAssetKey(body.partId);
    return key && hasImage(key) ? key : undefined;
  }
  if (body.miniId) {
    const key = miniBossAssetKey(body.miniId);
    return hasImage(key) ? key : undefined;
  }
  const owner = body.partId === 'unmaking-copy' ? body.owner : body;
  if (!owner?.bossId) return undefined;
  for (let phase = Math.max(1, owner.phase); phase >= 1; phase--) {
    const key = bossAssetKey(owner.bossId, phase);
    if (hasImage(key)) return key;
  }
  return undefined;
}

export function bossKey(def: EnemyDef): string {
  return `boss.${def.id}`;
}

export function bossTextureSize(def: EnemyDef): number {
  return (def.radius + BOSS_OUTLINE) * 2;
}

/** A boss circle: kingdom colour, thick ink outline, first letter of the name. */
export function ensureBossTexture(scene: Phaser.Scene, def: EnemyDef, kingdom: KingdomName): void {
  const key = bossKey(def);
  if (scene.textures.exists(key)) return;
  const size = bossTextureSize(def);
  const pixels = Math.ceil(size * DETAIL);
  const texture = scene.textures.createCanvas(key, pixels, pixels);
  if (!texture) return;
  const context = texture.getContext();
  context.save();
  context.scale(DETAIL, DETAIL);
  const centre = size / 2;
  context.beginPath();
  context.arc(centre, centre, def.radius - BOSS_OUTLINE / 2, 0, Math.PI * 2);
  context.fillStyle = KINGDOM_COLOURS[kingdom];
  context.fill();
  context.lineWidth = BOSS_OUTLINE;
  context.strokeStyle = PALETTE.ink;
  context.stroke();
  context.fillStyle = PALETTE.ink;
  context.font = `700 ${Math.round(def.radius * 0.95)}px "${FONTS.heading}", serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(def.name.replace(/^The /, '').charAt(0), centre, centre + 2);
  context.restore();
  texture.refresh();
}

function dashedLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, dash = 16, gap = 10): void {
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length < 1) return;
  const dx = (x2 - x1) / length;
  const dy = (y2 - y1) / length;
  for (let at = 0; at < length; at += dash + gap) {
    const end = Math.min(length, at + dash);
    g.lineBetween(x1 + dx * at, y1 + dy * at, x1 + dx * end, y1 + dy * end);
  }
}

function dashedArc(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, from: number, to: number): void {
  const step = Math.min(0.35, 16 / Math.max(radius, 1));
  for (let angle = from; angle < to; angle += step * 1.7) {
    const end = Math.min(to, angle + step);
    g.lineBetween(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, x + Math.cos(end) * radius, y + Math.sin(end) * radius);
  }
}

/** Outline of a telegraph shape, solid or dashed. */
function outline(g: Phaser.GameObjects.Graphics, t: BossTelegraph, dashed: boolean): void {
  if (t.shape === 'circle') {
    if (dashed) dashedArc(g, t.x, t.y, t.radius, 0, Math.PI * 2);
    else g.strokeCircle(t.x, t.y, t.radius);
    return;
  }
  if (t.shape === 'cone') {
    const from = t.angle - t.arc / 2;
    const to = t.angle + t.arc / 2;
    const ax = t.x + Math.cos(from) * t.radius;
    const ay = t.y + Math.sin(from) * t.radius;
    const bx = t.x + Math.cos(to) * t.radius;
    const by = t.y + Math.sin(to) * t.radius;
    if (dashed) {
      dashedLine(g, t.x, t.y, ax, ay);
      dashedLine(g, t.x, t.y, bx, by);
      dashedArc(g, t.x, t.y, t.radius, from, to);
    } else {
      g.lineBetween(t.x, t.y, ax, ay);
      g.lineBetween(t.x, t.y, bx, by);
      g.beginPath();
      g.arc(t.x, t.y, t.radius, from, to);
      g.strokePath();
    }
    return;
  }
  // Line: a rectangle along the segment.
  const length = Math.hypot(t.x2 - t.x, t.y2 - t.y) || 1;
  const nx = (-(t.y2 - t.y) / length) * (t.width / 2);
  const ny = ((t.x2 - t.x) / length) * (t.width / 2);
  const draw = dashed ? (x1: number, y1: number, x2: number, y2: number) => dashedLine(g, x1, y1, x2, y2) : (x1: number, y1: number, x2: number, y2: number) => g.lineBetween(x1, y1, x2, y2);
  draw(t.x + nx, t.y + ny, t.x2 + nx, t.y2 + ny);
  draw(t.x - nx, t.y - ny, t.x2 - nx, t.y2 - ny);
  draw(t.x + nx, t.y + ny, t.x - nx, t.y - ny);
  draw(t.x2 + nx, t.y2 + ny, t.x2 - nx, t.y2 - ny);
}

function fill(g: Phaser.GameObjects.Graphics, t: BossTelegraph, colour: number, alpha: number): void {
  g.fillStyle(colour, alpha);
  if (t.shape === 'circle') g.fillCircle(t.x, t.y, t.radius);
  else if (t.shape === 'cone') g.slice(t.x, t.y, t.radius, t.angle - t.arc / 2, t.angle + t.arc / 2, false).fillPath();
  else {
    const length = Math.hypot(t.x2 - t.x, t.y2 - t.y) || 1;
    const nx = (-(t.y2 - t.y) / length) * (t.width / 2);
    const ny = ((t.x2 - t.x) / length) * (t.width / 2);
    g.fillTriangle(t.x + nx, t.y + ny, t.x2 + nx, t.y2 + ny, t.x2 - nx, t.y2 - ny);
    g.fillTriangle(t.x + nx, t.y + ny, t.x2 - nx, t.y2 - ny, t.x - nx, t.y - ny);
  }
}

/** Every boss telegraph, filling as the attack nears (GDD 10.6, 15.1). */
export function drawBossTelegraphs(g: Phaser.GameObjects.Graphics, telegraphs: readonly BossTelegraph[]): void {
  for (const t of telegraphs) {
    const progress = Math.max(0, Math.min(1, 1 - t.timeLeft / t.duration));
    const colour = t.style.kind === 'borrowed' ? hexToNumber(KINGDOM_COLOURS[t.style.kingdom]) : DANGER;
    fill(g, t, colour, 0.06 + 0.2 * progress);
    g.lineStyle(t.style.kind === 'borrowed' ? 5 : 3, colour, 0.6 + 0.4 * progress);
    outline(g, t, t.style.kind === 'escort');
  }
}

/** Marks drawn on a boss body: resistances, an exposed core, a thorn shell, a revealed body. */
export function drawBossMarks(g: Phaser.GameObjects.Graphics, body: BossBody, time: number): void {
  const enemy = body.enemy;
  const { x, y, radius } = enemy;
  // The Abomination's adapted resistance shows by colour (GDD 10.4).
  if (enemy.resistType) {
    g.lineStyle(5, hexToNumber(DAMAGE_TYPE_COLOURS[enemy.resistType]), 0.95);
    g.strokeCircle(x, y, radius + 7);
  }
  // An exposed core glows gold.
  if (body.timers.exposed > 0) {
    g.fillStyle(GOLD, 0.5 + 0.4 * Math.sin(time * 18));
    g.fillCircle(x, y, radius * 0.4);
  }
  if (enemy.thornShell) {
    g.lineStyle(3, INK, 1);
    const facing = Math.atan2(enemy.faceY, enemy.faceX);
    for (let index = -4; index <= 4; index++) {
      const angle = facing + index * 0.28;
      g.lineBetween(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, x + Math.cos(angle) * (radius + 12), y + Math.sin(angle) * (radius + 12));
    }
  }
  // The real Unmaking shows a gold ring while revealed.
  if (body.bossId === 'the-unmaking' && body.timers.reveal > 0) {
    g.lineStyle(4, GOLD, 1);
    g.strokeCircle(x, y, radius + 12);
  }
  // A phase transition shimmers.
  if (body.transition > 0) {
    g.lineStyle(4, 0xffffff, 0.4 + 0.5 * Math.sin(time * 30));
    g.strokeCircle(x, y, radius + 4);
  }
  // The war banner shows its reach.
  if (body.partId === 'war-banner') {
    g.lineStyle(2, DANGER, 0.35);
    dashedArc(g, x, y, BOSS_RULES.bannerRadius, 0, Math.PI * 2);
  }
}
