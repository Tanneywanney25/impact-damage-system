import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config';
import { outcomeOf, starsFor } from '../src/systems/rules';

describe('outcomeOf', () => {
  it('winning requires zero pigs, regardless of birds left', () => {
    expect(outcomeOf({ pigsAlive: 0, birdsLeft: 2, birdInFlight: false })).toBe('won');
    expect(outcomeOf({ pigsAlive: 0, birdsLeft: 0, birdInFlight: false })).toBe('won');
  });

  it('the last bird can still win while its flight resolves', () => {
    // No birds left but one mid-flight: not lost yet.
    expect(outcomeOf({ pigsAlive: 2, birdsLeft: 0, birdInFlight: true })).toBe('playing');
    // ...and if that flight kills the pigs:
    expect(outcomeOf({ pigsAlive: 0, birdsLeft: 0, birdInFlight: true })).toBe('won');
  });

  it('losing requires empty quiver, no flight, and pigs alive', () => {
    expect(outcomeOf({ pigsAlive: 1, birdsLeft: 0, birdInFlight: false })).toBe('lost');
  });

  it('otherwise the round continues', () => {
    expect(outcomeOf({ pigsAlive: 3, birdsLeft: 2, birdInFlight: false })).toBe('playing');
  });
});

describe('starsFor', () => {
  it('maps birds remaining to the star table', () => {
    expect(starsFor(0, defaultConfig)).toBe(1);
    expect(starsFor(1, defaultConfig)).toBe(2);
    expect(starsFor(2, defaultConfig)).toBe(3);
  });

  it('clamps above the table', () => {
    expect(starsFor(7, defaultConfig)).toBe(3);
  });
});
