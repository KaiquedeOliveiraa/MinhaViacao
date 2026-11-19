// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { createStore } from '../game/store';
import { serialize } from '../save/schema';
import { createStorage, SAVE_KEY } from '../save/storage';
import { createGame } from '../sim/newGame';
import { memoryKv, testCatalog, testCompany } from '../sim/testkit';
import { advance } from '../sim/tick';
import { importIntoGame, openCompanyMenu } from './companyMenu';

test('importar arquivo inválido não mexe no jogo atual', () => {
  const kv = memoryKv(); const storage = createStorage(kv);
  const store = createStore(testCatalog, createGame(testCatalog, testCompany)); const before = store.getState();
  expect(importIntoGame(store, storage, 'isto não é um save')).toBe(false);
  expect(importIntoGame(store, storage, JSON.stringify({ version: 99 }))).toBe(false);
  expect(store.getState()).toBe(before);
  expect(kv.data.size).toBe(0);
});
test('importar arquivo válido troca o jogo e grava', () => {
  const kv = memoryKv(); const storage = createStorage(kv);
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  const other = advance(createGame(testCatalog, { ...testCompany, name: 'Outra' }), testCatalog, 500);
  expect(importIntoGame(store, storage, serialize(other))).toBe(true);
  expect(store.getState()).toEqual(other);
  expect(JSON.parse(kv.data.get(SAVE_KEY)!).company.name).toBe('Outra');
});
test('o menu tem os seis itens', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  openCompanyMenu({ store, storage: createStorage(memoryKv()), onEditIdentity() {}, onExit() {}, onNewGame() {} });
  expect([...document.querySelectorAll('[data-menu]')].map(n => n.getAttribute('data-menu'))).toEqual(['edit', 'rivals', 'export', 'import', 'new', 'exit']);
});
test('a mensagem de importação inválida diz o motivo', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  importIntoGame(store, createStorage(memoryKv()), JSON.stringify({ version: 99 }));
  expect(document.querySelector('.toast-stack')!.textContent).toContain('Esse jogo salvo é de uma versão mais nova do jogo.');
});
