// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { mountListTab } from './listTab';
import { setup } from './uiTestkit';

test('cabeçalhos na ordem e uma linha por Line', () => {
  const { store, el } = setup(); mountListTab(el, store);
  expect([...el.querySelectorAll('th')].map(n => n.textContent)).toEqual(['Linha', 'Km', 'Preço', 'Lotação', 'Lucro hoje', 'Veículos', 'Motorista']);
  expect(el.querySelectorAll('tbody tr')).toHaveLength(store.getState().lines.length);
  expect(el.querySelector('tbody tr')!.textContent).toContain('Alfa ⇄ Beta');
});
test('km arredondado e motorista "—" sem motorista', () => {
  const { store, el } = setup(); mountListTab(el, store);
  const cells = [...el.querySelectorAll('tbody tr td')].map(n => n.textContent!);
  const road = store.catalog.roads.find(r => r.id === 'alfa-beta')!;
  expect(cells[1]).toBe(`${Math.round(road.distanceKm)} km`);
  expect(cells[6]).toBe('—');
  expect(cells[5]).toContain(store.getState().buses[0]!.name);
});
test('motorista mostra o id quando o ônibus tem', () => {
  const { store, el } = setup();
  store.replace({ ...store.getState(), buses: store.getState().buses.map(b => ({ ...b, driverId: 'mot-1' })) });
  mountListTab(el, store);
  expect(el.querySelectorAll('tbody tr td')[6]!.textContent).toBe('mot-1');
});
test('o tick atualiza o lucro sem recriar a linha da tabela', () => {
  const { store, el } = setup(); mountListTab(el, store);
  const tr = el.querySelector('tbody tr')!;
  const before = el.querySelector('[data-live="profit"]')!.textContent;
  store.advance(60);
  expect(el.querySelector('tbody tr')).toBe(tr);
  expect(el.querySelector('[data-live="profit"]')!.textContent).not.toBe(before);
});
test('sem linhas: estado vazio', () => {
  const { store, el } = setup();
  store.replace({ ...store.getState(), lines: [], buses: [] });
  mountListTab(el, store);
  expect(el.textContent).toContain('Nenhuma linha ainda.');
  expect(el.querySelector('table')).toBeNull();
});

test('quando o anúncio vende no tick, o ônibus some da coluna Veículos', async () => {
  const { buyBus, listBus, assignBus } = await import('../sim/actions');
  const { sellNowCents } = await import('../sim/market');
  const { store, el } = setup(5_000_000);
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini', name: 'Reserva' }));
  store.dispatch((s, c) => assignBus(s, c, 'bus-2', 'alfa-beta'));
  store.dispatch((s, c) => listBus(s, c, 'bus-2', sellNowCents(c, s.buses[1]!, s.clockMinutes)));
  mountListTab(el, store);
  expect(el.textContent).toContain('Reserva');
  for (let i = 0; i < 400 && store.getState().buses.length > 1; i++) store.advance(60);
  expect(store.getState().buses).toHaveLength(1);
  expect(el.textContent).not.toContain('Reserva');
});
