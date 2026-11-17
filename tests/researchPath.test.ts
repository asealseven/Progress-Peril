import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/data/characters';
import { DISCIPLINES, MASTERY_POINTS, RESEARCH_NODES, researchNodeByName } from '../src/data/research';
import type { ResearchNodeDef } from '../src/data/research';
import { WEAPONS } from '../src/data/weapons';
import { archivePreview, createArchive, discoveryRank, hasRank, innerToDiscover } from '../src/sim/archive';
import { nodeState } from '../src/sim/research';
import { createRun } from '../src/sim/run';

// Balance change after playtesting (GDD 8.13, 15.8): Practitioner at 13 points,
// Archive-only nodes one step beyond the known tree, and the path to the next rank.

function node(name: string): ResearchNodeDef {
  const found = researchNodeByName(name);
  if (!found) throw new Error(`Unknown node: ${name}`);
  return found;
}

describe('Practitioner within two runs (GDD 8.13)', () => {
  it('pays 7 points from starting knowledge and 13 from every centre and inner node, in each discipline', () => {
    const archive = createArchive();
    for (const discipline of DISCIPLINES) {
      const own = RESEARCH_NODES.filter((entry) => entry.disciplines.length === 1 && entry.disciplines[0] === discipline);
      const known = own.filter((entry) => archive.discovered.has(entry.id));
      const firstRun = known.reduce((sum, entry) => sum + MASTERY_POINTS[entry.ring], 0);
      const ringsOpen = own.filter((entry) => entry.ring === 'Centre' || entry.ring === 'Inner');
      const fullRun = ringsOpen.reduce((sum, entry) => sum + MASTERY_POINTS[entry.ring], 0);
      expect(firstRun).toBe(7);
      expect(fullRun).toBe(13);
      // One run never reaches the rank on a fresh profile. Two always do.
      archive.mastery[discipline] = firstRun;
      expect(hasRank(archive, discipline, 'Practitioner')).toBe(false);
      archive.mastery[discipline] = firstRun * 2;
      expect(hasRank(archive, discipline, 'Practitioner')).toBe(true);
    }
  });

  it('lists the inner nodes still to discover for each discipline', () => {
    const archive = createArchive();
    expect(innerToDiscover(archive, 'Chemistry').map((entry) => entry.name)).toEqual(['Corrosive Acids', 'Fume Chemistry', 'Catalysis']);
    archive.discovered.add(node('Corrosive Acids').id);
    expect(innerToDiscover(archive, 'Chemistry').map((entry) => entry.name)).toEqual(['Fume Chemistry', 'Catalysis']);
  });
});

describe('Archive-only nodes on the research web (GDD 15.8)', () => {
  it('shows undiscovered nodes one step beyond the known tree, and no further', () => {
    const archive = createArchive();
    const run = createRun(1, CHARACTERS.inventor, WEAPONS.crossbow, archive);
    // Blackpowder is starting knowledge: its children show as Archive only.
    expect(nodeState(run, node('Shaped Charges'))).toBe('archive');
    expect(nodeState(run, node('Incendiary Engineering'))).toBe('archive');
    // Corrosive Acids needs only a centre node: Archive only. Its child stays unknown.
    expect(nodeState(run, node('Corrosive Acids'))).toBe('archive');
    expect(nodeState(run, node('Concentrated Acids'))).toBe('undiscovered');
    // Outer nodes two steps out stay unknown.
    expect(nodeState(run, node('Thermite'))).toBe('undiscovered');
    // A discovery moves the frontier out by one step.
    archive.discovered.add(node('Incendiary Engineering').id);
    expect(nodeState(run, node('Thermite'))).toBe('archive');
  });

  it('keeps hidden nodes hidden and needs every required node for cross-discipline nodes', () => {
    const archive = createArchive();
    for (const hidden of RESEARCH_NODES.filter((entry) => entry.ring === 'Hidden')) expect(archivePreview(archive, hidden)).toBe(false);
    for (const cross of RESEARCH_NODES.filter((entry) => entry.ring === 'Cross')) {
      const ready = cross.requires.every((name) => archive.discovered.has(node(name).id));
      expect(archivePreview(archive, cross)).toBe(ready);
    }
  });

  it('names the rank each discovery needs', () => {
    expect(discoveryRank(node('Corrosive Acids'))).toBeUndefined();
    expect(discoveryRank(node('Shaped Charges'))).toBe('Practitioner');
    expect(discoveryRank(node('Thermite'))).toBe('Expert');
  });
});
