import { LOGO_ICONS } from '../data/logos';
import type { LogoRef } from '../sim/types';
import { h, svg } from './dom';

/** Logo da empresa: ícone pronto (na cor secundária, sobre a primária) ou a imagem enviada. */
export function logoView(logo: LogoRef, colors: { primary: string; secondary: string }, sizePx: number): HTMLElement {
  const box = h('span', { class: 'logo-view', 'aria-hidden': 'true' });
  box.style.width = `${sizePx}px`;
  box.style.height = `${sizePx}px`;
  if (logo.kind === 'icon') {
    box.style.background = colors.primary;
    box.appendChild(svg('svg', { viewBox: '0 0 24 24', width: '70%', height: '70%' },
      svg('path', { d: LOGO_ICONS[logo.iconId].path, fill: colors.secondary, 'fill-rule': 'evenodd' })));
  } else {
    box.classList.add('logo-view-image');
    const img = h('img', { alt: '', draggable: 'false' });
    img.setAttribute('src', logo.dataUrl);
    box.appendChild(img);
  }
  return box;
}
