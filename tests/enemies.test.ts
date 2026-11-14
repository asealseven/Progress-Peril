import { describe, expect, it } from 'vitest';
import type { ArenaDef } from '../src/data/arenas';
import { CHARACTERS } from '../src/data/characters';
import { ENEMIES, ENEMY_LIST, enemiesOfFaction } from '../src/data/enemies';
import type { EnemyDef } from '../src/data/enemies';
import { DAMAGE_STEP, ENEMY_RULES, THREAT_COST, tierValue } from '../src/data/tiers';
import { WEAPONS } from '../src/data/weapons';
import { createRun, createWorldForRound } from '../src/sim/run';
import { hitEnemy, killEnemy } from '../src/sim/world/damage';
import { createSquad, shieldBlocks, spawnGroup, strikeDamage } from '../src/sim/world/enemies';
import { addHazard, enemyBlast } from '../src/sim/world/hazards';
import { fireStraight } from '../src/sim/world/projectiles';
import { hasStatus, triggerStatus } from '../src/sim/world/status';
import type { Enemy, HazardKind } from '../src/sim/world/types';
import type { World } from '../src/sim/world/world';
import {
  IDLE,
  OPEN_ARENA,
  PLAIN_ENEMY,
  arm,
  distanceToPlayer,
  dummyAt,
  enemyAt,
  enemyDef,
  holdFire,
  makeWorld,
  stepSeconds,
} from './helpers';

/** A quiet world: no weapons, no damage taken, the round held open. */
function quiet(options: Parameters<typeof makeWorld>[0] = {}): World {
  return makeWorld({ armed: false, invincible: true, ...options });
}

/** Steps until the check passes. Returns false when the limit runs out first. */
function stepUntil(world: World, seconds: number, check: () => boolean): boolean {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) {
    if (check()) return true;
    world.step(IDLE);
  }
  return check();
}

function hazards(world: World, kind: HazardKind): number {
  return world.hazards.items.filter((hazard) => hazard.active && hazard.kind === kind).length;
}

function alive(world: World, id: string): Enemy[] {
  return world.enemies.items.filter((enemy) => enemy.active && enemy.def.id === id);
}

/** Freezes an enemy in place with a fixed facing. */
function pin(enemy: Enemy, faceX: number, faceY: number): void {
  enemy.speed = 0;
  enemy.baseSpeed = 0;
  enemy.confused = 9999;
  enemy.faceX = faceX;
  enemy.faceY = faceY;
}

/** Damage one weapon hit deals to an enemy, read from its health. */
function damageOf(world: World, enemy: Enemy, dirX?: number, dirY?: number): number {
  const before = enemy.health;
  hitEnemy(world, enemy, 0, { dirX, dirY });
  return before - enemy.health;
}

describe('enemy roster (GDD 9.8, 9.10, 9.16)', () => {
  it('holds 23 enemies across six factions', () => {
    expect(ENEMY_LIST).toHaveLength(23);
    expect(enemiesOfFaction('Kingdom Armies').map((enemy) => enemy.name).sort()).toEqual([
      'Forgeguard Knight',
      'Royal Bastion',
      'Royal Footman',
      'Royal Longbowman',
    ]);
    for (const faction of ['Clockwork Legions', 'Failed Experiments', 'Wilds', 'Outlaws', 'Unknown'] as const) {
      expect(enemiesOfFaction(faction).length).toBeGreaterThanOrEqual(3);
    }
    expect(ENEMY_LIST.filter((enemy) => enemy.signatureOf).map((enemy) => enemy.name).sort()).toEqual([
      'Forgeguard Knight',
      'Gear Lancer',
      'Static Mote',
      'Thornling',
      'Vat Chimera',
    ]);
  });

  it('follows the threat tiers in GDD 4.11', () => {
    const byTier = (tier: string): string[] =>
      ENEMY_LIST.filter((enemy) => enemy.threat === tier).map((enemy) => enemy.name).sort();
    expect(byTier('Minimal')).toEqual(['Clockwork Crawler', 'Static Mote', 'Thornling']);
    expect(byTier('Low')).toEqual(['Chemical Crawler', 'Highwayman', 'Hunting Hound', 'Royal Footman']);
    expect(byTier('High')).toEqual(['Anomaly', 'Iron Sentinel', 'Mercenary Captain', 'Spore Mother', 'The Unstable']);
    expect(byTier('Extreme')).toEqual(['Ancient Guardian']);
    expect(byTier('Medium')).toHaveLength(10);
  });

  it('copies stats, weaknesses and resistances from GDD 9.10 and 9.11', () => {
    const sentinel = ENEMIES['iron-sentinel'];
    expect([sentinel.health, sentinel.damage, sentinel.speed, sentinel.range, sentinel.armour]).toEqual([
      'High',
      'Medium',
      'Low',
      'Low',
      'Extreme',
    ]);
    expect(sentinel.weakTo).toEqual(['Electric', 'Corrosive']);
    expect(sentinel.immune).toEqual(['Toxic']);
    expect(ENEMIES['hunting-hound'].speed).toBe('Extreme');
    expect(ENEMIES['ancient-guardian'].resists).toEqual(['Fire', 'Cold', 'Electric']);
    expect(ENEMIES['royal-bastion'].roles).toEqual(['Tank', 'Support']);
    for (const enemy of ENEMY_LIST) expect(enemy.behaviour.length).toBeGreaterThan(10);
  });

  it('spawns every enemy and steps a crowd of each without a crash', () => {
    for (const def of ENEMY_LIST) {
      const world = makeWorld({ invincible: true });
      spawnGroup(world, def, 6);
      spawnGroup(world, def, 2, 'elite');
      stepSeconds(world, 8);
      expect(world.phase).toBe('running');
    }
  });
});

