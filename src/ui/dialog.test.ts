// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { confirmDialog, promptDialog } from './dialog';
import { click, flush } from './uiTestkit';

test('confirmar, cancelar e Esc', async () => {
  let p = confirmDialog('Tem certeza?', 'Excluir'); await flush();
  expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Tem certeza?');
  click('[data-action="confirm"]'); expect(await p).toBe(true);
  p = confirmDialog('De novo?'); await flush();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); expect(await p).toBe(false);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
test('campo de texto respeita o limite e devolve o que foi digitado', async () => {
  const p = promptDialog({ title: 'Nome do ônibus', label: 'Nome', maxLength: 30, confirmLabel: 'Salvar' }); await flush();
  const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!;
  expect(input.maxLength).toBe(30);
  input.value = 'Guerreiro da BR-470'; click('[data-action="confirm"]');
  expect(await p).toBe('Guerreiro da BR-470');
});
test('cancelar o campo de texto devolve null', async () => {
  const p = promptDialog({ title: 'Nome', label: 'Nome', maxLength: 30, confirmLabel: 'Salvar' }); await flush();
  click('[data-action="cancel"]');
  expect(await p).toBeNull();
});
