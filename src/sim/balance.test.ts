import { expect, test } from 'vitest';
import { catalog } from './catalog';
import { cheapestOffer } from './market';
import { startedGame, testCompany } from './testkit';
import { advance } from './tick';

// Mesmo fluxo de npm run calibrate: jogo novo, compra a oferta mais barata (micro usado) e abre a primeira linha (sem taxa) com ele.
test('com sede em Ibirama, o segundo micro-ônibus chega entre 20 e 30 minutos reais', () => {
  let s = startedGame(catalog, { ...testCompany, hqCityId: 'ibirama' });
  const price = cheapestOffer(catalog).priceCents;
  let minutes = 0;
  while (s.cashCents < price && minutes < 5000) { s = advance(s, catalog, 10); minutes += 10; }
  expect(minutes).toBeGreaterThanOrEqual(1200);
  expect(minutes).toBeLessThanOrEqual(1800);
});
