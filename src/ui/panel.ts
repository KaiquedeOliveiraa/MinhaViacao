import type { Store } from '../game/store';
import { h } from './dom';
import { mountGarageTab } from './garageTab';
import { mountLinesTab } from './linesTab';
import { mountListTab } from './listTab';
import { mountShopTab } from './shopTab';

export type PanelTab = 'map' | 'lines' | 'list' | 'garage' | 'shop';
/** `select` deixa quem está de fora (o tutorial) abrir uma aba. */
export interface PanelHandle { unmount(): void; select(tab: PanelTab): void; }
const TABS: { id: PanelTab; label: string }[] = [
  { id: 'map', label: 'Mapa' },
  { id: 'lines', label: 'Linhas' },
  { id: 'list', label: 'Lista' },
  { id: 'garage', label: 'Garagem' },
  { id: 'shop', label: 'Loja' },
];

function mobileQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 899px)') : null;
}

/** Garagem e Loja: painel expandido sobre o mapa, com o botão Voltar ao mapa (só desktop). */
function mountExpanded(el: HTMLElement, mount: (slot: HTMLElement) => () => void, onBack: () => void): () => void {
  const slot = h('div', { class: 'expanded-body' });
  el.replaceChildren(
    h('div', { class: 'expanded-bar' },
      h('button', { type: 'button', class: 'btn btn-light btn-compact back-btn', dataset: { action: 'back' }, onClick: onBack }, 'Voltar ao mapa')),
    slot,
  );
  return mount(slot);
}

/**
 * Painel das abas. Desktop: coluna à direita (a aba Mapa fica escondida).
 * Celular: barra fixa no rodapé; abas que não são o Mapa abrem em tela cheia por cima do mapa.
 */
export function mountPanel(el: HTMLElement, store: Store, opts: { onTab?(tab: PanelTab): void } = {}): PanelHandle {
  const query = mobileQuery();
  let current: PanelTab = query?.matches ? 'map' : 'lines';
  let unmountTab: (() => void) | null = null;

  const content = h('div', { class: 'panel-content', role: 'tabpanel' });
  const buttons = TABS.map(({ id, label }) => h('button', {
    type: 'button', class: 'tab-btn', role: 'tab', dataset: { tab: id }, 'aria-selected': 'false',
    onClick: () => select(id),
  }, label));
  const root = h('div', { class: 'panel' }, h('nav', { class: 'tab-bar', role: 'tablist', 'aria-label': 'Painel' }, ...buttons), content);
  el.replaceChildren(root);

  function select(tab: PanelTab) {
    current = tab;
    unmountTab?.();
    unmountTab = null;
    root.dataset.activeTab = tab;
    const expanded = tab === 'list' || tab === 'garage' || tab === 'shop';
    if (expanded) { root.dataset.expanded = 'true'; el.dataset.expanded = 'true'; }
    else { delete root.dataset.expanded; delete el.dataset.expanded; }
    for (const btn of buttons) btn.setAttribute('aria-selected', String(btn.dataset.tab === tab));
    if (tab === 'lines') unmountTab = mountLinesTab(content, store);
    else if (tab === 'list') unmountTab = mountExpanded(content, (slot) => mountListTab(slot, store), () => select('lines'));
    else if (tab === 'garage') unmountTab = mountExpanded(content, (slot) => mountGarageTab(slot, store), () => select('lines'));
    else if (tab === 'shop') unmountTab = mountExpanded(content, (slot) => mountShopTab(slot, store), () => select('lines'));
    else content.replaceChildren();
    opts.onTab?.(tab);
  }

  const onQuery = () => { if (!query?.matches && current === 'map') select('lines'); };
  query?.addEventListener?.('change', onQuery);
  select(current);

  return {
    select,
    unmount() {
      unmountTab?.();
      unmountTab = null;
      query?.removeEventListener?.('change', onQuery);
    },
  };
}
