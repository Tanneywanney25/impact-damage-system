import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLevel } from '../src/systems/levels';

function loadFixture(n: number): unknown {
  return JSON.parse(
    readFileSync(new URL(`../public/levels/level${n}.json`, import.meta.url), 'utf-8'),
  );
}

describe('shipped levels (scripts/level_builder.py output)', () => {
  it('all three levels parse and match their layouts', () => {
    const l1 = parseLevel(loadFixture(1));
    expect(l1.name).toBe('First Contact');
    expect(l1.birds).toBe(3);
    expect(l1.blocks).toHaveLength(5);
    expect(l1.pigs).toHaveLength(1);

    const l2 = parseLevel(loadFixture(2));
    expect(l2.name).toBe('Double Decker');
    expect(l2.pigs).toHaveLength(3);

    const l3 = parseLevel(loadFixture(3));
    expect(l3.name).toBe('The Tower');
    expect(l3.birds).toBe(4);
  });

  it('consecutive L cells merged into single wide logs', () => {
    const l1 = parseLevel(loadFixture(1));
    const logs = l1.blocks.filter((b) => b.type === 'log');
    expect(logs).toHaveLength(1);
    expect(logs[0]!.w).toBeCloseTo(3 * 44); // "LLL" at cell 44
  });

  it('grid rows stack upward from the ground origin', () => {
    const l1 = parseLevel(loadFixture(1));
    const pig = l1.pigs[0]!;
    const boxes = l1.blocks.filter((b) => b.type === 'box');
    const bottomBoxY = Math.max(...boxes.map((b) => b.y));
    expect(pig.y).toBeLessThan(bottomBoxY); // pig sits above the bottom row
  });
});

describe('parseLevel validation', () => {
  const valid = {
    name: 'T',
    birds: 2,
    blocks: [{ type: 'box', x: 1, y: 2, w: 10, h: 10 }],
    pigs: [{ x: 5, y: 5, r: 9 }],
  };

  it('accepts a valid level', () => {
    expect(parseLevel(valid).birds).toBe(2);
  });

  it('rejects missing name, zero birds, missing pigs', () => {
    expect(() => parseLevel({ ...valid, name: '' })).toThrow(/name/);
    expect(() => parseLevel({ ...valid, birds: 0 })).toThrow(/birds/);
    expect(() => parseLevel({ ...valid, pigs: [] })).toThrow(/pig/);
  });

  it('rejects malformed blocks and pigs with the offending index', () => {
    expect(() =>
      parseLevel({ ...valid, blocks: [{ type: 'sphere', x: 0, y: 0, w: 5, h: 5 }] }),
    ).toThrow(/block at index 0/);
    expect(() => parseLevel({ ...valid, pigs: [{ x: 1, y: 2, r: -3 }] })).toThrow(
      /pig at index 0/,
    );
  });

  it('rejects non-objects', () => {
    expect(() => parseLevel(null)).toThrow();
    expect(() => parseLevel('level')).toThrow();
  });
});
