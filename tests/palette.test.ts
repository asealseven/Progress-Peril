import { describe, expect, it } from 'vitest';
import {
  DAMAGE_TYPE_COLOURS,
  FACTION_COLOURS,
  KINGDOM_COLOURS,
  PALETTE,
  hexToNumber,
} from '../src/data/palette';

describe('palette', () => {
  it('converts hex strings to numbers', () => {
    expect(hexToNumber('#F3EBDA')).toBe(0xf3ebda);
    expect(hexToNumber(PALETTE.ink)).toBe(0x2a2118);
  });

  it('holds nine damage types, six factions and five kingdoms', () => {
    expect(Object.keys(DAMAGE_TYPE_COLOURS)).toHaveLength(9);
    expect(Object.keys(FACTION_COLOURS)).toHaveLength(6);
    expect(Object.keys(KINGDOM_COLOURS)).toHaveLength(5);
  });

  it('uses six-digit hex colours everywhere', () => {
    const all = [
      ...Object.values(PALETTE),
      ...Object.values(DAMAGE_TYPE_COLOURS),
      ...Object.values(FACTION_COLOURS),
      ...Object.values(KINGDOM_COLOURS),
    ];
    for (const colour of all) {
      expect(colour).toMatch(/^#[0-9A-F]{6}$/);
    }
  });
});
