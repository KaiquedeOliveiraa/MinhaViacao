import { travelMinutes } from './catalog';
import type { Bus, Line, Road } from './types';

export interface RoadIndex { road: Road; cumulativeKm: number[]; totalKm: number; }

function haversineKm([lat1, lng1]: [number, number], [lat2, lng2]: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Distância acumulada em cada ponto do traçado, para andar proporcional aos km e não aos pontos. */
export function buildRoadIndex(road: Road): RoadIndex {
  const cumulativeKm = [0];
  for (let i = 1; i < road.coords.length; i++) {
    cumulativeKm.push(cumulativeKm[i - 1]! + haversineKm(road.coords[i - 1]!, road.coords[i]!));
  }
  return { road, cumulativeKm, totalKm: cumulativeKm.at(-1) ?? 0 };
}

/** Ponto do traçado em `t` (0 = road.a, 1 = road.b), preso ao intervalo. */
export function pointAt(index: RoadIndex, t: number): [number, number] {
  const { coords } = index.road;
  const first = coords[0]!;
  const last = coords.at(-1)!;
  const clamped = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  if (clamped <= 0 || index.totalKm === 0) return [first[0], first[1]];
  if (clamped >= 1) return [last[0], last[1]];
  const target = clamped * index.totalKm;
  let lo = 0;
  let hi = index.cumulativeKm.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (index.cumulativeKm[mid]! <= target) lo = mid; else hi = mid;
  }
  const k0 = index.cumulativeKm[lo]!;
  const k1 = index.cumulativeKm[hi]!;
  const f = k1 > k0 ? (target - k0) / (k1 - k0) : 0;
  const p0 = coords[lo]!;
  const p1 = coords[hi]!;
  return [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
}

/** Posição do ônibus no sentido road.a → road.b; null se está parado na garagem. */
export function lineT(bus: Bus, line: Line, road: Road): number | null {
  const trip = bus.trip;
  if (trip.phase === 'idle') return null;
  if (trip.phase === 'waiting') {
    const city = trip.at === 'a' ? line.a : line.b;
    return city === road.a ? 0 : 1;
  }
  const from = trip.from === 'a' ? line.a : line.b;
  const progress = Math.min(1, Math.max(0, trip.progress));
  return from === road.a ? progress : 1 - progress;
}

/** Minutos até a chegada; null se não está em viagem. */
export function etaMinutes(bus: Bus, road: Road): number | null {
  if (bus.trip.phase !== 'moving') return null;
  return Math.max(0, Math.ceil(travelMinutes(road) * (1 - bus.trip.progress) - 1e-9));
}
