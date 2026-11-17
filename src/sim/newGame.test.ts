import { expect, test } from 'vitest';
import { createGame, validateCompanyInput } from './newGame';
import { testCatalog, testCompany } from './testkit';

test('jogo novo começa com caixa, um ônibus e a linha até a cidade mais próxima', () => {
  const s = createGame(testCatalog, testCompany);
  expect(s.version).toBe(1);
  expect(s.cashCents).toBe(1_500_000);
  expect(s.clockMinutes).toBe(0);
  expect(s.buses).toHaveLength(1);
  expect(s.buses[0]).toMatchObject({ modelId: 'mini', lineId: 'alfa-beta', livery: 'diagonal', trip: { phase: 'waiting', at: 'a', minutesLeft: 0 } });
  expect(s.lines).toHaveLength(1);
  expect(s.lines[0]).toMatchObject({ id: 'alfa-beta', a: 'alfa', b: 'beta', priceCents: 2600, paused: false });
  expect(s.lines[0]!.queueA).toBeCloseTo(200 / 24, 6);
  expect(s.lines[0]!.queueB).toBeCloseTo(200 / 24, 6);
  expect(s.nextBusNumber).toBe(2);
});
test('a linha inicial sai da sede mesmo quando a sede vem depois no alfabeto', () => {
  const s = createGame(testCatalog, { ...testCompany, hqCityId: 'gama' });
  expect(s.lines[0]).toMatchObject({ id: 'beta-gama', a: 'gama', b: 'beta' });
});
test('validação da empresa', () => {
  expect(validateCompanyInput(testCompany, testCatalog)).toEqual([]);
  expect(validateCompanyInput({ ...testCompany, name: '   ' }, testCatalog)).toEqual(['nome']);
  expect(validateCompanyInput({ ...testCompany, name: 'x'.repeat(31) }, testCatalog)).toEqual(['nome']);
  expect(validateCompanyInput({ ...testCompany, hqCityId: 'curitiba' }, testCatalog)).toEqual(['sede']);
  expect(validateCompanyInput({ ...testCompany, primaryColor: 'laranja' }, testCatalog)).toEqual(['cor']);
  expect(validateCompanyInput({ ...testCompany, logo: { kind: 'image', dataUrl: 'javascript:alert(1)' } }, testCatalog)).toEqual(['logo']);
  expect(validateCompanyInput({ ...testCompany, logo: { kind: 'image', dataUrl: 'data:image/png;base64,' + 'A'.repeat(200_001) } }, testCatalog)).toEqual(['logo']);
});
test('o nome da empresa é guardado sem espaços nas pontas', () => {
  expect(createGame(testCatalog, { ...testCompany, name: '  Expresso  ' }).company.name).toBe('Expresso');
});
