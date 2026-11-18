import { expect, test } from 'vitest';
import { catalog, getCity, nearestCity, routeId, travelMinutes } from './catalog';
import type { Road } from './types';

function kmBetween([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
function cityPoint(id: string): [number, number] {
  const city = getCity(catalog, id);
  if (!city) throw new Error(`cidade ${id} não existe`);
  return [city.lat, city.lng];
}

test('routeId é o mesmo nos dois sentidos', () => {
  expect(routeId('ibirama', 'blumenau')).toBe('blumenau-ibirama');
  expect(routeId('blumenau', 'ibirama')).toBe('blumenau-ibirama');
});
test('existem 4 cidades, 6 modelos e 6 rodovias', () => {
  expect(catalog.cities).toHaveLength(4);
  expect(catalog.models).toHaveLength(6);
  expect(catalog.roads).toHaveLength(6);
});
test('cada rodovia começa e termina a menos de 2 km das suas cidades', () => {
  for (const road of catalog.roads) {
    expect(road.a < road.b).toBe(true);
    expect(road.coords.length).toBeGreaterThanOrEqual(2);
    expect(kmBetween(road.coords[0]!, cityPoint(road.a))).toBeLessThan(2);
    expect(kmBetween(road.coords.at(-1)!, cityPoint(road.b))).toBeLessThan(2);
    expect(road.distanceKm).toBeGreaterThan(0);
  }
});
test('tempo de viagem a 60 km/h', () => {
  expect(travelMinutes({ distanceKm: 70 } as Road)).toBe(70);
  expect(travelMinutes({ distanceKm: 50.4 } as Road)).toBe(50);
});
test('a cidade mais próxima de Ibirama é Blumenau', () => {
  expect(nearestCity(catalog, 'ibirama')).toBe('blumenau');
});
