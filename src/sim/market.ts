import {
  AGE_VALUE_FLOOR, DEPRECIATION_PER_YEAR, DRIVE_OFF_FACTOR, GAME_START_YEAR, KM_FULL_WEAR, KM_VALUE_FLOOR, MINUTES_PER_DAY,
  SALE_CHANCE_AT_FAIR, SALE_MAX_RATIO, SELL_NOW_FRACTION,
} from '../data/balance';
import { getModel } from './catalog';
import type { Bus, Catalog, Offer } from './types';

export type DealerOffer = Offer & { dealerId: string };

/** Ano do calendário do jogo: 2026 no primeiro ano (365 dias), depois um a mais por ano. */
export function gameYear(clockMinutes: number): number {
  return GAME_START_YEAR + Math.floor(Math.floor(clockMinutes / MINUTES_PER_DAY) / 365);
}

/** Preço do novo × 0,85 (perde 15% ao sair da loja) × fator de idade × fator de quilometragem, cada fator com o seu piso. */
export function fairValueCents(c: Catalog, bus: Pick<Bus, 'modelId' | 'year' | 'odometerKm'>, clockMinutes: number): number {
  const model = getModel(c, bus.modelId);
  if (!model) return 0;
  const age = Math.max(0, gameYear(clockMinutes) - bus.year);
  const ageFactor = Math.max(AGE_VALUE_FLOOR, DEPRECIATION_PER_YEAR ** age);
  const kmFactor = Math.max(KM_VALUE_FLOOR, 1 - bus.odometerKm / KM_FULL_WEAR);
  return Math.round(model.priceCents * DRIVE_OFF_FACTOR * ageFactor * kmFactor);
}

/** Venda imediata: uma fração do valor justo. */
export function sellNowCents(c: Catalog, bus: Pick<Bus, 'modelId' | 'year' | 'odometerKm'>, clockMinutes: number): number {
  return Math.round(SELL_NOW_FRACTION * fairValueCents(c, bus, clockMinutes));
}

/** Chance de o anúncio vender numa hora cheia: cheia até o valor justo, caindo até zero em 1,15× o justo. */
export function saleChancePerHour(priceCents: number, fairCents: number): number {
  if (!(fairCents > 0)) return 0;
  const ratio = priceCents / fairCents;
  if (ratio <= 1) return SALE_CHANCE_AT_FAIR;
  if (ratio >= SALE_MAX_RATIO) return 0;
  return SALE_CHANCE_AT_FAIR * ((SALE_MAX_RATIO - ratio) / (SALE_MAX_RATIO - 1)) ** 2;
}

/** Número em [0, 1) determinado pelo texto (FNV-1a de 32 bits seguido de uma mistura final). */
export function hash01(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Todas as ofertas de todas as lojas, com o id da loja. */
export function allOffers(c: Catalog): DealerOffer[] {
  return c.dealers.flatMap((dealer) => dealer.offers.map((offer) => ({ ...offer, dealerId: dealer.id })));
}

export function getOffer(c: Catalog, offerId: string): DealerOffer | undefined {
  return allOffers(c).find((offer) => offer.id === offerId);
}

/** A oferta mais barata do catálogo: é com ela que a calibração e os testes começam o jogo. */
export function cheapestOffer(c: Catalog): DealerOffer {
  const cheapest = allOffers(c).sort((x, y) => x.priceCents - y.priceCents)[0];
  if (!cheapest) throw new Error('catálogo sem ofertas');
  return cheapest;
}