describe('ranks and scaling (GDD 9.10, 9.12, 9.13)', () => {
  it('raises Health and Damage one step per territory', () => {
    const health = [1, 8, 15].map((round) => enemyAt(quiet({ round }), 'Royal Footman', 500, 0).maxHealth);
    expect(health).toEqual([35, 90, 220]);
    const damage = [1, 8, 15].map((round) => enemyAt(quiet({ round }), 'Royal Footman', 500, 0).damage);
    expect(damage).toEqual([7, 12, 20]);
    // Above Extreme each step multiplies by 2.5.
    expect(enemyAt(quiet({ round: 8 }), 'Ancient Guardian', 500, 0).maxHealth).toBe(550);
  });

  it('gives elites one Health step, larger meters and modifiers by territory', () => {
    const first = enemyAt(quiet(), 'Royal Footman', 500, 0, { rank: 'elite' });
    expect(first.maxHealth).toBe(90);
    expect(first.meterScale).toBe(2);
    expect(first.modifiers).toHaveLength(1);
    const second = enemyAt(quiet({ round: 8 }), 'Royal Footman', 500, 0, { rank: 'elite' });
    expect(second.maxHealth).toBe(220);
    expect(second.modifiers).toHaveLength(2);
  });

  it('gives champions two Health steps, two modifiers and one trait', () => {
    const champion = enemyAt(quiet({ round: 15 }), 'Royal Footman', 500, 0, { rank: 'champion' });
    expect(champion.maxHealth).toBe(1375);
    expect(champion.meterScale).toBe(3);
    expect(champion.modifiers).toHaveLength(2);
    expect(champion.championTrait).toBeDefined();
  });
});

