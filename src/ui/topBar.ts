import type { Speed, Store } from '../game/store';
import type { Company } from '../sim/types';
import { h, svg } from './dom';
import { formatClock, formatMoney } from './format';
import { logoView } from './logoView';

const SPEEDS: { speed: Speed; label: string; aria: string }[] = [
  { speed: 0, label: '❚❚', aria: 'Pausar' },
  { speed: 1, label: '1x', aria: 'Velocidade 1x' },
  { speed: 2, label: '2x', aria: 'Velocidade 2x' },
  { speed: 4, label: '4x', aria: 'Velocidade 4x' },
];

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function menuIcon(): SVGSVGElement {
  return svg('svg', { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true' },
    svg('path', { d: 'M4 6h16M4 12h16M4 18h16', stroke: 'currentColor', 'stroke-width': 2.2, 'stroke-linecap': 'round', fill: 'none' }));
}

/** Logo, nome, caixa, relógio e velocidade. */
export function mountTopBar(el: HTMLElement, store: Store, opts: { onMenu(): void }): () => void {
  const logoSlot = h('span', { class: 'top-logo' });
  const name = h('span', { class: 'top-name' });
  const cash = h('span', { class: 'cash', dataset: { live: 'cash' } });
  const clock = h('span', { class: 'clock', dataset: { live: 'clock' } });
  const speedButtons = SPEEDS.map(({ speed, label, aria }) => h('button', {
    type: 'button', class: 'speed-btn', dataset: { speed: String(speed) }, 'aria-label': aria, 'aria-pressed': 'false',
    onClick: () => store.setSpeed(speed),
  }, label));

  el.replaceChildren(h('header', { class: 'top-bar' },
    h('div', { class: 'top-row top-identity' },
      h('button', { type: 'button', class: 'icon-btn', dataset: { action: 'menu' }, 'aria-label': 'Menu da viação', onClick: () => opts.onMenu() }, menuIcon()),
      logoSlot,
      name,
      clock,
    ),
    h('div', { class: 'top-row top-status' },
      cash,
      h('div', { class: 'speed-group', role: 'group', 'aria-label': 'Velocidade do jogo' }, ...speedButtons),
    ),
  ));

  let lastSpeed: Speed = store.getSpeed() || 1;
  let shownCompany: Company | null = null;

  const updateNumbers = () => {
    const s = store.getState();
    cash.textContent = formatMoney(s.cashCents);
    cash.classList.toggle('money-down', s.cashCents < 0);
    clock.textContent = formatClock(s.clockMinutes);
  };
  const updateAll = () => {
    const s = store.getState();
    if (shownCompany !== s.company) {
      shownCompany = s.company;
      logoSlot.replaceChildren(logoView(s.company.logo, { primary: s.company.primaryColor, secondary: s.company.secondaryColor }, 32));
      name.textContent = s.company.name;
    }
    const speed = store.getSpeed();
    if (speed !== 0) lastSpeed = speed;
    for (const btn of speedButtons) btn.setAttribute('aria-pressed', String(btn.dataset.speed === String(speed)));
    updateNumbers();
  };

  // o espaço sobre outros botões continua clicando; sobre os de velocidade, alterna a pausa
  const isSpeedButton = (t: EventTarget | null) => t instanceof HTMLElement && t.closest('.speed-group') !== null;
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== ' ' || e.repeat || isTyping(e.target)) return;
    if (e.target instanceof HTMLButtonElement && !isSpeedButton(e.target)) return;
    e.preventDefault();
    store.setSpeed(store.getSpeed() === 0 ? lastSpeed : 0);
  };
  const onKeyUp = (e: KeyboardEvent) => { if (e.key === ' ' && isSpeedButton(e.target)) e.preventDefault(); };

  updateAll();
  const offTick = store.on('tick', updateNumbers);
  const offChange = store.on('change', updateAll);
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKeyUp);
  return () => {
    document.removeEventListener('keyup', onKeyUp);
    offTick();
    offChange();
    document.removeEventListener('keydown', onKey);
  };
}
