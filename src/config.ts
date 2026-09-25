/** Central configuration for Slingshot Siege. */

export interface DamageConfig {
  /** Impulse magnitude below this causes no damage. */
  threshold: number;
  /** Damage per unit of impulse beyond the threshold. */
  scale: number;
}

export interface EntityHealth {
  box: number;
  log: number;
  pig: number;
}

export interface GameConfig {
  canvas: { width: number; height: number };
  physics: { gravityY: number };
  ground: { height: number };
  bird: {
    radius: number;
    density: number;
    restitution: number;
    friction: number;
  };
  slingshot: {
    anchorX: number;
    anchorY: number;
    /** Max drag distance from the anchor, px. */
    maxStretch: number;
    /** Launch speed per px of stretch, (px/s)/px. */
    power: number;
  };
  damage: DamageConfig;
  health: EntityHealth;
  score: { box: number; log: number; pig: number };
  /** Stars by birds remaining at the win: index = birds left (clamped). */
  starsByBirdsLeft: [number, number, number];
  /** A flying bird is considered settled below this speed (px/s). */
  settleSpeed: number;
  /** Or after this long in flight, ms. */
  flightTimeoutMs: number;
  trajectoryDots: number;
}

export const defaultConfig: GameConfig = {
  canvas: { width: 1200, height: 500 },
  physics: { gravityY: 1 },
  ground: { height: 24 },
  bird: { radius: 18, density: 0.004, restitution: 0.35, friction: 0.4 },
  slingshot: { anchorX: 200, anchorY: 320, maxStretch: 110, power: 9 },
  damage: { threshold: 2.2, scale: 22 },
  health: { box: 60, log: 80, pig: 40 },
  score: { box: 100, log: 150, pig: 500 },
  starsByBirdsLeft: [1, 2, 3],
  settleSpeed: 6,
  flightTimeoutMs: 6000,
  trajectoryDots: 22,
};
