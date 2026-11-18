import { h } from './dom';
import { brandMark } from './brand';

export const IPHONE_WARNING = 'No iPhone, o aplicativo guarda o jogo separado do navegador. Exporte seu jogo antes e importe no aplicativo.';

/** Cartão "Jogue como aplicativo": como pôr o jogo na tela inicial do celular. */
export function renderInstallCard(): HTMLElement {
  return h('section', { class: 'card card-glow install-card', 'aria-labelledby': 'install-title' },
    h('div', { class: 'install-icon', 'aria-hidden': 'true' }, brandMark(40)),
    h('div', { class: 'install-body' },
      h('h2', { class: 'title', id: 'install-title' }, 'Jogue como aplicativo'),
      h('p', { class: 'muted' }, 'O Minha Viação na tela inicial do celular, em tela cheia. Sem loja e sem baixar nada.'),
      h('details', { class: 'install-how' },
        h('summary', { class: 'btn btn-light btn-compact' }, 'Como instalar'),
        h('div', { class: 'install-steps' },
          h('p', { class: 'eyebrow' }, 'iPhone (Safari)'),
          h('ol', null,
            h('li', null, 'Toque em ', h('strong', null, 'Compartilhar'), ', o quadrado com a seta para cima.'),
            h('li', null, 'Role a lista e toque em ', h('strong', null, 'Adicionar à Tela de Início'), '.'),
            h('li', null, 'Toque em ', h('strong', null, 'Adicionar'), '.'),
          ),
          h('p', { class: 'eyebrow' }, 'Android (Chrome)'),
          h('ol', null,
            h('li', null, 'Toque no menu ', h('strong', null, '⋮'), ' no canto de cima.'),
            h('li', null, 'Toque em ', h('strong', null, 'Instalar app'), ' ou ', h('strong', null, 'Adicionar à tela inicial'), '.'),
          ),
        ),
      ),
      h('p', { class: 'install-warning' }, IPHONE_WARNING),
    ),
  );
}
