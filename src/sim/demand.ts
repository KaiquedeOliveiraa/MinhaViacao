import {
  DEMAND_K, MAX_PRICE_FACTOR, MINUTES_PER_DAY, POP_EXPONENT, PRICE_ELASTICITY, PRICE_MAX_MULT, PRICE_MIN_MULT,
  QUEUE_MAX_HOURS, REF_PRICE_BASE_REAIS, REF_PRICE_PER_KM_REAIS,
} from '../data/balance';
import type { City } from './types';

/** Passageiros por dia, em cada sentido, pelo modelo gravitacional. */
export function potentialPerDay(a: City, b: City, distanceKm: number): number {
  return (DEMAND_K * ((a.population / 1000) * (b.population / 1000)) ** POP_EXPONENT) / distanceKm;
}

/** Preço de referência com conforto 1,0. */
export function baseRefPriceCents(distanceKm: number): number {
  return refPriceCents(distanceKm, 1);
}

export function refPriceCents(distanceKm: number, comfort: number): number {
  return Math.round((REF_PRICE_BASE_REAIS + REF_PRICE_PER_KM_REAIS * distanceKm) * comfort * 100);
}

/** Limites do controle de preço; usam a referência com conforto 1,0 para não mudarem com a frota. */
export function priceBoundsCents(distanceKm: number): { min: number; max: number } {
  const base = baseRefPriceCents(distanceKm);
  return { min: Math.round(base * PRICE_MIN_MULT), max: Math.round(base * PRICE_MAX_MULT) };
}

export function priceFactor(refCents: number, priceCents: number): number {
  if (!(priceCents > 0)) return MAX_PRICE_FACTOR;
  return Math.min(MAX_PRICE_FACTOR, (refCents / priceCents) ** PRICE_ELASTICITY);
}

export function arrivalsPerMinute(potential: number, factor: number): number {
  return (potential * factor) / MINUTES_PER_DAY;
}

/** A fila guarda no máximo QUEUE_MAX_HOURS horas de passageiros. */
export function queueCap(potential: number, factor: number): number {
  return (potential * factor * QUEUE_MAX_HOURS) / 24;
}

/** Soma um minuto de chegadas e limita ao teto. */
export function growQueue(queue: number, potential: number, factor: number): number {
  return Math.min(queueCap(potential, factor), queue + arrivalsPerMinute(potential, factor));
}
