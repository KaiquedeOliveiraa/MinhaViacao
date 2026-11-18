/**
 * Simulação sem tela que mede a economia com as regras reais (npm run calibrate).
 * Imprime três tabelas e o estado dos seis critérios de aceite do plano (tarefa 7).
 */
import { MINUTES_PER_DAY } from '../src/data/balance';
import { catalog, getCity, getModel, getRoad } from '../src/sim/catalog';
import { allOffers, cheapestOffer, type DealerOffer } from '../src/sim/market';
import { refPriceCents } from '../src/sim/demand';
import { createGame, newLine } from '../src/sim/newGame';
import { lineOccupancy, linePotential, openFeeCents } from '../src/sim/selectors';
import { startedGame, testCompany } from '../src/sim/testkit';
import { advance } from '../src/sim/tick';
import type { BusModel, CityId, GameState, Road } from '../src/sim/types';

const c = catalog;
const reais = (cents: number) => `R$ ${(cents / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
const cityName = (id: CityId) => getCity(c, id)?.name ?? id;
const roadName = (r: Road) => `${cityName(r.a)}–${cityName(r.b)}`;
const results: { n: number; label: string; value: string; ok: boolean }[] = [];
const check = (n: number, label: string, value: string, ok: boolean) => results.push({ n, label, value, ok });
const startOffer = cheapestOffer(c);
const offerName = (o: DealerOffer) => `${o.modelId} ${o.condition === 'novo' ? 'novo' : `usado ${o.year}`}`;

// (a) minutos até pagar um segundo ônibus da oferta mais barata, por sede. O começo é o do jogo:
// createGame (sem ônibus), compra a oferta mais barata (micro usado) e abre a linha da sede até a cidade mais próxima,
// no preço de referência, com o ônibus nela (primeira linha sem taxa) — startedGame no testkit.
function minutesToSecondBus(hq: CityId): number | null {
  let s = startedGame(c, { ...testCompany, hqCityId: hq });
  const price = startOffer.priceCents;
  let minutes = 0;
  while (s.cashCents < price) {
    if (minutes >= 20 * MINUTES_PER_DAY) return null;
    s = advance(s, c, 10);
    minutes += 10;
  }
  return minutes;
}

console.log(`\n(a) Sede → minutos de jogo até comprar o 2º ${getModel(c, startOffer.modelId)!.name} (${offerName(startOffer)}, ${reais(startOffer.priceCents)})`);
const byHq = new Map<CityId, number | null>();
for (const city of c.cities) {
  const m = minutesToSecondBus(city.id);
  byHq.set(city.id, m);
  console.log(`  ${city.name.padEnd(14)} ${m === null ? '> 20 dias' : `${m} min (${(m / 60).toFixed(1)} min reais)`}`);
}

// (b) lucro diário de 1 ônibus por rodovia e modelo, no preço de referência
function soloState(road: Road, model: BusModel): GameState {
  const s = createGame(c, { ...testCompany, hqCityId: road.a });
  s.lines = [newLine(c, road.a, road.b, refPriceCents(road.distanceKm, model.comfort))];
  s.buses = [{ id: 'bus-1', modelId: model.id, name: 'x', livery: 'plain', lineId: road.id, trip: { phase: 'waiting', at: 'a', minutesLeft: 0 }, driverId: null, year: 2026, odometerKm: 0, listing: null }];
  return s;
}
function dailyProfit(road: Road, model: BusModel): { profit: number; occupancy: number | null } {
  let s = advance(soloState(road, model), c, MINUTES_PER_DAY); // começo do dia 2
  const start = s.cashCents;
  s = advance(s, c, 3 * MINUTES_PER_DAY); // fim do dia 4
  return { profit: (s.cashCents - start) / 3, occupancy: lineOccupancy(s.lines[0]!) };
}

// o lucro diário depende só do modelo (idade e km não mexem na operação); o retorno, do preço de cada oferta
console.log('\n(b) Rodovia × modelo → lucro por dia (dias 2 a 4) e dias para cada oferta se pagar');
const payback = new Map<string, { road: Road; model: BusModel; offer: DealerOffer; profit: number; days: number }>();
const profits = new Map<string, number>();
const fmtDays = (d: number) => (d === Infinity ? 'nunca' : d.toFixed(1));
for (const road of c.roads) {
  for (const model of c.models) {
    const { profit, occupancy } = dailyProfit(road, model);
    profits.set(`${road.id}|${model.id}`, profit);
    const cols: string[] = [];
    for (const offer of allOffers(c).filter((o) => o.modelId === model.id)) {
      const days = profit > 0 ? offer.priceCents / profit : Infinity;
      payback.set(`${road.id}|${offer.id}`, { road, model, offer, profit, days });
      cols.push(`${offer.condition === 'novo' ? 'novo' : offer.year} ${fmtDays(days)}`);
    }
    console.log(`  ${roadName(road).padEnd(26)} ${model.id.padEnd(7)} ${reais(profit).padStart(10)}/dia  lotação ${(occupancy === null ? '-' : Math.round(occupancy * 100) + '%').padStart(4)}  dias: ${cols.join(' · ')}`);
  }
}

console.log('\n(c) Taxa de abertura por rodovia');
for (const road of c.roads) {
  console.log(`  ${roadName(road).padEnd(26)} ${road.distanceKm.toFixed(1).padStart(6)} km  potencial ${linePotential(c, road.a, road.b).toFixed(0).padStart(4)}/dia  taxa ${reais(openFeeCents(c, road.a, road.b))}`);
}

console.log('\n(d) Oferta → preço e melhor retorno (na rodovia mais lucrativa para o modelo)');
for (const offer of [...allOffers(c)].sort((x, y) => x.priceCents - y.priceCents)) {
  const best = [...payback.values()].filter((p) => p.offer.id === offer.id).reduce((b, p) => (p.days < b.days ? p : b));
  console.log(`  ${offerName(offer).padEnd(18)} ${reais(offer.priceCents).padStart(11)}  ${fmtDays(best.days).padStart(5)} dias  (${roadName(best.road)})`);
}

// critérios
const ibi = byHq.get('ibirama') ?? null;
check(1, 'Ibirama: minutos até o 2º ônibus (1200 a 1800)', String(ibi), ibi !== null && ibi >= 1200 && ibi <= 1800);
for (const hq of ['blumenau', 'itajai']) {
  const m = byHq.get(hq) ?? null;
  check(2, `${cityName(hq)}: minutos até o 2º ônibus (400 ou mais)`, String(m), m === null || m >= 400);
}
{
  const s0 = startedGame(c, { ...testCompany, hqCityId: 'ibirama' });
  let s = advance(s0, c, 2 * MINUTES_PER_DAY); // fim do dia 2: yesterday = dia 2
  const d2 = s.lines[0]!.yesterday;
  s = advance(s, c, MINUTES_PER_DAY); // fim do dia 3
  const d3 = s.lines[0]!.yesterday;
  const occ = (d2.passengers + d3.passengers) / (d2.seatsOffered + d3.seatsOffered);
  check(3, 'Lotação da linha inicial de Ibirama, dias 2 e 3 (50% a 90%)', `${Math.round(occ * 100)}%`, occ >= 0.5 && occ <= 0.9);
}
{
  const worst = [...payback.values()].reduce((w, p) => (p.days < w.days ? p : w));
  check(4, 'Menor tempo de retorno entre todas as rodovias e ofertas (≥ 1,5 dia)', `${worst.days.toFixed(2)} (${roadName(worst.road)}, ${offerName(worst.offer)})`, worst.days >= 1.5);
}
for (const id of ['conv', 'rodo']) {
  const best = [...payback.values()].filter((p) => p.offer.modelId === id && p.offer.condition === 'novo').reduce((b, p) => (p.days < b.days ? p : b));
  check(5, `${getModel(c, id)!.name} novo na melhor linha: dias para se pagar (3 a 8)`, `${best.days.toFixed(2)} (${roadName(best.road)})`, best.days >= 3 && best.days <= 8);
}
{
  const road = getRoad(c, 'blumenau', 'itajai')!;
  const fee = openFeeCents(c, road.a, road.b);
  const profit = profits.get(`${road.id}|${startOffer.modelId}`)!;
  const ratio = fee / profit;
  check(6, 'Taxa Blumenau–Itajaí ÷ lucro diário do micro nela (2 a 5)', ratio.toFixed(2), ratio >= 2 && ratio <= 5);
}

console.log('\nCritérios');
for (const r of results) console.log(`  ${r.ok ? 'OK  ' : 'FORA'}  ${r.n}. ${r.label}: ${r.value}`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
