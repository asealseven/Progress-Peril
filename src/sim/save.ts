// Save system (GDD 15.13): three profiles in browser local storage, each with
// the Grand Archive and one active run. Every write keeps the previous save as
// a backup. Saves carry a version number and older saves convert on load.
// Export gives a file and a copyable code. Nothing leaves the device.
// No Phaser imports.

import { ARCHIVE_RULES } from '../data/archive';
import { CHARACTERS } from '../data/characters';
import { COMPONENT_LIST } from '../data/components';
import { WEAPON_LIST } from '../data/weapons';
import { createArchive } from './archive';
import type { ArchiveState } from './archive';
import type { RunState } from './run';

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'progress-peril.save';
export const BACKUP_KEY = 'progress-peril.save.backup';

export interface ProfileSave {
  name: string;
  archive: ArchiveState;
  /** The active run as saved at the start of its last preparation phase. */
  run: RunState | undefined;
}

export interface SaveFile {
  version: number;
  /** The profile in use, 0 to 2. */
  active: number;
  profiles: ProfileSave[];
}

/** Where saves live. The browser's local storage in the game, a map in tests. */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function memoryStorage(): SaveStorage & { readonly items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

/** The browser's local storage, or undefined where the browser blocks it. */
export function browserStorage(): SaveStorage | undefined {
  try {
    const storage = globalThis.localStorage;
    return storage ?? undefined;
  } catch {
    return undefined;
  }
}

export function newSaveFile(): SaveFile {
  return {
    version: SAVE_VERSION,
    active: 0,
    profiles: Array.from({ length: ARCHIVE_RULES.profiles }, (_, index) => ({
      name: `Profile ${index + 1}`,
      archive: createArchive(),
      run: undefined,
    })),
  };
}

// --- Encoding --------------------------------------------------------------------

/** Content definitions travel as references, so a save holds ids instead of copies. */
const REFERENCES = new Map<object, string>();
const DEFINITIONS = new Map<string, object>();
function register(kind: string, id: string, def: object): void {
  REFERENCES.set(def, `${kind}:${id}`);
  DEFINITIONS.set(`${kind}:${id}`, def);
}
for (const character of Object.values(CHARACTERS)) register('character', character.id, character);
for (const weapon of WEAPON_LIST) register('weapon', weapon.id, weapon);
for (const component of COMPONENT_LIST) register('component', component.id, component);

function replacer(this: unknown, key: string, value: unknown): unknown {
  // A run's Archive is the profile's Archive: it saves once, with the profile.
  if (key === 'archive' && isRunHolder(this)) {
    return { $archive: true };
  }
  if (value instanceof Set) return { $set: [...value] };
  if (value !== null && typeof value === 'object') {
    const reference = REFERENCES.get(value);
    if (reference) return { $ref: reference };
  }
  return value;
}

function isRunHolder(holder: unknown): boolean {
  return holder !== null && typeof holder === 'object' && 'weapons' in holder && 'seed' in holder;
}

function reviver(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if ('$set' in value && Array.isArray((value as { $set: unknown }).$set)) return new Set((value as { $set: unknown[] }).$set);
  if ('$ref' in value) {
    const def = DEFINITIONS.get(String((value as { $ref: unknown }).$ref));
    if (!def) throw new Error(`Unknown content in save: ${String((value as { $ref: unknown }).$ref)}`);
    return def;
  }
  return value;
}

export function encodeSave(file: SaveFile): string {
  return JSON.stringify(file, replacer);
}

/** Version 0: Milestone 6 to 8 Archives held discoveries, mastery, hints and a campaign count only. */
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

/** Converts a save one version up. Index 0 turns version 0 into version 1. */
export const MIGRATIONS: readonly Migration[] = [
  (raw) => {
    const profiles = Array.isArray(raw.profiles) ? (raw.profiles as Array<Record<string, unknown>>) : [];
    return {
      ...raw,
      version: 1,
      active: typeof raw.active === 'number' ? raw.active : 0,
      profiles: profiles.map((profile) => ({ ...profile, archive: fillArchive(profile.archive) })),
    };
  },
];

/** Missing Archive fields take their starting values, so an older Archive keeps what it had. */
function fillArchive(raw: unknown): ArchiveState {
  const fresh = createArchive();
  if (raw === null || typeof raw !== 'object') return fresh;
  const merged = { ...fresh, ...(raw as Partial<ArchiveState>) };
  merged.mastery = { ...fresh.mastery, ...(merged.mastery ?? {}) };
  merged.upgrades = { ...fresh.upgrades, ...(merged.upgrades ?? {}) };
  merged.upgradeSpent = { ...fresh.upgradeSpent, ...(merged.upgradeSpent ?? {}) };
  merged.challenges = { ...fresh.challenges, ...(merged.challenges ?? {}) };
  merged.codex = { ...fresh.codex, ...(merged.codex ?? {}) };
  merged.bests = { ...fresh.bests, ...(merged.bests ?? {}) };
  return merged;
}

export type SaveProblem = 'empty' | 'unreadable' | 'newer' | 'shape';

export type DecodeResult = { readonly file: SaveFile } | { readonly problem: SaveProblem };

/** Reads a save, converting older versions. Never throws. */
export function decodeSave(text: string | null | undefined): DecodeResult {
  if (!text) return { problem: 'empty' };
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text, reviver) as Record<string, unknown>;
  } catch {
    return { problem: 'unreadable' };
  }
  if (raw === null || typeof raw !== 'object') return { problem: 'shape' };
  let version = typeof raw.version === 'number' ? raw.version : 0;
  if (version > SAVE_VERSION) return { problem: 'newer' };
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return { problem: 'shape' };
    raw = step(raw);
    version++;
  }
  const profiles = raw.profiles;
  if (!Array.isArray(profiles) || profiles.length === 0) return { problem: 'shape' };
  const file = raw as unknown as SaveFile;
  // Each run's Archive is its profile's Archive.
  for (const profile of file.profiles) {
    profile.archive = fillArchive(profile.archive);
    if (profile.run) profile.run.archive = profile.archive;
    else profile.run = undefined;
  }
  while (file.profiles.length < ARCHIVE_RULES.profiles) file.profiles.push(newSaveFile().profiles[0] as ProfileSave);
  file.active = Math.min(file.profiles.length - 1, Math.max(0, Math.floor(file.active ?? 0)));
  return { file };
}

