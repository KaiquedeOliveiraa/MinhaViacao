import { expect, test } from 'vitest';
import { buyBus, listBus } from './actions';
import { hash01 } from './market';
import { startedGame, testCatalog } from './testkit';
import { advance } from './tick';
import type { ActionResult, GameState } from './types';

const fresh = () => startedGame(testCatalog);

test('avançar zero minutos não muda nada, e não altera o estado recebido', () => {
  const s = fresh(); const copy = structuredClone(s);
  expect(advance(s, testCatalog, 0)).toEqual(s);
  advance(s, testCatalog, 500);
  expect(s).toEqual(copy);
});
test('avançar em pedaços dá o mesmo resultado que avançar de uma vez', () => {
  const a = advance(advance(fresh(), testCatalog, 700), testCatalog, 800);
  expect(a).toEqual(advance(fresh(), testCatalog, 1500));
});
test('primeira viagem: parte no minuto 1 com 8 passageiros e chega no minuto 61', () => {
  const s1 = advance(fresh(), testCatalog, 1);
  expect(s1.buses[0]!.trip).toMatchObject({ phase: 'moving', from: 'a', passengers: 8, fareCents: 2600 });
  const s61 = advance(fresh(), testCatalog, 61);
  expect(s61.buses[0]!.trip).toEqual({ phase: 'waiting', at: 'b', minutesLeft: 10 });
  expect(s61.cashCents).toBe(1_500_000 + 8 * 2600 - 12_000);
  expect(s61.lines[0]!.today).toEqual({ revenueCents: 20_800, dieselCents: 12_000, passengers: 8, seatsOffered: 10 });
});
test('volta: parte da outra ponta no minuto 72 com o ônibus cheio', () => {
  const s = advance(fresh(), testCatalog, 72);
  expect(s.buses[0]!.trip).toMatchObject({ phase: 'moving', from: 'b', passengers: 10 });
});
test('mudar o preço durante a viagem não muda a passagem de quem já embarcou', () => {
  const s = advance(fresh(), testCatalog, 1);
  s.lines[0]!.priceCents = 7800;
  expect(advance(s, testCatalog, 60).cashCents).toBe(1_500_000 + 8 * 2600 - 12_000);
});
test('virada do dia cobra o custo fixo e gira as estatísticas', () => {
  const s = fresh();
  s.clockMinutes = 1439; s.buses[0]!.lineId = null; s.buses[0]!.trip = { phase: 'idle' };
  s.lines[0]!.today.passengers = 7;
  const next = advance(s, testCatalog, 1);
  expect(next.cashCents).toBe(1_500_000 - 35_000);
  expect(next.lines[0]!.yesterday.passengers).toBe(7);
  expect(next.lines[0]!.today.passengers).toBe(0);
});
test('linha pausada não acumula fila nem solta ônibus', () => {
  const s = fresh(); s.lines[0]!.paused = true;
  const next = advance(s, testCatalog, 120);
  expect(next.lines[0]!.queueA).toBeCloseTo(200 / 24, 6);
  expect(next.buses[0]!.trip.phase).toBe('waiting');
});
test('dois ônibus na mesma ponta saem com 70 minutos de intervalo', () => {
  const s = fresh();
  s.buses.push({ ...structuredClone(s.buses[0]!), id: 'b2', name: 'mini #2' });
  expect(advance(s, testCatalog, 70).buses[1]!.trip.phase).toBe('waiting');
  expect(advance(s, testCatalog, 71).buses[1]!.trip.phase).toBe('moving');
});
test('a fila nunca passa do teto de 3 horas', () => {
  let s = fresh();
  for (let i = 0; i < 100; i++) {
    s = advance(s, testCatalog, 60);
    expect(s.lines[0]!.queueA).toBeLessThanOrEqual(25 + 1e-9);
    expect(s.lines[0]!.queueB).toBeLessThanOrEqual(25 + 1e-9);
  }
});
test('foco de revisão: nos extremos de preço, 10 dias depois o caixa segue inteiro e finito', () => {
  for (const price of [780, 7800]) {
    const s = fresh(); s.lines[0]!.priceCents = price;
    const end = advance(s, testCatalog, 14_400);
    expect(Number.isInteger(end.cashCents)).toBe(true);
    expect(Number.isFinite(end.lines[0]!.queueA)).toBe(true);
    expect(end.clockMinutes).toBe(14_400);
  }
});

// Loja realista (fase 2, tarefa 8): odômetro e venda por anúncio.

