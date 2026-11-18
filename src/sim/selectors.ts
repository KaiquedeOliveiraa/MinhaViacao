import { DAILY_FIXED_CENTS_PER_BUS, MINUTES_PER_DAY, OPEN_FEE_CENTS_PER_PASSENGER, SELL_FRACTION } from '../data/balance';
import { getCity, getModel, getRoad } from './catalog';
import { potentialPerDay, refPriceCents } from './demand';
import type { Bus, Catalog, CityId, GameState, Line, RouteId } from './types';

/** A sede mais as pontas de todas as linhas. */
export function servedCities(s: GameState): CityId[] {
  const set = new Set<CityId>([s.company.hqCityId]);
  for (const line of s.lines) { set.add(line.a); set.add(line.b); }
  return [...set];
}

export function linePotential(c: Catalog, a: CityId, b: CityId): number {
  const road = getRoad(c, a, b);
  const cityA = getCity(c, a);
  const cityB = getCity(c, b);
  if (!road || !cityA || !cityB) return 0;
  return potentialPerDay(cityA, cityB, road.distanceKm);
}

export function openFeeCents(c: Catalog, a: CityId, b: CityId): number {
  return Math.round(linePotential(c, a, b) * OPEN_FEE_CENTS_PER_PASSENGER);
}

/** Taxa que a viação paga para abrir a rota: a primeira linha dela é de graça. */
export function openFeeForStateCents(s: GameState, c: Catalog, a: CityId, b: CityId): number {
  return s.lines.length === 0 ? 0 : openFeeCents(c, a, b);
}

/** Rotas ainda sem linha que tocam a rede; `a` é sempre a cidade já atendida. */
export function openableRoutes(s: GameState, c: Catalog): { a: CityId; b: CityId; feeCents: number; potential: number; distanceKm: number }[] {
  const served = new Set(servedCities(s));
  const existing = new Set(s.lines.map((line) => line.id));
  const out = [];
  for (const road of c.roads) {
    if (existing.has(road.id)) continue;
    let a: CityId; let b: CityId;
    if (served.has(road.a)) { a = road.a; b = road.b; }
    else if (served.has(road.b)) { a = road.b; b = road.a; }
    else continue;
    out.push({ a, b, feeCents: openFeeForStateCents(s, c, a, b), potential: linePotential(c, a, b), distanceKm: road.distanceKm });
  }
  return out;
}

export function busesOnLine(s: GameState, lineId: RouteId): Bus[] {
  return s.buses.filter((bus) => bus.lineId === lineId);
}

/** Média do conforto dos ônibus da linha; 1,0 sem ônibus. */
export function lineComfort(s: GameState, c: Catalog, line: Line): number {
  const comforts = busesOnLine(s, line.id).map((bus) => getModel(c, bus.modelId)?.comfort ?? 1);
  if (comforts.length === 0) return 1;
  return comforts.reduce((sum, v) => sum + v, 0) / comforts.length;
}

export function lineRefPriceCents(s: GameState, c: Catalog, line: Line): number {
  const road = getRoad(c, line.a, line.b);
  return road ? refPriceCents(road.distanceKm, lineComfort(s, c, line)) : 0;
}

/** Passageiros por lugar oferecido, somando hoje e ontem; null sem viagens. */
export function lineOccupancy(line: Line): number | null {
  const seats = line.today.seatsOffered + line.yesterday.seatsOffered;
  if (seats === 0) return null;
  return (line.today.passengers + line.yesterday.passengers) / seats;
}

/** Receita menos diesel menos o custo fixo dos ônibus da linha, proporcional à hora do dia. */
export function lineProfitTodayCents(s: GameState, line: Line): number {
  const dayFraction = (s.clockMinutes % MINUTES_PER_DAY) / MINUTES_PER_DAY;
  const fixed = Math.round(DAILY_FIXED_CENTS_PER_BUS * busesOnLine(s, line.id).length * dayFraction);
  return line.today.revenueCents - line.today.dieselCents - fixed;
}

export function sellValueCents(c: Catalog, bus: Bus): number {
  const model = getModel(c, bus.modelId);
  return model ? Math.round(model.priceCents * SELL_FRACTION) : 0;
}
