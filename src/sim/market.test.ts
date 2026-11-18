import { expect, test } from 'vitest';
import { SALE_MAX_RATIO } from '../data/balance';
import { buyOffer } from './actions';
import { catalog, getModel } from './catalog';
import { allOffers, cheapestOffer, fairValueCents, gameYear, hash01, saleChancePerHour, sellNowCents } from './market';
import { createGame } from './newGame';
import { testCatalog, testCompany } from './testkit';
import type { Bus } from './types';

const DAY = 1440;
const bus = (over: Partial<Bus> = {}): Bus => ({
  id: 'bus-1', modelId: 'mini', name: 'x', livery: 'plain', lineId: null, trip: { phase: 'idle' }, driverId: null,
  year: 2026, odometerKm: 0, listing: null, ...over,
});

test('ano do jogo: 2026 no primeiro ano, 2027 a partir do dia 366', () => {
  expect(gameYear(0)).toBe(2026);
  expect(gameYear(365 * DAY - 1)).toBe(2026);
  expect(gameYear(365 * DAY)).toBe(2027);
  expect(gameYear(3 * 365 * DAY + 10)).toBe(2029);
});

test('valor justo do novo no ano 0 é 85% do preço do novo (perde 15% ao sair da loja)', () => {
  expect(fairValueCents(testCatalog, bus(), 0)).toBe(1_700_000);
  for (const model of catalog.models) {
    expect(fairValueCents(catalog, bus({ modelId: model.id }), 0)).toBe(Math.round(model.priceCents * 0.85));
  }
});

test('valor justo cai 10% por ano e com a quilometragem', () => {
  expect(fairValueCents(testCatalog, bus(), 365 * DAY)).toBe(1_530_000);
  expect(fairValueCents(testCatalog, bus({ year: 2024, odometerKm: 150_000 }), 0)).toBe(Math.round(2_000_000 * 0.85 * 0.81 * 0.9));
});

test('pisos de idade (30%) e de quilometragem (60%)', () => {
  expect(fairValueCents(testCatalog, bus({ year: 1990 }), 0)).toBe(510_000);
  expect(fairValueCents(testCatalog, bus({ odometerKm: 900_000 }), 0)).toBe(1_020_000);
  expect(fairValueCents(testCatalog, bus({ odometerKm: 5_000_000 }), 0)).toBe(1_020_000);
  expect(fairValueCents(testCatalog, bus({ year: 1990, odometerKm: 5_000_000 }), 0)).toBe(306_000);
  expect(fairValueCents(testCatalog, bus({ year: 2030 }), 0)).toBe(1_700_000); // ano à frente não valoriza
});

test('vender agora paga 80% do valor justo', () => {
  expect(sellNowCents(testCatalog, bus(), 0)).toBe(1_360_000);
  expect(sellNowCents(testCatalog, bus({ year: 2024, odometerKm: 150_000 }), 0)).toBe(Math.round(0.8 * Math.round(2_000_000 * 0.85 * 0.81 * 0.9)));
});

test('modelo desconhecido vale zero', () => {
  expect(fairValueCents(testCatalog, bus({ modelId: 'jato' }), 0)).toBe(0);
  expect(sellNowCents(testCatalog, bus({ modelId: 'jato' }), 0)).toBe(0);
});

test('chance de venda por hora', () => {
  const fair = 1_000_000;
  expect(saleChancePerHour(900_000, fair)).toBe(0.25);
  expect(saleChancePerHour(1_000_000, fair)).toBe(0.25);
  expect(saleChancePerHour(1_075_000, fair)).toBeCloseTo(0.0625, 10);
  expect(saleChancePerHour(1_149_999, fair)).toBeGreaterThan(0);
  expect(saleChancePerHour(1_150_000, fair)).toBe(0);
  expect(saleChancePerHour(2_000_000, fair)).toBe(0);
  expect(saleChancePerHour(1_000_000, 0)).toBe(0);
});

