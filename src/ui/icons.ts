// Item icons for the notebook UI (GDD 15.1, 15.8). Weapons, components and
// relics show their generated image when one exists (ART_PROMPTS.md). Until
// then each draws a small blueprint sketch in code: a family glyph for
// weapons, a socket shape for components, a wax seal for relics and a door
// for shopkeepers.

import type Phaser from 'phaser';
import { assetKey } from '../data/assets';
import type { ComponentDef } from '../data/components';
import { KINGDOM_COLOURS, PALETTE, hexToNumber } from '../data/palette';
import type { RelicDef } from '../data/relics';
import { QUALITY_COLOURS, SHOPS } from '../data/shop';
import type { ShopId } from '../data/shop';
import type { WeaponDef } from '../data/weapons';
import { FONTS } from '../data/fonts';
import { addImageIfPresent } from '../render/images';

const INK = hexToNumber(PALETTE.ink);
const BRASS = hexToNumber(PALETTE.brass);
const PARCHMENT = hexToNumber(PALETTE.parchment);
const BLUEPRINT = 0x2f5d7c;

type Drawn = Phaser.GameObjects.GameObject[];

function sketch(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
  return scene.add.graphics({ x, y });
}

/** A weapon: its generated icon, or a blueprint glyph for its family. */
export function weaponIcon(scene: Phaser.Scene, def: WeaponDef, x: number, y: number, size: number): Drawn {
  const image = addImageIfPresent(scene, assetKey('weapon', def.name), x, y, size);
  if (image) return [image];
  const g = sketch(scene, x, y);
  const r = size / 2;
  g.fillStyle(0xe4ecf0, 1);
  g.fillRoundedRect(-r, -r, size, size, size * 0.12);
  g.lineStyle(1, BLUEPRINT, 0.35);
  for (let line = -r + size / 6; line < r; line += size / 6) {
    g.lineBetween(-r, line, r, line);
    g.lineBetween(line, -r, line, r);
  }
  g.lineStyle(Math.max(2, size / 18), BLUEPRINT, 1);
  const k = r * 0.7;
  switch (def.family) {
    case 'Melee':
      // A blade with a cross guard.
      g.lineBetween(-k, k, k, -k);
      g.lineBetween(-k * 0.55, k * 0.15, -k * 0.15, k * 0.55);
      break;
    case 'Ranged':
      // A drawn bow and its arrow.
      g.beginPath();
      g.arc(k * 0.5, 0, k, Math.PI * 0.6, Math.PI * 1.4);
      g.strokePath();
      g.lineBetween(k * 0.19, -k * 0.95, k * 0.19, k * 0.95);
      g.lineBetween(-k, 0, k, 0);
      g.lineBetween(-k, 0, -k * 0.7, -k * 0.2);
      g.lineBetween(-k, 0, -k * 0.7, k * 0.2);
      break;
    case 'Siege':
      // A wheel under a barrel.
      g.strokeCircle(-k * 0.2, k * 0.4, k * 0.45);
      g.strokeRect(-k * 0.3, -k * 0.5, k * 1.3, k * 0.5);
      break;
    case 'Mechanical':
      // A gear.
      g.strokeCircle(0, 0, k * 0.6);
      g.strokeCircle(0, 0, k * 0.2);
      for (let tooth = 0; tooth < 8; tooth++) {
        const angle = (tooth / 8) * Math.PI * 2;
        g.lineBetween(Math.cos(angle) * k * 0.6, Math.sin(angle) * k * 0.6, Math.cos(angle) * k, Math.sin(angle) * k);
      }
      break;
    case 'Alchemical':
      // A round flask.
      g.strokeCircle(0, k * 0.25, k * 0.6);
      g.strokeRect(-k * 0.2, -k, k * 0.4, k * 0.65);
      break;
    case 'Experimental':
      // A coil with a spark.
      for (let turn = 0; turn < 4; turn++) g.strokeEllipse(0, -k * 0.6 + turn * k * 0.4, k * 1.1, k * 0.35);
      g.lineBetween(k * 0.6, -k, k, -k * 0.6);
      break;
  }
  g.lineStyle(2, INK, 1);
  g.strokeRoundedRect(-r, -r, size, size, size * 0.12);
  return [g];
}

