// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { h } from './dom';

test('texto do jogador nunca vira HTML', () => {
  const el = h('p', null, '<img src=x onerror=alert(1)>');
  expect(el.querySelector('img')).toBeNull();
  expect(el.textContent).toBe('<img src=x onerror=alert(1)>');
});
test('innerHTML é proibido', () => { expect(() => h('p', { innerHTML: '<b>x</b>' })).toThrow(); });
test('atributos, classe, dataset e eventos', () => {
  let clicks = 0;
  const b = h('button', { class: 'btn', dataset: { live: 'cash' }, 'aria-pressed': 'true', onClick: () => clicks++ }, 'Ok', 3);
  b.click();
  expect([b.className, b.dataset.live, b.getAttribute('aria-pressed'), b.textContent, clicks]).toEqual(['btn', 'cash', 'true', 'Ok3', 1]);
});
