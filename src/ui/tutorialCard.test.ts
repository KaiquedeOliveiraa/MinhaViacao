// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { createStore } from '../game/store';
import { buyBus } from '../sim/actions';
import { createGame } from '../sim/newGame';
import { testCatalog, testCompany } from '../sim/testkit';
import type { TutorialStep } from '../sim/types';
import type { PanelTab } from './panel';
import { mountTutorialCard } from './tutorialCard';
import { click } from './uiTestkit';

/** Jogo novo (sem ônibus) no passo pedido, com o cartão montado e a navegação gravada. */
function mount(step: TutorialStep = 'comprar') {
  const store = createStore(testCatalog, { ...createGame(testCatalog, testCompany), tutorial: step }, 0);
  const el = document.createElement('div'); document.body.replaceChildren(el);
  const calls: string[] = [];
  const nav = { openTab: (tab: PanelTab) => { calls.push(`tab:${tab}`); }, openNewLine: () => { calls.push('nova-linha'); } };
  const unmount = mountTutorialCard(el, store, nav);
  return { store, el, calls, unmount };
}
const text = (el: HTMLElement) => el.querySelector('[data-tutorial-text]')?.textContent;

test('mostra o texto do passo atual', () => {
  expect(text(mount('comprar').el)).toBe('Passo 1 de 3 · Compre o seu primeiro ônibus na Loja.');
  expect(text(mount('pintar').el)).toBe('Passo 2 de 3 · Escolha a pintura dele na Garagem.');
  expect(text(mount('linha').el)).toBe('Passo 3 de 3 · Abra a sua primeira linha e coloque o ônibus nela. A primeira linha não paga taxa.');
  expect(mount('fim').el.querySelector('.tutorial-card')).toBeNull();
});
test('o cartão acompanha o passo quando o jogador age', () => {
  const { store, el } = mount('comprar');
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini' }));
  expect(text(el)).toBe('Passo 2 de 3 · Escolha a pintura dele na Garagem.');
});
test('"Abrir a Loja" abre a aba Loja', () => {
  const { el, calls } = mount('comprar');
  expect(el.querySelector('[data-tutorial-action="shop"]')!.textContent).toBe('Abrir a Loja');
  click('[data-tutorial-action="shop"]', el);
  expect(calls).toEqual(['tab:shop']);
});
test('"Abrir a Garagem" abre a aba Garagem', () => {
  const { el, calls } = mount('pintar');
  expect(el.querySelector('[data-tutorial-action="garage"]')!.textContent).toBe('Abrir a Garagem');
  click('[data-tutorial-action="garage"]', el);
  expect(calls).toEqual(['tab:garage']);
});
test('"Manter esta pintura" leva ao passo linha', () => {
  const { store, el } = mount('comprar');
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini' }));
  const keep = el.querySelector<HTMLElement>('[data-tutorial-action="keep-paint"]')!;
  expect(keep.textContent).toBe('Manter esta pintura');
  keep.click();
  expect(store.getState().tutorial).toBe('linha');
  expect(store.getState().buses[0]!.livery).toBe(testCompany.defaultLivery);
  expect(text(el)).toContain('Passo 3 de 3');
});
test('"Nova linha" abre a janela de nova linha', () => {
  const { el, calls } = mount('linha');
  expect(el.querySelector('[data-tutorial-action="new-line"]')!.textContent).toBe('Nova linha');
  click('[data-tutorial-action="new-line"]', el);
  expect(calls).toEqual(['nova-linha']);
});
test('"Pular tutorial" termina o tutorial e remove o cartão', () => {
  for (const step of ['comprar', 'pintar', 'linha'] as const) {
    const { store, el } = mount(step);
    const skip = el.querySelector<HTMLElement>('[data-tutorial-action="skip"]')!;
    expect(skip.textContent).toBe('Pular tutorial');
    skip.click();
    expect(store.getState().tutorial).toBe('fim');
    expect(el.querySelector('.tutorial-card')).toBeNull();
  }
});
test('desmontar tira o cartão e para de ouvir o store', () => {
  const { store, el, unmount } = mount('comprar');
  unmount();
  expect(el.querySelector('.tutorial-card')).toBeNull();
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini' }));
  expect(el.querySelector('.tutorial-card')).toBeNull();
});
