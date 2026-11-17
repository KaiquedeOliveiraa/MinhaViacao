import { expect, test } from 'vitest';
import { catalog, startModel } from './catalog';
import { createGame } from './newGame';
import { testCompany } from './testkit';
import { advance } from './tick';

test('com sede em Ibirama, o segundo micro-ônibus chega entre 20 e 30 minutos reais', () => {
  let s = createGame(catalog, { ...testCompany, hqCityId: 'ibirama' });
  const price = startModel(catalog).priceCents;
  let minutes = 0;
  while (s.cashCents < price && minutes < 5000) { s = advance(s, catalog, 10); minutes += 10; }
  expect(minutes).toBeGreaterThanOrEqual(1200);
  expect(minutes).toBeLessThanOrEqual(1800);
});
