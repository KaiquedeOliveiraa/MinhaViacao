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
