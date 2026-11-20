import { LOGO_ICONS } from '../data/logos';
import { LIVERY_STYLES } from '../sim/newGame';
import type { BusShape, LiveryStyle, LogoIconId } from '../sim/types';
import { renderSiteHeader } from './brand';
import { BUS_SHAPES, busSvg, liveryThumb } from './busSvg';
import { h } from './dom';
import { logoView } from './logoView';

const SHAPE_NAMES: Record<BusShape, string> = { van: 'Van (rascunho)', micro: 'Micro', conv: 'Convencional', rodo: 'Rodoviário', dd: 'Double deck (galeria)' };
const LIVERY_NAMES: Record<LiveryStyle, string> = { plain: 'lisa', stripe: 'faixa reta', diagonal: 'diagonal', wave: 'onda' };
const ICONS = Object.keys(LOGO_ICONS) as LogoIconId[];
const SCHEMES = [
  { name: 'Laranja e branco', primary: '#ff7a00', secondary: '#ffffff' },
  { name: 'Azul-marinho e amarelo', primary: '#1a237e', secondary: '#ffd400' },
];

/** Ícone de cada ônibus da galeria; a segunda paleta continua de onde a primeira parou, assim todo ícone aparece num ônibus. */
function iconFor(scheme: number, shape: number, livery: number): LogoIconId {
  const perScheme = BUS_SHAPES.length * LIVERY_STYLES.length;
  return ICONS[(scheme * perScheme + shape * LIVERY_STYLES.length + livery) % ICONS.length]!;
}

/** Cores neutras da comparação com as referências (npm run compare:bus): só a forma e os detalhes contam. */
const NEUTRAL = { primary: '#d4d6da', secondary: '#8d929a' };

/** /?galeria&comparar: cada forma em pintura lisa, cores neutras e sem logo, para a ferramenta de comparação. */
function compareSection(): HTMLElement {
  return h('section', { class: 'gallery-section', dataset: { compare: '' } },
    h('p', { class: 'eyebrow' }, 'Comparação: pintura lisa, cores neutras, sem logo'),
    h('div', { class: 'card-grid' },
      ...BUS_SHAPES.map((shape) => h('figure', { class: 'card gallery-item', dataset: { shape } },
        busSvg({ shape, livery: 'plain', ...NEUTRAL }),
        h('figcaption', { class: 'muted' }, SHAPE_NAMES[shape]),
      )),
    ),
  );
}

/** Galeria de conferência dos desenhos (/?galeria): todas as formas, pinturas e logos. */
export function renderGallery(): HTMLElement {
  const compare = new URLSearchParams(window.location.search).has('comparar');
  return h('div', { class: 'start-page' },
    renderSiteHeader(),
    h('main', { class: 'gallery' },
      h('h1', { class: 'title' }, 'Galeria de conferência'),
      compare ? compareSection() : null,
      ...SCHEMES.map((scheme, s) => h('section', { class: 'gallery-section' },
        h('p', { class: 'eyebrow' }, scheme.name),
        h('div', { class: 'card-grid' },
          ...BUS_SHAPES.flatMap((shape, i) => LIVERY_STYLES.map((livery, j) => h('figure', { class: 'card gallery-item' },
            busSvg({ shape, livery, primary: scheme.primary, secondary: scheme.secondary, logo: { kind: 'icon', iconId: iconFor(s, i, j) } }),
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
