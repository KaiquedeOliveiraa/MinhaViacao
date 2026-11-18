// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { buyBus } from '../sim/actions';
import { mountLinesTab } from './linesTab';
import { openNewLineDialog } from './newLineDialog';
import { click, flush, setup } from './uiTestkit';

test('um cartão por linha, com o nome das cidades', () => {
  const { store, el } = setup(); mountLinesTab(el, store);
  expect(el.querySelectorAll('[data-line]')).toHaveLength(1);
  expect(el.querySelector('[data-line="alfa-beta"]')!.textContent).toContain('Alfa ⇄ Beta');
});
test('arrastar o preço muda a linha sem recriar o controle', () => {
  const { store, el } = setup(); mountLinesTab(el, store);
  const slider = el.querySelector<HTMLInputElement>('[data-line="alfa-beta"] input[type="range"]')!;
  expect([slider.min, slider.max, slider.value]).toEqual(['780', '7800', '2600']);
  slider.value = '3000'; slider.dispatchEvent(new Event('input', { bubbles: true }));
  expect(store.getState().lines[0]!.priceCents).toBe(3000);
  expect(el.querySelector('[data-line="alfa-beta"] input[type="range"]')).toBe(slider);
  expect(el.querySelector('[data-line="alfa-beta"] [data-live="price"]')!.textContent).toBe('R$ 30,00');
});
test('pausar e retomar', () => {
  const { store, el } = setup(); mountLinesTab(el, store);
  click('[data-action="pause"]', el);
  expect(store.getState().lines[0]!.paused).toBe(true);
  expect(el.querySelector('[data-action="pause"]')!.textContent).toBe('Retomar');
});
test('excluir pede confirmação', async () => {
  const { store, el } = setup(); mountLinesTab(el, store);
  click('[data-action="close"]', el); await flush(); click('[data-action="cancel"]'); await flush();
  expect(store.getState().lines).toHaveLength(1);
  click('[data-action="close"]', el); await flush(); click('[data-action="confirm"]'); await flush();
  expect(store.getState().lines).toHaveLength(0);
  expect(el.querySelectorAll('[data-line]')).toHaveLength(0);
});
test('nova linha: só rotas que tocam a rede, e abrir cobra a taxa', async () => {
  const { store } = setup(); void openNewLineDialog(store); await flush();
  expect([...document.querySelectorAll('[data-route]')].map(n => n.getAttribute('data-route')).sort()).toEqual(['alfa-gama', 'beta-gama']);
  expect(document.querySelector('[data-route="beta-gama"]')!.textContent).toContain('Taxa de abertura: R$ 10.000');
  click('[data-route="beta-gama"]'); click('[data-action="confirm"]'); await flush();
  expect(store.getState().lines.map(l => l.id)).toEqual(['alfa-beta', 'beta-gama']);
  expect(store.getState().cashCents).toBe(500_000);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
test('nova linha: rota cara demais fica indisponível e diz quanto falta', async () => {
  const { store } = setup(500_000); void openNewLineDialog(store); await flush();
  const card = document.querySelector('[data-route="beta-gama"]')!;
  expect(card.getAttribute('aria-disabled')).toBe('true');
  expect(card.textContent).toContain('Faltam R$ 5.000');
});
test('adicionar e retirar ônibus da linha', () => {
  const { store, el } = setup(5_000_000); mountLinesTab(el, store);
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini', name: 'Reserva' }));
  const select = el.querySelector<HTMLSelectElement>('[data-line="alfa-beta"] select[data-action="add-bus"]')!;
  select.value = 'bus-2'; select.dispatchEvent(new Event('change', { bubbles: true }));
  expect(store.getState().buses[1]!.lineId).toBe('alfa-beta');
  click('[data-line="alfa-beta"] [data-remove-bus="bus-2"]', el);
  expect(store.getState().buses[1]!.lineId).toBeNull();
});
test('o tick só atualiza números, sem recriar o cartão', () => {
  const { store, el } = setup(); mountLinesTab(el, store);
  const card = el.querySelector('[data-line="alfa-beta"]');
  store.advance(120);
  expect(el.querySelector('[data-line="alfa-beta"]')).toBe(card);
  expect(el.querySelector('[data-live="occupancy"]')!.textContent).toBe('Lotação: 90%');
});
