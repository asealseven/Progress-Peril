import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { COMPONENT_LIST, componentByName } from '../src/data/components';
import {
  DISCIPLINES,
  OPENED_BY,
  RESEARCH_NODES,
  RESEARCH_RULES,
  STARTING_KNOWLEDGE,
  researchNodeByName,
} from '../src/data/research';
import type { ResearchNodeDef } from '../src/data/research';
import { STARTING_WEAPONS, WEAPONS, WEAPON_LIST } from '../src/data/weapons';
import { createArchive, masteryRank, nextRank } from '../src/sim/archive';
import { buildProblem, lockedBy, upgradeProblem } from '../src/sim/economy';
import { createComponent, resolveLoadout } from '../src/sim/loadout';
import {
  applyFindings,
  captureChoices,
  captureNode,
  dependents,
  emptyFindings,
  gradeOpen,
  itemLockedBy,
  nodeCost,
  nodeState,
  queueCapture,
  refundNode,
  refundPreview,
  researchNodeNow,
  researchProblem,
  resolveResearch,
} from '../src/sim/research';
import { createRun, resolvePlayerStats } from '../src/sim/run';
import type { RunState } from '../src/sim/run';

function node(name: string): ResearchNodeDef {
  const found = researchNodeByName(name);
  if (!found) throw new Error(name);
  return found;
}

function rich(points = 10000): RunState {
  const run = createRun(5, CHARACTERS.inventor, WEAPONS.crossbow);
  run.research.points = points;
  run.materials = { Scrap: 500, Reagents: 500, Crystals: 500, Specimens: 500 };
  run.gold = 10000;
  return run;
}

/** Researches a node and every requirement before it. */
function researchWithRequirements(run: RunState, target: ResearchNodeDef): void {
  for (const name of target.requires) {
    const required = node(name);
    if (!run.research.researched.includes(required.id)) researchWithRequirements(run, required);
  }
  expect(researchNodeNow(run, target)).toBeUndefined();
}

describe('research web data (GDD 8.12)', () => {
  it('holds 120 nodes: 18 per discipline, 20 cross and 10 hidden', () => {
    expect(RESEARCH_NODES).toHaveLength(120);
    for (const discipline of DISCIPLINES) {
      const own = RESEARCH_NODES.filter((entry) => entry.disciplines.length === 1 && entry.disciplines[0] === discipline);
      expect(own).toHaveLength(18);
      expect(own.filter((entry) => entry.ring === 'Centre')).toHaveLength(3);
      expect(own.filter((entry) => entry.ring === 'Inner')).toHaveLength(5);
      expect(own.filter((entry) => entry.ring === 'Middle')).toHaveLength(6);
      expect(own.filter((entry) => entry.ring === 'Outer')).toHaveLength(4);
    }
    expect(RESEARCH_NODES.filter((entry) => entry.ring === 'Cross')).toHaveLength(20);
    expect(RESEARCH_NODES.filter((entry) => entry.ring === 'Hidden')).toHaveLength(10);
    expect(new Set(RESEARCH_NODES.map((entry) => entry.id)).size).toBe(120);
  });

  it('links every requirement to a node and gives every hidden node a condition and a hint', () => {
    for (const entry of RESEARCH_NODES) {
      for (const name of entry.requires) expect(researchNodeByName(name), `${entry.name} needs ${name}`).toBeDefined();
      if (entry.ring === 'Hidden') {
        expect(entry.condition).toBeTruthy();
        expect(entry.hint).toBeTruthy();
      }
    }
    for (const name of STARTING_KNOWLEDGE) expect(researchNodeByName(name)).toBeDefined();
  });

  it('opens every weapon but the six starting ones, and every component above Common', () => {
    for (const weapon of WEAPON_LIST) {
      const starting = STARTING_WEAPONS.includes(weapon);
      expect(OPENED_BY.has(weapon.name), weapon.name).toBe(!starting);
    }
    for (const component of COMPONENT_LIST) {
      expect(OPENED_BY.has(component.name), component.name).toBe(component.quality !== 'Common');
    }
  });
});

