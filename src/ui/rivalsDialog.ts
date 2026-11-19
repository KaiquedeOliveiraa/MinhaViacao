import { RIVALS, type Rival } from '../data/rivals';
import type { Store } from '../game/store';
import { rivalProgress } from '../sim/rivals';
import { h, svg } from './dom';
import { formatMoney } from './format';

/** 50.000.000 centavos → 'R$ 500 mil'; 350.000.000 → 'R$ 3,5 milhões'. */
export function formatBig(cents: number): string {
  const reais = cents / 100;
  if (reais >= 1_000_000) {
    const m = reais / 1_000_000;
    const text = String(Math.round(m * 10) / 10).replace('.', ',');
    return `R$ ${text} ${m < 2 ? 'milhão' : 'milhões'}`;
  }
  if (reais >= 1000) return `R$ ${String(Math.round(reais / 100) / 10).replace('.', ',')} mil`;
  return formatMoney(cents);
}

export function requirementText(rival: Rival): string {
  const q = rival.requirement;
  if (q.kind === 'patrimonio') return `Patrimônio de ${formatBig(q.cents)}`;
  if (q.kind === 'linhas') return q.count === 1 ? '1 linha' : `${q.count} linhas`;
  return q.count === 1 ? '1 ônibus' : `${q.count} ônibus`;
}

function progressText(rival: Rival, current: number): string {
  return rival.requirement.kind === 'patrimonio' ? `Você tem ${formatBig(current)}` : `Você tem ${current}`;
}

/** Cadeado genérico, desenho próprio. Cores pelo CSS. */
export function padlockIcon(): SVGSVGElement {
  return svg('svg', { class: 'padlock', viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true' },
    svg('path', { class: 'padlock-shackle', d: 'M8 11V8a4 4 0 0 1 8 0v3', fill: 'none', 'stroke-width': 2, 'stroke-linecap': 'round' }),
    svg('rect', { class: 'padlock-body', x: 5, y: 11, width: 14, height: 10, rx: 2.5 }),
    svg('circle', { class: 'padlock-hole', cx: 12, cy: 16, r: 1.6 }),
  );
}

/** Lista de viações rivais bloqueadas. O desbloqueio ainda não existe: só mostramos o requisito. */
export function openRivalsDialog(store: Store): void {
  const state = store.getState();
  const close = () => { document.removeEventListener('keydown', onKey, true); backdrop.remove(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };

  const items = RIVALS.map((rival) => {
    const p = rivalProgress(state, store.catalog, rival);
    const pct = Math.max(0, Math.min(100, Math.round((p.current / p.target) * 100)));
    return h('li', { class: `rival-item${p.met ? ' is-met' : ''}`, dataset: { rival: rival.id } },
      padlockIcon(),
      h('div', { class: 'rival-info' },
        h('div', { class: 'rival-top' },
          h('span', { class: 'rival-name' }, rival.name),
          h('span', { class: 'muted small' }, rival.region),
        ),
        h('div', { class: 'rival-req' }, requirementText(rival)),
        h('div', { class: 'rival-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': `Progresso para ${rival.name}` },
          h('span', { class: 'rival-fill', style: `width:${pct}%` })),
        h('div', { class: 'muted small' }, p.met ? 'Desbloqueio em breve' : progressText(rival, Math.max(0, p.current))),
      ),
    );
  });

  const panel = h('div', { class: 'dialog-panel rivals-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Viações rivais' },
    h('div', { class: 'menu-head' },
      h('span', { class: 'title menu-title' }, 'Viações rivais'),
      h('button', { type: 'button', class: 'icon-btn', dataset: { action: 'close-rivals' }, 'aria-label': 'Fechar', onClick: close }, '✕'),
    ),
    h('p', { class: 'muted small' }, 'Metas para o futuro. Cumpra o requisito para chegar perto de cada uma.'),
    h('ul', { class: 'rivals-list' }, ...items),
  );
  const backdrop = h('div', { class: 'dialog-backdrop', onClick: (e: Event) => { if (e.target === backdrop) close(); } }, panel);
  document.body.appendChild(backdrop);
  document.addEventListener('keydown', onKey, true);
  panel.querySelector<HTMLElement>('[data-action="close-rivals"]')!.focus();
}
