import type { Store } from '../game/store';
import { buyOffer } from '../sim/actions';
import { getModel } from '../sim/catalog';
import { allOffers, type DealerOffer } from '../sim/market';
import type { BusModel } from '../sim/types';
import { busSvg } from './busSvg';
import { promptDialog } from './dialog';
import { h } from './dom';
import { errorMessage, formatMoney } from './format';
import { toast } from './toast';

const decimal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const kilometers = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km`;

/** Aba Loja: as ofertas das lojas (novos e usados), na pintura padrão da viação. */
export function mountShopTab(el: HTMLElement, store: Store): () => void {
  const c = store.catalog;
  const grid = h('div', { class: 'card-grid shop-grid' });
  el.replaceChildren(h('div', { class: 'tab-page shop-tab' }, h('div', { class: 'tab-head' }, h('h2', { class: 'title' }, 'Loja')), grid));

  const buttons = new Map<string, { button: HTMLButtonElement; offer: DealerOffer }>();

  async function buy(offer: DealerOffer, model: BusModel) {
    const name = await promptDialog({ title: model.name, label: 'Nome do ônibus (opcional)', maxLength: 30, confirmLabel: 'Comprar' });
    if (name === null) return;
    const r = store.dispatch((s, cat) => buyOffer(s, cat, { offerId: offer.id, name }));
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
    const cards: HTMLElement[] = [];
    for (const offer of allOffers(c)) {
      const model = getModel(c, offer.modelId);
      if (!model) continue;
      const used = offer.condition === 'usado';
      const button = h('button', { type: 'button', class: 'btn btn-primary btn-compact', dataset: { action: 'buy' }, onClick: () => { void buy(offer, model); } });
      buttons.set(offer.id, { button, offer });
      cards.push(h('article', { class: 'card card-stripe shop-card', dataset: { offer: offer.id, model: model.id } },
        h('div', { class: 'bus-card-art' }, busSvg({ shape: model.shape, primary: company.primaryColor, secondary: company.secondaryColor, livery: company.defaultLivery, logo: company.logo })),
        h('h3', { class: 'bus-card-name' }, model.name),
        h('ul', { class: 'spec-list' },
          h('li', { dataset: { spec: 'condition' } }, used ? 'Usado' : 'Novo'),
          used ? h('li', { dataset: { spec: 'year' } }, `Ano ${offer.year}`) : null,
          used ? h('li', { dataset: { spec: 'km' } }, kilometers(offer.odometerKm)) : null,
          h('li', null, `${model.seats} lugares`),
          h('li', null, `Conforto ${decimal(model.comfort)}`),
          h('li', null, `${decimal(model.kmPerLiter)} km por litro`),
        ),
        h('div', { class: 'shop-buy' }, h('strong', { class: 'shop-price' }, formatMoney(offer.priceCents)), button),
      ));
    }
    grid.replaceChildren(...cards);
  }

  /** Atualizado também no tick: o caixa muda com o tempo. */
  function update() {
    const cash = store.getState().cashCents;
    for (const { button, offer } of buttons.values()) {
      const missing = offer.priceCents - cash;
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
