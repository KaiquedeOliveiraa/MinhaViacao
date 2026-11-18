import type { Store } from '../game/store';
import { buyBus } from '../sim/actions';
import type { BusModel } from '../sim/types';
import { busSvg } from './busSvg';
import { promptDialog } from './dialog';
import { h } from './dom';
import { errorMessage, formatMoney } from './format';
import { toast } from './toast';

const decimal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Aba Loja: os modelos à venda, na pintura padrão da viação. */
export function mountShopTab(el: HTMLElement, store: Store): () => void {
  const c = store.catalog;
  const grid = h('div', { class: 'card-grid shop-grid' });
  el.replaceChildren(h('div', { class: 'tab-page shop-tab' }, h('div', { class: 'tab-head' }, h('h2', { class: 'title' }, 'Loja')), grid));

  const buttons = new Map<string, { button: HTMLButtonElement; model: BusModel }>();

  async function buy(model: BusModel) {
    const name = await promptDialog({ title: model.name, label: 'Nome do ônibus (opcional)', maxLength: 30, confirmLabel: 'Comprar' });
    if (name === null) return;
    const r = store.dispatch((s, cat) => buyBus(s, cat, { modelId: model.id, name }));
    if (!r.ok) { toast(errorMessage(r.error), 'erro'); return; }
    const bus = r.state.buses.at(-1);
    toast(`${bus?.name ?? model.name} chegou à garagem.`, 'ok');
  }

  let artKey = '';
  function build() {
    const { company } = store.getState();
    const next = JSON.stringify([company.primaryColor, company.secondaryColor, company.defaultLivery, company.logo]);
    if (next === artKey) return;
    artKey = next;
    buttons.clear();
    grid.replaceChildren(...c.models.map((model) => {
      const button = h('button', { type: 'button', class: 'btn btn-primary btn-compact', dataset: { action: 'buy' }, onClick: () => { void buy(model); } });
      buttons.set(model.id, { button, model });
      return h('article', { class: 'card card-stripe shop-card', dataset: { model: model.id } },
        h('div', { class: 'bus-card-art' }, busSvg({ shape: model.shape, primary: company.primaryColor, secondary: company.secondaryColor, livery: company.defaultLivery, logo: company.logo })),
        h('h3', { class: 'bus-card-name' }, model.name),
        h('ul', { class: 'spec-list' },
          h('li', null, `${model.seats} lugares`),
          h('li', null, `Conforto ${decimal(model.comfort)}`),
          h('li', null, `${decimal(model.kmPerLiter)} km por litro`),
        ),
        h('div', { class: 'shop-buy' }, h('strong', { class: 'shop-price' }, formatMoney(model.priceCents)), button),
      );
    }));
  }

  /** Atualizado também no tick: o caixa muda com o tempo. */
  function update() {
    const cash = store.getState().cashCents;
    for (const { button, model } of buttons.values()) {
      const missing = model.priceCents - cash;
      const blocked = cash < 0 || missing > 0;
      button.disabled = blocked;
      button.textContent = blocked ? `Faltam ${formatMoney(Math.max(missing, 0))}` : 'Comprar';
    }
  }

  build();
  update();
  const offChange = store.on('change', () => { build(); update(); });
  const offTick = store.on('tick', update);
  return () => { offChange(); offTick(); };
}
