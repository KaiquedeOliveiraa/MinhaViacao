// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { mountPanel } from './panel';
import { click, setup } from './uiTestkit';

test('Garagem e Loja expandem o painel; Voltar ao mapa recolhe', () => {
  const { store, el } = setup(); mountPanel(el, store);
  expect(el.querySelector('[data-expanded="true"]')).toBeNull();
  click('[data-tab="garage"]', el);
  expect(el.querySelector('[data-expanded="true"]')).not.toBeNull();
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(1);
  click('[data-action="back"]', el);
  expect(el.querySelector('[data-expanded="true"]')).toBeNull();
  expect(el.querySelectorAll('[data-line]')).toHaveLength(1);
});
test('select abre uma aba por fora (o tutorial usa) e unmount desmonta a aba', () => {
  const { store, el } = setup(); const panel = mountPanel(el, store);
  panel.select('shop');
  expect(el.querySelector('[data-tab="shop"]')!.getAttribute('aria-selected')).toBe('true');
  expect(el.querySelectorAll('[data-offer]')).toHaveLength(3); // uma por oferta do catálogo de teste
  panel.select('garage');
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(1);
  panel.unmount();
  store.replace({ ...store.getState(), buses: [] });
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(1); // desmontada: não reage mais ao store
});
test('sem matchMedia (jsdom), o painel começa na aba Linhas', () => {
  const { store, el } = setup(); mountPanel(el, store);
  expect(el.querySelector('[data-tab="lines"]')!.getAttribute('aria-selected')).toBe('true');
});
