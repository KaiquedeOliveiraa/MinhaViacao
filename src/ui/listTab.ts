import type { Store } from '../game/store';
import { getRoad } from '../sim/catalog';
import { busesOnLine, lineOccupancy, lineProfitTodayCents } from '../sim/selectors';
import type { GameState, Line } from '../sim/types';
import { h } from './dom';
import { formatMoney } from './format';
import { lineName } from './linesTab';

const HEADERS = ['Linha', 'Km', 'Preço', 'Lotação', 'Lucro hoje', 'Veículos', 'Motorista'];

interface RowRefs { tr: HTMLElement; occupancy: HTMLElement; profit: HTMLElement; }

/** Aba Lista: todas as linhas numa tabela. */
export function mountListTab(el: HTMLElement, store: Store): () => void {
  const c = store.catalog;
  const body = h('div', { class: 'list-body' });
  el.replaceChildren(h('div', { class: 'tab-page list-tab' }, h('div', { class: 'tab-head' }, h('h2', { class: 'title' }, 'Lista')), body));

  let rows = new Map<string, RowRefs>();
  let structureKey = '';

  function buildRow(s: GameState, line: Line): RowRefs {
    const buses = busesOnLine(s, line.id);
    const km = getRoad(c, line.a, line.b)?.distanceKm;
    const drivers = buses.map((b) => b.driverId).filter((d): d is string => d !== null);
    const occupancy = h('span', { dataset: { live: 'occupancy' } });
    const profit = h('span', { dataset: { live: 'profit' } });
    const tr = h('tr', { dataset: { line: line.id } },
      h('td', { class: 'list-name' }, lineName(store, line)),
      h('td', null, km === undefined ? '—' : `${Math.round(km)} km`),
      h('td', null, formatMoney(line.priceCents, { cents: true })),
      h('td', null, occupancy),
      h('td', null, profit),
      h('td', null, ...(buses.length ? buses.map((b) => h('div', null, b.name)) : ['—'])),
      h('td', null, ...(drivers.length ? drivers.map((d) => h('div', null, d)) : ['—'])),
    );
    return { tr, occupancy, profit };
  }

  function keyOf(s: GameState): string {
    return JSON.stringify(s.lines.map((l) => [l.id, l.priceCents, busesOnLine(s, l.id).map((b) => [b.id, b.name, b.driverId])]));
  }

  function update() {
    const s = store.getState();
    for (const line of s.lines) {
      const r = rows.get(line.id);
      if (!r) continue;
      const occ = lineOccupancy(line);
      r.occupancy.textContent = occ === null ? '—' : `${Math.round(occ * 100)}%`;
      const profit = lineProfitTodayCents(s, line);
      r.profit.textContent = formatMoney(profit);
      r.profit.className = Math.round(profit / 100) < 0 ? 'money-down' : 'money-up';
    }
  }

  function render() {
    const s = store.getState();
    const key = keyOf(s);
    if (key !== structureKey) {
      structureKey = key;
      rows = new Map(s.lines.map((line) => [line.id, buildRow(s, line)]));
      if (rows.size === 0) body.replaceChildren(h('p', { class: 'muted empty' }, 'Nenhuma linha ainda.'));
      else body.replaceChildren(h('div', { class: 'table-wrap' }, h('table', { class: 'list-table' },
        h('thead', null, h('tr', null, ...HEADERS.map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, ...[...rows.values()].map((r) => r.tr)),
      )));
    }
    update();
  }

  render();
  const offChange = store.on('change', render);
  const offTick = store.on('tick', update);
  return () => { offChange(); offTick(); };
}