describe('signature behaviours (GDD 9.11)', () => {
  it('Royal Footman: holds a shield line behind a Bastion and keeps the order after the leader dies', () => {
    const world = quiet();
    const squad = createSquad(world, enemyDef('Royal Bastion'), 'Protect');
    const bastion = enemyAt(world, 'Royal Bastion', 800, 0, { squad });
    const footmen = [-40, 0, 40].map((dy) => enemyAt(world, 'Royal Footman', 780, dy, { squad }));
    expect(squad.leaderId).toBe(bastion.id);
    stepSeconds(world, 5);
    const toPlayer = { x: world.player.x - bastion.x, y: world.player.y - bastion.y };
    for (const footman of footmen) {
      // Behind the Bastion: on the far side from the player.
      expect((footman.x - bastion.x) * toPlayer.x + (footman.y - bastion.y) * toPlayer.y).toBeLessThan(0);
    }
    killEnemy(world, bastion);
    expect(squad.leaderAlive).toBe(false);
    expect(squad.order).toBe('Protect');
    // With no leader the line breaks and the footmen close in.
    expect(stepUntil(world, 12, () => footmen.some((footman) => distanceToPlayer(world, footman) < 80))).toBe(true);
  });

  it('Royal Longbowman: keeps distance and fires', () => {
    const world = quiet();
    const archer = enemyAt(world, 'Royal Longbowman', 70, 0);
    archer.attackCooldown = 3;
    stepSeconds(world, 2);
    expect(distanceToPlayer(world, archer)).toBeGreaterThan(150);
    expect(stepUntil(world, 4, () => world.enemyShots.activeCount > 0)).toBe(true);
    expect(stepUntil(world, 3, () => world.stats.hitsTaken > 0)).toBe(true);
  });

  it('Royal Longbowman: fires volleys on command from a living leader', () => {
    const world = quiet();
    const squad = createSquad(world, enemyDef('Royal Bastion'), 'Protect');
    enemyAt(world, 'Royal Bastion', 320, 0, { squad });
    const archers = [0.5, 0.8, 1.1].map((cooldown, index) => {
      const archer = enemyAt(world, 'Royal Longbowman', 300, (index - 1) * 60, { squad });
      archer.attackCooldown = cooldown;
      return archer;
    });
    const started: number[] = [];
    for (let step = 0; step < 60 * 6 && started.length < archers.length; step++) {
      world.step(IDLE);
      archers.forEach((archer, index) => {
        if (started[index] === undefined && archer.action === 'windup') started[index] = step;
      });
    }
    expect(started).toHaveLength(3);
    expect(Math.max(...started) - Math.min(...started)).toBeLessThanOrEqual(12);
  });

  it('Royal Bastion: the tower shield stops frontal projectiles for allies behind', () => {
    const behind = (faceX: number): number => {
      const world = makeWorld({ weapons: [arm('Ballista')], noCriticals: true });
      holdFire(world);
      const bastion = enemyAt(world, 'Royal Bastion', 150, 0);
      bastion.health = bastion.maxHealth = 100000;
      pin(bastion, faceX, 0);
      const ally = dummyAt(world, 230, 0);
      fireStraight(world, {
        x: world.player.x,
        y: world.player.y,
        dirX: 1,
        dirY: 0,
        weaponIndex: 0,
        speed: 700,
        range: 480,
        radius: 4,
        pierce: 3,
      });
      stepSeconds(world, 1);
      expect(bastion.health).toBeLessThan(100000);
      return 100000 - ally.health;
    };
    // Facing the player, the shield stops the bolt. Facing away, the bolt pierces through.
    expect(behind(-1)).toBe(0);
    expect(behind(1)).toBeGreaterThan(0);
  });

  it('Clockwork Crawler: latches on and slows the player', () => {
    const world = quiet();
    enemyAt(world, 'Clockwork Crawler', 40, 0);
    expect(stepUntil(world, 4, () => world.stats.hitsTaken > 0)).toBe(true);
    expect(world.player.slowFactor).toBeCloseTo(ENEMY_RULES.latchSlow);
    world.step({ moveX: 0, moveY: 1 });
    expect(Math.hypot(world.player.vx, world.player.vy)).toBeCloseTo(world.player.stats.moveSpeed * ENEMY_RULES.latchSlow);
    stepSeconds(world, ENEMY_RULES.latchSeconds + 0.1, { moveX: 0, moveY: 1 });
  });

  it('Iron Sentinel: guards Mechanists and is weak to Magnetic effects', () => {
    const world = quiet();
    const squad = createSquad(world, enemyDef('Iron Sentinel'), 'Protect');
    const sentinel = enemyAt(world, 'Iron Sentinel', 500, 0, { squad });
    const mechanist = enemyAt(world, 'Mechanist', 560, 30, { squad });
    let protecting = false;
    stepUntil(world, 4, () => {
      protecting = protecting || (sentinel.ai === 'protect' && sentinel.wardId === mechanist.id);
      return protecting;
    });
    expect(protecting).toBe(true);

    const armed = makeWorld({ weapons: [arm('Electromagnetic Repeater')], noCriticals: true });
    holdFire(armed);
    const magneticWeak: EnemyDef = { ...PLAIN_ENEMY, id: 'test-magnetic', traits: ['magnetic-weak'] };
    const plain = damageOf(armed, dummyAt(armed, 200, 0));
    expect(damageOf(armed, dummyAt(armed, 200, 60, magneticWeak))).toBeCloseTo(plain * DAMAGE_STEP.weak);
  });

  it('Mechanist: repairs mechanical allies', () => {
    const world = quiet();
    const mechanist = enemyAt(world, 'Mechanist', 500, 0);
    mechanist.abilityCooldown2 = 999;
    const sentinel = enemyAt(world, 'Iron Sentinel', 560, 0);
    sentinel.health = sentinel.maxHealth * 0.5;
    expect(stepUntil(world, 5, () => sentinel.health > sentinel.maxHealth * 0.5)).toBe(true);
    expect(sentinel.health).toBeCloseTo(sentinel.maxHealth * (0.5 + ENEMY_RULES.repairShare));
  });

  it('Mechanist: deploys Clockwork Crawlers up to a cap', () => {
    const world = quiet();
    const mechanist = enemyAt(world, 'Mechanist', 400, 0);
    stepSeconds(world, 2);
    expect(alive(world, 'clockwork-crawler')).toHaveLength(ENEMY_RULES.deployCount);
    stepSeconds(world, 40);
    expect(mechanist.summoned).toBe(ENEMY_RULES.deployCap);
  });

  it('Chemical Crawler: leaves an acid trail and bursts into a toxic pool on death', () => {
    const world = makeWorld({ armed: false });
    const crawler = enemyAt(world, 'Chemical Crawler', 500, 0);
    stepSeconds(world, 1.5);
    expect(hazards(world, 'acid')).toBeGreaterThan(0);
    killEnemy(world, crawler);
    const near = enemyAt(world, 'Chemical Crawler', 30, 0);
    killEnemy(world, near);
    expect(hazards(world, 'toxic')).toBe(2);
    stepSeconds(world, 1);
    expect(world.stats.damageTaken).toBeGreaterThan(0);
  });

  it('Regenerator: regenerates after a short time without damage, and Corroded stops regeneration', () => {
    const world = makeWorld({ invincible: true });
    holdFire(world);
    const regenerator = enemyAt(world, 'Regenerator', 600, 0);
    regenerator.speed = 0;
    regenerator.health = 40;
    stepSeconds(world, ENEMY_RULES.regenDelay - 0.2);
    expect(regenerator.health).toBe(40);
    stepSeconds(world, 1);
    expect(regenerator.health).toBeGreaterThan(40);

    const held = regenerator.health;
    triggerStatus(world, regenerator, 0, 'Corroded');
    stepSeconds(world, 2);
    expect(regenerator.health).toBe(held);
  });

  it('Volatile Specimen: rushes the player and detonates, and the blast hurts other enemies too', () => {
    const world = makeWorld({ armed: false });
    const specimen = enemyAt(world, 'Volatile Specimen', 160, 0);
    expect(stepUntil(world, 5, () => !specimen.active)).toBe(true);
    stepSeconds(world, 0.1);
    expect(world.stats.damageTaken).toBeGreaterThan(0);

    // Shot down early, the specimen still bursts and hurts its neighbours.
    const other = quiet();
    const second = enemyAt(other, 'Volatile Specimen', 500, 0);
    const neighbour = dummyAt(other, 540, 0);
    killEnemy(other, second);
    stepSeconds(other, 0.1);
    expect(100000 - neighbour.health).toBeCloseTo(tierValue('enemyDamage', 'High') * ENEMY_RULES.allyBlastFactor);
  });

  it('Hunting Hound: strikes, then retreats', () => {
    const world = quiet();
    const hound = enemyAt(world, 'Hunting Hound', 80, 0);
    expect(stepUntil(world, 4, () => world.stats.hitsTaken > 0)).toBe(true);
    expect(stepUntil(world, 2, () => hound.retreatTimer > 0)).toBe(true);
    const before = distanceToPlayer(world, hound);
    stepSeconds(world, 1);
    expect(distanceToPlayer(world, hound)).toBeGreaterThan(before + 100);
  });

  it('Ironback Beetle: charges in a straight line', () => {
    const world = quiet();
    const beetle = enemyAt(world, 'Ironback Beetle', 260, 0);
    expect(stepUntil(world, 4, () => beetle.action === 'charge')).toBe(true);
    const start = beetle.x;
    stepSeconds(world, 0.25);
    expect(Math.abs(beetle.x - start)).toBeGreaterThan(60);
    expect(stepUntil(world, 2, () => world.stats.hitsTaken > 0)).toBe(true);
  });

  it('Ironback Beetle: the shell guards the front and the rear takes extra damage', () => {
    const world = makeWorld({ noCriticals: true });
    holdFire(world);
    const beetle = enemyAt(world, 'Ironback Beetle', 200, 0);
    beetle.health = beetle.maxHealth = 100000;
    pin(beetle, -1, 0);
    const side = damageOf(world, beetle, 0, 1);
    expect(damageOf(world, beetle, 1, 0)).toBeCloseTo(side * DAMAGE_STEP.resist);
    expect(damageOf(world, beetle, -1, 0)).toBeCloseTo(side * DAMAGE_STEP.weak);
  });

  it('Spore Mother: spawns spore pods, which burst into slowing clouds', () => {
    const world = quiet();
    enemyAt(world, 'Spore Mother', 240, 0);
    expect(stepUntil(world, 3, () => hazards(world, 'pod') > 0)).toBe(true);
    expect(stepUntil(world, 4, () => hazards(world, 'spores') > 0)).toBe(true);
    const cloud = world.hazards.items.find((hazard) => hazard.active && hazard.kind === 'spores');
    world.player.x = cloud?.x ?? 0;
    world.player.y = cloud?.y ?? 0;
    world.step(IDLE);
    expect(world.player.slowFactor).toBe(ENEMY_RULES.sporeSlow);
  });

  it('Highwayman: dashes in, steals gold on hit and drops the gold on death', () => {
    const world = quiet({ gold: 20 });
    const highwayman = enemyAt(world, 'Highwayman', 140, 0);
    let dashed = false;
    expect(
      stepUntil(world, 5, () => {
        dashed = dashed || highwayman.action === 'charge';
        return world.stats.hitsTaken > 0;
      }),
    ).toBe(true);
    expect(dashed).toBe(true);
    expect(world.gold).toBe(20 - ENEMY_RULES.stealGold);
    expect(highwayman.carriedGold).toBe(ENEMY_RULES.stealGold);
    killEnemy(world, highwayman);
    expect(world.gold).toBe(20);
  });

  it('Rogue Inventor: throws mines and carries a random experimental weapon', () => {
    const world = makeWorld({ armed: false });
    const inventor = enemyAt(world, 'Rogue Inventor', 300, 0);
    inventor.attackCooldown = 999;
    const experimental = [WEAPONS['electromagnetic-repeater'], WEAPONS['living-arsenal'], WEAPONS['tesla-rod'], WEAPONS['burning-mirror']];
    expect(experimental.map((weapon) => weapon.damageTypes[0])).toContain(inventor.attackType);
    expect(stepUntil(world, 3, () => hazards(world, 'mine') > 0)).toBe(true);
    const mine = world.hazards.items.find((hazard) => hazard.active && hazard.kind === 'mine');
    // The mine lands on the player. Once armed, the blast follows.
    expect(Math.hypot((mine?.x ?? 0) - world.player.x, (mine?.y ?? 0) - world.player.y)).toBeLessThan(5);
    expect(stepUntil(world, 3, () => world.stats.damageTaken > 0)).toBe(true);
  });

  it('Mercenary Captain: commands Outlaws, raises nearby ally damage and orders flanks', () => {
    const world = quiet();
    const squad = createSquad(world, enemyDef('Highwayman'), 'Pin');
    const ally = enemyAt(world, 'Highwayman', 600, 0, { squad });
    expect(strikeDamage(world, ally)).toBe(ally.damage);
    const captain = enemyAt(world, 'Mercenary Captain', 640, 0, { squad });
    expect(squad.leaderId).toBe(captain.id);
    expect(squad.order).toBe('Surround');
    expect(strikeDamage(world, ally)).toBeCloseTo(ally.damage * (1 + tierValue('modifierSize', 'Low')));
  });

  it('Anomaly: teleports short distances and shifts its resistance on a cycle', () => {
    const world = quiet();
    const anomaly = enemyAt(world, 'Anomaly', 500, 0);
    const first = anomaly.resistType;
    expect(first).toBeDefined();
    let teleported = false;
    const seen = new Set([first]);
    for (let step = 0; step < 60 * 9; step++) {
      world.step(IDLE);
      teleported = teleported || world.events.some((event) => event.type === 'teleport');
      world.events.length = 0;
      seen.add(anomaly.resistType);
    }
    expect(teleported).toBe(true);
    expect(seen.size).toBeGreaterThanOrEqual(3);
    expect(seen.has('Electric')).toBe(false);
  });

  it('Ancient Guardian: dormant until disturbed', () => {
    const world = makeWorld({ invincible: true });
    holdFire(world);
    const guardian = enemyAt(world, 'Ancient Guardian', 700, 0);
    stepSeconds(world, 3);
    expect(guardian.action).toBe('dormant');
    expect(distanceToPlayer(world, guardian)).toBe(700);
    hitEnemy(world, guardian, 0);
    expect(guardian.action).toBe('chase');

    const near = quiet();
    const second = enemyAt(near, 'Ancient Guardian', ENEMY_RULES.wakeRadius - 10, 0);
    near.step(IDLE);
    expect(second.action).not.toBe('dormant');
  });

  it('Ancient Guardian: sends shockwaves across the arena, and pillars give cover', () => {
    const hits = (arena: ArenaDef): number => {
      const world = quiet({ arena });
      addHazard(world, 'shockwave', world.player.x + 400, world.player.y, 22, 2.2, { damage: 12, damageType: 'Impact' });
      stepSeconds(world, 2);
      return world.stats.hitsTaken;
    };
    expect(hits(OPEN_ARENA)).toBe(1);
    const covered: ArenaDef = {
      ...OPEN_ARENA,
      obstacles: [{ kind: 'pillar', x: OPEN_ARENA.playerStart.x + 150, y: OPEN_ARENA.playerStart.y, radius: 40 }],
    };
    expect(hits(covered)).toBe(0);

    const world = quiet();
    const guardian = enemyAt(world, 'Ancient Guardian', 200, 0);
    expect(stepUntil(world, 4, () => hazards(world, 'shockwave') > 0)).toBe(true);
    expect(guardian.action).toBe('recover');
  });

  it('The Unstable: suppresses Auxiliary components on nearby player weapons', () => {
    const run = createRun(3, CHARACTERS.inventor, WEAPONS.crossbow);
    run.weapons = [arm('Crossbow', 'Bayonet Mount')];
    const world = createWorldForRound(run);
    world.invincible = true;
    const weapon = world.weapons[0]!;
    expect(weapon.resolved.triggers.bayonet).toBeTruthy();
    const unstable = enemyAt(world, 'The Unstable', ENEMY_RULES.suppressRadius - 40, 0);
    unstable.health = unstable.maxHealth = 100000;
    unstable.speed = 0;
    world.step(IDLE);
    expect(world.auxiliarySuppressed).toBe(true);
    expect(weapon.resolved).toBe(weapon.suppressed);
    expect(weapon.resolved.triggers.bayonet).toBeFalsy();
    killEnemy(world, unstable);
    world.step(IDLE);
    expect(world.auxiliarySuppressed).toBe(false);
    expect(weapon.resolved).toBe(weapon.full);
  });

  it('The Unstable: resists through shorter status durations', () => {
    const world = makeWorld();
    holdFire(world);
    const unstable = enemyAt(world, 'The Unstable', 600, 0);
    const plain = dummyAt(world, 600, 100);
    triggerStatus(world, unstable, 0, 'Corroded');
    triggerStatus(world, plain, 0, 'Corroded');
    expect(unstable.statusActive[2]).toBeCloseTo((plain.statusActive[2] ?? 0) * ENEMY_RULES.shortStatusFactor);
  });

  it('Forgeguard Knight: hammer slams leave burning ground for a short time', () => {
    const world = makeWorld({ armed: false });
    enemyAt(world, 'Forgeguard Knight', 60, 0);
    expect(stepUntil(world, 4, () => hazards(world, 'burning') > 0)).toBe(true);
    stepSeconds(world, 1);
    expect(world.stats.damageTaken).toBeGreaterThan(0);
    stepSeconds(world, ENEMY_RULES.burningGroundSeconds + ENEMY_RULES.slamWindup);
  });

  it('Vat Chimera: gains a random elite modifier at half health', () => {
    const world = quiet();
    const chimera = enemyAt(world, 'Vat Chimera', 600, 0);
    world.step(IDLE);
    expect(chimera.modifiers).toHaveLength(0);
    chimera.health = chimera.maxHealth * 0.45;
    world.step(IDLE);
    expect(chimera.modifiers).toHaveLength(1);
    expect(world.events.some((event) => event.type === 'mutated')).toBe(true);
    stepSeconds(world, 1);
    expect(chimera.modifiers).toHaveLength(1);
  });

  it('Gear Lancer: winds up, charges in a straight line and stalls after hitting a wall', () => {
    const world = quiet();
    world.player.x = world.arena.width - 60;
    const lancer = enemyAt(world, 'Gear Lancer', -300, 0);
    expect(stepUntil(world, 3, () => lancer.action === 'windup')).toBe(true);
    expect(stepUntil(world, 3, () => lancer.action === 'charge')).toBe(true);
    const y = lancer.y;
    expect(stepUntil(world, 3, () => lancer.action === 'stall')).toBe(true);
    expect(lancer.y).toBeCloseTo(y, 0);
    expect(lancer.x).toBeCloseTo(world.arena.width - lancer.radius, 0);
    stepSeconds(world, ENEMY_RULES.stallSeconds - 0.2);
    expect(lancer.action).toBe('stall');
  });

  it('Static Mote: bursts on death, arcing Electric damage to everything nearby, enemies included', () => {
    const world = makeWorld({ armed: false });
    const motes = [40, 80, 120].map((dx) => enemyAt(world, 'Static Mote', dx, 0));
    for (const mote of motes) mote.speed = 0;
    killEnemy(world, motes[0]!);
    stepSeconds(world, 0.5);
    // The burst chains through the cluster and reaches the player.
    expect(alive(world, 'static-mote')).toHaveLength(0);
    expect(world.stats.kills).toBe(3);
    expect(world.stats.damageTaken).toBeGreaterThan(0);
  });

  it('Thornling: leaves a seed on death, which sprouts again unless burned', () => {
    const world = quiet({ spawns: [] });
    const thornling = enemyAt(world, 'Thornling', 600, 0);
    killEnemy(world, thornling);
    expect(world.seedCount).toBe(1);
    world.step(IDLE);
    // The round stays open while a seed waits.
    expect(world.phase).toBe('running');
    stepSeconds(world, ENEMY_RULES.seedSeconds + 0.1);
    const sprouts = alive(world, 'thornling');
    expect(sprouts).toHaveLength(1);
    // A sprouted Thornling leaves no seed, so the round ends.
    killEnemy(world, sprouts[0]!);
    expect(world.seedCount).toBe(0);
    world.step(IDLE);
    expect(world.phase).toBe('cleared');

    const burned = quiet();
    const second = enemyAt(burned, 'Thornling', 600, 0);
    burned.lastHitType = 'Fire';
    killEnemy(burned, second);
    expect(burned.seedCount).toBe(0);
  });

  it('Thornling: fire destroys a seed on the ground', () => {
    const world = makeWorld({ weapons: [arm('Mortar', 'Incendiary Oil')], invincible: true });
    holdFire(world);
    const thornling = enemyAt(world, 'Thornling', 300, 0);
    const { x, y } = thornling;
    killEnemy(world, thornling);
    expect(world.seedCount).toBe(1);
    // An explosion carrying Fire burns the seed.
    world.queueExplosion({ x, y, radius: 40, weaponIndex: 0, damageScale: 1, generation: 1, explosive: true });
    stepSeconds(world, 0.1);
    expect(world.seedCount).toBe(0);
  });
});

