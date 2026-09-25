import type { GameConfig } from '../config';

export interface Vec2 {
  x: number;
  y: number;
}

/** Clamp the drag point to the slingshot's max stretch radius. */
export function clampDrag(drag: Vec2, cfg: GameConfig): Vec2 {
  const { anchorX, anchorY, maxStretch } = cfg.slingshot;
  const dx = drag.x - anchorX;
  const dy = drag.y - anchorY;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxStretch) return { ...drag };
  const k = maxStretch / dist;
  return { x: anchorX + dx * k, y: anchorY + dy * k };
}

/**
 * Launch velocity: opposite the stretch vector, proportional to stretch length.
 * Returned in px/s.
 */
export function launchVelocity(drag: Vec2, cfg: GameConfig): Vec2 {
  const clamped = clampDrag(drag, cfg);
  const { anchorX, anchorY, power } = cfg.slingshot;
  return {
    x: (anchorX - clamped.x) * power,
    y: (anchorY - clamped.y) * power,
  };
}

/**
 * Predicted ballistic arc (no drag): dots for the aim guide.
 * `gravityPxS2` is the effective gravity in px/s².
 */
export function trajectoryPoints(
  start: Vec2,
  velocity: Vec2,
  gravityPxS2: number,
  dots: number,
  dtSeconds = 0.09,
): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 1; i <= dots; i++) {
    const t = i * dtSeconds;
    points.push({
      x: start.x + velocity.x * t,
      y: start.y + velocity.y * t + 0.5 * gravityPxS2 * t * t,
    });
  }
  return points;
}
