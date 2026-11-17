/**
 * Gera src/data/roads.json a partir do serviço público do OSRM.
 * Roda uma única vez (npm run roads); o jogo nunca chama serviço de rotas.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { City, Road } from '../src/sim/types';

const MAX_POINTS = 400;
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const cities: City[] = JSON.parse(readFileSync(here('../src/data/cities.json'), 'utf8'));

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reduz para no máximo `max` pontos, mantendo o primeiro e o último. */
export function thin<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(points[Math.round((i * (points.length - 1)) / (max - 1))]!);
  return out;
}

async function fetchRoute(a: City, b: City): Promise<{ distance: number; coords: [number, number][] }> {
  const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'bus-game-roads-script/1.0' } });
    if (res.ok) {
      const json = (await res.json()) as { routes: { distance: number; geometry: { coordinates: [number, number][] } }[] };
      const route = json.routes[0];
      if (!route) throw new Error(`sem rota entre ${a.id} e ${b.id}`);
      return { distance: route.distance, coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]) };
    }
    if (attempt >= 4) throw new Error(`OSRM respondeu ${res.status} para ${a.id}-${b.id}`);
    await sleep(2000 * attempt);
  }
}

async function main() {
  const sorted = [...cities].sort((x, y) => (x.id < y.id ? -1 : 1));
  const roads: Road[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]!;
      const b = sorted[j]!;
      if (roads.length > 0) await sleep(1000);
      const { distance, coords } = await fetchRoute(a, b);
      roads.push({
        id: `${a.id}-${b.id}`,
        a: a.id,
        b: b.id,
        distanceKm: Math.round(distance / 100) / 10,
        coords: thin(coords, MAX_POINTS).map(([lat, lng]) => [round5(lat), round5(lng)]),
      });
    }
  }
  writeFileSync(here('../src/data/roads.json'), JSON.stringify(roads) + '\n');
  console.log('rota | km | pontos');
  for (const r of roads) console.log(`${r.id} | ${r.distanceKm} | ${r.coords.length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
