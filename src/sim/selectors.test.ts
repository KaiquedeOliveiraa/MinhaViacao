import { expect, test } from 'vitest';
import { createGame, emptyDayStats } from './newGame';
import { lineOccupancy, lineProfitTodayCents, openableRoutes, openFeeCents, openFeeForStateCents, sellValueCents, servedCities } from './selectors';
import { startedGame, testCatalog, testCompany } from './testkit';
import { advance } from './tick';

test('cidades atendidas e rotas que podem ser abertas', () => {
  const s = startedGame(testCatalog);
  expect(servedCities(s).sort()).toEqual(['alfa', 'beta']);
  expect(openableRoutes(s, testCatalog).map(r => `${r.a}>${r.b}`).sort()).toEqual(['alfa>gama', 'beta>gama']);
  expect(openFeeCents(testCatalog, 'beta', 'gama')).toBe(1_000_000);
});
test('lotação e lucro do dia', () => {
  const s = advance(startedGame(testCatalog), testCatalog, 720); // meio-dia
  const line = s.lines[0]!;
  expect(lineOccupancy({ ...line, today: emptyDayStats(), yesterday: emptyDayStats() })).toBeNull();
  expect(lineOccupancy(line)).toBe(line.today.passengers / line.today.seatsOffered);
  expect(lineProfitTodayCents(s, line)).toBe(line.today.revenueCents - line.today.dieselCents - 17_500);
  expect(sellValueCents(testCatalog, s.buses[0]!)).toBe(1_000_000);
});
test('a primeira linha da viação não paga taxa; depois dela, paga', () => {
  const s = createGame(testCatalog, testCompany);
  expect(openFeeForStateCents(s, testCatalog, 'alfa', 'beta')).toBe(0);
  const started = startedGame(testCatalog);
  expect(openFeeForStateCents(started, testCatalog, 'beta', 'gama')).toBe(openFeeCents(testCatalog, 'beta', 'gama'));
});
test('sem linhas, as rotas que saem da sede aparecem com taxa 0', () => {
  const routes = openableRoutes(createGame(testCatalog, testCompany), testCatalog);
  expect(routes.map(r => `${r.a}>${r.b}`).sort()).toEqual(['alfa>beta', 'alfa>gama']);
  expect(routes.every(r => r.feeCents === 0)).toBe(true);
  expect(openableRoutes(startedGame(testCatalog), testCatalog).find(r => r.b === 'gama' && r.a === 'beta')!.feeCents).toBe(1_000_000);
});
