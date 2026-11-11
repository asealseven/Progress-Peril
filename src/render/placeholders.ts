// Placeholder art drawn in code (CLAUDE.md "Placeholder art"). Each texture
// uses the asset manifest key of the image it stands in for, so a generated
// image under the same key replaces the placeholder with no other change.

import type Phaser from 'phaser';
import type { EnemyDef } from '../data/enemies';
import { FONTS } from '../data/fonts';
import { FACTION_COLOURS, PALETTE } from '../data/palette';
import { COMBAT } from '../data/tiers';

/** Placeholders draw at three times their logical size, for sharp scaling. */
const DETAIL = 3;

function drawTexture(
  scene: Phaser.Scene,
  key: string,
  logicalSize: number,
  draw: (context: CanvasRenderingContext2D, centre: number) => void,
): void {
  if (scene.textures.exists(key)) return;
  const pixels = Math.ceil(logicalSize * DETAIL);
  const texture = scene.textures.createCanvas(key, pixels, pixels);
  if (!texture) return;
  const context = texture.getContext();
  context.save();
  context.scale(DETAIL, DETAIL);
  draw(context, logicalSize / 2);
  context.restore();
  texture.refresh();
}

export const PLAYER_KEY = 'character.the-inventor';
export const PLAYER_PROJECTILE_KEY = 'projectile.player';
const PLAYER_RING_GAP = 7;
const OUTLINE = 3;

/** Logical size of the player placeholder, ring included. */
export const PLAYER_TEXTURE_SIZE = (COMBAT.playerRadius + PLAYER_RING_GAP + OUTLINE) * 2;

/** Player: parchment circle, ink outline, dashed gold ring. */
export function ensurePlayerTexture(scene: Phaser.Scene): void {
  drawTexture(scene, PLAYER_KEY, PLAYER_TEXTURE_SIZE, (context, centre) => {
    context.beginPath();
    context.arc(centre, centre, COMBAT.playerRadius - OUTLINE / 2, 0, Math.PI * 2);
    context.fillStyle = PALETTE.parchment;
    context.fill();
    context.lineWidth = OUTLINE;
    context.strokeStyle = PALETTE.ink;
    context.stroke();

    context.beginPath();
    context.setLineDash([6, 5]);
    context.arc(centre, centre, COMBAT.playerRadius + PLAYER_RING_GAP, 0, Math.PI * 2);
    context.lineWidth = 2;
    context.strokeStyle = PALETTE.playerEffects;
    context.stroke();
    context.setLineDash([]);
  });
}

export function enemyKey(def: EnemyDef): string {
  return `enemy.${def.id}`;
}

/** Logical size of an enemy placeholder. */
export function enemyTextureSize(def: EnemyDef): number {
  return (def.radius + OUTLINE) * 2;
}

/** Enemy: circle in the faction colour, ink outline, first letter of the name. */
export function ensureEnemyTexture(scene: Phaser.Scene, def: EnemyDef): void {
  drawTexture(scene, enemyKey(def), enemyTextureSize(def), (context, centre) => {
    context.beginPath();
    context.arc(centre, centre, def.radius - OUTLINE / 2, 0, Math.PI * 2);
    context.fillStyle = FACTION_COLOURS[def.faction];
    context.fill();
    context.lineWidth = OUTLINE;
    context.strokeStyle = PALETTE.ink;
    context.stroke();

    context.fillStyle = PALETTE.ink;
    context.font = `700 ${Math.round(def.radius * 1.15)}px "${FONTS.body}", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(def.name.charAt(0), centre, centre + 1);
  });
}

/** Logical size of the player projectile placeholder. */
export const PROJECTILE_TEXTURE_SIZE = (COMBAT.projectileRadius + 2) * 2;

/** Player projectile: gold with an ink outline. */
export function ensureProjectileTexture(scene: Phaser.Scene): void {
  drawTexture(scene, PLAYER_PROJECTILE_KEY, PROJECTILE_TEXTURE_SIZE, (context, centre) => {
    context.beginPath();
    context.arc(centre, centre, COMBAT.projectileRadius, 0, Math.PI * 2);
    context.fillStyle = PALETTE.playerEffects;
    context.fill();
    context.lineWidth = 1.5;
    context.strokeStyle = PALETTE.ink;
    context.stroke();
  });
}
