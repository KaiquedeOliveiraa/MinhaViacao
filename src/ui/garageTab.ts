import { LISTING_MAX_FACTOR, SALE_MAX_RATIO } from '../data/balance';
import type { Store } from '../game/store';
import { listBus, renameBus, sellBus, setBusLivery, unlistBus } from '../sim/actions';
import { getModel } from '../sim/catalog';
import { fairValueCents, sellNowCents } from '../sim/market';
import { LIVERY_STYLES } from '../sim/newGame';
import type { ActionResult, Bus, GameState, LiveryStyle } from '../sim/types';
import { busSvg, liveryThumb } from './busSvg';
import { confirmDialog, promptDialog, showDialog } from './dialog';
import { h } from './dom';
import { errorMessage, formatMoney, logoKey } from './format';
import { lineName } from './linesTab';
import { toast } from './toast';

const LIVERY_LABELS: Record<LiveryStyle, string> = { plain: 'Lisa', stripe: 'Faixa reta', diagonal: 'Faixa diagonal', wave: 'Onda' };
export const LAST_BUS_MESSAGE = 'Sua viação precisa de pelo menos um ônibus.';
export const EMPTY_GARAGE = 'Nenhum ônibus na garagem. Compre o primeiro na Loja.';

const kilometers = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km`;

/** Diálogo do anúncio: preço em reais, começando no valor justo. Devolve os centavos ou null. */
function listingDialog(busName: string, fairCents: number, minCents: number, maxCents: number): Promise<number | null> {
  const input = h('input', {
    class: 'text-input', id: 'listing-price', type: 'number', inputmode: 'numeric', step: '1',
    min: String(Math.ceil(minCents / 100)), max: String(Math.floor(maxCents / 100)),
  });
  input.value = String(Math.round(fairCents / 100));
  const error = h('p', { class: 'form-error small', role: 'alert' });
  return showDialog<number | null>({
    title: `Anunciar ${busName}`,
    body: [
      h('p', { class: 'dialog-message' }, `Valor justo: ${formatMoney(fairCents)}. Quanto mais acima, mais demora; acima de ${formatMoney(Math.round(SALE_MAX_RATIO * fairCents))} não vende.`),
      h('label', { class: 'field-label', for: 'listing-price' }, 'Preço do anúncio (R$)'),
      input,
      error,
    ],
    confirmLabel: 'Anunciar',
    cancelValue: null,
    initialFocus: input,
    onConfirm: () => {
      const cents = Math.round(Number(input.value) * 100);
      if (!input.value.trim() || !Number.isFinite(cents) || cents < minCents || cents > maxCents) {
        error.textContent = `Digite um preço entre ${formatMoney(minCents)} e ${formatMoney(maxCents)}.`;
        return undefined;
      }
      return cents;
    },
  });
}

/** Aba Garagem: cada ônibus desenhado com a sua pintura, com renomear, pintura, venda e anúncio. */
export function mountGarageTab(el: HTMLElement, store: Store): () => void {
  const c = store.catalog;
  const grid = h('div', { class: 'card-grid garage-grid' });
  el.replaceChildren(h('div', { class: 'tab-page garage-tab' }, h('div', { class: 'tab-head' }, h('h2', { class: 'title' }, 'Garagem')), grid));

  const run = (action: (s: GameState) => ActionResult) => {
    const r = store.dispatch((s) => action(s));
    if (!r.ok) toast(errorMessage(r.error), 'erro');
    return r.ok;
  };

  const live = new Map<string, { sell: HTMLButtonElement; km: HTMLElement; fair: HTMLElement | null; warn: HTMLElement | null }>();
  const WARN_TEXT = 'Acima do limite: não vende';
  /** Valor justo de hoje e o aviso de anúncio acima do limite de venda. */
  function paintListing(bus: Bus, clock: number, fair: HTMLElement | null, warn: HTMLElement | null) {
    if (!bus.listing || !fair || !warn) return;
    const value = fairValueCents(c, bus, clock);
    fair.textContent = `Valor justo hoje: ${formatMoney(value)}`;
    warn.hidden = !(bus.listing.priceCents >= SALE_MAX_RATIO * value);
  }
  const sellLabel = (value: number) => `Vender agora por ${formatMoney(value)}`;

  function card(s: GameState, bus: Bus): HTMLElement {
    const model = getModel(c, bus.modelId);
    const line = s.lines.find((l) => l.id === bus.lineId);
    const isLast = s.buses.length <= 1;
    /** Valor de agora: o ônibus e o relógio mudam sem refazer o cartão. */
    const current = () => store.getState().buses.find((b) => b.id === bus.id) ?? bus;
    const sell = h('button', {
      type: 'button', class: 'btn btn-light btn-compact', dataset: { action: 'sell' }, disabled: isLast, title: isLast ? LAST_BUS_MESSAGE : null,
      onClick: async () => {
        const value = sellNowCents(c, current(), store.getState().clockMinutes);
        if (await confirmDialog(`Vender ${bus.name} por ${formatMoney(value)}?`, 'Vender')) {
          if (run((st) => sellBus(st, c, bus.id))) toast(`${bus.name} foi vendido.`, 'ok');
        }
      },
    }, sellLabel(sellNowCents(c, bus, s.clockMinutes)));

    const adButton = bus.listing
      ? h('button', {
        type: 'button', class: 'btn btn-light btn-compact', dataset: { action: 'unlist' },
        onClick: () => { run((st) => unlistBus(st, c, bus.id)); },
      }, 'Retirar anúncio')
      : h('button', {
        type: 'button', class: 'btn btn-primary btn-compact', dataset: { action: 'list' }, disabled: isLast, title: isLast ? LAST_BUS_MESSAGE : null,
        onClick: async () => {
          const now = store.getState().clockMinutes;
          const fair = fairValueCents(c, current(), now);
          const price = await listingDialog(current().name, fair, sellNowCents(c, current(), now), Math.floor(LISTING_MAX_FACTOR * fair));
          if (price === null) return;
          if (run((st) => listBus(st, c, bus.id, price))) toast(`${bus.name} foi anunciado por ${formatMoney(price)}.`, 'ok');
        },
      }, 'Anunciar');

    const km = h('li', { dataset: { spec: 'km' } }, kilometers(bus.odometerKm));
    const fair = bus.listing ? h('span', { class: 'muted small', dataset: { listing: 'fair' } }) : null;
    const warn = bus.listing ? h('span', { class: 'listing-warn small', role: 'alert', dataset: { listing: 'warn' } }, WARN_TEXT) : null;
    paintListing(bus, s.clockMinutes, fair, warn);
    live.set(bus.id, { sell, km, fair, warn });

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
      h('ul', { class: 'spec-list' }, h('li', { dataset: { spec: 'year' } }, `Ano ${bus.year}`), km),
      bus.listing ? h('span', { class: 'badge badge-listing', dataset: { badge: 'listing' } }, `Anunciado por ${formatMoney(bus.listing.priceCents)}`) : null,
      bus.listing ? h('div', { class: 'listing-info' }, fair, warn) : null,
      h('div', { class: 'livery-row', role: 'group', 'aria-label': 'Pintura deste ônibus' },
        ...LIVERY_STYLES.map((style) => h('button', {
          type: 'button', class: 'choice livery-choice', dataset: { livery: style }, 'aria-pressed': String(bus.livery === style), 'aria-label': LIVERY_LABELS[style], title: LIVERY_LABELS[style],
          onClick: () => { if (bus.livery !== style) run((st) => setBusLivery(st, c, bus.id, style)); },
        }, liveryThumb(style, s.company.primaryColor, s.company.secondaryColor))),
      ),
      h('div', { class: 'bus-card-actions' }, sell, adButton),
    );
  }

  /** Valores que mudam com o tempo (quilometragem e valor de venda): só o texto, sem refazer os cartões. */
  function refreshValues() {
    const s = store.getState();
    for (const bus of s.buses) {
      const parts = live.get(bus.id);
      if (!parts) continue;
      parts.km.textContent = kilometers(bus.odometerKm);
      parts.sell.textContent = sellLabel(sellNowCents(c, bus, s.clockMinutes));
      paintListing(bus, s.clockMinutes, parts.fair, parts.warn);
    }
  }

  let key = '';
  function render() {
    const s = store.getState();
    const next = JSON.stringify([{ ...s.company, logo: logoKey(s.company.logo) }, s.buses.map((b) => [b.id, b.name, b.livery, b.lineId, b.listing?.priceCents ?? null]), s.lines.map((l) => l.id)]);
    if (next === key) return;
    key = next;
    live.clear();
    if (s.buses.length === 0) grid.replaceChildren(h('p', { class: 'muted empty' }, EMPTY_GARAGE));
    else grid.replaceChildren(...s.buses.map((bus) => card(s, bus)));
  }

  render();
  const offChange = store.on('change', () => { render(); refreshValues(); });
  const offHour = store.on('hour', refreshValues);
  return () => { offChange(); offHour(); };
}
