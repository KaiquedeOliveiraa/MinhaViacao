import type { Speed, Store } from './store';

export const MS_PER_GAME_MINUTE = 1000;
/** Um quadro nunca vale mais que isto: é o que impede o progresso offline com a aba escondida. */
export const MAX_FRAME_MS = 1000;

export function stepMinutes(accMs: number, deltaMs: number, speed: Speed): { minutes: number; accMs: number } {
  if (speed === 0) return { minutes: 0, accMs };
  const delta = Math.min(MAX_FRAME_MS, Math.max(0, deltaMs));
  const total = accMs + delta * speed;
  const minutes = Math.floor(total / MS_PER_GAME_MINUTE);
  return { minutes, accMs: total - minutes * MS_PER_GAME_MINUTE };
}

interface LoopDeps { now(): number; raf(cb: () => void): number; caf(id: number): void; }

const browserDeps = (): LoopDeps => ({
  now: () => performance.now(),
  raf: (cb) => requestAnimationFrame(cb),
  caf: (id) => cancelAnimationFrame(id),
});

export function createLoop(store: Store, deps: LoopDeps = browserDeps()): { start(): void; stop(): void } {
  let frameId: number | null = null;
  let last = 0;
  let acc = 0;

  const frame = () => {
    const now = deps.now();
    const step = stepMinutes(acc, now - last, store.getSpeed());
    last = now;
    acc = step.accMs;
    if (step.minutes > 0) store.advance(step.minutes);
    frameId = deps.raf(frame);
  };

  return {
    start() {
      if (frameId !== null) return;
      last = deps.now();
      frameId = deps.raf(frame);
    },
    stop() {
      if (frameId === null) return;
      deps.caf(frameId);
      frameId = null;
    },
  };
}