describe('costs and requirements (GDD 8.10, 8.11)', () => {
  it('charges by ring, with materials per linked discipline', () => {
    const run = rich();
    expect(nodeCost(run, node('Applied Combustion'))).toEqual({ points: 15, materials: {} });
    expect(nodeCost(run, node('Blackpowder'))).toEqual({ points: 35, materials: { Reagents: 1 } });
    expect(nodeCost(run, node('Shaped Charges'))).toEqual({ points: 70, materials: { Reagents: 3 } });
    expect(nodeCost(run, node('Thermite'))).toEqual({ points: 140, materials: { Reagents: 6 } });
    expect(nodeCost(run, node('Chemical Ballistics'))).toEqual({ points: 110, materials: { Reagents: 3, Scrap: 3 } });
    // Physics and Mathematics both pay in Crystals.
    expect(nodeCost(run, node('Kinetic Probability'))).toEqual({ points: 110, materials: { Crystals: 6 } });
  });

  it('needs every requirement first (AND logic)', () => {
    const run = rich();
    const target = node('Volatile Catalysts');
    expect(target.requires).toEqual(['Volatile Compounds', 'Catalysis']);
    expect(researchProblem(run, target)).toBe('requirements');
    expect(nodeState(run, target)).toBe('blocked');
    researchWithRequirements(run, node('Volatile Compounds'));
    expect(researchProblem(run, target)).toBe('requirements');
    researchWithRequirements(run, node('Catalysis'));
    expect(nodeState(run, target)).toBe('available');
    expect(researchNodeNow(run, target)).toBeUndefined();
    expect(nodeState(run, target)).toBe('researched');
    expect(researchNodeNow(run, target)).toBe('researched');
  });

  it('researches at once and takes the points and the materials', () => {
    const run = rich(50);
    run.materials.Reagents = 1;
    expect(researchNodeNow(run, node('Applied Combustion'))).toBeUndefined();
    expect(run.research.points).toBe(35);
    expect(researchNodeNow(run, node('Blackpowder'))).toBeUndefined();
    expect(run.research.points).toBe(0);
    expect(run.materials.Reagents).toBe(0);
    expect(researchProblem(run, node('Volatile Compounds'))).toBe('points');
    run.research.points = 100;
    expect(researchProblem(run, node('Volatile Compounds'))).toBe('materials');
    expect(nodeState(run, node('Volatile Compounds'))).toBe('discovered');
  });

  it('keeps hidden nodes off the web until found', () => {
    const run = rich();
    const hidden = node('Iron Lung');
    expect(nodeState(run, hidden)).toBe('undiscovered');
    expect(researchNodeNow(run, hidden)).toBe('undiscovered');
  });

  it('lowers point costs with Efficient Research', () => {
    const run = rich();
    const efficient = RESEARCH_NODES.find((entry) =>
      entry.effects.some((effect) => effect.kind === 'rule' && effect.rule === 'efficientResearch'),
    );
    if (!efficient) throw new Error('Efficient Research');
    researchWithRequirements(run, efficient);
    expect(nodeCost(run, node('Thermite')).points).toBe(Math.ceil(140 * RESEARCH_RULES.efficientShare));
  });
});

describe('refunds (GDD 8.10)', () => {
  it('returns 75 per cent rounded down and removes dependent nodes', () => {
    const run = rich(1000);
    researchWithRequirements(run, node('Incendiary Engineering'));
    researchWithRequirements(run, node('Shaped Charges'));
    researchWithRequirements(run, node('Thermite'));
    const blackpowder = node('Blackpowder');
    expect(dependents(run, blackpowder).map((entry) => entry.name).sort()).toEqual([
      'Incendiary Engineering',
      'Shaped Charges',
      'Thermite',
    ]);
    const preview = refundPreview(run, blackpowder);
    // 35 + 70 + 70 + 140 points: 26 + 52 + 52 + 105. Reagents 1 + 3 + 3 + 6: 0 + 2 + 2 + 4.
    expect(preview?.points).toBe(26 + 52 + 52 + 105);
    expect(preview?.materials.Reagents).toBe(8);
    const before = run.research.points;
    const reagents = run.materials.Reagents;
    refundNode(run, blackpowder);
    expect(run.research.points).toBe(before + 235);
    expect(run.materials.Reagents).toBe(reagents + 8);
    expect(run.research.researched).toEqual([node('Applied Combustion').id]);
  });

  it('leaves owned items with the player and closes the shop again', () => {
    const run = rich();
    const alloy = componentByName('Damascus Alloy');
    if (!alloy) throw new Error('Damascus Alloy');
    expect(lockedBy(run, alloy)).toBe('Forging');
    expect(buildProblem(run, alloy)).toBe('locked');
    researchWithRequirements(run, node('Forging'));
    expect(lockedBy(run, alloy)).toBeUndefined();
    expect(buildProblem(run, alloy)).toBeUndefined();
    run.inventory.push(createComponent(alloy));
    refundNode(run, node('Forging'));
    expect(lockedBy(run, alloy)).toBe('Forging');
    expect(run.inventory.some((entry) => entry.def === alloy)).toBe(true);
  });

  it('refunds nothing for a captured node, and keeps mastery once earned', () => {
    const run = rich(0);
    queueCapture(run, 'Keldrath');
    captureNode(run, node('Metalworking'));
    expect(run.archive.mastery.Engineering).toBe(1);
    expect(refundPreview(run, node('Metalworking'))?.points).toBe(0);
    refundNode(run, node('Metalworking'));
    run.research.points = 15;
    researchNodeNow(run, node('Metalworking'));
    // A node pays mastery once per run (GDD 8.13).
    expect(run.archive.mastery.Engineering).toBe(1);
  });
});

