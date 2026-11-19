import { expect, test, vi } from 'vitest';
import { createStore } from '../game/store';
import { buyBus, listBus, sellBus } from '../sim/actions';
import { sellNowCents } from '../sim/market';
import { startedGame, testCatalog } from '../sim/testkit';
import { watchListingSales } from './saleNotice';

function listedStore() {
  const store = createStore(testCatalog, { ...startedGame(testCatalog), cashCents: 5_000_000 }, 0);
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini', name: 'Reserva' }));
  store.dispatch((s, c) => listBus(s, c, 'bus-2', sellNowCents(c, s.buses[1]!, s.clockMinutes)));
  return store;
}

test('avisa uma única vez quando o anúncio vende no tick', () => {
  const store = listedStore();
  const notify = vi.fn();
  watchListingSales(store, notify);
  const price = store.getState().buses[1]!.listing!.priceCents;
  for (let i = 0; i < 400 && store.getState().buses.length > 1; i++) store.advance(60);
  expect(store.getState().buses).toHaveLength(1);
  expect(notify).toHaveBeenCalledTimes(1);
  expect(notify).toHaveBeenCalledWith('Reserva', price);
  store.advance(600);
  expect(notify).toHaveBeenCalledTimes(1);
});
test('vender na hora não avisa', () => {
  const store = listedStore();
  const notify = vi.fn();
  watchListingSales(store, notify);
  store.dispatch((s, c) => sellBus(s, c, 'bus-2'));
  store.advance(60);
  expect(notify).not.toHaveBeenCalled();
});
