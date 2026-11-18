// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { testCompany } from '../sim/testkit';
import { mountTopBar } from './topBar';
import { click, setup } from './uiTestkit';

test('mostra empresa, caixa e relógio, e atualiza no tick', () => {
  const { store, el } = setup(); mountTopBar(el, store, { onMenu() {} });
  const live = (k: string) => el.querySelector(`[data-live="${k}"]`)!;
  expect(el.textContent).toContain(testCompany.name);
  expect(live('cash').textContent).toBe('R$ 15.000');
  expect(live('clock').textContent).toBe('Dia 1 · 00:00');
  store.advance(61);
  expect(live('cash').textContent).toBe('R$ 15.088');
  expect(live('clock').textContent).toBe('Dia 1 · 01:01');
});
test('caixa negativo fica vermelho', () => {
  const { store, el } = setup(-5_000); mountTopBar(el, store, { onMenu() {} });
  expect(el.querySelector('[data-live="cash"]')!.classList.contains('money-down')).toBe(true);
});
test('botões de velocidade', () => {
  const { store, el } = setup(); mountTopBar(el, store, { onMenu() {} });
  click('[data-speed="4"]', el);
  expect(store.getSpeed()).toBe(4);
  expect(el.querySelector('[data-speed="4"]')!.getAttribute('aria-pressed')).toBe('true');
  expect(el.querySelector('[data-speed="0"]')!.getAttribute('aria-pressed')).toBe('false');
});
test('desmontar para de atualizar', () => {
  const { store, el } = setup(); const off = mountTopBar(el, store, { onMenu() {} });
  off(); store.advance(61);
  expect(el.querySelector('[data-live="cash"]')?.textContent ?? 'R$ 15.000').toBe('R$ 15.000');
});
test('barra de espaço alterna entre pausa e a última velocidade, menos em campo de texto', () => {
  const { store, el } = setup(); const off = mountTopBar(el, store, { onMenu() {} });
  click('[data-speed="2"]', el);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  expect(store.getSpeed()).toBe(0);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  expect(store.getSpeed()).toBe(2);
  const input = document.createElement('input'); document.body.appendChild(input);
  input.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  expect(store.getSpeed()).toBe(2);
  off();
});
test('o botão de menu chama onMenu', () => {
  let menus = 0; const { store, el } = setup(); mountTopBar(el, store, { onMenu: () => menus++ });
  click('[data-action="menu"]', el);
  expect(menus).toBe(1);
});
