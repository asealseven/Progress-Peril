import { describe, expect, it } from 'vitest';
import { AP_REWARDS, CHALLENGES, DISCOVERY, PERMANENT_UPGRADES, SPECIALISATION_COST, UPGRADE_IDS } from '../src/data/archive';
import { CHARACTERS } from '../src/data/characters';
import { COMPONENT_LIST } from '../src/data/components';
import { RESEARCH_NODES, researchNodeByName } from '../src/data/research';
import { SPECIALISATION_LIST } from '../src/data/specialisations';
import { tierValue } from '../src/data/tiers';
import { WEAPONS } from '../src/data/weapons';
import {
  buySpecialisation,
  buyUpgrade,
  createArchive,
  createFullArchive,
  discoverNode,
  discoveryProblem,
  progressChallenge,
  refundSpecialisation,
  refundUpgrade,
  specialisationSlots,
  toggleSpecialisation,
  upgradeStepCost,
} from '../src/sim/archive';
import type { ArchiveState } from '../src/sim/archive';
import { experimentalOpen } from '../src/sim/economy';
import { resolveLoadout } from '../src/sim/loadout';
import { researchNodeNow } from '../src/sim/research';
import { createRun, createWorldForRound, finishRound } from '../src/sim/run';
import type { RunState } from '../src/sim/run';
import {
  BACKUP_KEY,
  MIGRATIONS,
  SAVE_KEY,
  SAVE_VERSION,
  decodeSave,
  encodeSave,
  exportCode,
  importSave,
  loadSave,
  memoryStorage,
  newSaveFile,
  writeSave,
} from '../src/sim/save';
import { killEnemy } from '../src/sim/world/damage';
import { typeMultiplier } from '../src/sim/world/status';
import { addModifierFlag } from '../src/sim/world/traits';
import type { ArchivePerks } from '../src/sim/world/types';
import { BASE_STATS, arm, dummyAt, makeWorld, stepSeconds } from './helpers';

function node(name: string) {
  const found = researchNodeByName(name);
  if (!found) throw new Error(name);
  return found;
}

function runWith(archive: ArchiveState, seed = 4): RunState {
  archive.campaigns = Math.max(1, archive.campaigns);
  return createRun(seed, CHARACTERS.inventor, WEAPONS.crossbow, archive);
}

function perks(changes: Partial<ArchivePerks>): ArchivePerks {
  return { rules: new Map(), statusFill: new Map(), masters: [], masterStatus: 'Burning', revival: false, ...changes };
}

describe('Grand Archive catalogue (GDD 11.10, 11.14)', () => {
  it('starts with 25 nodes: every centre node and two inner nodes per discipline', () => {
    const archive = createArchive();
    expect(archive.discovered.size).toBe(25);
    for (const entry of RESEARCH_NODES.filter((n) => n.ring === 'Centre')) expect(archive.discovered.has(entry.id)).toBe(true);
  });

  it('prices the whole Archive at 7,260 Archive Points', () => {
    const starting = createArchive();
    let discovery = 0;
    for (const entry of RESEARCH_NODES) if (!starting.discovered.has(entry.id)) discovery += DISCOVERY[entry.ring]?.points ?? 0;
    const upgrades = UPGRADE_IDS.reduce((sum, id) => sum + PERMANENT_UPGRADES[id].costs.reduce((a, b) => a + b, 0), 0);
    const specialisations = SPECIALISATION_LIST.length * SPECIALISATION_COST;
    expect(discovery).toBe(4300);
    expect(upgrades).toBe(1960);
    expect(specialisations).toBe(1000);
  });

  it('gates discoveries by ring: inner open, middle Practitioner, outer Expert, cross by requirements', () => {
    const archive = createArchive();
    archive.points = 1000;
    expect(discoveryProblem(archive, node('Applied Combustion'))).toBe('known');
    expect(discoveryProblem(archive, node('Iron Lung'))).toBe('hidden');
    expect(discoveryProblem(archive, node('Corrosive Acids'))).toBeUndefined();
    expect(discoveryProblem(archive, node('Incendiary Engineering'))).toBe('mastery');
    archive.mastery.Chemistry = 12;
    expect(discoveryProblem(archive, node('Incendiary Engineering'))).toBe('mastery');
    archive.mastery.Chemistry = 13;
    expect(discoveryProblem(archive, node('Incendiary Engineering'))).toBeUndefined();
    expect(discoveryProblem(archive, node('Thermite'))).toBe('mastery');
    archive.mastery.Chemistry = 60;
    expect(discoveryProblem(archive, node('Thermite'))).toBe('requirements');
    expect(discoverNode(archive, node('Incendiary Engineering'))).toBeUndefined();
    expect(archive.points).toBe(960);
    expect(discoveryProblem(archive, node('Thermite'))).toBeUndefined();
    const poor = createArchive();
    expect(discoveryProblem(poor, node('Corrosive Acids'))).toBe('points');
  });

  it('completes First Invention with a cross-disciplinary discovery', () => {
    const archive = createFullArchive();
    const cross = RESEARCH_NODES.find((n) => n.ring === 'Cross')!;
    archive.discovered.delete(cross.id);
    archive.points = 60;
    expect(discoverNode(archive, cross)).toBeUndefined();
    expect(archive.completed.has('first-invention')).toBe(true);
    expect(archive.points).toBe(CHALLENGES['first-invention'].points);
    expect(archive.challenges['scientific-perfection']).toBe(1);
  });
});