describe('items, recipes and grades opened by research', () => {
  it('opens weapons and components in shops and recipes', () => {
    const run = rich();
    expect(itemLockedBy(run, 'Ballista')).toBe('Siege Engineering');
    expect(itemLockedBy(run, 'Crossbow')).toBeUndefined();
    researchWithRequirements(run, node('Siege Engineering'));
    expect(itemLockedBy(run, 'Ballista')).toBeUndefined();
  });

  it('needs a middle-ring node for Grade III and an outer-ring node for Grade IV', () => {
    const run = rich();
    const weapon = run.weapons[0];
    if (!weapon) throw new Error('weapon');
    weapon.grade = 2;
    expect(gradeOpen(run, 2)).toBe(true);
    expect(gradeOpen(run, 3)).toBe(false);
    expect(upgradeProblem(run, weapon, 'damage')).toBe('locked');
    researchWithRequirements(run, node('Shaped Charges'));
    expect(gradeOpen(run, 3)).toBe(true);
    expect(gradeOpen(run, 4)).toBe(false);
    expect(upgradeProblem(run, weapon, 'damage')).toBeUndefined();
    researchWithRequirements(run, node('Thermite'));
    expect(gradeOpen(run, 4)).toBe(true);
  });
});

describe('captured research (GDD 5.8)', () => {
  it('offers centre and inner nodes of the beaten kingdom, for free', () => {
    const run = rich(0);
    queueCapture(run, 'Myrathis');
    const choices = captureChoices(run);
    expect(choices.length).toBeGreaterThan(0);
    for (const choice of choices) {
      expect(['Centre', 'Inner']).toContain(choice.ring);
      expect(choice.disciplines.some((discipline) => discipline === 'Chemistry' || discipline === 'Biology')).toBe(true);
    }
    // Inner nodes still need their requirements.
    expect(choices.map((entry) => entry.name)).not.toContain('Blackpowder');
    expect(captureNode(run, node('Metalworking'))).toBe(false);
    expect(captureNode(run, node('Applied Combustion'))).toBe(true);
    expect(run.research.points).toBe(0);
    expect(run.research.captures).toHaveLength(0);
    expect(captureChoices(run)).toEqual([]);
  });
});

describe('mastery (GDD 8.13)', () => {
  it('awards points per ring to each linked discipline', () => {
    const run = rich();
    researchWithRequirements(run, node('Thermite'));
    // Centre 1, Inner 2, Middle 3, Outer 5.
    expect(run.archive.mastery.Chemistry).toBe(11);
    researchWithRequirements(run, node('Chemical Ballistics'));
    expect(run.archive.mastery.Chemistry).toBe(13);
    expect(run.archive.mastery.Engineering).toBeGreaterThanOrEqual(2);
  });

  it('names ranks at 0, 20, 60, 140 and 280 points', () => {
    expect(masteryRank(0)).toBe('Novice');
    expect(masteryRank(19)).toBe('Novice');
    expect(masteryRank(20)).toBe('Practitioner');
    expect(masteryRank(60)).toBe('Expert');
    expect(masteryRank(140)).toBe('Master');
    expect(masteryRank(280)).toBe('Grandmaster');
    expect(nextRank(25)).toEqual({ name: 'Expert', points: 60 });
    expect(nextRank(300)).toBeUndefined();
  });

  it('carries mastery and hidden nodes into the next run through the Archive', () => {
    const archive = createArchive();
    const first = createRun(1, CHARACTERS.inventor, WEAPONS.crossbow, archive);
    first.research.points = 15;
    researchNodeNow(first, node('Metalworking'));
    applyFindings(first, { ...emptyFindings(), galvanicEliteKill: true }, { survived: true, healthShare: 1, weapons: [] });
    const second = createRun(2, CHARACTERS.inventor, WEAPONS.crossbow, archive);
    expect(second.archive.mastery.Engineering).toBe(1);
    expect(nodeState(second, node('Lightning in a Bottle'))).not.toBe('undiscovered');
    expect(second.research.researched).toEqual([]);
  });

  it("finds The Philosopher's Engine at Expert in all five disciplines and hints at one", () => {
    const run = rich();
    const engine = node("The Philosopher's Engine");
    run.archive.mastery.Chemistry = 59;
    researchNodeNow(run, node('Applied Combustion'));
    expect(run.archive.hints.has(engine.id)).toBe(true);
    expect(run.archive.discovered.has(engine.id)).toBe(false);
    for (const discipline of DISCIPLINES) run.archive.mastery[discipline] = 59;
    researchNodeNow(run, node('Metalworking'));
    expect(run.archive.discovered.has(engine.id)).toBe(false);
    run.archive.mastery.Physics = 60;
    run.archive.mastery.Mathematics = 60;
    run.archive.mastery.Biology = 60;
    researchNodeNow(run, node('Basic Toxicology'));
    expect(run.archive.discovered.has(engine.id)).toBe(true);
  });
});