describe('elite modifiers (GDD 9.12)', () => {
  const elite = (world: World, name: string, dx: number, modifier: Parameters<typeof enemyAt>[4]): Enemy =>
    enemyAt(world, name, dx, 0, { rank: 'elite', ...modifier });

  it('Armoured: Armour up two steps', () => {
    const footman = elite(quiet(), 'Royal Footman', 500, { modifiers: ['armoured'] });
    expect(footman.armour).toBe(tierValue('armour', 'Extreme'));
  });

  it('Swift: Speed and attack speed up one step', () => {
    const footman = elite(quiet(), 'Royal Footman', 500, { modifiers: ['swift'] });
    expect(footman.speed).toBe(tierValue('enemySpeed', 'High'));
    expect(footman.attackRate).toBeCloseTo(ENEMY_RULES.attackSpeedStep);
    // Past Extreme a step adds a fixed share.
    const hound = elite(quiet(), 'Hunting Hound', 500, { modifiers: ['swift'] });
    expect(hound.speed).toBeCloseTo(tierValue('enemySpeed', 'Extreme') * (1 + ENEMY_RULES.speedStepAboveExtreme));
  });

  it('Volatile: explodes on death', () => {
    const world = makeWorld({ armed: false });
    const footman = elite(world, 'Royal Footman', 50, { modifiers: ['volatile'] });
    killEnemy(world, footman);
    stepSeconds(world, 0.1);
    expect(world.stats.damageTaken).toBeGreaterThan(0);
  });

  it('Regenerating: heals over time, and Corroded stops the healing', () => {
    const world = makeWorld({ invincible: true });
    holdFire(world);
    const footman = elite(world, 'Royal Footman', 600, { modifiers: ['regenerating'] });
    footman.speed = 0;
    footman.health = 10;
    stepSeconds(world, 1);
    expect(footman.health).toBeCloseTo(10 + footman.maxHealth * ENEMY_RULES.eliteRegenPerSecond, 1);
    const held = footman.health;
    triggerStatus(world, footman, 0, 'Corroded');
    stepSeconds(world, 1);
    expect(footman.health).toBe(held);
  });

  it('Shielded: the frontal shield blocks projectiles, Electric shots pass and attacks open the guard', () => {
    const shot = (weaponName: string): number => {
      const world = makeWorld({ weapons: [arm(weaponName)], noCriticals: true });
      holdFire(world);
      const footman = elite(world, 'Royal Footman', 150, { modifiers: ['shielded'] });
      footman.health = footman.maxHealth = 100000;
      pin(footman, -1, 0);
      fireStraight(world, { x: world.player.x, y: world.player.y, dirX: 1, dirY: 0, weaponIndex: 0, speed: 700, range: 400, radius: 4 });
      stepSeconds(world, 0.5);
      return 100000 - footman.health;
    };
    expect(shot('Crossbow')).toBe(0);
    expect(shot('Electromagnetic Repeater')).toBeGreaterThan(0);

    const world = quiet();
    const footman = elite(world, 'Royal Footman', 150, { modifiers: ['shielded'] });
    footman.faceX = -1;
    footman.faceY = 0;
    expect(shieldBlocks(footman, 1, 0)).toBe(true);
    // A shot from behind, or during the elite's own attack, lands.
    expect(shieldBlocks(footman, -1, 0)).toBe(false);
    footman.action = 'windup';
    expect(shieldBlocks(footman, 1, 0)).toBe(false);
  });

  it('Commanding: nearby allies gain Damage up, Low', () => {
    const world = quiet();
    const ally = enemyAt(world, 'Royal Footman', 600, 0);
    elite(world, 'Royal Footman', 640, { modifiers: ['commanding'] });
    expect(strikeDamage(world, ally)).toBeCloseTo(ally.damage * 1.1);
  });

  it('Splitting: splits into two smaller copies on death', () => {
    const world = quiet();
    const footman = elite(world, 'Royal Footman', 600, { modifiers: ['splitting'] });
    const health = footman.maxHealth;
    killEnemy(world, footman);
    const copies = alive(world, 'royal-footman');
    expect(copies).toHaveLength(2);
    for (const copy of copies) {
      expect(copy.rank).toBe('normal');
      expect(copy.maxHealth).toBeCloseTo(health * ENEMY_RULES.splitHealthShare);
      expect(copy.radius).toBeLessThan(footman.def.radius);
    }
    for (const copy of copies) killEnemy(world, copy);
    expect(alive(world, 'royal-footman')).toHaveLength(0);
  });

  it('Resistant: resists one damage type', () => {
    const world = makeWorld({ noCriticals: true });
    holdFire(world);
    const plain = damageOf(world, dummyAt(world, 300, 0));
    const resistant = dummyAt(world, 300, 60);
    resistant.resistType = 'Piercing';
    expect(damageOf(world, resistant)).toBeCloseTo(plain * DAMAGE_STEP.resist);
    const rolled = elite(world, 'Royal Longbowman', 700, { modifiers: ['resistant'] });
    expect(rolled.resistType).toBeDefined();
  });

  it('Hardened: immune to one status effect', () => {
    const world = makeWorld({ weapons: [arm('War Hammer')], noCriticals: true });
    holdFire(world);
    const footman = elite(world, 'Royal Footman', 60, { modifiers: ['hardened'] });
    footman.health = footman.maxHealth = 100000;
    footman.speed = 0;
    footman.hardened = 'Stunned';
    for (let i = 0; i < 30; i++) hitEnemy(world, footman, 0);
    expect(hasStatus(footman, 'Stunned')).toBe(false);
    const plain = dummyAt(world, 60, 60);
    for (let i = 0; i < 30; i++) hitEnemy(world, plain, 0);
    expect(hasStatus(plain, 'Stunned')).toBe(true);
  });

  it('Magnetised: pulls Metallic projectiles off course', () => {
    const pulled = (weaponName: string): number => {
      const world = makeWorld({ weapons: [arm(weaponName)], noCriticals: true });
      holdFire(world);
      const magnet = elite(world, 'Royal Footman', 200, { modifiers: ['magnetised'] });
      magnet.y += 70;
      magnet.health = magnet.maxHealth = 100000;
      magnet.speed = 0;
      world.step(IDLE);
      fireStraight(world, { x: world.player.x, y: world.player.y, dirX: 1, dirY: 0, weaponIndex: 0, speed: 500, range: 480, radius: 4 });
      stepSeconds(world, 1);
      return 100000 - magnet.health;
    };
    // The Electromagnetic Repeater fires Metallic projectiles. Crossbow bolts fly straight past.
    expect(pulled('Electromagnetic Repeater')).toBeGreaterThan(0);
    expect(pulled('Crossbow')).toBe(0);
  });

  it('Infectious: leaves a toxic pool on death', () => {
    const world = quiet();
    killEnemy(world, elite(world, 'Royal Footman', 600, { modifiers: ['infectious'] }));
    expect(hazards(world, 'toxic')).toBe(1);
  });

  it('Vampiric: heals on each hit against the player', () => {
    const world = quiet();
    const footman = elite(world, 'Royal Footman', 40, { modifiers: ['vampiric'] });
    footman.health = 10;
    expect(stepUntil(world, 4, () => world.stats.hitsTaken > 0)).toBe(true);
    expect(footman.health).toBeCloseTo(10 + footman.maxHealth * ENEMY_RULES.vampiricHealShare);
  });
});