describe('permanent upgrades and respec (GDD 11.5, 11.8, 11.11)', () => {
  it('sells steps at the listed costs up to the limit', () => {
    const archive = createArchive();
    archive.points = 1000;
    expect(upgradeStepCost(archive, 'starting-gold')).toBe(30);
    expect(buyUpgrade(archive, 'starting-gold')).toBe(true);
    expect(buyUpgrade(archive, 'starting-gold')).toBe(true);
    expect(buyUpgrade(archive, 'starting-gold')).toBe(true);
    expect(buyUpgrade(archive, 'starting-gold')).toBe(false);
    expect(archive.points).toBe(1000 - 180);
  });

  it('refunds 90 per cent of an upgrade, rounded down', () => {
    const archive = createArchive();
    archive.points = 500;
    buyUpgrade(archive, 'max-health');
    buyUpgrade(archive, 'max-health');
    expect(refundUpgrade(archive, 'max-health')).toBe(90);
    expect(archive.upgrades['max-health']).toBe(0);
    expect(archive.points).toBe(500 - 100 + 90);
  });

  it('applies starting advantages to a new run', () => {
    const archive = createArchive();
    archive.points = 2000;
    for (const id of ['starting-gold', 'starting-research', 'shop-rerolls', 'max-health', 'revival'] as const) buyUpgrade(archive, id);
    const run = runWith(archive);
    expect(run.gold).toBe(10);
    expect(run.research.points).toBe(5);
    expect(run.freeRerolls).toBe(1);
    expect(run.revival).toBe(true);
    const world = createWorldForRound(run);
    expect(world.player.stats.maxHealth).toBeCloseTo(tierValue('playerMaxHealth', 'Medium') * 1.01);
  });
});

