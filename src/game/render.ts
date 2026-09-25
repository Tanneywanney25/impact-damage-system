import type { GameConfig } from '../config';
import { launchVelocity, trajectoryPoints } from '../systems/launch';
import type { SiegeWorld } from './world';

export interface SiegeSprites {
  bg: HTMLImageElement;
  bird: HTMLImageElement;
  pig: HTMLImageElement;
  wood1: HTMLImageElement;
  wood2: HTMLImageElement;
  base: HTMLImageElement;
}

/** Canvas2D renderer for the siege world. */
export function render(ctx: CanvasRenderingContext2D, cfg: GameConfig, world: SiegeWorld, sprites: SiegeSprites): void {
  const { width, height } = cfg.canvas;
  ctx.drawImage(sprites.bg, 0, 0, width, height);

  // Ground strip.
  ctx.fillStyle = '#5b3d23';
  ctx.fillRect(0, height - cfg.ground.height, width, cfg.ground.height);
  ctx.fillStyle = '#7a9d3f';
  ctx.fillRect(0, height - cfg.ground.height, width, 6);

  // Slingshot post.
  const { anchorX, anchorY } = cfg.slingshot;
  ctx.strokeStyle = '#4a2c14';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(anchorX, height - cfg.ground.height);
  ctx.lineTo(anchorX, anchorY + 8);
  ctx.stroke();

  // Aim guide + band while dragging.
  if (world.phase === 'dragging' && world.dragPoint && world.bird) {
    const v = launchVelocity(world.dragPoint, cfg);
    const dots = trajectoryPoints(world.dragPoint, v, cfg.physics.gravityY * 980, cfg.trajectoryDots);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [i, d] of dots.entries()) {
      const rDot = 4 - (i / dots.length) * 2.5;
      ctx.beginPath();
      ctx.arc(d.x, d.y, rDot, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3d2410';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY);
    ctx.lineTo(world.dragPoint.x, world.dragPoint.y);
    ctx.stroke();
  }

  // Entities.
  for (const entity of world.entities) {
    const { position, angle } = entity.body;
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);
    if (entity.kind === 'pig') {
      ctx.drawImage(sprites.pig, -entity.r, -entity.r, entity.r * 2, entity.r * 2);
    } else {
      const img = entity.kind === 'box' ? sprites.wood1 : sprites.wood2;
      ctx.drawImage(img, -entity.w / 2, -entity.h / 2, entity.w, entity.h);
    }
    // Damage tint proportional to lost health.
    const hurt = 1 - entity.health / entity.maxHealth;
    if (hurt > 0.02) {
      ctx.fillStyle = `rgba(200, 30, 30, ${0.38 * hurt})`;
      if (entity.kind === 'pig') {
        ctx.beginPath();
        ctx.arc(0, 0, entity.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-entity.w / 2, -entity.h / 2, entity.w, entity.h);
      }
    }
    ctx.restore();
  }

  // Bird.
  if (world.bird) {
    const { position, angle } = world.bird.body;
    const r = world.bird.r;
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);
    ctx.drawImage(sprites.bird, -r, -r, r * 2, r * 2);
    ctx.restore();
  }
}
