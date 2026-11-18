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
test('sem matchMedia (jsdom), o painel começa na aba Linhas', () => {
  const { store, el } = setup(); mountPanel(el, store);
  expect(el.querySelector('[data-tab="lines"]')!.getAttribute('aria-selected')).toBe('true');
});