describe('hidden node conditions and hints (GDD 8.12)', () => {
  const context = { survived: true, healthShare: 1, weapons: [] as string[] };

  it('discovers on the condition and hints on a near miss', () => {
    const cases: Array<[string, Partial<ReturnType<typeof emptyFindings>>, Partial<ReturnType<typeof emptyFindings>>]> = [
      ['Lightning in a Bottle', { galvanicEliteKill: true }, { galvanicElite: true }],
      ['Perpetual Reaction', { chainLimitReached: true, chainDepth: 3 }, { chainDepth: 2 }],
      ['Probability Storm', { criticalBurst: 10 }, { criticalBurst: 5 }],
      ['Fungal Machinery', { sporeMotherByConstruct: true }, { sporeMotherKilled: true }],
      ['Anomalous Physics', { unstableSuppressedKill: true }, { unstableKilled: true }],
    ];
    for (const [name, met, near] of cases) {
      const hinted = rich();
      expect(applyFindings(hinted, { ...emptyFindings(), ...near }, context)).toEqual([]);
      expect(hinted.archive.hints.has(node(name).id), name).toBe(true);
      const found = rich();
      expect(applyFindings(found, { ...emptyFindings(), ...met }, context)).toContain(name);
      expect(nodeState(found, node(name))).not.toBe('undiscovered');
    }
  });

  it('counts Steam Bursts across rounds', () => {
    const run = rich();
    applyFindings(run, { ...emptyFindings(), steamBursts: 30 }, context);
    expect(run.archive.hints.has(node('Spontaneous Combustion').id)).toBe(true);
    expect(applyFindings(run, { ...emptyFindings(), steamBursts: 20 }, context)).toContain('Spontaneous Combustion');
  });

  it('reads health and weapons at the end of a round', () => {
    const run = rich();
    applyFindings(run, emptyFindings(), { survived: true, healthShare: 0.15, weapons: ['Tesla Rod'] });
    expect(run.archive.hints.has(node('Iron Lung').id)).toBe(true);
    expect(run.archive.hints.has(node('Living Battery').id)).toBe(true);
    const found = applyFindings(run, emptyFindings(), {
      survived: true,
      healthShare: 0.05,
      weapons: ['Living Arsenal', 'Tesla Rod'],
    });
    expect(found.sort()).toEqual(['Iron Lung', 'Living Battery']);
  });
});

describe('research effects', () => {
  it('raises typed damage, stats and opens research synergies', () => {
    const run = rich();
    const base = resolvePlayerStats(run.character);
    const before = resolveLoadout(run.weapons, base).weapons[0];
    researchWithRequirements(run, node('Ballistics'));
    researchWithRequirements(run, node('Probability'));
    const research = resolveResearch(run.research.researched);
    const after = resolveLoadout(run.weapons, base, { research }).weapons[0];
    expect(after?.range).toBeGreaterThan(before?.range ?? 0);
    expect(after?.criticalChance).toBeGreaterThan(before?.criticalChance ?? 0);
  });

  it('opens and closes research synergies with the node', () => {
    const run = rich(0);
    const synergyNode = RESEARCH_NODES.find((entry) => entry.effects.some((effect) => effect.kind === 'synergy'));
    if (!synergyNode) throw new Error('synergy node');
    run.research.points = 10000;
    researchWithRequirements(run, synergyNode);
    expect(run.researchSynergies.length).toBeGreaterThan(0);
    refundNode(run, synergyNode);
    expect(run.researchSynergies).toEqual([]);
  });
});
