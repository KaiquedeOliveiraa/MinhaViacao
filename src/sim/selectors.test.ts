import { expect, test } from 'vitest';
import { createGame, emptyDayStats } from './newGame';
import { lineOccupancy, lineProfitTodayCents, openableRoutes, openFeeCents, sellValueCents, servedCities } from './selectors';
import { testCatalog, testCompany } from './testkit';
import { advance } from './tick';

test('cidades atendidas e rotas que podem ser abertas', () => {
  const s = createGame(testCatalog, testCompany);
  expect(servedCities(s).sort()).toEqual(['alfa', 'beta']);
  expect(openableRoutes(s, testCatalog).map(r => `${r.a}>${r.b}`).sort()).toEqual(['alfa>gama', 'beta>gama']);
  expect(openFeeCents(testCatalog, 'beta', 'gama')).toBe(1_000_000);
});
test('lotação e lucro do dia', () => {
  const s = advance(createGame(testCatalog, testCompany), testCatalog, 720); // meio-dia
  const line = s.lines[0]!;
  expect(lineOccupancy({ ...line, today: emptyDayStats(), yesterday: emptyDayStats() })).toBeNull();
  expect(lineOccupancy(line)).toBe(line.today.passengers / line.today.seatsOffered);
  expect(lineProfitTodayCents(s, line)).toBe(line.today.revenueCents - line.today.dieselCents - 17_500);
  expect(sellValueCents(testCatalog, s.buses[0]!)).toBe(1_000_000);
});
