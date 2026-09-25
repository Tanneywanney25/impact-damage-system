import Matter from 'matter-js';
import type { GameConfig } from '../config';
import { applyDamage, collisionImpulse, impulseToDamage, isDestroyed } from '../systems/damage';
import type { Level } from '../systems/levels';
import { clampDrag, launchVelocity, type Vec2 } from '../systems/launch';
import { outcomeOf, starsFor, type Outcome } from '../systems/rules';

export type EntityKind = 'box' | 'log' | 'pig' | 'bird';

export interface Tracked {
  body: Matter.Body;
  kind: EntityKind;
  health: number;
  maxHealth: number;
  w: number;
  h: number;
  r: number;
}

export type Phase = 'aiming' | 'dragging' | 'flying' | 'won' | 'lost';

/** The Matter.js siege world: level bodies, slingshot bird, impulse damage. */
export class SiegeWorld {
  readonly engine: Matter.Engine;
  entities: Tracked[] = [];
  bird: Tracked | null = null;
  phase: Phase = 'aiming';
  birdsLeft = 0;
  score = 0;
  stars = 0;
  dragPoint: Vec2 | null = null;
  levelName = '';

  private flightStartedAt = 0;
  private pendingDamage = new Map<Matter.Body, number>();

  constructor(private readonly cfg: GameConfig) {
    this.engine = Matter.Engine.create();
    this.engine.gravity.y = cfg.physics.gravityY;

    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;
        const relSpeed = Math.hypot(
          bodyA.velocity.x - bodyB.velocity.x,
          bodyA.velocity.y - bodyB.velocity.y,
        );
        const massA = bodyA.isStatic ? Infinity : bodyA.mass;
        const massB = bodyB.isStatic ? Infinity : bodyB.mass;
        const impulse = collisionImpulse(relSpeed, massA, massB);
        const damage = impulseToDamage(impulse, this.cfg.damage);
        if (damage <= 0) continue;
        for (const body of [bodyA, bodyB]) {
          this.pendingDamage.set(body, (this.pendingDamage.get(body) ?? 0) + damage);
        }
      }
    });
  }

  get pigsAlive(): number {
    return this.entities.filter((e) => e.kind === 'pig').length;
  }

  loadLevel(level: Level): void {
    const { cfg } = this;
    Matter.Composite.clear(this.engine.world, false);
    this.entities = [];
    this.bird = null;
    this.pendingDamage.clear();
    this.score = 0;
    this.stars = 0;
    this.levelName = level.name;
    this.birdsLeft = level.birds;

    // Static ground.
    const groundY = cfg.canvas.height - cfg.ground.height / 2;
    Matter.Composite.add(
      this.engine.world,
      Matter.Bodies.rectangle(cfg.canvas.width / 2, groundY, cfg.canvas.width, cfg.ground.height, {
        isStatic: true,
        label: 'ground',
      }),
    );

    for (const block of level.blocks) {
      const body = Matter.Bodies.rectangle(block.x, block.y, block.w, block.h, {
        angle: block.angle ?? 0,
        friction: 0.6,
        restitution: 0.1,
      });
      this.entities.push({
        body,
        kind: block.type,
        health: cfg.health[block.type],
        maxHealth: cfg.health[block.type],
        w: block.w,
        h: block.h,
        r: 0,
      });
      Matter.Composite.add(this.engine.world, body);
    }
    for (const pig of level.pigs) {
      const body = Matter.Bodies.circle(pig.x, pig.y, pig.r, { friction: 0.4, restitution: 0.2 });
      this.entities.push({
        body,
        kind: 'pig',
        health: cfg.health.pig,
        maxHealth: cfg.health.pig,
        w: 0,
        h: 0,
        r: pig.r,
      });
      Matter.Composite.add(this.engine.world, body);
    }

    this.phase = 'aiming';
    this.nockBird();
  }

  /** Place a fresh bird on the sling (static until released). */
  private nockBird(): void {
    if (this.birdsLeft <= 0) return;
    const { anchorX, anchorY } = this.cfg.slingshot;
    const body = Matter.Bodies.circle(anchorX, anchorY, this.cfg.bird.radius, {
      density: this.cfg.bird.density,
      restitution: this.cfg.bird.restitution,
      friction: this.cfg.bird.friction,
      isStatic: true,
    });
    this.bird = {
      body,
      kind: 'bird',
      health: Infinity,
      maxHealth: Infinity,
      w: 0,
      h: 0,
      r: this.cfg.bird.radius,
    };
    Matter.Composite.add(this.engine.world, body);
  }

  beginDrag(point: Vec2): boolean {
    if (this.phase !== 'aiming' || !this.bird) return false;
    const near =
      Math.hypot(point.x - this.bird.body.position.x, point.y - this.bird.body.position.y) <
      this.cfg.bird.radius * 3;
    if (!near) return false;
    this.phase = 'dragging';
    this.drag(point);
    return true;
  }

  drag(point: Vec2): void {
    if (this.phase !== 'dragging' || !this.bird) return;
    this.dragPoint = clampDrag(point, this.cfg);
    Matter.Body.setPosition(this.bird.body, this.dragPoint);
  }

  release(nowMs: number): void {
    if (this.phase !== 'dragging' || !this.bird || !this.dragPoint) return;
    const velocity = launchVelocity(this.dragPoint, this.cfg);
    Matter.Body.setStatic(this.bird.body, false);
    // Matter velocity is px per 16.666ms tick; convert from px/s.
    Matter.Body.setVelocity(this.bird.body, { x: velocity.x / 60, y: velocity.y / 60 });
    this.birdsLeft -= 1;
    this.phase = 'flying';
    this.flightStartedAt = nowMs;
    this.dragPoint = null;
  }

  step(dtMs: number, nowMs: number): void {
    if (this.phase === 'won' || this.phase === 'lost') return;
    Matter.Engine.update(this.engine, dtMs);

    // Apply queued collision damage.
    if (this.pendingDamage.size > 0) {
      const survivors: Tracked[] = [];
      for (const entity of this.entities) {
        const damage = this.pendingDamage.get(entity.body) ?? 0;
        entity.health = applyDamage(entity.health, damage);
        if (isDestroyed(entity.health)) {
          if (entity.kind !== 'bird') this.score += this.cfg.score[entity.kind];
          Matter.Composite.remove(this.engine.world, entity.body);
        } else {
          survivors.push(entity);
        }
      }
      this.entities = survivors;
      this.pendingDamage.clear();
    }

    // Bird settle / off-screen → next bird or verdict.
    if (this.phase === 'flying' && this.bird) {
      const b = this.bird.body;
      const speed = Math.hypot(b.velocity.x, b.velocity.y) * 60; // px/s
      const off =
        b.position.x < -80 || b.position.x > this.cfg.canvas.width + 80 || b.position.y > this.cfg.canvas.height + 80;
      const settled = speed < this.cfg.settleSpeed || nowMs - this.flightStartedAt > this.cfg.flightTimeoutMs;
      if (off || settled) {
        Matter.Composite.remove(this.engine.world, b);
        this.bird = null;
        this.phase = 'aiming';
        this.nockBird();
      }
    }

    const outcome: Outcome = outcomeOf({
      pigsAlive: this.pigsAlive,
      birdsLeft: this.birdsLeft,
      birdInFlight: this.phase === 'flying',
    });
    if (outcome === 'won') {
      this.phase = 'won';
      this.stars = starsFor(this.birdsLeft, this.cfg);
    } else if (outcome === 'lost') {
      this.phase = 'lost';
    }
  }
}
