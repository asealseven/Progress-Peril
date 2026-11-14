// Image loading through the asset manifest (CLAUDE.md rule 8, GDD 15.1).
// The asset-files build step lists what sits in public/assets. Boot loads
// every manifest image found there under its manifest key. Every other key
// keeps its placeholder drawn in code, so a missing file never crashes the
// game, and a new file replaces its placeholder with no code change.

import type Phaser from 'phaser';
import files from 'virtual:asset-files';
import { IMAGE_ASSETS } from '../data/assets';

const loaded = new Set<string>();
let reported = false;

/** True when the generated image for a manifest key loaded. */
export function hasImage(key: string): boolean {
  return loaded.has(key);
}

/** Queues every manifest image that exists. Call from a scene's preload(). */
export function queueImages(scene: Phaser.Scene): void {
  const present = new Set(files);
  const found = IMAGE_ASSETS.filter((entry) => entry.path !== undefined && present.has(entry.path));
  for (const entry of found) {
    if (entry.path && !scene.textures.exists(entry.key)) scene.load.image(entry.key, entry.path);
  }
  scene.load.on('filecomplete', (key: string) => loaded.add(key));
  scene.load.on('loaderror', (file: Phaser.Loader.File) => {
    // A broken file falls back to its placeholder and logs once.
    console.warn(`Image ${file.key} failed to load. The placeholder stays.`);
  });
  if (!reported) {
    reported = true;
    console.info(`Images: ${found.length} of ${IMAGE_ASSETS.length} found. The rest draw placeholders.`);
  }
}

/**
 * Sizes a generated image to fit a box of the given logical size, keeping its
 * proportions. Placeholders fill the box exactly.
 */
export function fitImage(image: Phaser.GameObjects.Image, width: number, height: number = width): Phaser.GameObjects.Image {
  if (!hasImage(image.texture.key)) return image.setDisplaySize(width, height);
  const frame = image.frame;
  const scale = Math.min(width / frame.realWidth, height / frame.realHeight);
  return image.setScale(scale);
}

/** Generated sprites draw a little larger than their collision circle, so the figure reads at the same size as the placeholder disc. */
export const SPRITE_IMAGE_SCALE = 1.5;

/**
 * Places a generated image in a box when one exists. Returns undefined when
 * the key has no image, so the caller draws its placeholder.
 */
export function addImageIfPresent(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  width: number,
  height: number = width,
): Phaser.GameObjects.Image | undefined {
  if (!hasImage(key)) return undefined;
  return fitImage(scene.add.image(x, y, key), width, height);
}
