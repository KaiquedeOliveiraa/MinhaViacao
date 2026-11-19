import { LISTING_MAX_FACTOR, MAX_NAME_LENGTH } from '../data/balance';
import { getCity, getModel, getRoad, routeId } from './catalog';
import { baseRefPriceCents, priceBoundsCents } from './demand';
import { allOffers, fairValueCents, gameYear, getOffer, sellNowCents } from './market';
import { isValidLivery, newLine, validateCompanyInput } from './newGame';
import { openFeeForStateCents, servedCities } from './selectors';
import type {
  ActionError, ActionResult, Bus, BusId, Catalog, CityId, Company, GameState, LiveryStyle, ModelId, RouteId,
} from './types';

const fail = (error: ActionError): ActionResult => ({ ok: false, error });
const done = (state: GameState): ActionResult => ({ ok: true, state });

/** Nome limpo, `''` quando vazio, ou `null` quando passa do limite. */
function cleanName(name: string | undefined): string | null {
  const trimmed = (name ?? '').trim();
  return trimmed.length > MAX_NAME_LENGTH ? null : trimmed;
}

/** Depois de abrir linha ou alocar: com algum ônibus numa linha, o tutorial acabou. */
function finishTutorialIfRunning(s: GameState): void {
  if (s.tutorial !== 'fim' && s.buses.some((bus) => bus.lineId !== null)) s.tutorial = 'fim';
}

function busNumber(bus: Bus): string {
  return bus.id.replace(/^bus-/, '');
}

/** Compra uma oferta de loja (estoque ilimitado). O novo sai com o ano do jogo; o usado, com o ano e os km da oferta. */
export function buyOffer(s: GameState, c: Catalog, input: { offerId: string; name?: string }): ActionResult {
  const offer = getOffer(c, input.offerId);
  if (!offer) return fail('oferta_inexistente');
  const model = getModel(c, offer.modelId);
  if (!model) return fail('modelo_inexistente');
  const name = cleanName(input.name);
  if (name === null) return fail('nome_invalido');
  if (s.cashCents < 0 || s.cashCents < offer.priceCents) return fail('saldo_insuficiente');
  const next = structuredClone(s);
  const number = next.nextBusNumber;
  next.buses.push({
    id: `bus-${number}`, modelId: model.id, name: name || `${model.name} #${number}`,
    livery: next.company.defaultLivery, lineId: null, trip: { phase: 'idle' }, driverId: null,
    year: offer.condition === 'novo' ? Math.max(offer.year, gameYear(s.clockMinutes)) : offer.year,
    odometerKm: offer.odometerKm, listing: null,
  });
  next.nextBusNumber = number + 1;
  next.cashCents -= offer.priceCents;
  if (next.tutorial === 'comprar') next.tutorial = 'pintar';
  return done(next);
}

/** Atalho: compra a oferta nova do modelo. */
export function buyBus(s: GameState, c: Catalog, input: { modelId: ModelId; name?: string }): ActionResult {
  const offer = allOffers(c).find((o) => o.modelId === input.modelId && o.condition === 'novo');
  if (!offer || !getModel(c, input.modelId)) return fail('modelo_inexistente');
  return buyOffer(s, c, { offerId: offer.id, name: input.name });
}

/** A frota nunca chega a zero por vendas: sempre sobra um ônibus fora de anúncio além deste. */
const hasOtherUnlisted = (s: GameState, busId: BusId): boolean => s.buses.some((b) => b.id !== busId && !b.listing);

/** Venda imediata pelo valor de `sellNowCents`; um anúncio do ônibus some junto. */
export function sellBus(s: GameState, c: Catalog, busId: BusId): ActionResult {
  const bus = s.buses.find((b) => b.id === busId);
  if (!bus) return fail('onibus_inexistente');
  if (!hasOtherUnlisted(s, busId)) return fail('ultimo_onibus');
  const next = structuredClone(s);
  next.buses = next.buses.filter((b) => b.id !== busId);
  next.cashCents += sellNowCents(c, bus, s.clockMinutes);
  return done(next);
}

/** Anuncia o ônibus (ou troca o preço do anúncio): entre a venda imediata e 2× o valor justo. */
export function listBus(s: GameState, c: Catalog, busId: BusId, priceCents: number): ActionResult {
  const index = s.buses.findIndex((b) => b.id === busId);
  if (index < 0) return fail('onibus_inexistente');
  if (!hasOtherUnlisted(s, busId)) return fail('ultimo_onibus');
  const bus = s.buses[index]!;
  const price = Math.round(priceCents);
  const min = sellNowCents(c, bus, s.clockMinutes);
  const max = LISTING_MAX_FACTOR * fairValueCents(c, bus, s.clockMinutes);
  if (!Number.isFinite(price) || price < min || price > max || price < 1) return fail('preco_invalido');
  const next = structuredClone(s);
  const listed = next.buses[index]!;
  listed.listing = { priceCents: price, sinceMinutes: bus.listing?.sinceMinutes ?? s.clockMinutes };
  return done(next);
}

export function unlistBus(s: GameState, _c: Catalog, busId: BusId): ActionResult {
  const index = s.buses.findIndex((b) => b.id === busId);
  if (index < 0) return fail('onibus_inexistente');
  const next = structuredClone(s);
  next.buses[index]!.listing = null;
  return done(next);
}