describe('champion traits (GDD 9.13)', () => {
  const champion = (world: World, trait: NonNullable<Enemy['championTrait']>, dx = 600): Enemy => {
    const enemy = enemyAt(world, 'Royal Footman', dx, 0, { rank: 'champion', trait, modifiers: [] });
    enemy.speed = 0;
    enemy.baseSpeed = 0;
    return enemy;
  };

  it('Warlord: summons an escort group at set health thresholds', () => {
    const world = quiet({ round: 15 });
    const warlord = champion(world, 'warlord');
    world.step(IDLE);
    expect(world.enemies.activeCount).toBe(1);
    warlord.health = warlord.maxHealth * 0.6;
    world.step(IDLE);
    expect(world.enemies.activeCount).toBe(1 + ENEMY_RULES.warlordEscorts);
    warlord.health = warlord.maxHealth * 0.3;
    world.step(IDLE);
    expect(world.enemies.activeCount).toBe(1 + ENEMY_RULES.warlordEscorts * 2);
    stepSeconds(world, 1);
    expect(world.enemies.activeCount).toBe(1 + ENEMY_RULES.warlordEscorts * 2);
  });

  it('Juggernaut: immune to Stun, knockback and slows', () => {
    const world = makeWorld({ weapons: [arm('War Hammer'), arm('Crossbow', 'Hardwood Stock')], noCriticals: true, round: 15 });
    holdFire(world);
    const juggernaut = champion(world, 'juggernaut', 60);
    juggernaut.health = juggernaut.maxHealth = 1e9;
    const plain = dummyAt(world, 60, 80);
    const x = juggernaut.x;
    const plainX = plain.x;
    for (let i = 0; i < 40; i++) {
      for (const target of [juggernaut, plain]) {
        hitEnemy(world, target, 0, { dirX: 1, dirY: 0 });
        hitEnemy(world, target, 1, { dirX: 1, dirY: 0 });
      }
    }
    expect(hasStatus(plain, 'Stunned')).toBe(true);
    expect(plain.x).toBeGreaterThan(plainX);
    expect(hasStatus(juggernaut, 'Stunned')).toBe(false);
    expect(juggernaut.x).toBe(x);
    // A slow never lowers a Juggernaut's speed.
    juggernaut.speed = juggernaut.baseSpeed = 100;
    juggernaut.slowTimer = 5;
    juggernaut.slowFactor = 0.5;
    const before = distanceToPlayer(world, juggernaut);
    world.player.x -= 600;
    stepSeconds(world, 1);
    expect(before + 600 - distanceToPlayer(world, juggernaut)).toBeGreaterThan(90);
  });

  it('Purifier: clears all status effects and empties all status meters every few seconds', () => {
    const world = makeWorld({ round: 15, invincible: true });
    holdFire(world);
    const purifier = champion(world, 'purifier');
    triggerStatus(world, purifier, 0, 'Corroded');
    purifier.statusMeter[0] = 1;
    stepSeconds(world, ENEMY_RULES.purifySeconds / 2);
    expect(hasStatus(purifier, 'Corroded')).toBe(true);
    triggerStatus(world, purifier, 0, 'Corroded');
    stepSeconds(world, ENEMY_RULES.purifySeconds / 2 + 0.1);
    expect(hasStatus(purifier, 'Corroded')).toBe(false);
    expect(purifier.statusMeter[0]).toBe(0);
    expect(purifier.meterScale).toBe(3);
  });

  it('Phase-Shifter: teleports after taking a large burst of damage', () => {
    const world = makeWorld({ weapons: [arm('War Hammer')], noCriticals: true, invincible: true });
    holdFire(world);
    const shifter = champion(world, 'phase-shifter', 60);
    const x = shifter.x;
    hitEnemy(world, shifter, 0);
    expect(shifter.x).toBe(x);
    for (let i = 0; i < 12 && shifter.x === x; i++) hitEnemy(world, shifter, 0);
    expect(distanceToPlayer(world, shifter)).toBeCloseTo(ENEMY_RULES.phaseDistance, -1);
  });

  it('Reactive Plating: gains resistance to the damage type taken most, for a short time', () => {
    const world = makeWorld({ noCriticals: true, invincible: true });
    holdFire(world);
    const plated = champion(world, 'reactive-plating');
    plated.health = plated.maxHealth = 1e9;
    const before = damageOf(world, plated);
    stepSeconds(world, ENEMY_RULES.platingSeconds + 0.1);
    expect(plated.plateType).toBe('Piercing');
    expect(damageOf(world, plated)).toBeCloseTo(before * DAMAGE_STEP.resist);
    // With no more Piercing hits the plating fades at the next check.
    stepSeconds(world, ENEMY_RULES.platingSeconds * 2 + 0.1);
    expect(plated.plateType).toBeUndefined();
  });

  it('Siege Breaker: targets and destroys player constructs and traps first', () => {
    const world = makeWorld({ weapons: [arm('Clockwork Turret')], invincible: true, round: 15 });
    stepSeconds(world, 1);
    expect(world.constructs.activeCount).toBe(1);
    for (const weapon of world.weapons) weapon.deployTimer = 1e9;
    const turret = world.constructs.items.find((construct) => construct.active)!;
    const breaker = enemyAt(world, 'Royal Footman', 300, 0, { rank: 'champion', trait: 'siege-breaker', modifiers: [] });
    breaker.health = breaker.maxHealth = 1e9;
    expect(stepUntil(world, 8, () => !turret.active)).toBe(true);
    // The player stood closer the whole time and took no hit before the turret fell.
    expect(world.stats.hitsTaken).toBe(0);
  });

  it('Overclocked: Speed and attack speed up two steps below half health', () => {
    const world = quiet({ round: 15 });
    const enemy = enemyAt(world, 'Royal Footman', 700, 0, { rank: 'champion', trait: 'overclocked', modifiers: [] });
    world.step(IDLE);
    expect(enemy.speed).toBe(tierValue('enemySpeed', 'Medium'));
    enemy.health = enemy.maxHealth * 0.4;
    world.step(IDLE);
    expect(enemy.speed).toBe(tierValue('enemySpeed', 'Extreme'));
    expect(enemy.attackRate).toBeCloseTo(ENEMY_RULES.attackSpeedStep ** 2);
  });
});

