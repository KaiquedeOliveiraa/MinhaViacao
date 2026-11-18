import { INITIAL_QUEUE_HOURS, MAX_NAME_LENGTH, START_CASH_CENTS } from '../data/balance';
import { getCity, getRoad, routeId } from './catalog';
import { potentialPerDay } from './demand';
import type { Catalog, CityId, Company, DayStats, GameState, Line, LiveryStyle, LogoIconId } from './types';

export const LOGO_ICON_IDS: readonly LogoIconId[] = [
  'wheel', 'road', 'bus', 'pine', 'mountain', 'wave',
  'star', 'arrow', 'chevrons', 'diamond', 'circles', 'sun', 'bird', 'horse', 'fish', 'peaks', 'waves', 'compass',
];
export const LIVERY_STYLES: readonly LiveryStyle[] = ['plain', 'stripe', 'diagonal', 'wave'];
export const MAX_LOGO_DATA_URL_LENGTH = 200_000;

export type CompanyInput = Company; // mesmo formato; chega da tela sem validação
export type CompanyInputError = 'nome' | 'sede' | 'cor' | 'logo' | 'pintura';

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const IMAGE_PREFIXES = ['data:image/png', 'data:image/jpeg', 'data:image/webp'];

export function isValidName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_NAME_LENGTH;
}

export function isValidColor(color: unknown): color is string {
  return typeof color === 'string' && COLOR_RE.test(color);
}

export function isValidLogo(logo: unknown): boolean {
  if (!logo || typeof logo !== 'object') return false;
  const ref = logo as Record<string, unknown>;
  if (ref.kind === 'icon') return LOGO_ICON_IDS.includes(ref.iconId as LogoIconId);
  if (ref.kind === 'image') {
    const url = ref.dataUrl;
    return typeof url === 'string' && url.length <= MAX_LOGO_DATA_URL_LENGTH && IMAGE_PREFIXES.some((p) => url.startsWith(p));
  }
  return false;
}

export function isValidLivery(livery: unknown): livery is LiveryStyle {
  return LIVERY_STYLES.includes(livery as LiveryStyle);
}

export function validateCompanyInput(input: CompanyInput, c: Catalog): CompanyInputError[] {
  const errors: CompanyInputError[] = [];
  if (!isValidName(input.name)) errors.push('nome');
  if (typeof input.hqCityId !== 'string' || !getCity(c, input.hqCityId)) errors.push('sede');
  if (!isValidColor(input.primaryColor) || !isValidColor(input.secondaryColor)) errors.push('cor');
  if (!isValidLogo(input.logo)) errors.push('logo');
  if (!isValidLivery(input.defaultLivery)) errors.push('pintura');
  return errors;
}

export function emptyDayStats(): DayStats {
  return { revenueCents: 0, dieselCents: 0, passengers: 0, seatsOffered: 0 };
}

/** Linha nova, com `a` e `b` na ordem do jogador e INITIAL_QUEUE_HOURS de passageiros em cada ponta. */
export function newLine(c: Catalog, a: CityId, b: CityId, priceCents: number): Line {
  const road = getRoad(c, a, b);
  const cityA = getCity(c, a);
  const cityB = getCity(c, b);
  if (!road || !cityA || !cityB) throw new Error(`rota inexistente: ${a}-${b}`);
  const initialQueue = (potentialPerDay(cityA, cityB, road.distanceKm) * INITIAL_QUEUE_HOURS) / 24;
  return {
    id: routeId(a, b), a, b, priceCents, paused: false,
    queueA: initialQueue, queueB: initialQueue,
    lastDepartA: null, lastDepartB: null,
    today: emptyDayStats(), yesterday: emptyDayStats(),
  };
}

export function createGame(c: Catalog, input: CompanyInput): GameState {
  const errors = validateCompanyInput(input, c);
  if (errors.length > 0) throw new Error(`empresa inválida: ${errors.join(', ')}`);
  const company: Company = { ...input, name: input.name.trim(), logo: { ...input.logo } };
  // sem ônibus e sem linhas: o tutorial guia a compra, a pintura e a primeira linha (que não paga taxa)
  return {
    version: 3,
    company,
    cashCents: START_CASH_CENTS,
    clockMinutes: 0,
    buses: [],
    lines: [],
    nextBusNumber: 1,
    tutorial: 'comprar',
  };
}
