import { h } from './dom';

const DURATION_MS = 4000;

function stack(): HTMLElement {
  let el = document.querySelector<HTMLElement>('.toast-stack');
  if (!el) {
    el = h('div', { class: 'toast-stack', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(el);
  }
  return el;
}

/** Aviso rápido no canto superior direito; some em 4 s. */
export function toast(message: string, kind: 'info' | 'ok' | 'erro' = 'info'): void {
  const item = h('div', { class: `toast toast-${kind}` }, message);
  stack().appendChild(item);
  setTimeout(() => item.remove(), DURATION_MS);
}