describe('constructs under attack (NOTES.md, GDD 9.13)', () => {
  it('area hits damage constructs, and a construct at zero Health breaks', () => {
    const world = makeWorld({ weapons: [arm('Clockwork Turret')], invincible: true });
    stepSeconds(world, 1);
    const turret = world.constructs.items.find((construct) => construct.active)!;
    const health = turret.health;
    enemyBlast(world, { x: turret.x, y: turret.y, radius: 40, damage: 10, damageType: 'Fire', hurtsEnemies: false });
    expect(turret.health).toBe(health - 10);
    enemyBlast(world, { x: turret.x, y: turret.y, radius: 40, damage: 1000, damageType: 'Fire', hurtsEnemies: false });
    expect(turret.active).toBe(false);
  });

  it('enemies walk past constructs to reach the player', () => {
    const world = makeWorld({ weapons: [arm('Clockwork Turret')], invincible: true });
    stepSeconds(world, 1);
    holdFire(world);
    const turret = world.constructs.items.find((construct) => construct.active)!;
    const health = turret.health;
    for (let i = 0; i < 4; i++) enemyAt(world, 'Royal Footman', 200, i * 30);
    expect(stepUntil(world, 6, () => world.stats.hitsTaken > 2)).toBe(true);
    expect(turret.health).toBe(health);
  });
});

describe('threat costs (GDD 4.11)', () => {
  it('uses 1, 2, 4, 8 and 16 budget units by threat tier', () => {
    expect(THREAT_COST).toEqual({ Minimal: 1, Low: 2, Medium: 4, High: 8, Extreme: 16 });
  });
});
