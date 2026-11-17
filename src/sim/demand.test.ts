import { expect, test } from 'vitest';
import {
  arrivalsPerMinute, baseRefPriceCents, growQueue, potentialPerDay, priceBoundsCents, priceFactor, queueCap, refPriceCents,
} from './demand';
import type { City } from './types';

const city = (population: number) => ({ population } as City);
test('potencial pelo modelo gravitacional', () => {
  expect(potentialPerDay(city(361_000), city(264_000), 50)).toBeCloseTo(740.9, 1);
  expect(potentialPerDay(city(19_000), city(361_000), 70)).toBeCloseTo(142.0, 1);
  expect(potentialPerDay(city(100_000), city(100_000), 60)).toBeCloseTo(200, 6);
});
test('preço de referência em centavos inteiros', () => {
  expect(baseRefPriceCents(70)).toBe(2950);
  expect(refPriceCents(70, 0.9)).toBe(2655);
  expect(refPriceCents(70, 1.2)).toBe(3540);
});
test('limites do preço', () => {
  expect(priceBoundsCents(70)).toEqual({ min: 885, max: 8850 });
});
test('fator de preço', () => {
  expect(priceFactor(2600, 2600)).toBe(1);
  expect(priceFactor(2600, 5200)).toBeCloseTo(0.3536, 4);
  expect(priceFactor(2600, 260)).toBe(1.5);      // teto
  expect(priceFactor(2600, 0)).toBe(1.5);        // nunca divide por zero
  expect(Number.isFinite(priceFactor(2600, -5))).toBe(true);
});
test('fila cresce e para no teto de 3 horas', () => {
  expect(arrivalsPerMinute(200, 1)).toBeCloseTo(0.13889, 5);
  expect(queueCap(200, 1)).toBe(25);
  expect(growQueue(0, 200, 1)).toBeCloseTo(0.13889, 5);
  expect(growQueue(24.95, 200, 1)).toBe(25);
  expect(growQueue(40, 200, 1)).toBe(25);        // fila acima do teto encolhe para o teto
});