export function renameBus(s: GameState, c: Catalog, busId: BusId, name: string): ActionResult {
  const index = s.buses.findIndex((b) => b.id === busId);
  if (index < 0) return fail('onibus_inexistente');
  const clean = cleanName(name);
  if (clean === null) return fail('nome_invalido');
  const next = structuredClone(s);
  const bus = next.buses[index]!;
  bus.name = clean || `${getModel(c, bus.modelId)?.name ?? 'Ônibus'} #${busNumber(bus)}`;
  return done(next);
}

export function setBusLivery(s: GameState, _c: Catalog, busId: BusId, livery: LiveryStyle): ActionResult {
  const index = s.buses.findIndex((b) => b.id === busId);
  if (index < 0) return fail('onibus_inexistente');
  if (!isValidLivery(livery)) return fail('pintura_invalida');
  const next = structuredClone(s);
  next.buses[index]!.livery = livery;
  if (next.tutorial === 'pintar') next.tutorial = 'linha';
  return done(next);
}

/** Tutorial: o jogador fica com a pintura que o ônibus já tem. */
export function confirmPaint(s: GameState, _c: Catalog): ActionResult {
  if (s.tutorial !== 'pintar') return done(s);
  return done({ ...structuredClone(s), tutorial: 'linha' });
}

export function skipTutorial(s: GameState, _c: Catalog): ActionResult {
  if (s.tutorial === 'fim') return done(s);
  return done({ ...structuredClone(s), tutorial: 'fim' });
}

function putOnLine(bus: Bus, lineId: RouteId): void {
  bus.lineId = lineId;
  bus.trip = { phase: 'waiting', at: 'a', minutesLeft: 0 };
}

function takeOffLine(bus: Bus): void {
  bus.lineId = null;
  bus.trip = { phase: 'idle' };
}

export function openLine(s: GameState, c: Catalog, input: { a: CityId; b: CityId; priceCents?: number; busId?: BusId }): ActionResult {
  const { a, b } = input;
  const road = getRoad(c, a, b);
  if (!road || !getCity(c, a) || !getCity(c, b)) return fail('rota_inexistente');
  const id = routeId(a, b);
  if (s.lines.some((line) => line.id === id)) return fail('linha_existente');
  const served = servedCities(s);
  if (!served.includes(a) && !served.includes(b)) return fail('fora_da_rede');
  let busIndex = -1;
  if (input.busId !== undefined) {
    busIndex = s.buses.findIndex((bus) => bus.id === input.busId);
    if (busIndex < 0) return fail('onibus_inexistente');
    if (s.buses[busIndex]!.lineId !== null) return fail('onibus_ocupado');
  }
  const fee = openFeeForStateCents(s, c, a, b);
  if (s.cashCents < 0 || s.cashCents < fee) return fail('saldo_insuficiente');
  const next = structuredClone(s);
  next.lines.push(newLine(c, a, b, clampPrice(road.distanceKm, input.priceCents, baseRefPriceCents(road.distanceKm))));
  next.cashCents -= fee;
  if (busIndex >= 0) putOnLine(next.buses[busIndex]!, id);
  finishTutorialIfRunning(next);
  return done(next);
}

export function closeLine(s: GameState, _c: Catalog, lineId: RouteId): ActionResult {
  if (!s.lines.some((line) => line.id === lineId)) return fail('linha_inexistente');
  const next = structuredClone(s);
  next.lines = next.lines.filter((line) => line.id !== lineId);
  for (const bus of next.buses) if (bus.lineId === lineId) takeOffLine(bus);
  return done(next);
}

function clampPrice(distanceKm: number, value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  const { min, max } = priceBoundsCents(distanceKm);
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function setLinePrice(s: GameState, c: Catalog, lineId: RouteId, priceCents: number): ActionResult {
  const index = s.lines.findIndex((line) => line.id === lineId);
  if (index < 0) return fail('linha_inexistente');
  const line = s.lines[index]!;
  const road = getRoad(c, line.a, line.b);
  if (!road) return fail('rota_inexistente');
  const next = structuredClone(s);
  next.lines[index]!.priceCents = clampPrice(road.distanceKm, priceCents, line.priceCents);
  return done(next);
}

export function setLinePaused(s: GameState, _c: Catalog, lineId: RouteId, paused: boolean): ActionResult {
  const index = s.lines.findIndex((line) => line.id === lineId);
  if (index < 0) return fail('linha_inexistente');
  const next = structuredClone(s);
  next.lines[index]!.paused = paused;
  return done(next);
}

export function assignBus(s: GameState, _c: Catalog, busId: BusId, lineId: RouteId): ActionResult {
  const index = s.buses.findIndex((bus) => bus.id === busId);
  if (index < 0) return fail('onibus_inexistente');
  if (!s.lines.some((line) => line.id === lineId)) return fail('linha_inexistente');
  if (s.buses[index]!.lineId !== null) return fail('onibus_ocupado');
  const next = structuredClone(s);
  putOnLine(next.buses[index]!, lineId);
  finishTutorialIfRunning(next);
  return done(next);
}

export function unassignBus(s: GameState, _c: Catalog, busId: BusId): ActionResult {
  const index = s.buses.findIndex((bus) => bus.id === busId);
  if (index < 0) return fail('onibus_inexistente');
  const next = structuredClone(s);
  takeOffLine(next.buses[index]!);
  return done(next);
}

export function updateCompany(s: GameState, c: Catalog, patch: Omit<Company, 'hqCityId'>): ActionResult {
  const company: Company = { ...patch, hqCityId: s.company.hqCityId };
  if (validateCompanyInput(company, c).length > 0) return fail('empresa_invalida');
  const next = structuredClone(s);
  next.company = { ...structuredClone(company), name: company.name.trim() };
  return done(next);
}