/** A component: its generated icon, or a socket shape for its slot in the quality colour. */
export function componentIcon(scene: Phaser.Scene, def: ComponentDef, x: number, y: number, size: number): Drawn {
  const image = addImageIfPresent(scene, assetKey('component', def.name), x, y, size);
  if (image) return [image];
  const g = sketch(scene, x, y);
  const r = size * 0.42;
  const colour = hexToNumber(QUALITY_COLOURS[def.quality]);
  g.fillStyle(colour, 0.35);
  g.lineStyle(Math.max(2, size / 16), INK, 1);
  switch (def.slot) {
    case 'Structure':
      g.fillRect(-r, -r, r * 2, r * 2);
      g.strokeRect(-r, -r, r * 2, r * 2);
      g.lineBetween(-r, 0, r, 0);
      g.lineBetween(0, -r, 0, r);
      break;
    case 'Mechanism': {
      g.fillCircle(0, 0, r * 0.8);
      g.strokeCircle(0, 0, r * 0.8);
      g.strokeCircle(0, 0, r * 0.3);
      for (let tooth = 0; tooth < 6; tooth++) {
        const angle = (tooth / 6) * Math.PI * 2;
        g.lineBetween(Math.cos(angle) * r * 0.8, Math.sin(angle) * r * 0.8, Math.cos(angle) * r, Math.sin(angle) * r);
      }
      break;
    }
    case 'Payload':
      g.fillCircle(0, r * 0.25, r * 0.7);
      g.strokeCircle(0, r * 0.25, r * 0.7);
      g.strokeRect(-r * 0.2, -r, r * 0.4, r * 0.55);
      break;
    case 'Auxiliary':
      g.fillTriangle(0, -r, r, 0, 0, r);
      g.fillTriangle(0, -r, -r, 0, 0, r);
      g.beginPath();
      g.moveTo(0, -r);
      g.lineTo(r, 0);
      g.lineTo(0, r);
      g.lineTo(-r, 0);
      g.closePath();
      g.strokePath();
      break;
  }
  return [g];
}

/** A relic: its generated icon, or a wax seal in the kingdom colour. */
export function relicIcon(scene: Phaser.Scene, def: RelicDef, x: number, y: number, size: number): Drawn {
  const image = addImageIfPresent(scene, assetKey('relic', def.name), x, y, size);
  if (image) return [image];
  const g = sketch(scene, x, y);
  const r = size * 0.45;
  const colour = hexToNumber(KINGDOM_COLOURS[def.kingdom]);
  g.fillStyle(colour, 1);
  for (let lobe = 0; lobe < 10; lobe++) {
    const angle = (lobe / 10) * Math.PI * 2;
    g.fillCircle(Math.cos(angle) * r * 0.82, Math.sin(angle) * r * 0.82, r * 0.24);
  }
  g.fillCircle(0, 0, r * 0.85);
  g.lineStyle(Math.max(2, size / 20), INK, 0.9);
  g.strokeCircle(0, 0, r * 0.62);
  const letter = scene.add
    .text(x, y, def.name.replace(/^The /, '').charAt(0), {
      fontFamily: `"${FONTS.heading}", serif`,
      fontSize: `${Math.round(size * 0.42)}px`,
      color: PALETTE.parchment,
    })
    .setOrigin(0.5);
  return [g, letter];
}

/** A shopkeeper: the portrait, or an arched door with a brass plaque. */
export function keeperIcon(scene: Phaser.Scene, id: ShopId, x: number, y: number, width: number, height: number): Drawn {
  const image = addImageIfPresent(scene, assetKey('shopkeeper', id), x, y, width, height);
  if (image) return [image];
  const g = sketch(scene, x, y);
  const w = Math.min(width, height * 0.7);
  const top = -height / 2 + w / 2;
  g.fillStyle(0x8c6a46, 1);
  g.fillRect(-w / 2, top, w, height / 2 - top);
  g.fillCircle(0, top, w / 2);
  g.lineStyle(3, INK, 1);
  g.beginPath();
  g.arc(0, top, w / 2, Math.PI, 0);
  g.lineTo(w / 2, height / 2);
  g.lineTo(-w / 2, height / 2);
  g.closePath();
  g.strokePath();
  g.lineStyle(2, INK, 0.5);
  g.lineBetween(0, top - w / 2, 0, height / 2);
  g.fillStyle(BRASS, 1);
  g.fillRect(-w * 0.32, top + 6, w * 0.64, 20);
  g.fillStyle(PARCHMENT, 1);
  g.fillCircle(w * 0.3, height * 0.12, 4);
  // Small doors keep a bare plaque. The shop name shows beside them.
  if (w < 90) return [g];
  const plaque = scene.add
    .text(x, y + top + 16, SHOPS[id].name, { fontFamily: `"${FONTS.body}", sans-serif`, fontSize: '13px', color: PALETTE.parchment, fontStyle: '700' })
    .setOrigin(0.5);
  return [g, plaque];
}
