import { expect, test } from 'vitest';
import { buyBus, setLinePrice } from '../sim/actions';
import { createGame } from '../sim/newGame';
import { testCatalog, testCompany } from '../sim/testkit';
import { createStore } from './store';

test('ação com erro não muda o estado nem emite change', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  const before = store.getState(); let changes = 0; store.on('change', () => changes++);
  expect(store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini' })).ok).toBe(false);
  expect(store.getState()).toBe(before); expect(changes).toBe(0);
});
test('ação com sucesso troca o estado e emite change uma vez', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  let changes = 0; store.on('change', () => changes++);
  store.dispatch((s, c) => setLinePrice(s, c, 'alfa-beta', 3000));
  expect(store.getState().lines[0]!.priceCents).toBe(3000); expect(changes).toBe(1);
});
test('tick a cada avanço e hour só ao cruzar a hora', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  let ticks = 0, hours = 0; store.on('tick', () => ticks++); store.on('hour', () => hours++);
  store.advance(59); store.advance(1); store.advance(30); store.advance(0);
  expect(ticks).toBe(3); expect(hours).toBe(1);
});
test('cancelar a inscrição para de receber eventos', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  let n = 0; const off = store.on('tick', () => n++); store.advance(1); off(); store.advance(1);
  expect(n).toBe(1);
});
test('velocidade começa em 1 e mudar emite change', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  let changes = 0; store.on('change', () => changes++);
  expect(store.getSpeed()).toBe(1);
  store.setSpeed(4);
  expect(store.getSpeed()).toBe(4); expect(changes).toBe(1);
});
