export type CityId = string;
export type ModelId = string;
export type BusId = string;
export type RouteId = string; // os dois CityId em ordem alfabética, unidos por '-'
export type End = 'a' | 'b';
export type Difficulty = 'facil' | 'medio' | 'dificil';
export type LiveryStyle = 'plain' | 'stripe' | 'diagonal' | 'wave';
export type LogoIconId = 'wheel' | 'road' | 'bus' | 'pine' | 'mountain' | 'wave';

export interface City { id: CityId; name: string; population: number; lat: number; lng: number; difficulty: Difficulty; }
export type BusShape = 'micro' | 'conv' | 'rodo';
export interface BusModel { id: ModelId; name: string; shape: BusShape; seats: number; comfort: number; kmPerLiter: number; priceCents: number; }
/** coords vão da cidade `a` até a `b`, com a < b em ordem alfabética. Cada ponto é [lat, lng]. */
export interface Road { id: RouteId; a: CityId; b: CityId; distanceKm: number; coords: [number, number][]; }
export interface Catalog { cities: City[]; models: BusModel[]; roads: Road[]; }

export type LogoRef = { kind: 'icon'; iconId: LogoIconId } | { kind: 'image'; dataUrl: string };
export interface Company { name: string; hqCityId: CityId; primaryColor: string; secondaryColor: string; logo: LogoRef; defaultLivery: LiveryStyle; }

export type Trip =
  | { phase: 'idle' }
  | { phase: 'waiting'; at: End; minutesLeft: number }
  | { phase: 'moving'; from: End; progress: number; passengers: number; fareCents: number };
export interface Bus { id: BusId; modelId: ModelId; name: string; livery: LiveryStyle; lineId: RouteId | null; trip: Trip; }

export interface DayStats { revenueCents: number; dieselCents: number; passengers: number; seatsOffered: number; }
/** `a` e `b` ficam na ordem em que o jogador escolheu; `id` é sempre o RouteId ordenado. */
export interface Line { id: RouteId; a: CityId; b: CityId; priceCents: number; paused: boolean; queueA: number; queueB: number; lastDepartA: number | null; lastDepartB: number | null; today: DayStats; yesterday: DayStats; }

export interface GameState { version: 1; company: Company; cashCents: number; clockMinutes: number; buses: Bus[]; lines: Line[]; nextBusNumber: number; }

export type ActionError =
  | 'saldo_insuficiente' | 'modelo_inexistente' | 'onibus_inexistente' | 'ultimo_onibus'
  | 'linha_existente' | 'linha_inexistente' | 'rota_inexistente' | 'fora_da_rede'
  | 'onibus_ocupado' | 'nome_invalido' | 'empresa_invalida';
export type ActionResult = { ok: true; state: GameState } | { ok: false; error: ActionError };
