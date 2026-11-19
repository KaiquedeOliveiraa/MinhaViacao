// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { RIVALS } from '../data/rivals';
import { createStore } from '../game/store';
import { createGame } from '../sim/newGame';
import { testCatalog, testCompany } from '../sim/testkit';
import { openRivalsDialog } from './rivalsDialog';

const open = (cash?: number) => {
  document.body.innerHTML = '';
  const g = createGame(testCatalog, testCompany);
  openRivalsDialog(createStore(testCatalog, cash === undefined ? g : { ...g, cashCents: cash }));
};

test('um item por rival, com cadeado, nome, região e requisito', () => {
  open();
  const items = [...document.querySelectorAll('[data-rival]')];
  expect(items.map(n => n.getAttribute('data-rival'))).toEqual(RIVALS.map(r => r.id));
  for (const [i, r] of RIVALS.entries()) {
    expect(items[i]!.querySelector('svg.padlock')).not.toBeNull();
    expect(items[i]!.textContent).toContain(r.name);
    expect(items[i]!.querySelector('[role="progressbar"]')).not.toBeNull();
  }
  expect(items[0]!.textContent).toMatch(/\d+ linhas/);
  expect(items.some(n => /Patrimônio de R\$ [\d.,]+ (mil|milhão|milhões)/.test(n.textContent!))).toBe(true);
  expect(items.some(n => /\d+ ônibus/.test(n.textContent!))).toBe(true);
  expect(document.querySelector('img')).toBeNull();
});
test('requisito cumprido mostra Desbloqueio em breve', () => {
  open(50_000_000_000);
  const patr = RIVALS.find(r => r.requirement.kind === 'patrimonio')!;
  expect(document.querySelector(`[data-rival="${patr.id}"]`)!.textContent).toContain('Desbloqueio em breve');
});
test('fecha com o botão', () => {
  open();
  (document.querySelector('[data-action="close-rivals"]') as HTMLElement).click();
  expect(document.querySelector('.rivals-panel')).toBeNull();
});
