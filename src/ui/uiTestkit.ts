import { createStore } from '../game/store';
import { createGame } from '../sim/newGame';
import { testCatalog, testCompany } from '../sim/testkit';

/** Início comum dos testes de interface da fase 5: store pausado com o catálogo de teste. */
export const setup = (cashCents = 1_500_000) => {
  const store = createStore(testCatalog, { ...createGame(testCatalog, testCompany), cashCents }, 0); // pausado
  const el = document.createElement('div'); document.body.replaceChildren(el);
  return { store, el };
};
export const flush = () => new Promise(r => setTimeout(r, 0));
export const click = (sel: string, root: ParentNode = document) => root.querySelector<HTMLElement>(sel)!.click();
