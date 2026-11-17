import { advance as advanceSim } from '../sim/tick';
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
      state = advanceSim(state, c, minutes);
      emit('tick');
      if (Math.floor(state.clockMinutes / 60) !== hourBefore) emit('hour');
    },
    on(event, fn) {
      listeners[event].add(fn);
      return () => { listeners[event].delete(fn); };
    },
  };
}
