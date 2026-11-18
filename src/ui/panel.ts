import type { Store } from '../game/store';
import { h } from './dom';
import { mountLinesTab } from './linesTab';

export type PanelTab = 'map' | 'lines' | 'garage' | 'shop';
const TABS: { id: PanelTab; label: string }[] = [
  { id: 'map', label: 'Mapa' },
  { id: 'lines', label: 'Linhas' },
  { id: 'garage', label: 'Garagem' },
  { id: 'shop', label: 'Loja' },
];

function mobileQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 899px)') : null;
}

function placeholder(el: HTMLElement, title: string): () => void {
  el.replaceChildren(h('div', { class: 'tab-page' }, h('h2', { class: 'title' }, title), h('p', { class: 'muted' }, 'Em breve')));
  return () => {};
}

/**
 * Painel das abas. Desktop: coluna à direita (a aba Mapa fica escondida).
 * Celular: barra fixa no rodapé; abas que não são o Mapa abrem em tela cheia por cima do mapa.
 */
export function mountPanel(el: HTMLElement, store: Store, opts: { onTab?(tab: PanelTab): void } = {}): () => void {
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
    for (const btn of buttons) btn.setAttribute('aria-selected', String(btn.dataset.tab === tab));
    if (tab === 'lines') unmountTab = mountLinesTab(content, store);
    else if (tab === 'garage') unmountTab = placeholder(content, 'Garagem');
    else if (tab === 'shop') unmountTab = placeholder(content, 'Loja');
    else content.replaceChildren();
    opts.onTab?.(tab);
  }

  const onQuery = () => { if (!query?.matches && current === 'map') select('lines'); };
  query?.addEventListener?.('change', onQuery);
  select(current);

  return () => {
    unmountTab?.();
    query?.removeEventListener?.('change', onQuery);
  };
}
