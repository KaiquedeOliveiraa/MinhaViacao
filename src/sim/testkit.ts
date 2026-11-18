import { buyOffer, openLine } from './actions';
import { getModel, getRoad, nearestCity } from './catalog';
import { refPriceCents } from './demand';
import { cheapestOffer } from './market';
import { createGame } from './newGame';
import type { Catalog, Company, GameState } from './types';

// 3 cidades em linha: alfa (100 mil hab.), beta (100 mil), gama (25 mil)
// rodovias: alfa-beta 60 km, beta-gama 30 km, alfa-gama 90 km (2 pontos cada)
// modelos: 'mini' (shape 'micro', 10 lugares, conforto 1.0, 3 km/l, novo 2_000_000) e 'grande' (shape 'conv', 20 lugares,
// conforto 1.0, 2.5 km/l, novo 6_000_000). Uma loja com 'mini-novo' (a mais barata), 'grande-novo' e 'grande-2020'
// (usado, 300.000 km, 4_000_000).
export const testCatalog: Catalog = {
  cities: [
    { id: 'alfa', name: 'Alfa', population: 100_000, lat: -27.0, lng: -49.6, difficulty: 'medio' },
    { id: 'beta', name: 'Beta', population: 100_000, lat: -27.0, lng: -49.0, difficulty: 'facil' },
    { id: 'gama', name: 'Gama', population: 25_000, lat: -27.0, lng: -48.7, difficulty: 'dificil' },
  ],
  models: [
    { id: 'mini', name: 'Mini', category: 'micro', shape: 'micro', seats: 10, comfort: 1.0, kmPerLiter: 3, priceCents: 2_000_000 },
    { id: 'grande', name: 'Grande', category: 'onibus', shape: 'conv', seats: 20, comfort: 1.0, kmPerLiter: 2.5, priceCents: 6_000_000 },
  ],
  dealers: [
    {
      id: 'loja', name: 'Loja Teste', cityId: null, lat: null, lng: null,
      offers: [
        { id: 'mini-novo', modelId: 'mini', condition: 'novo', year: 2026, odometerKm: 0, priceCents: 2_000_000 },
        { id: 'grande-novo', modelId: 'grande', condition: 'novo', year: 2026, odometerKm: 0, priceCents: 6_000_000 },
        { id: 'grande-2020', modelId: 'grande', condition: 'usado', year: 2020, odometerKm: 300_000, priceCents: 4_000_000 },
      ],
    },
  ],
  roads: [
    { id: 'alfa-beta', a: 'alfa', b: 'beta', distanceKm: 60, coords: [[-27.0, -49.6], [-27.0, -49.0]] },
    { id: 'beta-gama', a: 'beta', b: 'gama', distanceKm: 30, coords: [[-27.0, -49.0], [-27.0, -48.7]] },
    { id: 'alfa-gama', a: 'alfa', b: 'gama', distanceKm: 90, coords: [[-27.0, -49.6], [-27.0, -48.7]] },
  ],
};

export const testCompany: Company = {
  name: 'Expresso Teste',
  hqCityId: 'alfa',
  primaryColor: '#ff7a00',
  secondaryColor: '#ffffff',
  logo: { kind: 'icon', iconId: 'bus' },
  defaultLivery: 'diagonal',
};

/**
 * O começo do MVP, para os testes que dependem de um ônibus rodando: compra a oferta mais barata e abre
 * a linha da sede até a cidade mais próxima, no preço de referência desse modelo, com o ônibus nela.
 * A primeira linha não paga taxa, então o caixa fica no início menos o preço do ônibus; tutorial em 'fim'.
 */
export function startedGame(c: Catalog, company: Company = testCompany): GameState {
  const offer = cheapestOffer(c);
  const model = getModel(c, offer.modelId)!;
  const hq = company.hqCityId;
  const other = nearestCity(c, hq);
  const road = getRoad(c, hq, other)!;
  const step = (r: ReturnType<typeof buyOffer>): GameState => { if (!r.ok) throw new Error(r.error); return r.state; };
  const bought = step(buyOffer(createGame(c, company), c, { offerId: offer.id }));
  const busId = bought.buses[0]!.id;
  return step(openLine(bought, c, { a: hq, b: other, priceCents: refPriceCents(road.distanceKm, model.comfort), busId }));
}

/** Armazenamento em memória com a forma do localStorage, para os testes. */
export interface MemoryKv { data: Map<string, string>; getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; }
export function memoryKv(): MemoryKv {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
}
