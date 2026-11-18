import { LOGO_ICONS } from '../data/logos';
import { LIVERY_STYLES } from '../sim/newGame';
import type { BusShape, LogoIconId } from '../sim/types';
import { renderSiteHeader } from './brand';
import { busSvg, liveryThumb } from './busSvg';
import { h } from './dom';
import { logoView } from './logoView';

const SHAPES: BusShape[] = ['micro', 'conv', 'rodo'];
const SCHEMES = [
  { name: 'Laranja e branco', primary: '#ff7a00', secondary: '#ffffff' },
  { name: 'Azul-marinho e amarelo', primary: '#1a237e', secondary: '#ffd400' },
];

/** Galeria de conferência dos desenhos (só em desenvolvimento: /?galeria). */
export function renderGallery(): HTMLElement {
  return h('div', { class: 'start-page' },
    renderSiteHeader(),
    h('main', { class: 'gallery' },
      h('h1', { class: 'title' }, 'Galeria de conferência'),
      ...SCHEMES.map((scheme) => h('section', { class: 'gallery-section' },
        h('p', { class: 'eyebrow' }, scheme.name),
        h('div', { class: 'card-grid' },
          ...SHAPES.flatMap((shape) => LIVERY_STYLES.map((livery) => h('figure', { class: 'card gallery-item' },
            busSvg({ shape, livery, primary: scheme.primary, secondary: scheme.secondary, logo: { kind: 'icon', iconId: 'bus' } }),
            h('figcaption', { class: 'muted' }, `${shape} · ${livery}`),
          ))),
        ),
        h('div', { class: 'gallery-row' },
          ...LIVERY_STYLES.map((style) => h('span', { class: 'gallery-thumb' }, liveryThumb(style, scheme.primary, scheme.secondary))),
        ),
        h('div', { class: 'gallery-row' },
          ...(Object.keys(LOGO_ICONS) as LogoIconId[]).map((id) => h('span', { class: 'gallery-logo' },
            logoView({ kind: 'icon', iconId: id }, scheme, 56),
            h('span', { class: 'muted' }, LOGO_ICONS[id].label),
          )),
        ),
      )),
    ),
  );
}
