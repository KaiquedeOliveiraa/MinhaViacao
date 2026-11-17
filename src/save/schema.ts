import { MAX_NAME_LENGTH } from '../data/balance';
import { getCity, getModel, getRoad, routeId } from '../sim/catalog';
import { isValidLivery, validateCompanyInput } from '../sim/newGame';
import type {
  Bus, Catalog, Company, DayStats, End, GameState, Line, LiveryStyle, LogoIconId, LogoRef, Trip,
} from '../sim/types';
import { migrate } from './migrate';

export const SAVE_VERSION = 1;
export const MAX_BUSES = 500;
export type ParseError = 'formato' | 'versao_futura' | 'referencia';
export type ParseResult = { ok: true; state: GameState } | { ok: false; error: ParseError };

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

class Invalid extends Error {
  constructor(readonly code: ParseError) { super(code); }
}
const bad = (code: ParseError = 'formato'): never => { throw new Invalid(code); };

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : bad());
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : bad());
const str = (v: unknown): string => (typeof v === 'string' ? v : bad());
const bool = (v: unknown): boolean => (typeof v === 'boolean' ? v : bad());
const int = (v: unknown, min = Number.MIN_SAFE_INTEGER): number =>
  (typeof v === 'number' && Number.isSafeInteger(v) && v >= min ? v : bad());
const real = (v: unknown, min: number, max = Infinity): number =>
  (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : bad());
const end = (v: unknown): End => (v === 'a' || v === 'b' ? v : bad());

function readLogo(v: unknown): LogoRef {
  const o = obj(v);
  if (o.kind === 'icon') return { kind: 'icon', iconId: str(o.iconId) as LogoIconId };
  if (o.kind === 'image') return { kind: 'image', dataUrl: str(o.dataUrl) };
  return bad();
}

function readCompany(v: unknown, c: Catalog): Company {
  const o = obj(v);
  const company: Company = {
    name: str(o.name),
    hqCityId: str(o.hqCityId),
    primaryColor: str(o.primaryColor),
    secondaryColor: str(o.secondaryColor),
    logo: readLogo(o.logo),
    defaultLivery: str(o.defaultLivery) as LiveryStyle,
  };
  if (validateCompanyInput(company, c).length > 0) bad();
  return company;
}

function readStats(v: unknown): DayStats {
  const o = obj(v);
  return {
    revenueCents: int(o.revenueCents, 0),
    dieselCents: int(o.dieselCents, 0),
    passengers: int(o.passengers, 0),
    seatsOffered: int(o.seatsOffered, 0),
  };
}

function readLine(v: unknown, c: Catalog): Line {
  const o = obj(v);
  const a = str(o.a);
  const b = str(o.b);
  if (!getCity(c, a) || !getCity(c, b) || !getRoad(c, a, b)) bad('referencia');
  const id = str(o.id);
  if (id !== routeId(a, b)) bad();
  const lastDepart = (x: unknown) => (x === null ? null : int(x, 0));
  return {
    id, a, b,
    priceCents: int(o.priceCents, 1),
    paused: bool(o.paused),
    queueA: real(o.queueA, 0),
    queueB: real(o.queueB, 0),
    lastDepartA: lastDepart(o.lastDepartA),
    lastDepartB: lastDepart(o.lastDepartB),
    today: readStats(o.today),
    yesterday: readStats(o.yesterday),
  };
}

function readTrip(v: unknown, seats: number): Trip {
  const o = obj(v);
  switch (o.phase) {
    case 'idle': return { phase: 'idle' };
    case 'waiting': return { phase: 'waiting', at: end(o.at), minutesLeft: int(o.minutesLeft, 0) };
    case 'moving': {
      const passengers = int(o.passengers, 0);
      if (passengers > seats) bad();
      return { phase: 'moving', from: end(o.from), progress: real(o.progress, 0, 1), passengers, fareCents: int(o.fareCents, 0) };
    }
    default: return bad();
  }
}

function readBus(v: unknown, c: Catalog, lineIds: Set<string>): Bus {
  const o = obj(v);
  const id = str(o.id);
  if (id.length === 0) bad();
  const modelId = str(o.modelId);
  const model = getModel(c, modelId) ?? bad('referencia');
  const name = str(o.name);
  if (name.trim().length === 0 || name.length > MAX_NAME_LENGTH) bad();
  const livery = str(o.livery);
  if (!isValidLivery(livery)) bad();
  const lineId = o.lineId === null ? null : str(o.lineId);
  if (lineId !== null && !lineIds.has(lineId)) bad();
  const trip = readTrip(o.trip, model.seats);
  if ((trip.phase === 'idle') !== (lineId === null)) bad();
  return { id, modelId, name, livery: livery as LiveryStyle, lineId, trip };
}

function readState(raw: unknown, c: Catalog): GameState {
  const top = obj(raw);
  if (typeof top.version === 'number' && top.version > SAVE_VERSION) bad('versao_futura');
  const o = obj(migrate(top) ?? bad());
  if (o.version !== SAVE_VERSION) bad();

  const company = readCompany(o.company, c);
  const lines = arr(o.lines).map((l) => readLine(l, c));
  const lineIds = new Set(lines.map((l) => l.id));
  if (lineIds.size !== lines.length) bad();

  const rawBuses = arr(o.buses);
  if (rawBuses.length > MAX_BUSES) bad();
  const buses = rawBuses.map((b) => readBus(b, c, lineIds));
  if (new Set(buses.map((b) => b.id)).size !== buses.length) bad();

  return {
    version: SAVE_VERSION,
    company,
    cashCents: int(o.cashCents),
    clockMinutes: int(o.clockMinutes, 0),
    buses,
    lines,
    nextBusNumber: int(o.nextBusNumber, 1),
  };
}

/** Converte e valida campo a campo; o estado devolvido só tem campos conhecidos. */
export function parseSave(raw: unknown, c: Catalog): ParseResult {
  try {
    return { ok: true, state: readState(raw, c) };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.code };
    return { ok: false, error: 'formato' };
  }
}
