// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { mountShopTab } from './shopTab';
import { click, flush, setup } from './uiTestkit';

test('sem caixa, o botão diz quanto falta', () => {
  const { store, el } = setup(); mountShopTab(el, store);
  const buy = el.querySelector<HTMLButtonElement>('[data-model="mini"] [data-action="buy"]')!;
  expect(buy.disabled).toBe(true);
  expect(buy.textContent).toBe('Faltam R$ 5.000');
});
test('o botão libera quando o caixa alcança o preço', () => {
  const { store, el } = setup(1_990_000); mountShopTab(el, store);
  store.advance(61); // a primeira viagem rende R$ 88
  expect(el.querySelector<HTMLButtonElement>('[data-action="buy"]')!.disabled).toBe(true);
  store.replace({ ...store.getState(), cashCents: 2_000_000 });
  expect(el.querySelector<HTMLButtonElement>('[data-action="buy"]')!.disabled).toBe(false);
});
test('comprar pede o nome; cancelar não compra', async () => {
  const { store, el } = setup(5_000_000); mountShopTab(el, store);
  click('[data-action="buy"]', el); await flush(); click('[data-action="cancel"]'); await flush();
  expect(store.getState().buses).toHaveLength(1);
  click('[data-action="buy"]', el); await flush(); click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses).toHaveLength(2);
  expect(store.getState().buses[1]!.name).toMatch(/#2$/);
});
test('um cartão por oferta, com novo/usado, ano e km do usado', () => {
  const { store, el } = setup(); mountShopTab(el, store);
  expect([...el.querySelectorAll<HTMLElement>('[data-offer]')].map(e => [e.dataset.offer, e.dataset.model])).toEqual([
    ['mini-novo', 'mini'], ['grande-novo', 'grande'], ['grande-2020', 'grande'],
  ]);
  const used = el.querySelector('[data-offer="grande-2020"]')!.textContent!;
  expect(used).toContain('Grande');
  expect(used).toContain('Usado');
  expect(used).toContain('2020');
  expect(el.querySelector('[data-offer="grande-2020"] [data-spec="km"]')!.textContent).toBe('300.000 km');
  expect(used).toContain('R$ 40.000');
  const novo = el.querySelector('[data-offer="grande-novo"]')!;
  expect(novo.textContent).toContain('Novo');
  expect(novo.textContent).toContain('R$ 60.000');
  expect(novo.querySelector('[data-spec="km"]')).toBeNull();
  expect(novo.querySelector('[data-spec="year"]')).toBeNull();
});
test('comprar uma oferta usada traz o ônibus com o ano e a quilometragem dela', async () => {
  const { store, el } = setup(5_000_000); mountShopTab(el, store);
  click('[data-offer="grande-2020"] [data-action="buy"]', el); await flush(); click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses[1]).toMatchObject({ modelId: 'grande', year: 2020, odometerKm: 300_000 });
  expect(store.getState().cashCents).toBe(1_000_000);
});
