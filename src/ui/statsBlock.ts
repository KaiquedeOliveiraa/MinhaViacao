import { LIVERY_STYLES } from '../sim/newGame';
import type { Catalog } from '../sim/types';
import { h } from './dom';

/** Bloco "No jogo": números grandes tirados do catálogo. */
export function renderStatsBlock(c: Catalog): HTMLElement {
  const stats: [number, string][] = [
    [c.cities.length, 'cidades de Santa Catarina'],
    [c.roads.length, 'rodovias reais entre elas'],
    [c.models.length, 'modelos de ônibus'],
    [LIVERY_STYLES.length, 'estilos de pintura'],
  ];
  return h('section', { class: 'card stats-block', 'aria-label': 'No jogo' },
    h('p', { class: 'eyebrow' }, 'No jogo'),
    h('div', { class: 'stats-grid' },
      ...stats.map(([n, label]) => h('div', { class: 'stat' },
        h('span', { class: 'stat-num' }, n),
        h('span', { class: 'stat-label' }, label),
      )),
    ),
  );
}