describe('specialisations (GDD 11.12)', () => {
  it('costs 100, equips two, three after Grandmaster, and refunds in full', () => {
    const archive = createArchive();
    archive.points = 400;
    for (const id of ['pyrotechnist', 'electrician', 'gambler'] as const) expect(buySpecialisation(archive, id)).toBe(true);
    expect(archive.points).toBe(100);
    expect(toggleSpecialisation(archive, 'pyrotechnist')).toBe(true);
    expect(toggleSpecialisation(archive, 'electrician')).toBe(true);
    expect(toggleSpecialisation(archive, 'gambler')).toBe(false);
    archive.mastery.Physics = 280;
    expect(specialisationSlots(archive)).toBe(3);
    expect(toggleSpecialisation(archive, 'gambler')).toBe(true);
    expect(refundSpecialisation(archive, 'gambler')).toBe(100);
    expect(archive.equipped).toEqual(['pyrotechnist', 'electrician']);
  });

  it('pairs each bonus with a drawback', () => {
    const fire = arm('Firebomb Satchel');
    const plain = resolveLoadout([fire], BASE_STATS).weapons[0]!;
    const pyro = resolveLoadout([fire], BASE_STATS, { specialisations: ['pyrotechnist'] }).weapons[0]!;
    const firePart = (weapon: typeof plain) => weapon.damageParts.find((part) => part.type === 'Fire')?.amount ?? 0;
    expect(firePart(pyro)).toBeGreaterThan(firePart(plain));
    const electrician = resolveLoadout([arm('Crossbow')], BASE_STATS, { specialisations: ['electrician'] });
    expect(electrician.weapons[0]!.extraChainJumps).toBe(1);
    expect(electrician.playerStats.maxHealth).toBeCloseTo(BASE_STATS.maxHealth * (1 - tierValue('modifierSize', 'Low')));
    const medic = resolveLoadout([arm('Crossbow')], BASE_STATS, { specialisations: ['field-medic'] });
    expect(medic.weapons[0]!.damage).toBeLessThan(resolveLoadout([arm('Crossbow')], BASE_STATS).weapons[0]!.damage);
    expect(medic.playerStats.regeneration).toBeGreaterThan(BASE_STATS.regeneration);
  });

  it('carries equipped specialisations into the run and the shop', () => {
    const archive = createArchive();
    archive.points = 100;
    buySpecialisation(archive, 'accountant');
    toggleSpecialisation(archive, 'accountant');
    const run = runWith(archive);
    expect(run.specialisations).toEqual(['accountant']);
  });
});

describe('Archive Points (GDD 3.8, 11.3)', () => {
  function play(run: RunState, round: number, survive = true): void {
    run.round = round;
    const world = createWorldForRound(run);
    world.phase = survive ? 'cleared' : 'defeat';
    if (survive && round % 7 === 0) world.bossFallen = true;
    finishRound(run, world);
  }

  it('pays rounds, mini-bosses, bosses, the final boss and the campaign', () => {
    const archive = createArchive();
    const run = runWith(archive);
    run.kingdoms = ['Keldrath', 'Myrathis', 'Nymora'];
    play(run, 1);
    expect(archive.points).toBe(AP_REWARDS.round);
    play(run, 4);
    expect(archive.points).toBe(AP_REWARDS.round + AP_REWARDS.miniBoss);
    play(run, 7);
    expect(archive.points).toBe(AP_REWARDS.round + AP_REWARDS.miniBoss + AP_REWARDS.boss);
    play(run, 21);
    expect(archive.points).toBe(AP_REWARDS.round + AP_REWARDS.miniBoss + AP_REWARDS.boss + AP_REWARDS.finalBoss + AP_REWARDS.campaign);
    expect(run.archiveEarned).toBe(archive.points);
    expect(archive.codex.endings.has('Nymora')).toBe(true);
  });

  it('keeps points from completed rounds after a death', () => {
    const archive = createArchive();
    const run = runWith(archive);
    play(run, 1);
    play(run, 2, false);
    expect(run.status).toBe('dead');
    expect(archive.points).toBe(AP_REWARDS.round);
  });

  it('pays for the first research of a technology and for hidden discoveries', () => {
    const archive = createArchive();
    const run = runWith(archive);
    run.research.points = 100;
    researchNodeNow(run, node('Applied Combustion'));
    expect(archive.points).toBe(AP_REWARDS.technology);
    const again = runWith(archive, 9);
    again.research.points = 100;
    researchNodeNow(again, node('Applied Combustion'));
    expect(archive.points).toBe(AP_REWARDS.technology);
  });
});

describe('the revival (GDD 3.8)', () => {
  it('returns the player once at partial health with a short invulnerability', () => {
    const world = makeWorld({ armed: false });
    Object.assign(world, { perks: perks({ revival: true }) });
    world.player.health = 0;
    world.step({ moveX: 0, moveY: 0 });
    expect(world.revived).toBe(true);
    expect(world.phase).toBe('running');
    expect(world.player.health).toBeCloseTo(world.player.stats.maxHealth * 0.5);
    expect(world.player.invulnerable).toBeGreaterThan(2);
    world.player.health = 0;
    world.step({ moveX: 0, moveY: 0 });
    expect(world.phase).toBe('defeat');
  });

  it('marks the campaign revival used', () => {
    const archive = createArchive();
    archive.upgrades.revival = 1;
    const run = runWith(archive);
    const world = createWorldForRound(run);
    expect(world.perks.revival).toBe(true);
    world.revived = true;
    world.phase = 'cleared';
    finishRound(run, world);
    expect(run.revivalUsed).toBe(true);
    expect(createWorldForRound(run).perks.revival).toBe(false);
  });
});

