/** Level file parsing/validation. Levels ship in public/levels/*.json
 *  and are emitted by scripts/level_builder.py from text layouts. */

export type BlockType = 'box' | 'log';

export interface BlockSpec {
  type: BlockType;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Rotation in radians (logs are often placed at ±angles). */
  angle?: number;
}

export interface PigSpec {
  x: number;
  y: number;
  r: number;
}

export interface Level {
  name: string;
  birds: number;
  blocks: BlockSpec[];
  pigs: PigSpec[];
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Validate a parsed level JSON; throws with a specific message when malformed. */
export function parseLevel(data: unknown): Level {
  if (typeof data !== 'object' || data === null) throw new Error('level: expected an object');
  const level = data as Partial<Level>;
  if (typeof level.name !== 'string' || level.name.length === 0) {
    throw new Error('level: missing name');
  }
  if (!isFiniteNumber(level.birds) || level.birds < 1) {
    throw new Error('level: birds must be >= 1');
  }
  if (!Array.isArray(level.blocks)) throw new Error('level: blocks must be an array');
  if (!Array.isArray(level.pigs) || level.pigs.length === 0) {
    throw new Error('level: needs at least one pig');
  }

  level.blocks.forEach((b, i) => {
    if (
      (b.type !== 'box' && b.type !== 'log') ||
      !isFiniteNumber(b.x) ||
      !isFiniteNumber(b.y) ||
      !isFiniteNumber(b.w) ||
      !isFiniteNumber(b.h) ||
      b.w <= 0 ||
      b.h <= 0 ||
      (b.angle !== undefined && !isFiniteNumber(b.angle))
    ) {
      throw new Error(`level: invalid block at index ${i}`);
    }
  });
  level.pigs.forEach((p, i) => {
    if (!isFiniteNumber(p.x) || !isFiniteNumber(p.y) || !isFiniteNumber(p.r) || p.r <= 0) {
      throw new Error(`level: invalid pig at index ${i}`);
    }
  });

  return {
    name: level.name,
    birds: Math.floor(level.birds),
    blocks: level.blocks as BlockSpec[],
    pigs: level.pigs as PigSpec[],
  };
}
