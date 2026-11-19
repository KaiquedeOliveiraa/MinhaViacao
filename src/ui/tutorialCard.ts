import type { Store } from '../game/store';
import { confirmPaint, skipTutorial } from '../sim/actions';
import type { TutorialStep } from '../sim/types';
import { h } from './dom';
import type { PanelTab } from './panel';

export interface TutorialNav { openTab(tab: PanelTab): void; openNewLine(): void; }

type ActiveStep = Exclude<TutorialStep, 'fim'>;
const LINE_PLACED_TEXT = 'Passo 3 de 3 · Coloque o ônibus na sua linha pela aba Linhas.';
const LINE_PLACED_ACTIONS: StepAction[] = [{ id: 'open-lines', label: 'Abrir Linhas', primary: true, run: (_s, nav) => nav.openTab('lines') }];

interface StepAction { id: string; label: string; primary: boolean; run(store: Store, nav: TutorialNav): void; }

const STEPS: Record<ActiveStep, { text: string; actions: StepAction[] }> = {
  comprar: {
    text: 'Passo 1 de 3 · Compre o seu primeiro ônibus na Loja.',
    actions: [{ id: 'shop', label: 'Abrir a Loja', primary: true, run: (_s, nav) => nav.openTab('shop') }],
  },
  pintar: {
    text: 'Passo 2 de 3 · Escolha a pintura dele na Garagem.',
    actions: [
      { id: 'garage', label: 'Abrir a Garagem', primary: true, run: (_s, nav) => nav.openTab('garage') },
      { id: 'keep-paint', label: 'Manter esta pintura', primary: false, run: (store) => { store.dispatch(confirmPaint); } },
    ],
  },
  linha: {
    text: 'Passo 3 de 3 · Abra a sua primeira linha e coloque o ônibus nela. A primeira linha não paga taxa.',
    actions: [{ id: 'new-line', label: 'Nova linha', primary: true, run: (_s, nav) => nav.openNewLine() }],
  },
};

/**
 * Cartão do tutorial do começo do jogo, fixo sobre o mapa. Mostra o passo atual com o atalho dele
 * e some quando o tutorial chega ao fim (ou é pulado).
 */
export function mountTutorialCard(el: HTMLElement, store: Store, nav: TutorialNav): () => void {
  let shown: string | null = null;

  function render() {
    const { tutorial: step, lines } = store.getState();
    // No passo 'linha', quem já tem linha (aberta antes de comprar o ônibus) só precisa colocar o ônibus nela.
    const variant = step === 'linha' && lines.length > 0 ? 'linha-aberta' : step;
    if (variant === shown) return;
    shown = variant;
    if (step === 'fim') { el.replaceChildren(); return; }
    const { text, actions } = variant === 'linha-aberta' ? { text: LINE_PLACED_TEXT, actions: LINE_PLACED_ACTIONS } : STEPS[step];
    el.replaceChildren(h('section', { class: 'card card-stripe tutorial-card', 'aria-label': 'Tutorial', dataset: { step } },
      h('p', { class: 'tutorial-text', dataset: { tutorialText: '' } }, text),
      h('div', { class: 'tutorial-actions' },
        ...actions.map((a) => h('button', {
          type: 'button', class: `btn btn-compact ${a.primary ? 'btn-primary' : 'btn-light'}`, dataset: { tutorialAction: a.id },
          onClick: () => a.run(store, nav),
        }, a.label)),
        h('button', {
          type: 'button', class: 'link-btn tutorial-skip', dataset: { tutorialAction: 'skip' },
          onClick: () => { store.dispatch(skipTutorial); },
        }, 'Pular tutorial'),
      ),
    ));
  }

  render();
  const off = store.on('change', render);
  return () => { off(); el.replaceChildren(); };
}
