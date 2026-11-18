import type { Store } from '../game/store';
import { renameBus, sellBus, setBusLivery } from '../sim/actions';
import { getModel } from '../sim/catalog';
import { LIVERY_STYLES } from '../sim/newGame';
import { sellValueCents } from '../sim/selectors';
import type { ActionResult, Bus, GameState, LiveryStyle } from '../sim/types';
import { busSvg, liveryThumb } from './busSvg';
import { confirmDialog, promptDialog } from './dialog';
import { h } from './dom';
import { errorMessage, formatMoney } from './format';
import { lineName } from './linesTab';
import { toast } from './toast';

const LIVERY_LABELS: Record<LiveryStyle, string> = { plain: 'Lisa', stripe: 'Faixa reta', diagonal: 'Faixa diagonal', wave: 'Onda' };
export const LAST_BUS_MESSAGE = 'Sua viação precisa de pelo menos um ônibus.';

/** Aba Garagem: cada ônibus desenhado com a sua pintura, com renomear, pintura e venda. */
export function mountGarageTab(el: HTMLElement, store: Store): () => void {
  const c = store.catalog;
  const grid = h('div', { class: 'card-grid garage-grid' });
  el.replaceChildren(h('div', { class: 'tab-page garage-tab' }, h('div', { class: 'tab-head' }, h('h2', { class: 'title' }, 'Garagem')), grid));

  const run = (action: (s: GameState) => ActionResult) => {
    const r = store.dispatch((s) => action(s));
    if (!r.ok) toast(errorMessage(r.error), 'erro');
    return r.ok;
  };

  function card(s: GameState, bus: Bus): HTMLElement {
    const model = getModel(c, bus.modelId);
    const line = s.lines.find((l) => l.id === bus.lineId);
    const value = sellValueCents(c, bus);
    const isLast = s.buses.length <= 1;
    const sell = h('button', {
      type: 'button', class: 'btn btn-light btn-compact', dataset: { action: 'sell' }, disabled: isLast, title: isLast ? LAST_BUS_MESSAGE : null,
      onClick: async () => {
        if (await confirmDialog(`Vender ${bus.name} por ${formatMoney(value)}?`, 'Vender')) {
          if (run((st) => sellBus(st, c, bus.id))) toast(`${bus.name} foi vendido.`, 'ok');
        }
      },
    }, `Vender por ${formatMoney(value)}`);

    return h('article', { class: 'card bus-card', dataset: { bus: bus.id } },
      h('header', { class: 'bus-card-head' },
        h('h3', { class: 'bus-card-name' }, bus.name),
        h('button', {
          type: 'button', class: 'link-btn', dataset: { action: 'rename' }, 'aria-label': `Renomear ${bus.name}`,
          onClick: async () => {
            const name = await promptDialog({ title: 'Nome do ônibus', label: 'Nome', initial: bus.name, maxLength: 30, confirmLabel: 'Salvar' });
            if (name !== null) run((st) => renameBus(st, c, bus.id, name));
          },
        }, 'Renomear'),
      ),
      h('div', { class: 'bus-card-art' }, model ? busSvg({ shape: model.shape, primary: s.company.primaryColor, secondary: s.company.secondaryColor, livery: bus.livery, logo: s.company.logo }) : null),
      h('div', { class: 'bus-card-meta' },
        h('span', { class: 'muted small' }, model ? `${model.name} · ${model.seats} lugares` : bus.modelId),
        h('span', { class: `badge ${line ? 'badge-active' : ''}` }, line ? lineName(store, line) : 'Parado'),
      ),
      h('div', { class: 'livery-row', role: 'group', 'aria-label': 'Pintura deste ônibus' },
        ...LIVERY_STYLES.map((style) => h('button', {
          type: 'button', class: 'choice livery-choice', dataset: { livery: style }, 'aria-pressed': String(bus.livery === style), 'aria-label': LIVERY_LABELS[style], title: LIVERY_LABELS[style],
          onClick: () => { if (bus.livery !== style) run((st) => setBusLivery(st, c, bus.id, style)); },
        }, liveryThumb(style, s.company.primaryColor, s.company.secondaryColor))),
      ),
      sell,
    );
  }

  let key = '';
  function render() {
    const s = store.getState();
    const next = JSON.stringify([s.company, s.buses.map((b) => [b.id, b.name, b.livery, b.lineId]), s.lines.map((l) => l.id)]);
    if (next === key) return;
    key = next;
    grid.replaceChildren(...s.buses.map((bus) => card(s, bus)));
  }

  render();
  const off = store.on('change', render);
  return off;
}
