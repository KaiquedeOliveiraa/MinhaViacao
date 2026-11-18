import type { Store } from '../game/store';
import { assignBus, closeLine, setLinePaused, setLinePrice, unassignBus } from '../sim/actions';
import { getCity, getModel, getRoad } from '../sim/catalog';
import { priceBoundsCents } from '../sim/demand';
import { busesOnLine, lineOccupancy, lineProfitTodayCents, lineRefPriceCents } from '../sim/selectors';
import type { ActionResult, GameState, Line } from '../sim/types';
import { confirmDialog } from './dialog';
import { h } from './dom';
import { errorMessage, formatMoney } from './format';
import { openNewLineDialog } from './newLineDialog';
import { toast } from './toast';

interface CardRefs {
  slider: HTMLInputElement;
  price: HTMLElement;
  ref: HTMLElement;
  occupancy: HTMLElement;
  profit: HTMLElement;
  pause: HTMLButtonElement;
  card: HTMLElement;
}

export function lineName(store: Store, line: Pick<Line, 'a' | 'b'>): string {
  const name = (id: string) => getCity(store.catalog, id)?.name ?? id;
  return `${name(line.a)} ⇄ ${name(line.b)}`;
}

/** Aba Linhas: um cartão por linha, com preço, lotação, lucro e ônibus. */
export function mountLinesTab(el: HTMLElement, store: Store): () => void {
  const c = store.catalog;
  const list = h('div', { class: 'lines-list' });
  el.replaceChildren(h('div', { class: 'tab-page lines-tab' },
    h('div', { class: 'tab-head' },
      h('h2', { class: 'title' }, 'Linhas'),
      h('button', { type: 'button', class: 'btn btn-primary btn-compact', dataset: { action: 'new-line' }, onClick: () => { void openNewLineDialog(store); } }, 'Nova linha'),
    ),
    list,
  ));

  const run = (action: (s: GameState) => ActionResult) => {
    const r = store.dispatch((s) => action(s));
    if (!r.ok) toast(errorMessage(r.error), 'erro');
    return r.ok;
  };

  let cards = new Map<string, CardRefs>();
  let structureKey = '';

  function buildCard(s: GameState, line: Line): CardRefs {
    const road = getRoad(c, line.a, line.b)!;
    const bounds = priceBoundsCents(road.distanceKm);
    const slider = h('input', {
      type: 'range', class: 'price-slider', min: String(bounds.min), max: String(bounds.max), step: '10', value: String(line.priceCents),
      'aria-label': `Preço da passagem ${lineName(store, line)}`,
      onInput: () => { run((st) => setLinePrice(st, c, line.id, Number(slider.value))); },
    });
    const price = h('strong', { class: 'price-value', dataset: { live: 'price' } });
    const ref = h('span', { class: 'muted small', dataset: { live: 'ref' } });
    const occupancy = h('span', { dataset: { live: 'occupancy' } });
    const profit = h('span', { dataset: { live: 'profit' } });
    const pause = h('button', { type: 'button', class: 'btn btn-light btn-compact', dataset: { action: 'pause' }, onClick: () => {
      const current = store.getState().lines.find((l) => l.id === line.id);
      if (current) run((st) => setLinePaused(st, c, line.id, !current.paused));
    } });
    const close = h('button', { type: 'button', class: 'btn btn-ghost btn-compact', dataset: { action: 'close' }, onClick: async () => {
      const ok = await confirmDialog(`Excluir a linha ${lineName(store, line)}? A taxa de abertura não é devolvida.`, 'Excluir');
      if (ok) run((st) => closeLine(st, c, line.id));
    } }, 'Excluir');

    const onLine = busesOnLine(s, line.id);
    const idle = s.buses.filter((b) => b.lineId === null);
    const busList = h('ul', { class: 'line-buses' },
      ...onLine.map((bus) => h('li', null,
        h('span', { class: 'line-bus-name' }, bus.name),
        h('span', { class: 'muted small' }, getModel(c, bus.modelId)?.name ?? ''),
        h('button', { type: 'button', class: 'link-btn', dataset: { removeBus: bus.id }, 'aria-label': `Retirar ${bus.name} da linha`, onClick: () => { run((st) => unassignBus(st, c, bus.id)); } }, 'Retirar'),
      )),
      onLine.length === 0 ? h('li', { class: 'muted small' }, 'Sem ônibus: a linha está parada.') : null,
    );
    const addSelect = h('select', {
      class: 'select', dataset: { action: 'add-bus' }, 'aria-label': 'Adicionar ônibus', disabled: idle.length === 0,
      onChange: () => { if (addSelect.value) run((st) => assignBus(st, c, addSelect.value, line.id)); },
    },
      h('option', { value: '' }, idle.length ? 'Adicionar ônibus…' : 'Nenhum ônibus parado'),
      ...idle.map((bus) => h('option', { value: bus.id }, bus.name)),
    );

    const card = h('article', { class: 'card card-stripe line-card', dataset: { line: line.id } },
      h('header', { class: 'line-head' },
        h('h3', { class: 'line-title' }, lineName(store, line)),
        h('span', { class: 'muted small' }, `${Math.round(road.distanceKm)} km`),
      ),
      h('div', { class: 'price-row' },
        h('div', { class: 'price-top' }, h('span', { class: 'field-label' }, 'Preço'), price),
        slider,
        ref,
      ),
      h('div', { class: 'line-stats' }, occupancy, profit),
      busList,
      addSelect,
      h('div', { class: 'line-actions' }, pause, close),
    );
    return { slider, price, ref, occupancy, profit, pause, card };
  }

  function updateCard(s: GameState, line: Line, r: CardRefs) {
    if (document.activeElement !== r.slider) r.slider.value = String(line.priceCents);
    r.price.textContent = formatMoney(line.priceCents, { cents: true });
    r.ref.textContent = `Referência: ${formatMoney(lineRefPriceCents(s, c, line), { cents: true })}`;
    const occ = lineOccupancy(line);
    r.occupancy.textContent = occ === null ? 'Lotação: sem viagens ainda' : `Lotação: ${Math.round(occ * 100)}%`;
    const profit = lineProfitTodayCents(s, line);
    r.profit.textContent = `Lucro hoje: ${formatMoney(profit)}`;
    r.profit.className = Math.round(profit / 100) < 0 ? 'money-down' : 'money-up';
    r.pause.textContent = line.paused ? 'Retomar' : 'Pausar';
    r.card.classList.toggle('is-paused', line.paused);
  }

  function keyOf(s: GameState): string {
    return JSON.stringify([
      s.buses.length === 0,
      s.lines.map((l) => [l.id, busesOnLine(s, l.id).map((b) => [b.id, b.name])]),
      s.buses.filter((b) => b.lineId === null).map((b) => [b.id, b.name]),
    ]);
  }

  function render() {
    const s = store.getState();
    const key = keyOf(s);
    if (key !== structureKey) {
      structureKey = key;
      cards = new Map(s.lines.map((line) => [line.id, buildCard(s, line)]));
      list.replaceChildren(...[...cards.values()].map((r) => r.card));
      if (cards.size === 0) {
        const text = s.buses.length === 0
          ? 'Nenhuma linha ainda. Compre um ônibus na Loja e depois toque em Nova linha.'
          : 'Nenhuma linha. Toque em Nova linha para começar.';
        list.appendChild(h('p', { class: 'muted empty' }, text));
      }
    }
    update();
  }

  function update() {
    const s = store.getState();
    for (const line of s.lines) {
      const r = cards.get(line.id);
      if (r) updateCard(s, line, r);
    }
  }

  render();
  const offChange = store.on('change', render);
  const offTick = store.on('tick', update);
  return () => { offChange(); offTick(); };
}
