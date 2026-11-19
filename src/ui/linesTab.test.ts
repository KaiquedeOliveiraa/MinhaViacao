// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { buyBus } from '../sim/actions';
import { createGame } from '../sim/newGame';
import { testCatalog, testCompany } from '../sim/testkit';
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
test('nova linha: a primeira linha da viação aparece como grátis e vem com o ônibus parado escolhido', async () => {
  const { store } = setup(); store.replace({ ...createGame(testCatalog, testCompany), cashCents: 2_000_000 });
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini' })); // caixa zerado, passo pintar
  void openNewLineDialog(store); await flush();
  expect([...document.querySelectorAll('[data-route]')].map(n => n.getAttribute('data-route')).sort()).toEqual(['alfa-beta', 'alfa-gama']);
  const card = document.querySelector('[data-route="alfa-beta"]')!;
  expect(card.textContent).toContain('Taxa de abertura: grátis (primeira linha)');
  expect(card.getAttribute('aria-disabled')).toBe('false');
  expect(document.querySelector<HTMLSelectElement>('[aria-label="Ônibus para a linha"]')!.value).toBe('bus-1');
  click('[data-route="alfa-beta"]'); click('[data-action="confirm"]'); await flush();
  expect(store.getState().lines.map(l => l.id)).toEqual(['alfa-beta']);
  expect(store.getState().buses[0]!.lineId).toBe('alfa-beta');
  expect(store.getState().tutorial).toBe('fim');
  expect(store.getState().cashCents).toBe(0);
});
test('sem linhas e sem ônibus, a aba Linhas diz o que fazer primeiro', () => {
  const { store, el } = setup(); store.replace(createGame(testCatalog, testCompany)); mountLinesTab(el, store);
  expect(el.querySelector('.empty')!.textContent).toBe('Nenhuma linha ainda. Compre um ônibus na Loja e depois toque em Nova linha.');
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini' }));
  expect(el.querySelector('.empty')!.textContent).toBe('Nenhuma linha. Toque em Nova linha para começar.');
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
test('o nome completo do ônibus fica no cartão, com o modelo em outro elemento', () => {
  const { store, el } = setup();
  const bus = store.getState().buses[0]!;
  const name = 'Micro Vale 24 (usado) #1 Muito Comprido';
  store.replace({ ...store.getState(), buses: store.getState().buses.map(b => b.id === bus.id ? { ...b, name } : b) });
  mountLinesTab(el, store);
  const li = el.querySelector('[data-line] .line-buses li')!;
  expect(li.querySelector('.line-bus-name')!.textContent).toBe(name);
  expect(li.querySelector('.line-bus-model')).not.toBeNull();
});

test('quando o anúncio vende no tick, o ônibus some do cartão e da lista de adicionar', async () => {
  const { listBus } = await import('../sim/actions');
  const { sellNowCents } = await import('../sim/market');
  const { store, el } = setup(5_000_000);
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini', name: 'Reserva' }));
  store.dispatch((s, c) => listBus(s, c, 'bus-2', sellNowCents(c, s.buses[1]!, s.clockMinutes)));
  mountLinesTab(el, store);
  expect(el.textContent).toContain('Reserva');
  for (let i = 0; i < 400 && store.getState().buses.length > 1; i++) store.advance(60);
  expect(store.getState().buses).toHaveLength(1);
  expect(el.textContent).not.toContain('Reserva');
});
