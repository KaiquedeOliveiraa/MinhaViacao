// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { createStorage, SAVE_KEY } from '../save/storage';
import { createGame } from '../sim/newGame';
import { memoryKv, testCatalog, testCompany } from '../sim/testkit';
import { boot } from './app';

const root = () => { const r = document.createElement('div'); document.body.replaceChildren(r); return r; };
const busy = { request: async (_n: string, _o: object, cb: (l: object | null) => unknown) => cb(null) } as unknown as Pick<LockManager, 'request'>;
const free = { request: async (_n: string, _o: object, cb: (l: object | null) => unknown) => cb({}) } as unknown as Pick<LockManager, 'request'>;

test('foco de revisão: save ilegível abre a tela inicial com aviso e não apaga nada', async () => {
  const kv = memoryKv(); kv.data.set(SAVE_KEY, '{"version":1,"cashCents":"hack"}'); const r = root();
  await boot(r, { catalog: testCatalog, kv, locks: free });
  expect(r.textContent).toContain('Seu jogo salvo não pôde ser lido');
  expect(r.textContent).toContain('Começar uma viação');
  expect(r.textContent).not.toContain('Continuar');
  expect(kv.data.get(SAVE_KEY)).toBe('{"version":1,"cashCents":"hack"}');
});
test('foco de revisão: sem armazenamento, o jogo abre normalmente', async () => {
  const r = root(); await boot(r, { catalog: testCatalog, kv: null, locks: free });
  expect(r.textContent).toContain('Começar uma viação');
});
test('jogo salvo válido oferece Continuar com o nome da viação', async () => {
  const kv = memoryKv(); createStorage(kv).save(createGame(testCatalog, testCompany)); const r = root();
  await boot(r, { catalog: testCatalog, kv, locks: free });
  expect(r.textContent).toContain(`Continuar: ${testCompany.name}`);
});
test('segunda aba não joga', async () => {
  const r = root(); await boot(r, { catalog: testCatalog, kv: memoryKv(), locks: busy });
  expect(r.textContent).toContain('O jogo já está aberto em outra aba');
  expect(r.querySelector('button')).toBeNull();
});
test('?galeria abre mesmo com o jogo aberto em outra aba (não usa a trava)', async () => {
  window.history.pushState({}, '', '/?galeria');
  try {
    const r = root(); await boot(r, { catalog: testCatalog, kv: memoryKv(), locks: busy });
    expect(r.textContent).not.toContain('O jogo já está aberto em outra aba');
    expect(r.childElementCount).toBeGreaterThan(0);
  } finally { window.history.pushState({}, '', '/'); }
});
