import { expect, test } from 'vitest';
import { buyBus, setLinePrice } from '../sim/actions';
import { memoryKv, startedGame, testCatalog } from '../sim/testkit';
import { createStorage, SAVE_KEY } from '../save/storage';

import { attachAutosave, createStore } from './store';

test('ação com erro não muda o estado nem emite change', () => {
  const store = createStore(testCatalog, startedGame(testCatalog));
  const before = store.getState(); let changes = 0; store.on('change', () => changes++);
  expect(store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini' })).ok).toBe(false);
  expect(store.getState()).toBe(before); expect(changes).toBe(0);
});
test('ação com sucesso troca o estado e emite change uma vez', () => {
  const store = createStore(testCatalog, startedGame(testCatalog));
  let changes = 0; store.on('change', () => changes++);
  store.dispatch((s, c) => setLinePrice(s, c, 'alfa-beta', 3000));
  expect(store.getState().lines[0]!.priceCents).toBe(3000); expect(changes).toBe(1);
});
test('tick a cada avanço e hour só ao cruzar a hora', () => {
  const store = createStore(testCatalog, startedGame(testCatalog));
  let ticks = 0, hours = 0; store.on('tick', () => ticks++); store.on('hour', () => hours++);
  store.advance(59); store.advance(1); store.advance(30); store.advance(0);
  expect(ticks).toBe(3); expect(hours).toBe(1);
});
test('cancelar a inscrição para de receber eventos', () => {
  const store = createStore(testCatalog, startedGame(testCatalog));
  let n = 0; const off = store.on('tick', () => n++); store.advance(1); off(); store.advance(1);
  expect(n).toBe(1);
});
test('velocidade começa em 1 e mudar emite change', () => {
  const store = createStore(testCatalog, startedGame(testCatalog));
  let changes = 0; store.on('change', () => changes++);
  expect(store.getSpeed()).toBe(1);
  store.setSpeed(4);
  expect(store.getSpeed()).toBe(4); expect(changes).toBe(1);
});

test('salva a cada hora de jogo e a cada ação', () => {
  const kv = memoryKv(); const store = createStore(testCatalog, startedGame(testCatalog));
  attachAutosave(store, createStorage(kv), () => {});
  store.advance(59); expect(kv.data.has(SAVE_KEY)).toBe(false);
  store.advance(1);  expect(JSON.parse(kv.data.get(SAVE_KEY)!).clockMinutes).toBe(60);
  store.dispatch((s, c) => setLinePrice(s, c, 'alfa-beta', 3000));
  expect(JSON.parse(kv.data.get(SAVE_KEY)!).lines[0].priceCents).toBe(3000);
});
test('foco de revisão: armazenamento cheio avisa uma vez e o jogo segue', () => {
  const kv = { ...memoryKv(), setItem: () => { throw new Error('cheio'); } }; let fails = 0;
  const store = createStore(testCatalog, startedGame(testCatalog));
  attachAutosave(store, createStorage(kv), () => fails++);
  store.advance(60); store.advance(60); store.advance(60);
  expect(fails).toBe(1);
  expect(store.getState().clockMinutes).toBe(180);
});
test('depois de desligar, não salva mais', () => {
  const kv = memoryKv(); const store = createStore(testCatalog, startedGame(testCatalog));
  attachAutosave(store, createStorage(kv), () => {})();
  store.advance(60); expect(kv.data.has(SAVE_KEY)).toBe(false);
});
test('grava quando a página fica escondida', () => {
  const kv = memoryKv(); const store = createStore(testCatalog, startedGame(testCatalog));
  let hidden = false; const listeners: Record<string, () => void> = {};
  const doc = { get visibilityState() { return hidden ? 'hidden' : 'visible'; }, addEventListener: (t: string, f: () => void) => { listeners[t] = f; }, removeEventListener: () => {}, defaultView: null } as unknown as Document;
  attachAutosave(store, createStorage(kv), () => {}, doc);
  store.advance(10); hidden = true; listeners.visibilitychange!();
  expect(JSON.parse(kv.data.get(SAVE_KEY)!).clockMinutes).toBe(10);
});
