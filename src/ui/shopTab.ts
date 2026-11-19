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

type Category = 'todas' | BusModel['category'];
type Condition = 'todos' | 'novo' | 'usado';
type Sort = 'preco-asc' | 'preco-desc' | 'lugares' | 'novo';

const CATEGORIES: [Category, string][] = [['todas', 'Todas'], ['van', 'Vans'], ['micro', 'Micro-ônibus'], ['onibus', 'Ônibus'], ['rodoviario', 'Rodoviários']];
const CONDITIONS: [Condition, string][] = [['todos', 'Todos'], ['novo', 'Novos'], ['usado', 'Usados']];
const SORTS: [Sort, string][] = [['preco-asc', 'Menor preço'], ['preco-desc', 'Maior preço'], ['lugares', 'Mais lugares'], ['novo', 'Mais novo']];

export const NO_BUDGET_MESSAGE = 'Nenhum veículo cabe no caixa agora.';
export const NO_MATCH_MESSAGE = 'Nenhuma oferta com esses filtros.';

function selectField<T extends string>(label: string, name: string, options: [T, string][], onPick: (v: T) => void): HTMLElement {
  const id = `shop-filter-${name}`;
  const select = h('select', { class: 'select', id, dataset: { filter: name } },
    ...options.map(([value, text]) => h('option', { value }, text)));
  select.addEventListener('change', () => onPick(select.value as T));
  return h('div', { class: 'filter-field' }, h('label', { class: 'field-label', for: id }, label), select);
}

/** Aba Loja: as ofertas das lojas (novos e usados), na pintura padrão da viação, com filtros e ordenação só na tela. */
export function mountShopTab(el: HTMLElement, store: Store): () => void {
  const c = store.catalog;
  let category: Category = 'todas';
  let condition: Condition = 'todos';
  let sort: Sort = 'preco-asc';
  let budget = false;

  const grid = h('div', { class: 'card-grid shop-grid' });
  const budgetBox = h('input', { type: 'checkbox', id: 'shop-filter-budget', dataset: { filter: 'budget' } });
  budgetBox.addEventListener('change', () => { budget = budgetBox.checked; render(); });
  const filters = h('div', { class: 'shop-filters' },
    selectField('Categoria', 'category', CATEGORIES, (v) => { category = v; render(); }),
    selectField('Estado', 'condition', CONDITIONS, (v) => { condition = v; render(); }),
    selectField('Ordenar por', 'sort', SORTS, (v) => { sort = v; render(); }),
    h('label', { class: 'check-field', for: 'shop-filter-budget' }, budgetBox, 'Cabe no meu orçamento'),
  );
  el.replaceChildren(h('div', { class: 'tab-page shop-tab' }, h('div', { class: 'tab-head' }, h('h2', { class: 'title' }, 'Loja')), filters, grid));

  const buttons = new Map<string, { button: HTMLButtonElement; offer: DealerOffer }>();

  async function buy(offer: DealerOffer, model: BusModel) {
    const name = await promptDialog({ title: model.name, label: 'Nome do ônibus (opcional)', maxLength: 30, confirmLabel: 'Comprar' });
    if (name === null) return;
    const r = store.dispatch((s, cat) => buyOffer(s, cat, { offerId: offer.id, name }));
    if (!r.ok) { toast(errorMessage(r.error), 'erro'); return; }
    const bus = r.state.buses.at(-1);
    toast(`${bus?.name ?? model.name} chegou à garagem.`, 'ok');
  }

  const compare: Record<Sort, (a: DealerOffer, b: DealerOffer, seats: (o: DealerOffer) => number) => number> = {
    'preco-asc': (a, b) => a.priceCents - b.priceCents,
    'preco-desc': (a, b) => b.priceCents - a.priceCents,
    lugares: (a, b, seats) => seats(b) - seats(a) || a.priceCents - b.priceCents,
    novo: (a, b) => b.year - a.year || a.odometerKm - b.odometerKm || a.priceCents - b.priceCents,
  };

  function visibleOffers(): DealerOffer[] {
    const cash = store.getState().cashCents;
    const seats = (o: DealerOffer) => getModel(c, o.modelId)?.seats ?? 0;
    return allOffers(c)
      .filter((o) => {
        const model = getModel(c, o.modelId);
        if (!model) return false;
        if (category !== 'todas' && model.category !== category) return false;
        if (condition !== 'todos' && o.condition !== condition) return false;
        if (budget && (cash < 0 || o.priceCents > cash)) return false;
        return true;
      })
      .sort((a, b) => compare[sort](a, b, seats) || (a.id < b.id ? -1 : 1));
  }

  let renderKey = '';
  function render() {
    const { company, cashCents } = store.getState();
    const offers = visibleOffers();
    const next = JSON.stringify([company.primaryColor, company.secondaryColor, company.defaultLivery, company.logo, offers.map((o) => o.id), budget && cashCents < 0]);
    if (next !== renderKey) {
      renderKey = next;
      buttons.clear();
      const cards: HTMLElement[] = [];
      for (const offer of offers) {
        const model = getModel(c, offer.modelId);
        if (!model) continue;
        const used = offer.condition === 'usado';
        const button = h('button', { type: 'button', class: 'btn btn-primary btn-compact', dataset: { action: 'buy' }, onClick: () => { void buy(offer, model); } });
        buttons.set(offer.id, { button, offer });
        cards.push(h('article', { class: 'card card-stripe shop-card', dataset: { offer: offer.id, model: model.id } },
          h('div', { class: 'bus-card-art' }, busSvg({ shape: model.shape, primary: company.primaryColor, secondary: company.secondaryColor, livery: company.defaultLivery, logo: company.logo })),
          h('div', { class: 'shop-card-head' },
            h('h3', { class: 'bus-card-name' }, model.name),
            h('span', { class: `badge ${used ? '' : 'badge-active'}`, dataset: { spec: 'condition' } }, used ? 'Usado' : 'Novo'),
          ),
          h('ul', { class: 'spec-list' },
            used ? h('li', { dataset: { spec: 'year' } }, `Ano ${offer.year}`) : null,
            used ? h('li', { dataset: { spec: 'km' } }, kilometers(offer.odometerKm)) : null,
            h('li', null, `${model.seats} lugares`),
            h('li', null, `Conforto ${decimal(model.comfort)}`),
            h('li', null, `${decimal(model.kmPerLiter)} km por litro`),
          ),
          h('div', { class: 'shop-buy' }, h('strong', { class: 'shop-price' }, formatMoney(offer.priceCents)), button),
        ));
      }
      if (cards.length === 0) {
        grid.replaceChildren(h('p', { class: 'muted empty' }, budget ? NO_BUDGET_MESSAGE : NO_MATCH_MESSAGE));
      } else grid.replaceChildren(...cards);
    }
    updateButtons();
  }

  /** Atualizado também no tick: o caixa muda com o tempo. */
  function updateButtons() {
    const cash = store.getState().cashCents;
    for (const { button, offer } of buttons.values()) {
      const missing = offer.priceCents - cash;
      const blocked = cash < 0 || missing > 0;
      button.disabled = blocked;
      button.textContent = blocked ? `Faltam ${formatMoney(Math.max(missing, 0))}` : 'Comprar';
    }
  }

  render();
  const offChange = store.on('change', render);
  const offHour = store.on('hour', render); // o filtro de orçamento acompanha o caixa
  const offTick = store.on('tick', updateButtons);
  return () => { offChange(); offHour(); offTick(); };
}
