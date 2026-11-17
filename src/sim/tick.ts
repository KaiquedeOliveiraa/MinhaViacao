import { DAILY_FIXED_CENTS_PER_BUS, DIESEL_CENTS_PER_LITER, LAYOVER_MINUTES, MINUTES_PER_DAY } from '../data/balance';
import { getCity, getModel, getRoad, travelMinutes } from './catalog';
import { emptyDayStats } from './newGame';
import { growQueue, potentialPerDay, priceFactor, refPriceCents } from './demand';
import type { Bus, BusModel, Catalog, GameState, Line, Road } from './types';

interface LineRuntime {
  line: Line;
  road: Road;
  travel: number;
  potential: number;
  factor: number;
  busCount: number;
  active: boolean;
}

/** Valores que não mudam dentro de um `advance`: preço, frota e traçado só mudam por ações. */
function prepareLines(s: GameState, c: Catalog): Map<string, LineRuntime> {
  const out = new Map<string, LineRuntime>();
  for (const line of s.lines) {
    const road = getRoad(c, line.a, line.b);
    const cityA = getCity(c, line.a);
    const cityB = getCity(c, line.b);
    if (!road || !cityA || !cityB) continue;
    const models = s.buses
      .filter((bus) => bus.lineId === line.id)
      .map((bus) => getModel(c, bus.modelId))
      .filter((m): m is BusModel => m !== undefined);
    const comfort = models.length > 0 ? models.reduce((sum, m) => sum + m.comfort, 0) / models.length : 1;
    const potential = potentialPerDay(cityA, cityB, road.distanceKm);
    out.set(line.id, {
      line, road, travel: travelMinutes(road), potential,
      factor: priceFactor(refPriceCents(road.distanceKm, comfort), line.priceCents),
      busCount: models.length,
      active: !line.paused && models.length > 0,
    });
  }
  return out;
}

function stepBus(s: GameState, c: Catalog, bus: Bus, rt: LineRuntime): void {
  const { line } = rt;
  const trip = bus.trip;
  if (trip.phase === 'waiting') {
    if (trip.minutesLeft > 0) { trip.minutesLeft -= 1; return; }
    if (line.paused) return;
    const last = trip.at === 'a' ? line.lastDepartA : line.lastDepartB;
    const interval = (2 * (rt.travel + LAYOVER_MINUTES)) / rt.busCount;
    if (last !== null && s.clockMinutes - last < interval) return;
    const model = getModel(c, bus.modelId);
    if (!model) return;
    const queue = trip.at === 'a' ? line.queueA : line.queueB;
    const boarded = Math.max(0, Math.min(Math.floor(queue), model.seats));
    if (trip.at === 'a') { line.queueA = queue - boarded; line.lastDepartA = s.clockMinutes; }
    else { line.queueB = queue - boarded; line.lastDepartB = s.clockMinutes; }
    line.today.seatsOffered += model.seats;
    line.today.passengers += boarded;
    bus.trip = { phase: 'moving', from: trip.at, progress: 0, passengers: boarded, fareCents: line.priceCents };
    return;
  }
  if (trip.phase === 'moving') {
    trip.progress += 1 / rt.travel;
    if (trip.progress <= 1 - 1e-9) return;
    const model = getModel(c, bus.modelId);
    const revenue = trip.passengers * trip.fareCents;
    const diesel = model ? Math.round((rt.road.distanceKm / model.kmPerLiter) * DIESEL_CENTS_PER_LITER) : 0;
    s.cashCents += revenue - diesel;
    line.today.revenueCents += revenue;
    line.today.dieselCents += diesel;
    bus.trip = { phase: 'waiting', at: trip.from === 'a' ? 'b' : 'a', minutesLeft: LAYOVER_MINUTES };
  }
}

/** Avança `minutes` minutos de jogo. Pura: devolve um estado novo e não altera `state`. */
export function advance(state: GameState, c: Catalog, minutes: number): GameState {
  const s = structuredClone(state);
  const steps = Math.max(0, Math.floor(minutes));
  if (steps === 0) return s;
  const lines = prepareLines(s, c);

  for (let i = 0; i < steps; i++) {
    for (const rt of lines.values()) {
      if (!rt.active) continue;
      rt.line.queueA = growQueue(rt.line.queueA, rt.potential, rt.factor);
      rt.line.queueB = growQueue(rt.line.queueB, rt.potential, rt.factor);
    }
    for (const bus of s.buses) {
      if (bus.lineId === null) continue;
      const rt = lines.get(bus.lineId);
      if (rt) stepBus(s, c, bus, rt);
    }
    s.clockMinutes += 1;
    if (s.clockMinutes % MINUTES_PER_DAY === 0) {
      s.cashCents -= DAILY_FIXED_CENTS_PER_BUS * s.buses.length;
      for (const line of s.lines) {
        line.yesterday = line.today;
        line.today = emptyDayStats();
      }
    }
  }
  return s;
}
