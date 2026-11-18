import { expect, test } from 'vitest';
import { createGame } from '../sim/newGame';
import { memoryKv as memory, testCatalog, testCompany } from '../sim/testkit';
import { advance } from '../sim/tick';
import { serialize } from './schema';
import { BACKUP_KEY, createStorage, SAVE_KEY } from './storage';

const s1 = () => createGame(testCatalog, testCompany);
const s2 = () => advance(s1(), testCatalog, 300);

test('sem nada gravado', () => { expect(createStorage(memory()).load(testCatalog)).toEqual({ state: null, damaged: false }); });
test('grava e lê', () => {
  const st = createStorage(memory());
  expect(st.save(s1())).toBe(true);
  expect(st.load(testCatalog)).toEqual({ state: s1(), source: 'principal' });
});
test('a gravação anterior vira backup', () => {
  const kv = memory(); const st = createStorage(kv);
  st.save(s1()); st.save(s2());
  expect(JSON.parse(kv.data.get(BACKUP_KEY)!)).toEqual(JSON.parse(serialize(s1())));
});
test('principal corrompido: volta para o backup', () => {
  const kv = memory(); const st = createStorage(kv);
  st.save(s1()); st.save(s2()); kv.data.set(SAVE_KEY, '{"version":1,"cash');
  expect(st.load(testCatalog)).toEqual({ state: s1(), source: 'backup' });
});
test('foco de revisão: os dois ilegíveis, avisa e não apaga', () => {
  const kv = memory(); kv.data.set(SAVE_KEY, 'lixo'); kv.data.set(BACKUP_KEY, '[]');
  expect(createStorage(kv).load(testCatalog)).toEqual({ state: null, damaged: true });
  expect(kv.data.get(SAVE_KEY)).toBe('lixo');
});
test('foco de revisão: armazenamento cheio ou ausente não derruba o jogo', () => {
  const full = { ...memory(), setItem: () => { throw new DOMException('cheio', 'QuotaExceededError'); } };
  expect(createStorage(full).save(s1())).toBe(false);
  expect(createStorage(null).save(s1())).toBe(false);
  expect(createStorage(null).load(testCatalog)).toEqual({ state: null, damaged: false });
});
test('clear apaga principal e backup', () => {
  const kv = memory(); const st = createStorage(kv); st.save(s1()); st.save(s2()); st.clear();
  expect(kv.data.size).toBe(0);
});
