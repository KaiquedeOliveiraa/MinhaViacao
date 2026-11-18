import { createStore } from '../game/store';
import { startedGame, testCatalog } from '../sim/testkit';

/** Início comum dos testes de interface da fase 5: store pausado com o catálogo de teste, já com o ônibus na primeira linha. */
export const setup = (cashCents = 1_500_000) => {
  const store = createStore(testCatalog, { ...startedGame(testCatalog), cashCents }, 0); // pausado
  const el = document.createElement('div'); document.body.replaceChildren(el);
  return { store, el };
};
export const flush = () => new Promise(r => setTimeout(r, 0));
export const click = (sel: string, root: ParentNode = document) => root.querySelector<HTMLElement>(sel)!.click();
