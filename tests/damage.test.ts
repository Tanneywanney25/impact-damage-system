import { describe, expect, it } from 'vitest';
import { applyDamage, collisionImpulse, impulseToDamage, isDestroyed } from '../src/systems/damage';

const cfg = { threshold: 2.2, scale: 22 };

describe('impulseToDamage', () => {
  it('is zero at and below the threshold', () => {
    expect(impulseToDamage(0, cfg)).toBe(0);
    expect(impulseToDamage(2.2, cfg)).toBe(0);
    expect(impulseToDamage(1.9, cfg)).toBe(0);
  });

  it('scales linearly beyond the threshold', () => {
    expect(impulseToDamage(3.2, cfg)).toBeCloseTo(22);
    expect(impulseToDamage(4.2, cfg)).toBeCloseTo(44);
  });

  it('never returns negative damage', () => {
    expect(impulseToDamage(-5, cfg)).toBe(0);
  });
});

describe('collisionImpulse', () => {
  it('uses the lighter body’s mass', () => {
    expect(collisionImpulse(10, 2, 5)).toBe(20);
    expect(collisionImpulse(10, 5, 2)).toBe(20);
  });

  it('a static partner (Infinity mass) defers to the dynamic body', () => {
    expect(collisionImpulse(6, Infinity, 3)).toBe(18);
  });

  it('static vs static transfers nothing', () => {
    expect(collisionImpulse(50, Infinity, Infinity)).toBe(0);
  });

  it('zero relative speed transfers nothing', () => {
    expect(collisionImpulse(0, 4, 4)).toBe(0);
  });
});

describe('applyDamage / isDestroyed', () => {
  it('subtracts damage and floors at zero', () => {
    expect(applyDamage(60, 25)).toBe(35);
    expect(applyDamage(10, 999)).toBe(0);
  });

  it('destruction threshold is exactly zero health', () => {
    expect(isDestroyed(0.0001)).toBe(false);
    expect(isDestroyed(0)).toBe(true);
  });

  it('a full hit chain: healthy → damaged → destroyed', () => {
    let health = 60;
    health = applyDamage(health, impulseToDamage(3.2, cfg)); // −22
    expect(isDestroyed(health)).toBe(false);
    health = applyDamage(health, impulseToDamage(4.2, cfg)); // −44 → 0 floor
    expect(isDestroyed(health)).toBe(true);
  });
});
