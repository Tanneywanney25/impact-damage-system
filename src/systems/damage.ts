import type { DamageConfig } from '../config';

/**
 * Impulse → damage mapping: nothing below the threshold (gentle contacts,
 * resting stacks), then linear in the excess.
 */
export function impulseToDamage(impulse: number, cfg: DamageConfig): number {
  return Math.max(0, impulse - cfg.threshold) * cfg.scale;
}

/**
 * Impulse proxy for a collision between two bodies: relative speed weighted by
 * the lighter participant's mass (a heavy bird hitting a light plank transfers
 * roughly the plank-limited momentum). Static bodies pass Infinity mass.
 */
export function collisionImpulse(relativeSpeed: number, massA: number, massB: number): number {
  const effectiveMass = Math.min(massA, massB);
  if (!Number.isFinite(effectiveMass)) return 0; // static-static never damages
  return relativeSpeed * effectiveMass;
}

/** Apply damage; health floors at 0. */
export function applyDamage(health: number, damage: number): number {
  return Math.max(0, health - damage);
}

export function isDestroyed(health: number): boolean {
  return health <= 0;
}
