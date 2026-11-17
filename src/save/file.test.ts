import { expect, test } from 'vitest';
import { createGame } from '../sim/newGame';
import { testCatalog, testCompany } from '../sim/testkit';
import { advance } from '../sim/tick';
import { exportFileName, importText } from './file';
import { serialize } from './schema';

const s1 = () => createGame(testCatalog, testCompany);
const s2 = () => advance(s1(), testCatalog, 300);

test('nome do arquivo exportado', () => {
  expect(exportFileName({ ...s1(), company: { ...testCompany, name: 'Expresso Catarina' } })).toBe('minha-viacao-expresso-catarina.json');
  expect(exportFileName({ ...s1(), company: { ...testCompany, name: '../../<x>' } })).toBe('minha-viacao-x.json');
  expect(exportFileName({ ...s1(), company: { ...testCompany, name: '???' } })).toBe('minha-viacao-viacao.json');
});
test('importar texto', () => {
  expect(importText(serialize(s2()), testCatalog)).toEqual({ ok: true, state: s2() });
  expect(importText('não é json', testCatalog)).toEqual({ ok: false, error: 'formato' });
});
