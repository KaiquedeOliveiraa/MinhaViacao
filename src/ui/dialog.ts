import { h } from './dom';

export interface DialogOptions<T> {
  title?: string;
  body: (Node | string | null)[];
  confirmLabel: string;
  cancelLabel?: string;
  /** Valor ao confirmar; `undefined` mantém a janela aberta (ex.: falta escolher algo). */
  onConfirm(): T | undefined;
  cancelValue: T;
  initialFocus?: HTMLElement;
  danger?: boolean;
}

let dialogCounter = 0;

/**
 * Janela própria (div com role="dialog" e aria-modal), porque <dialog> não funciona em jsdom.
 * No celular ela sobe do rodapé; no desktop fica centralizada.
 */
export function showDialog<T>(o: DialogOptions<T>): Promise<T> {
  return new Promise<T>((resolve) => {
    const previous = document.activeElement as HTMLElement | null;
    const titleId = `dialog-title-${++dialogCounter}`;
    let done = false;

    const finish = (value: T) => {
      if (done) return;
      done = true;
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      previous?.focus?.();
      resolve(value);
    };
    const confirm = () => {
      const value = o.onConfirm();
      if (value !== undefined) finish(value);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); finish(o.cancelValue); }
    };

    const confirmButton = h('button', { type: 'button', class: `btn ${o.danger ? 'btn-danger' : 'btn-primary'}`, dataset: { action: 'confirm' }, onClick: confirm }, o.confirmLabel);
    const panel = h('div', { class: 'dialog-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': o.title ? titleId : null },
      o.title ? h('h2', { class: 'title dialog-title', id: titleId }, o.title) : null,
      h('div', { class: 'dialog-body' }, ...o.body),
      h('div', { class: 'dialog-actions' },
        h('button', { type: 'button', class: 'btn btn-light', dataset: { action: 'cancel' }, onClick: () => finish(o.cancelValue) }, o.cancelLabel ?? 'Cancelar'),
        confirmButton,
      ),
    );
    const backdrop = h('div', { class: 'dialog-backdrop', onClick: (e: Event) => { if (e.target === backdrop) finish(o.cancelValue); } }, panel);
    document.body.appendChild(backdrop);
    document.addEventListener('keydown', onKey, true);
    (o.initialFocus ?? confirmButton).focus();
  });
}

/** Esc ou 'Cancelar' = false. */
export function confirmDialog(message: string, confirmLabel = 'Confirmar'): Promise<boolean> {
  return showDialog<boolean>({
    body: [h('p', { class: 'dialog-message' }, message)],
    confirmLabel,
    onConfirm: () => true,
    cancelValue: false,
    danger: /excluir|apagar|vender/i.test(confirmLabel),
  });
}

export function promptDialog(o: { title: string; label: string; initial?: string; maxLength: number; confirmLabel: string }): Promise<string | null> {
  const inputId = `dialog-input-${dialogCounter + 1}`;
  const input = h('input', { class: 'text-input', id: inputId, type: 'text', autocomplete: 'off' });
  input.maxLength = o.maxLength;
  input.value = o.initial ?? '';
  return showDialog<string | null>({
    title: o.title,
    body: [h('label', { class: 'field-label', for: inputId }, o.label), input],
    confirmLabel: o.confirmLabel,
    onConfirm: () => input.value,
    cancelValue: null,
    initialFocus: input,
  });
}
