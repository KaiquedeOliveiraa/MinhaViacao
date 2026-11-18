import { DAILY_FIXED_CENTS_PER_BUS, DIESEL_CENTS_PER_LITER, LAYOVER_MINUTES, MINUTES_PER_DAY } from '../data/balance';
import { getCity, getModel, getRoad, travelMinutes } from './catalog';
import { fairValueCents, hash01, saleChancePerHour } from './market';
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

/**
 * Valores por linha calculados no começo do `advance`: preço e traçado só mudam por ações; a frota também muda
 * dentro do `advance` quando um anúncio vende, e aí `advance` chama esta função de novo.
 */
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
    bus.odometerKm += Math.round(rt.road.distanceKm);
    line.today.revenueCents += revenue;
    line.today.dieselCents += diesel;
    bus.trip = { phase: 'waiting', at: trip.from === 'a' ? 'b' : 'a', minutesLeft: LAYOVER_MINUTES };
  }
}

/**
 * Na hora cheia, cada ônibus anunciado é sorteado (hash do ônibus e da hora). Vendido, sai da frota como na
 * venda imediata (a viagem em curso se perde) e o caixa recebe o preço anunciado. Devolve se alguém foi vendido.
 */
function sellListedBuses(s: GameState, c: Catalog): boolean {
  const hour = s.clockMinutes / 60;
  const sold = new Set<string>();
  for (const bus of s.buses) {
    if (!bus.listing) continue;
    const chance = saleChancePerHour(bus.listing.priceCents, fairValueCents(c, bus, s.clockMinutes));
    if (hash01(`${bus.id}:${hour}`) < chance) {
      sold.add(bus.id);
      s.cashCents += bus.listing.priceCents;
    }
  }
  if (sold.size === 0) return false;
  s.buses = s.buses.filter((bus) => !sold.has(bus.id));
  return true;
}

/** Avança `minutes` minutos de jogo. Pura: devolve um estado novo e não altera `state`. */
export function advance(state: GameState, c: Catalog, minutes: number): GameState {
  const s = structuredClone(state);
  const steps = Math.max(0, Math.floor(minutes));
  if (steps === 0) return s;
  let lines = prepareLines(s, c);

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
    // a frota mudou: refaz os valores por linha (intervalo, conforto, linha sem ônibus)
    if (s.clockMinutes % 60 === 0 && sellListedBuses(s, c)) lines = prepareLines(s, c);
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