describe('mastery ranks (GDD 8.13)', () => {
  it('opens Experimental components of a discipline at Expert', () => {
    const archive = createArchive();
    const run = runWith(archive);
    const experimental = COMPONENT_LIST.filter((component) => component.quality === 'Experimental');
    expect(experimental.length).toBeGreaterThan(0);
    for (const component of experimental) expect(experimentalOpen(run, component)).toBe(false);
    for (const discipline of ['Chemistry', 'Physics', 'Mathematics', 'Engineering', 'Biology'] as const) archive.mastery[discipline] = 60;
    for (const component of experimental) expect(experimentalOpen(run, component)).toBe(true);
  });

  it('runs the Master mechanics', () => {
    // Physics: Electric and Cold ignore the Resistant elite modifier.
    const physics = makeWorld({ armed: false });
    const resistant = dummyAt(physics, 100, 0);
    addModifierFlag(resistant, 'resistant');
    resistant.resistType = 'Electric';
    const before = typeMultiplier(resistant, 'Electric', physics);
    Object.assign(physics, { perks: perks({ masters: ['Physics'] }) });
    expect(typeMultiplier(resistant, 'Electric', physics)).toBeGreaterThan(before);

    // Biology: Organic kills sometimes drop healing herbs.
    const biology = makeWorld({ armed: false });
    Object.assign(biology, { perks: perks({ masters: ['Biology'] }) });
    let herbs = 0;
    for (let index = 0; index < 400; index++) {
      killEnemy(biology, dummyAt(biology, 300, 0), -1, 0);
    }
    for (const pickup of biology.pickups.items) if (pickup.active && pickup.kind === 'herb') herbs++;
    expect(herbs).toBeGreaterThan(0);

  });

  it('starts constructs deployed with the Engineering Master', () => {
    const r = runWith(createArchive());
    r.archive.mastery.Engineering = 140;
    r.weapons = [arm('Clockwork Turret')];
    const world = createWorldForRound(r);
    stepSeconds(world, 0.2);
    expect(world.constructs.activeCount).toBe(1);
    const turret = world.constructs.items.find((construct) => construct.active)!;
    expect(turret.health).toBeCloseTo(turret.maxHealth / 2);
  });
});

describe('challenges and the Codex (GDD 11.7, 15.6)', () => {
  it('counts Mechanical Menace across runs and pays once', () => {
    const archive = createArchive();
    expect(progressChallenge(archive, 'mechanical-menace', 499)).toBe(false);
    expect(progressChallenge(archive, 'mechanical-menace', 5)).toBe(true);
    expect(archive.points).toBe(CHALLENGES['mechanical-menace'].points);
    expect(progressChallenge(archive, 'mechanical-menace', 5)).toBe(false);
  });

  it('records Against All Odds and the Codex after a round', () => {
    const archive = createArchive();
    const run = runWith(archive);
    run.kingdoms = ['Keldrath'];
    run.weapons = [arm('Crossbow'), arm('Pike'), arm('Longbow')];
    run.round = 7;
    const world = createWorldForRound(run);
    dummyAt(world, 200, 0);
    world.findings.mechanicalKills = 3;
    world.findings.reactions.add('Shatter');
    world.bossFallen = true;
    world.phase = 'cleared';
    finishRound(run, world);
    expect(archive.completed.has('against-all-odds')).toBe(true);
    expect(archive.challenges['mechanical-menace']).toBe(3);
    expect(archive.codex.reactions.has('Shatter')).toBe(true);
    expect(archive.codex.enemies.size).toBeGreaterThan(0);
    expect(archive.codex.kingdoms.has('Keldrath')).toBe(true);
  });
});

