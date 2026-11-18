// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { buyBus } from '../sim/actions';
import { testCompany } from '../sim/testkit';
import { mountGarageTab } from './garageTab';
import { click, flush, setup } from './uiTestkit';

const withTwo = () => { const s = setup(5_000_000); s.store.dispatch((st, c) => buyBus(st, c, { modelId: 'mini', name: 'Reserva' })); return s; };
test('um cartão por ônibus, com desenho, selo e valor de venda', () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(2);
  expect(el.querySelector('[data-bus="bus-1"]')!.textContent).toContain('Alfa ⇄ Beta');
  expect(el.querySelector('[data-bus="bus-2"]')!.textContent).toContain('Parado');
  expect(el.querySelector('[data-bus="bus-2"] svg [data-region="body"]')!.getAttribute('fill')).toBe(testCompany.primaryColor);
  expect(el.querySelector('[data-bus="bus-2"] [data-action="sell"]')!.textContent).toBe('Vender por R$ 10.000');
});
test('sem ônibus, a Garagem diz para comprar na Loja', () => {
  const { store, el } = setup(5_000_000); store.replace({ ...store.getState(), buses: [], lines: [] }); mountGarageTab(el, store);
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(0);
  expect(el.querySelector('.empty')!.textContent).toBe('Nenhum ônibus na garagem. Compre o primeiro na Loja.');
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini' }));
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(1);
  expect(el.querySelector('.empty')).toBeNull();
});
test('o último ônibus não pode ser vendido', () => {
  const { store, el } = setup(); mountGarageTab(el, store);
  const sell = el.querySelector<HTMLButtonElement>('[data-action="sell"]')!;
  expect(sell.disabled).toBe(true);
  expect(sell.title).toBe('Sua viação precisa de pelo menos um ônibus.');
});
test('trocar a pintura de um ônibus não muda os outros', () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  click('[data-bus="bus-2"] [data-livery="plain"]', el);
  expect(store.getState().buses.map(b => b.livery)).toEqual(['diagonal', 'plain']);
  expect(el.querySelector('[data-bus="bus-2"] svg [data-region="stripe"]')).toBeNull();
  expect(el.querySelector('[data-bus="bus-1"] svg [data-region="stripe"]')).not.toBeNull();
});
test('renomear e vender passam pelas janelas', async () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  click('[data-bus="bus-2"] [data-action="rename"]', el); await flush();
  document.querySelector<HTMLInputElement>('[role="dialog"] input')!.value = '<b>Trovão</b>'; click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses[1]!.name).toBe('<b>Trovão</b>');
  expect(el.querySelector('[data-bus="bus-2"] b')).toBeNull();                 // aparece como texto
  click('[data-bus="bus-2"] [data-action="sell"]', el); await flush(); click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses).toHaveLength(1);
  expect(store.getState().cashCents).toBe(3_000_000 + 1_000_000);
});
