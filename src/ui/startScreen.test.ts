// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { catalog } from '../sim/catalog';
import { renderInstallCard } from './installCard';
import { renderStartScreen, type StartProps } from './startScreen';
import { renderStatsBlock } from './statsBlock';

const props = (over: Partial<StartProps> = {}): StartProps => ({ savedName: null, notice: null, onStart() {}, onContinue() {}, onImport() {}, ...over });
const labels = (el: HTMLElement) => [...el.querySelectorAll('button')].map(b => b.textContent);
test('sem jogo salvo não existe Continuar', () => {
  expect(labels(renderStartScreen(props()))).toEqual(['Começar uma viação', 'Importar jogo salvo']);
});
test('com jogo salvo, Continuar vem primeiro e mostra o nome como texto', () => {
  const el = renderStartScreen(props({ savedName: '<b>Expresso</b>' }));
  expect(labels(el)[0]).toBe('Continuar: <b>Expresso</b>');
  expect(el.querySelector('b')).toBeNull();
});
test('aviso aparece quando existe', () => {
  expect(renderStartScreen(props({ notice: 'Seu jogo salvo não pôde ser lido.' })).textContent).toContain('não pôde ser lido');
});
test('botões chamam as funções', () => {
  let started = 0; const el = renderStartScreen(props({ onStart: () => started++ }));
  [...el.querySelectorAll('button')].find(b => b.textContent === 'Começar uma viação')!.click();
  expect(started).toBe(1);
});
test('importar entrega o arquivo escolhido', () => {
  const got: File[] = [];
  const el = renderStartScreen(props({ onImport: f => got.push(f) }));
  const input = el.querySelector<HTMLInputElement>('input[type=file]')!;
  const file = new File(['{}'], 'save.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file] });
  input.dispatchEvent(new Event('change'));
  expect(got).toEqual([file]);
});
test('bloco No jogo conta o que o catálogo tem', () => {
  const nums = [...renderStatsBlock(catalog).querySelectorAll('.stat-num')].map(n => n.textContent);
  expect(nums).toEqual(['4', '6', '6', '4']);
});
test('cartão de instalação traz o aviso obrigatório do iPhone', () => {
  expect(renderInstallCard().textContent).toContain('No iPhone, o aplicativo guarda o jogo separado do navegador. Exporte seu jogo antes e importe no aplicativo.');
});
