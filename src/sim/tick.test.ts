import { expect, test } from 'vitest';
import { createGame } from './newGame';
import { testCatalog, testCompany } from './testkit';
import { advance } from './tick';

const fresh = () => createGame(testCatalog, testCompany);

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