describe('saves (GDD 15.13)', () => {
  function sampleFile() {
    const file = newSaveFile();
    const archive = file.profiles[0]!.archive;
    archive.mastery.Biology = 42;
    archive.hints.add('iron-lung');
    const run = runWith(archive);
    const world = createWorldForRound(run);
    world.phase = 'cleared';
    finishRound(run, world);
    archive.points = 321;
    run.weapons.push(arm('Pike', 'Damascus Alloy'));
    file.profiles[0]!.run = run;
    file.active = 0;
    return file;
  }

  it('holds three profiles, each with an Archive and one run', () => {
    const file = newSaveFile();
    expect(file.profiles).toHaveLength(3);
    expect(file.version).toBe(SAVE_VERSION);
  });

  it('round-trips the Archive and the run, content by reference', () => {
    const file = sampleFile();
    const decoded = decodeSave(encodeSave(file));
    if (!('file' in decoded)) throw new Error(decoded.problem);
    const profile = decoded.file.profiles[0]!;
    expect(profile.archive.points).toBe(321);
    expect(profile.archive.hints.has('iron-lung')).toBe(true);
    expect(profile.archive.discovered).toBeInstanceOf(Set);
    const run = profile.run!;
    expect(run.round).toBe(2);
    expect(run.weapons[0]!.def).toBe(WEAPONS.crossbow);
    expect(run.weapons[1]!.components.Structure?.def.name).toBe('Damascus Alloy');
    expect(run.character).toBe(CHARACTERS.inventor);
    expect(run.archive).toBe(profile.archive);
    // The restored run plays on.
    const world = createWorldForRound(run);
    world.phase = 'cleared';
    finishRound(run, world);
    expect(run.round).toBe(3);
  });

  it('keeps the previous save as a backup and falls back to it', () => {
    const storage = memoryStorage();
    const first = sampleFile();
    expect(writeSave(storage, first)).toBe(true);
    first.profiles[0]!.archive.points = 999;
    writeSave(storage, first);
    expect(storage.getItem(BACKUP_KEY)).toContain('321');
    storage.setItem(SAVE_KEY, '{ broken');
    const loaded = loadSave(storage);
    expect(loaded.fromBackup).toBe(true);
    expect(loaded.file.profiles[0]!.archive.points).toBe(321);
    expect(loadSave(memoryStorage()).file.profiles).toHaveLength(3);
  });

  it('converts a version 0 save: older Archives keep what they had', () => {
    const v0 = JSON.stringify({
      profiles: [{ name: 'Old', archive: { discovered: { $set: ['applied-combustion', 'thermite'] }, mastery: { Chemistry: 70 }, hints: { $set: [] }, campaigns: 4 }, run: null }],
    });
    expect(MIGRATIONS).toHaveLength(SAVE_VERSION);
    const decoded = decodeSave(v0);
    if (!('file' in decoded)) throw new Error(decoded.problem);
    const archive = decoded.file.profiles[0]!.archive;
    expect(decoded.file.version).toBe(SAVE_VERSION);
    expect(archive.discovered.has('thermite')).toBe(true);
    expect(archive.mastery.Chemistry).toBe(70);
    expect(archive.mastery.Physics).toBe(0);
    expect(archive.points).toBe(0);
    expect(archive.upgrades.revival).toBe(0);
    expect(archive.codex.enemies).toBeInstanceOf(Set);
    expect(decoded.file.profiles).toHaveLength(3);
  });

  it('refuses newer and broken saves', () => {
    expect(decodeSave(JSON.stringify({ version: SAVE_VERSION + 1, profiles: [] }))).toEqual({ problem: 'newer' });
    expect(decodeSave('not json')).toEqual({ problem: 'unreadable' });
    expect(decodeSave('')).toEqual({ problem: 'empty' });
    expect(decodeSave('{"version":1,"profiles":[]}')).toEqual({ problem: 'shape' });
  });

  it('exports a code and a file that import on another device', () => {
    const file = sampleFile();
    const code = exportCode(file);
    expect(code.startsWith('PP1:')).toBe(true);
    for (const text of [code, encodeSave(file)]) {
      const imported = importSave(text);
      if (!('file' in imported)) throw new Error(imported.problem);
      expect(imported.file.profiles[0]!.archive.points).toBe(321);
      expect(imported.file.profiles[0]!.run!.weapons).toHaveLength(2);
    }
    expect('problem' in importSave('PP1:@@@')).toBe(true);
  });
});