// --- Storage ---------------------------------------------------------------------

/** Loads the save, falling back to the backup when the main copy fails (GDD 15.13). */
export function loadSave(storage: SaveStorage | undefined): { file: SaveFile; fromBackup: boolean } {
  if (!storage) return { file: newSaveFile(), fromBackup: false };
  let main: DecodeResult = { problem: 'empty' };
  let backup: DecodeResult = { problem: 'empty' };
  try {
    main = decodeSave(storage.getItem(SAVE_KEY));
    if ('file' in main) return { file: main.file, fromBackup: false };
    backup = decodeSave(storage.getItem(BACKUP_KEY));
  } catch {
    return { file: newSaveFile(), fromBackup: false };
  }
  if ('file' in backup) return { file: backup.file, fromBackup: true };
  return { file: newSaveFile(), fromBackup: false };
}

let persistAsked = false;

/** Writes the save. The previous save becomes the backup. Returns false when storage refuses. */
export function writeSave(storage: SaveStorage | undefined, file: SaveFile): boolean {
  if (!storage) return false;
  try {
    const previous = storage.getItem(SAVE_KEY);
    if (previous) storage.setItem(BACKUP_KEY, previous);
    storage.setItem(SAVE_KEY, encodeSave(file));
  } catch {
    return false;
  }
  // Ask the browser to keep saves when space runs low (GDD 15.13).
  if (!persistAsked) {
    persistAsked = true;
    const storageManager = (globalThis.navigator as Navigator | undefined)?.storage;
    void storageManager?.persist?.().catch(() => false);
  }
  return true;
}

// --- Export and import ---------------------------------------------------------------

const CODE_PREFIX = 'PP1:';

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(code: string): string {
  const binary = atob(code);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** A copyable save code (GDD 15.13). */
export function exportCode(file: SaveFile): string {
  return CODE_PREFIX + toBase64(encodeSave(file));
}

/** Reads a save code or the text of a save file. */
export function importSave(input: string): DecodeResult {
  const text = input.trim();
  if (text.startsWith(CODE_PREFIX)) {
    try {
      return decodeSave(fromBase64(text.slice(CODE_PREFIX.length).replace(/\s+/g, '')));
    } catch {
      return { problem: 'unreadable' };
    }
  }
  return decodeSave(text);
}
