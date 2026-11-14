// The save file shared by every scene (GDD 15.13). The first call loads it
// from browser storage. Scenes save through these helpers at the moments the
// GDD names: the run at the start of each preparation phase, the Archive after
// every round and at the end of every run.

import type Phaser from 'phaser';
import type { ArchiveState } from '../sim/archive';
import type { RunState } from '../sim/run';
import { browserStorage, loadSave, writeSave } from '../sim/save';
import type { ProfileSave, SaveFile, SaveStorage } from '../sim/save';

const KEY = 'save-session';

interface Session {
  readonly storage: SaveStorage | undefined;
  file: SaveFile;
  readonly fromBackup: boolean;
}

export function session(scene: Phaser.Scene): Session {
  let current = scene.registry.get(KEY) as Session | undefined;
  if (!current) {
    const storage = browserStorage();
    const loaded = loadSave(storage);
    current = { storage, file: loaded.file, fromBackup: loaded.fromBackup };
    scene.registry.set(KEY, current);
  }
  return current;
}

export function profile(scene: Phaser.Scene): ProfileSave {
  const current = session(scene);
  const entry = current.file.profiles[current.file.active] ?? current.file.profiles[0];
  if (!entry) throw new Error('No save profile');
  return entry;
}

export function archive(scene: Phaser.Scene): ArchiveState {
  return profile(scene).archive;
}

export function saveNow(scene: Phaser.Scene): boolean {
  const current = session(scene);
  return writeSave(current.storage, current.file);
}

/** The run saves at the start of every preparation phase (GDD 15.13). */
export function saveRun(scene: Phaser.Scene, run: RunState): void {
  profile(scene).run = run;
  saveNow(scene);
}

/** A run that ended leaves the profile. The Archive keeps what it earned. */
export function endRun(scene: Phaser.Scene): void {
  profile(scene).run = undefined;
  saveNow(scene);
}

/** Replaces the whole save, after an import. */
export function replaceSave(scene: Phaser.Scene, file: SaveFile): void {
  session(scene).file = file;
  saveNow(scene);
}

export function switchProfile(scene: Phaser.Scene, index: number): void {
  const current = session(scene);
  if (index < 0 || index >= current.file.profiles.length) return;
  current.file.active = index;
  saveNow(scene);
}
