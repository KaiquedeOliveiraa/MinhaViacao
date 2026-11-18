import { h } from './dom';

export interface StartProps {
  savedName: string | null;
  notice: string | null;
  onStart(): void;
  onContinue(): void;
  onImport(file: File): void;
}

/** Cartão principal da tela de entrada: rótulo, título, frase e os botões. */
export function renderStartScreen(p: StartProps): HTMLElement {
  const fileInput = h('input', {
    type: 'file', accept: 'application/json,.json', hidden: true, 'aria-hidden': 'true', tabindex: '-1',
    onChange: () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (file) p.onImport(file);
    },
  });

  const hasSave = p.savedName !== null;
  const buttons = hasSave
    ? [
      h('button', { class: 'btn btn-primary', type: 'button', onClick: p.onContinue }, `Continuar: ${p.savedName}`),
      h('button', { class: 'btn btn-light', type: 'button', onClick: p.onStart }, 'Começar uma viação'),
      h('button', { class: 'btn btn-ghost', type: 'button', onClick: () => fileInput.click() }, 'Importar jogo salvo'),
    ]
    : [
      h('button', { class: 'btn btn-primary', type: 'button', onClick: p.onStart }, 'Começar uma viação'),
      h('button', { class: 'btn btn-light', type: 'button', onClick: () => fileInput.click() }, 'Importar jogo salvo'),
    ];

  return h('section', { class: 'card card-hero card-stripe start-hero', 'aria-labelledby': 'start-title' },
    h('p', { class: 'chip' }, h('span', { class: 'chip-dot', 'aria-hidden': 'true' }), 'Santa Catarina · rodovias reais'),
    h('h1', { class: 'display', id: 'start-title' }, 'Monte a sua ', h('span', { class: 'accent-text' }, 'viação')),
    h('p', { class: 'lead' }, 'Monte sua viação e conquiste as estradas, começando por Santa Catarina.'),
    h('div', { class: 'hero-art', dataset: { slot: 'bus' } }),
    p.notice ? h('p', { class: 'notice', role: 'alert' }, p.notice) : null,
    h('div', { class: 'btn-stack' }, ...buttons),
    fileInput,
  );
}
