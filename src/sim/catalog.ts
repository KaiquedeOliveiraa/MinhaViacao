import citiesJson from '../data/cities.json';
import modelsJson from '../data/models.json';
import roadsJson from '../data/roads.json';
import { AVG_SPEED_KMH } from '../data/balance';
import type { BusModel, Catalog, City, CityId, ModelId, Road, RouteId } from './types';

export const catalog: Catalog = {
  cities: citiesJson as City[],
  models: modelsJson as BusModel[],
  roads: roadsJson as Road[],
};

export function routeId(x: CityId, y: CityId): RouteId {
  return x < y ? `${x}-${y}` : `${y}-${x}`;
}

export function getCity(c: Catalog, id: CityId): City | undefined {
  return c.cities.find((city) => city.id === id);
}

export function getModel(c: Catalog, id: ModelId): BusModel | undefined {
  return c.models.find((model) => model.id === id);
}

/** O modelo mais barato do catálogo: é com ele que todo jogo começa. */
export function startModel(c: Catalog): BusModel {
  const cheapest = [...c.models].sort((x, y) => x.priceCents - y.priceCents)[0];
  if (!cheapest) throw new Error('catálogo sem modelos');
  return cheapest;
}

export function getRoad(c: Catalog, x: CityId, y: CityId): Road | undefined {
  if (x === y) return undefined;
  const id = routeId(x, y);
  return c.roads.find((road) => road.id === id);
}

export function travelMinutes(road: Pick<Road, 'distanceKm'>): number {
  return Math.max(1, Math.round((road.distanceKm / AVG_SPEED_KMH) * 60));
}

export function nearestCity(c: Catalog, from: CityId): CityId {
  let best: Road | undefined;
  for (const road of c.roads) {
    if (road.a !== from && road.b !== from) continue;
    if (!best || road.distanceKm < best.distanceKm) best = road;
  }
  if (!best) throw new Error(`nenhuma rodovia sai de ${from}`);
  return best.a === from ? best.b : best.a;
}
