import { h, svg } from './dom';

/** Marca do jogo: frente de ônibus estilizada na cor de destaque. */
export function brandMark(size = 32): SVGSVGElement {
  return svg('svg', { viewBox: '0 0 32 32', width: size, height: size, class: 'brand-mark', 'aria-hidden': 'true' },
    svg('rect', { x: 2, y: 2, width: 28, height: 28, rx: 8, fill: 'var(--accent)' }),
    svg('rect', { x: 8, y: 7, width: 16, height: 16, rx: 3, fill: 'none', stroke: 'var(--on-accent)', 'stroke-width': 2 }),
    svg('rect', { x: 10, y: 9.5, width: 12, height: 6, rx: 1.2, fill: 'var(--on-accent)' }),
    svg('circle', { cx: 11.5, cy: 19.5, r: 1.4, fill: 'var(--on-accent)' }),
    svg('circle', { cx: 20.5, cy: 19.5, r: 1.4, fill: 'var(--on-accent)' }),
    svg('rect', { x: 9.5, y: 23, width: 3, height: 3, rx: 1, fill: 'var(--on-accent)' }),
    svg('rect', { x: 19.5, y: 23, width: 3, height: 3, rx: 1, fill: 'var(--on-accent)' }),
  );
}

/** Cabeçalho com a marca e o nome do jogo. */
export function renderSiteHeader(): HTMLElement {
  return h('header', { class: 'site-header' },
    h('div', { class: 'site-header-inner' },
      h('div', { class: 'brand' },
        brandMark(36),
        h('span', { class: 'brand-name' }, 'Minha ', h('span', { class: 'accent-text' }, 'Viação')),
      ),
    ),
  );
}
