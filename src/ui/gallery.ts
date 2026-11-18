import { LOGO_ICONS } from '../data/logos';
import { LIVERY_STYLES } from '../sim/newGame';
import type { BusShape, LiveryStyle, LogoIconId } from '../sim/types';
import { renderSiteHeader } from './brand';
import { BUS_SHAPES, busSvg, liveryThumb } from './busSvg';
import { h } from './dom';
import { logoView } from './logoView';

const SHAPE_NAMES: Record<BusShape, string> = { van: 'Van (rascunho)', micro: 'Micro', conv: 'Convencional', rodo: 'Rodoviário' };
const LIVERY_NAMES: Record<LiveryStyle, string> = { plain: 'lisa', stripe: 'faixa reta', diagonal: 'diagonal', wave: 'onda' };
const ICONS = Object.keys(LOGO_ICONS) as LogoIconId[];
const SCHEMES = [
  { name: 'Laranja e branco', primary: '#ff7a00', secondary: '#ffffff' },
  { name: 'Azul-marinho e amarelo', primary: '#1a237e', secondary: '#ffd400' },
];

/** Galeria de conferência dos desenhos (/?galeria): todas as formas, pinturas e logos. */
export function renderGallery(): HTMLElement {
  return h('div', { class: 'start-page' },
    renderSiteHeader(),
    h('main', { class: 'gallery' },
      h('h1', { class: 'title' }, 'Galeria de conferência'),
      ...SCHEMES.map((scheme) => h('section', { class: 'gallery-section' },
        h('p', { class: 'eyebrow' }, scheme.name),
        h('div', { class: 'card-grid' },
          ...BUS_SHAPES.flatMap((shape, i) => LIVERY_STYLES.map((livery, j) => h('figure', { class: 'card gallery-item' },
            busSvg({ shape, livery, primary: scheme.primary, secondary: scheme.secondary, logo: { kind: 'icon', iconId: ICONS[(i * LIVERY_STYLES.length + j) % ICONS.length]! } }),
            h('figcaption', { class: 'muted' }, `${SHAPE_NAMES[shape]} · ${LIVERY_NAMES[livery]}`),
          ))),
        ),
        h('div', { class: 'gallery-row' },
          ...LIVERY_STYLES.map((style) => h('span', { class: 'gallery-thumb' }, liveryThumb(style, scheme.primary, scheme.secondary))),
        ),
        h('div', { class: 'gallery-row' },
          ...ICONS.map((id) => h('span', { class: 'gallery-logo' },
            logoView({ kind: 'icon', iconId: id }, scheme, 56),
            h('span', { class: 'muted' }, LOGO_ICONS[id].label),
          )),
        ),
      )),
    ),
  );
}
