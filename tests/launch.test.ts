import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config';
import { clampDrag, launchVelocity, trajectoryPoints } from '../src/systems/launch';

const cfg = defaultConfig;
const { anchorX, anchorY, maxStretch, power } = cfg.slingshot;

describe('clampDrag', () => {
  it('leaves points inside the stretch radius untouched', () => {
    const p = { x: anchorX - 50, y: anchorY + 20 };
    expect(clampDrag(p, cfg)).toEqual(p);
  });

  it('projects far points back onto the stretch circle', () => {
    const p = { x: anchorX - 500, y: anchorY };
    const clamped = clampDrag(p, cfg);
    expect(clamped.x).toBeCloseTo(anchorX - maxStretch);
    expect(Math.hypot(clamped.x - anchorX, clamped.y - anchorY)).toBeCloseTo(maxStretch);
  });
});

describe('launchVelocity', () => {
  it('points opposite the stretch and scales with power', () => {
    const v = launchVelocity({ x: anchorX - 100, y: anchorY + 40 }, cfg);
    expect(v.x).toBeCloseTo(100 * power);
    expect(v.y).toBeCloseTo(-40 * power);
  });

  it('zero stretch launches with zero velocity', () => {
    expect(launchVelocity({ x: anchorX, y: anchorY }, cfg)).toEqual({ x: 0, y: 0 });
  });

  it('an over-stretched drag is capped by the clamp', () => {
    const capped = launchVelocity({ x: anchorX - 10_000, y: anchorY }, cfg);
    expect(capped.x).toBeCloseTo(maxStretch * power);
  });
});

describe('trajectoryPoints', () => {
  it('follows the ballistic parabola x = x0 + vx t, y = y0 + vy t + ½gt²', () => {
    const pts = trajectoryPoints({ x: 0, y: 0 }, { x: 100, y: -200 }, 980, 3, 0.1);
    expect(pts[0]!.x).toBeCloseTo(10);
    expect(pts[0]!.y).toBeCloseTo(-200 * 0.1 + 0.5 * 980 * 0.01);
    expect(pts[2]!.x).toBeCloseTo(30);
  });

  it('emits the requested number of dots', () => {
    expect(trajectoryPoints({ x: 0, y: 0 }, { x: 1, y: 1 }, 980, 22)).toHaveLength(22);
  });
});
