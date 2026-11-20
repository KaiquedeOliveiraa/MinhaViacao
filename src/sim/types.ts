export type CityId = string;
export type ModelId = string;
export type BusId = string;
export type RouteId = string; // os dois CityId em ordem alfabética, unidos por '-'
export type End = 'a' | 'b';
export type Difficulty = 'facil' | 'medio' | 'dificil';
export type LiveryStyle = 'plain' | 'stripe' | 'diagonal' | 'wave';
export type LogoIconId =
  | 'wheel' | 'road' | 'bus' | 'pine' | 'mountain' | 'wave'
  | 'star' | 'arrow' | 'chevrons' | 'diamond' | 'circles' | 'sun' | 'bird' | 'horse' | 'fish' | 'peaks' | 'waves' | 'compass';

export interface City { id: CityId; ibge?: number; name: string; population: number; lat: number; lng: number; difficulty: Difficulty; }
export type BusShape = 'van' | 'micro' | 'conv' | 'rodo' | 'dd';
export type BusCategory = 'van' | 'micro' | 'onibus' | 'rodoviario';
/** `priceCents` é o preço do modelo novo. */
export interface BusModel { id: ModelId; name: string; category: BusCategory; shape: BusShape; seats: number; comfort: number; kmPerLiter: number; priceCents: number; }
export type OfferCondition = 'novo' | 'usado';
export interface Offer { id: string; modelId: ModelId; condition: OfferCondition; year: number; odometerKm: number; priceCents: number; }
/** Loja de veículos. Sem cidade nem coordenadas por enquanto: preparada para lojas no mapa. */
export interface Dealer { id: string; name: string; cityId: CityId | null; lat: number | null; lng: number | null; offers: Offer[]; }
/** coords vão da cidade `a` até a `b`, com a < b em ordem alfabética. Cada ponto é [lat, lng]. */
export interface Road { id: RouteId; a: CityId; b: CityId; distanceKm: number; coords: [number, number][]; }
export interface Catalog { cities: City[]; models: BusModel[]; roads: Road[]; dealers: Dealer[]; }

export type LogoRef = { kind: 'icon'; iconId: LogoIconId } | { kind: 'image'; dataUrl: string };
export interface Company { name: string; hqCityId: CityId; primaryColor: string; secondaryColor: string; logo: LogoRef; defaultLivery: LiveryStyle; }

export type Trip =
  | { phase: 'idle' }
  | { phase: 'waiting'; at: End; minutesLeft: number }
  | { phase: 'moving'; from: End; progress: number; passengers: number; fareCents: number };
export type DriverId = string;
export interface Listing { priceCents: number; sinceMinutes: number; }
export interface Bus {
  id: BusId; modelId: ModelId; name: string; livery: LiveryStyle; lineId: RouteId | null; trip: Trip; driverId: DriverId | null;
  year: number; odometerKm: number; listing: Listing | null;
}

export interface DayStats { revenueCents: number; dieselCents: number; passengers: number; seatsOffered: number; }
/** `a` e `b` ficam na ordem em que o jogador escolheu; `id` é sempre o RouteId ordenado. */
export interface Line { id: RouteId; a: CityId; b: CityId; priceCents: number; paused: boolean; queueA: number; queueB: number; lastDepartA: number | null; lastDepartB: number | null; today: DayStats; yesterday: DayStats; }

export type TutorialStep = 'comprar' | 'pintar' | 'linha' | 'fim';
export interface GameState { version: 3; company: Company; cashCents: number; clockMinutes: number; buses: Bus[]; lines: Line[]; nextBusNumber: number; tutorial: TutorialStep; }

export type ActionError =
  | 'saldo_insuficiente' | 'modelo_inexistente' | 'onibus_inexistente' | 'ultimo_onibus'
  | 'linha_existente' | 'linha_inexistente' | 'rota_inexistente' | 'fora_da_rede'
  | 'onibus_ocupado' | 'nome_invalido' | 'empresa_invalida' | 'pintura_invalida'
  | 'preco_invalido' | 'oferta_inexistente';
export type ActionResult = { ok: true; state: GameState } | { ok: false; error: ActionError };
