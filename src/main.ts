import { defaultConfig } from './config';
import { render, type SiegeSprites } from './game/render';
import { SiegeWorld } from './game/world';
import { parseLevel, type Level } from './systems/levels';

const LEVEL_COUNT = 3;

function requireEl<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element ${selector}`);
  return el;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

async function fetchLevel(n: number): Promise<Level> {
  const res = await fetch(`levels/level${n}.json`);
  if (!res.ok) throw new Error(`level${n}: HTTP ${res.status}`);
  return parseLevel(await res.json());
}

async function init(): Promise<void> {
  const canvas = requireEl<HTMLCanvasElement>('#game');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  const cfg = defaultConfig;
  canvas.width = cfg.canvas.width;
  canvas.height = cfg.canvas.height;

  const levelEl = requireEl('#hud-level');
  const birdsEl = requireEl('#hud-birds');
  const scoreEl = requireEl('#hud-score');
  const selectEl = requireEl('#level-select');
  const verdictEl = requireEl('#verdict');

  const [bg, bird, pig, wood1, wood2, base] = await Promise.all([
    loadImage('assets/bg.png'),
    loadImage('assets/bird.png'),
    loadImage('assets/pig.png'),
    loadImage('assets/wood1.png'),
    loadImage('assets/wood2.png'),
    loadImage('assets/base.png'),
  ]);
  const sprites: SiegeSprites = { bg, bird, pig, wood1, wood2, base };

  const levels = await Promise.all(
    Array.from({ length: LEVEL_COUNT }, (_, i) => fetchLevel(i + 1)),
  );

  const world = new SiegeWorld(cfg);
  let currentLevel = 0;
  let verdictShown = false;

  function loadLevel(index: number): void {
    currentLevel = Math.max(0, Math.min(LEVEL_COUNT - 1, index));
    const level = levels[currentLevel];
    if (!level) return;
    world.loadLevel(level);
    verdictShown = false;
    verdictEl.hidden = true;
    refreshButtons();
  }

  function refreshButtons(): void {
    selectEl.innerHTML = '';
    levels.forEach((level, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = `${i + 1}. ${level.name}`;
      if (i === currentLevel) btn.classList.add('active');
      btn.addEventListener('click', () => loadLevel(i));
      selectEl.append(btn);
    });
    const restart = document.createElement('button');
    restart.type = 'button';
    restart.textContent = '↻ Restart';
    restart.addEventListener('click', () => loadLevel(currentLevel));
    selectEl.append(restart);
  }

  function showVerdict(): void {
    verdictShown = true;
    verdictEl.hidden = false;
    if (world.phase === 'won') {
      const starText = '★'.repeat(world.stars) + '☆'.repeat(3 - world.stars);
      const next =
        currentLevel < LEVEL_COUNT - 1
          ? '<button id="next-btn" type="button">Next level</button>'
          : '';
      verdictEl.innerHTML = `<h2>Level cleared!</h2>
        <div class="stars">${starText}</div>
        <p>Score ${world.score} — ${world.birdsLeft} bird(s) spared</p>
        <button id="retry-btn" type="button">Replay</button>${next}`;
    } else {
      verdictEl.innerHTML = `<h2>Out of birds</h2>
        <p>${world.pigsAlive} pig(s) survived — score ${world.score}</p>
        <button id="retry-btn" type="button">Try again</button>`;
    }
    verdictEl.querySelector('#retry-btn')?.addEventListener('click', () => loadLevel(currentLevel));
    verdictEl.querySelector('#next-btn')?.addEventListener('click', () => loadLevel(currentLevel + 1));
  }

  // Pointer handling.
  function canvasPoint(e: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * cfg.canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * cfg.canvas.height,
    };
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (world.beginDrag(canvasPoint(e))) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => world.drag(canvasPoint(e)));
  canvas.addEventListener('pointerup', () => world.release(performance.now()));

  loadLevel(0);

  let last = performance.now();
  function frame(now: number): void {
    const dtMs = Math.min(now - last, 33);
    last = now;
    world.step(dtMs, now);
    render(ctx as CanvasRenderingContext2D, cfg, world, sprites);

    levelEl.textContent = `Level: ${world.levelName}`;
    birdsEl.textContent = `Birds: ${'🐦'.repeat(Math.max(0, world.birdsLeft))}${world.birdsLeft === 0 ? '—' : ''}`;
    scoreEl.textContent = `Score: ${world.score}`;
    if ((world.phase === 'won' || world.phase === 'lost') && !verdictShown) showVerdict();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

void init();
