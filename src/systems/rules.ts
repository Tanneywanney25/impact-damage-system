import type { GameConfig } from '../config';

export type Outcome = 'playing' | 'won' | 'lost';

export interface RoundState {
  pigsAlive: number;
  birdsLeft: number;
  /** True while a bird is mid-flight (a loss can't be declared yet). */
  birdInFlight: boolean;
}

/**
 * Win/lose rules:
 * - all pigs down → won (even if that was the last bird)
 * - pigs alive, no birds left, nothing in flight → lost
 * - otherwise still playing
 */
export function outcomeOf(state: RoundState): Outcome {
  if (state.pigsAlive <= 0) return 'won';
  if (state.birdsLeft <= 0 && !state.birdInFlight) return 'lost';
  return 'playing';
}

/** Stars for a win: by birds remaining, clamped to the configured table. */
export function starsFor(birdsLeft: number, cfg: GameConfig): number {
  const table = cfg.starsByBirdsLeft;
  const idx = Math.max(0, Math.min(table.length - 1, birdsLeft));
  return table[idx] ?? 1;
}