test('hash01 é estável e fica em [0, 1)', () => {
  expect(hash01('bus-1:5')).toBe(hash01('bus-1:5'));
  expect(hash01('bus-1:5')).not.toBe(hash01('bus-1:6'));
  let sum = 0;
  for (let i = 0; i < 2000; i++) {
    const v = hash01(`bus-${i % 7}:${i}`);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
    sum += v;
  }
  expect(sum / 2000).toBeGreaterThan(0.45);
  expect(sum / 2000).toBeLessThan(0.55);
});

test('catálogo: seis modelos com categoria e uma loja central fora do mapa', () => {
  expect(catalog.models.map((m) => [m.id, m.category, m.priceCents])).toEqual([
    ['van', 'van', 3_800_000], ['micro', 'micro', 5_500_000], ['micro32', 'micro', 7_500_000],
    ['conv', 'onibus', 12_000_000], ['rodo', 'rodoviario', 17_000_000], ['rodo42', 'rodoviario', 21_000_000],
  ]);
  expect(catalog.dealers.map((d) => [d.id, d.name, d.cityId, d.lat, d.lng])).toEqual([['central', 'Garagem Central', null, null, null]]);
});

test('cada modelo tem uma oferta nova (2026, 0 km, preço do modelo) e uma ou duas usadas', () => {
  const offers = allOffers(catalog);
  expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length);
  for (const offer of offers) expect(getModel(catalog, offer.modelId)).toBeDefined();
  for (const model of catalog.models) {
    const mine = offers.filter((o) => o.modelId === model.id);
    const novos = mine.filter((o) => o.condition === 'novo');
    expect(novos).toHaveLength(1);
    expect(novos[0]).toMatchObject({ year: 2026, odometerKm: 0, priceCents: model.priceCents, dealerId: 'central' });
    const usados = mine.filter((o) => o.condition === 'usado');
    expect(usados.length).toBeGreaterThanOrEqual(1);
    expect(usados.length).toBeLessThanOrEqual(2);
    for (const o of usados) { expect(o.year).toBeLessThan(2026); expect(o.odometerKm).toBeGreaterThan(0); }
  }
});

test('a oferta mais barata é o micro usado 2012, 480.000 km, R$ 20.000', () => {
  expect(cheapestOffer(catalog)).toMatchObject({ modelId: 'micro', condition: 'usado', year: 2012, odometerKm: 480_000, priceCents: 2_000_000 });
  const others = allOffers(catalog).filter((o) => o.id !== cheapestOffer(catalog).id);
  for (const o of others) expect(o.priceCents).toBeGreaterThan(2_000_000);
});

test('sem arbitragem: o ônibus recém-comprado de qualquer oferta vale no máximo o preço dela', () => {
  for (const c of [catalog, testCatalog]) {
    for (const offer of allOffers(c)) {
      const s = { ...createGame(c, { ...testCompany, hqCityId: c.cities[0]!.id }), cashCents: 1e9 };
      const r = buyOffer(s, c, { offerId: offer.id });
      if (!r.ok) throw new Error(r.error);
      const bought = r.state.buses.at(-1)!;
      expect(fairValueCents(c, bought, 0)).toBeLessThanOrEqual(offer.priceCents);
      expect(sellNowCents(c, bought, 0)).toBeLessThan(offer.priceCents);
    }
  }
});

test('sem lucro por anúncio: nenhum ônibus recém-comprado vende anunciado acima do preço que custou', () => {
  expect(SALE_MAX_RATIO).toBe(1.15);
  for (const offer of allOffers(catalog)) {
    const s = { ...createGame(catalog, { ...testCompany, hqCityId: 'blumenau' }), cashCents: 1e9 };
    const r = buyOffer(s, catalog, { offerId: offer.id });
    if (!r.ok) throw new Error(r.error);
    const bought = r.state.buses.at(-1)!;
    const fair = fairValueCents(catalog, bought, 0);
    expect(SALE_MAX_RATIO * fair, offer.id).toBeLessThan(offer.priceCents);
    expect(fair, offer.id).toBeLessThanOrEqual(offer.priceCents);
    expect(sellNowCents(catalog, bought, 0), offer.id).toBeLessThan(offer.priceCents);
    // o anúncio mais caro que ainda vende não cobre o preço pago
    expect(saleChancePerHour(offer.priceCents, fair), offer.id).toBe(0);
  }
});
