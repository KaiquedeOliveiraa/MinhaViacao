import { advance as advanceSim } from '../sim/tick';
import type { SaveStorage } from '../save/storage';
import type { ActionResult, Catalog, GameState } from '../sim/types';

export type Speed = 0 | 1 | 2 | 4; // 0 = pausado
export type StoreEvent = 'change' | 'tick' | 'hour';

/**
 * Em 'change' a tela pode reconstruir pedaços; em 'tick' ela só atualiza números que já estão na tela.
 */
export interface Store {
  readonly catalog: Catalog;
  getState(): GameState;
  getSpeed(): Speed;
  setSpeed(speed: Speed): void;
  dispatch(action: (s: GameState, c: Catalog) => ActionResult): ActionResult;
  replace(state: GameState): void;
  advance(minutes: number): void;
  on(event: StoreEvent, fn: () => void): () => void;
}

export function createStore(c: Catalog, initial: GameState, speed: Speed = 1): Store {
  let state = initial;
  let currentSpeed = speed;
  const listeners: Record<StoreEvent, Set<() => void>> = { change: new Set(), tick: new Set(), hour: new Set() };
  const emit = (event: StoreEvent) => { for (const fn of [...listeners[event]]) fn(); };

  return {
    catalog: c,
    getState: () => state,
    getSpeed: () => currentSpeed,
    setSpeed(next) {
      currentSpeed = next;
      emit('change');
    },
    dispatch(action) {
      const result = action(state, c);
      if (result.ok) {
        state = result.state;
        emit('change');
      }
      return result;
    },
    replace(next) {
      state = next;
      emit('change');
    },
    advance(minutes) {
      if (!(minutes > 0)) return;
      const hourBefore = Math.floor(state.clockMinutes / 60);
      const busesBefore = state.buses.map((b) => b.id).join('|');
      state = advanceSim(state, c, minutes);
      emit('tick');
      if (Math.floor(state.clockMinutes / 60) !== hourBefore) emit('hour');
      // A venda de um anúncio acontece dentro do tick: a frota mudou, as telas precisam se reconstruir.
      if (state.buses.map((b) => b.id).join('|') !== busesBefore) emit('change');
    },
    on(event, fn) {
      listeners[event].add(fn);
      return () => { listeners[event].delete(fn); };
    },
  };
}

/**
 * Grava em 'hour', em 'change' e quando a página fica escondida (visibilitychange) ou sai (pagehide).
 * `onFail` é chamado no máximo uma vez: o jogo segue mesmo sem conseguir salvar.
 */
export function attachAutosave(
  store: Store,
  storage: SaveStorage,
  onFail: () => void,
  doc: Document | undefined = typeof document !== 'undefined' ? document : undefined,
): () => void {
  let failed = false;
  const save = () => {
    if (storage.save(store.getState()) || failed) return;
    failed = true;
    onFail();
  };
  const onVisibility = () => { if (doc?.visibilityState === 'hidden') save(); };
  const offHour = store.on('hour', save);
  const offChange = store.on('change', save);
  const win = doc?.defaultView ?? null;
  doc?.addEventListener('visibilitychange', onVisibility);
  win?.addEventListener('pagehide', save);
  return () => {
    offHour();
    offChange();
    doc?.removeEventListener('visibilitychange', onVisibility);
    win?.removeEventListener('pagehide', save);
  };
}