const ok = (r: ActionResult): GameState => { if (!r.ok) throw new Error(r.error); return r.state; };
/** Valor justo do mini novo, sem km: 85% do preço. */
const FAIR = 1_700_000;
/** bus-1 na linha alfa-beta, bus-2 (mini novo) parado na garagem. */
const withSpare = () => ok(buyBus({ ...fresh(), cashCents: 5_000_000 }, testCatalog, { modelId: 'mini' }));
/** Primeira hora cheia, a partir de `from`, em que o sorteio de `busId` sai abaixo de `chance`. */
const saleHour = (busId: string, chance: number, from = 1) => {
  for (let h = from; h < from + 500; h++) if (hash01(`${busId}:${h}`) < chance) return h;
  throw new Error('sem hora de venda');
};

test('o odômetro sobe a distância da rodovia a cada viagem que chega', () => {
  expect(advance(fresh(), testCatalog, 60).buses[0]!.odometerKm).toBe(0);
  expect(advance(fresh(), testCatalog, 61).buses[0]!.odometerKm).toBe(60);
  expect(advance(fresh(), testCatalog, 131).buses[0]!.odometerKm).toBe(60);
  expect(advance(fresh(), testCatalog, 132).buses[0]!.odometerKm).toBe(120);
});

test('anúncio no valor justo vende em 3 dias; o caixa recebe o preço uma vez', () => {
  const listed = ok(listBus(withSpare(), testCatalog, 'bus-2', FAIR));
  const control = advance(withSpare(), testCatalog, 3 * 1440);
  const end = advance(listed, testCatalog, 3 * 1440);
  expect(end.buses.map((b) => b.id)).toEqual(['bus-1']);
  const h = saleHour('bus-2', 0.25);
  expect(h).toBeLessThanOrEqual(72);
  // depois da venda o bus-2 deixa de pagar o custo fixo das viradas de dia (a venda vem antes do custo do dia)
  const midnightsAfter = [1, 2, 3].filter((d) => d * 24 >= h).length;
  expect(end.cashCents).toBe(control.cashCents + FAIR + 35_000 * midnightsAfter);
});

test('anúncio a 1,15× o valor justo nunca vende', () => {
  const listed = ok(listBus(withSpare(), testCatalog, 'bus-2', 1_955_000));
  const end = advance(listed, testCatalog, 3 * 1440);
  expect(end.buses.map((b) => b.id)).toEqual(['bus-1', 'bus-2']);
  expect(end.buses[1]!.listing).toEqual({ priceCents: 1_955_000, sinceMinutes: 0 });
});

test('ônibus anunciado vendido em viagem perde a viagem e não gera receita depois', () => {
  const h = saleHour('bus-1', 0.25, 30);
  const s = ok(listBus(withSpare(), testCatalog, 'bus-1', FAIR));
  s.clockMinutes = h * 60 - 30;
  s.buses[0]!.trip = { phase: 'moving', from: 'a', progress: 0.2, passengers: 10, fareCents: 2600 };
  const end = advance(s, testCatalog, 1440);
  expect(end.buses.map((b) => b.id)).toEqual(['bus-2']);
  expect(end.cashCents).toBe(s.cashCents + FAIR - 35_000); // só o custo fixo do bus-2 parado
  expect(end.lines[0]!.today.revenueCents + end.lines[0]!.yesterday.revenueCents).toBe(0);
});

test('anúncio só é sorteado na hora cheia', () => {
  const h = saleHour('bus-2', 0.25);
  const listed = ok(listBus(withSpare(), testCatalog, 'bus-2', FAIR));
  expect(advance(listed, testCatalog, h * 60 - 1).buses).toHaveLength(2);
  expect(advance(listed, testCatalog, h * 60).buses).toHaveLength(1);
});

test('com a venda no meio, avançar em pedaços dá o mesmo resultado que avançar de uma vez', () => {
  const listed = ok(listBus(withSpare(), testCatalog, 'bus-1', FAIR));
  const once = advance(listed, testCatalog, 3 * 1440);
  let chunks = listed;
  for (let i = 0; i < 3 * 1440; i += 97) chunks = advance(chunks, testCatalog, Math.min(97, 3 * 1440 - i));
  expect(chunks).toEqual(once);
  expect(once.buses.map((b) => b.id)).toEqual(['bus-2']);
});

test('dois ônibus anunciados podem vender os dois: a frota fica vazia sem erro', () => {
  let s = ok(listBus(withSpare(), testCatalog, 'bus-1', FAIR));
  s = ok(listBus(s, testCatalog, 'bus-2', FAIR));
  const end = advance(s, testCatalog, 3 * 1440);
  expect(end.buses).toEqual([]);
  expect(Number.isInteger(end.cashCents)).toBe(true);
  expect(advance(end, testCatalog, 1440).cashCents).toBe(end.cashCents); // sem frota, sem custo fixo
});
