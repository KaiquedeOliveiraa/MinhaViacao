// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { buyBus, listBus } from '../sim/actions';
import { fairValueCents, sellNowCents } from '../sim/market';
import { testCatalog, testCompany } from '../sim/testkit';
import { mountGarageTab } from './garageTab';
import { click, flush, setup } from './uiTestkit';

const withTwo = () => { const s = setup(5_000_000); s.store.dispatch((st, c) => buyBus(st, c, { modelId: 'mini', name: 'Reserva' })); return s; };
test('um cartão por ônibus, com desenho, selo e valor de venda', () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(2);
  expect(el.querySelector('[data-bus="bus-1"]')!.textContent).toContain('Alfa ⇄ Beta');
  expect(el.querySelector('[data-bus="bus-2"]')!.textContent).toContain('Parado');
  expect(el.querySelector('[data-bus="bus-2"] svg [data-region="body"]')!.getAttribute('fill')).toBe(testCompany.primaryColor);
  expect(el.querySelector('[data-bus="bus-2"] [data-action="sell"]')!.textContent).toBe('Vender agora por R$ 13.600'); // 80% do valor justo do novo (85% do preço)
});
test('sem ônibus, a Garagem diz para comprar na Loja', () => {
  const { store, el } = setup(5_000_000); store.replace({ ...store.getState(), buses: [], lines: [] }); mountGarageTab(el, store);
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(0);
  expect(el.querySelector('.empty')!.textContent).toBe('Nenhum ônibus na garagem. Compre o primeiro na Loja.');
  store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini' }));
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(1);
  expect(el.querySelector('.empty')).toBeNull();
});
test('o último ônibus não pode ser vendido', () => {
  const { store, el } = setup(); mountGarageTab(el, store);
  const sell = el.querySelector<HTMLButtonElement>('[data-action="sell"]')!;
  expect(sell.disabled).toBe(true);
  expect(sell.title).toBe('Sua viação precisa de pelo menos um ônibus.');
});
test('trocar a pintura de um ônibus não muda os outros', () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  click('[data-bus="bus-2"] [data-livery="plain"]', el);
  expect(store.getState().buses.map(b => b.livery)).toEqual(['diagonal', 'plain']);
  expect(el.querySelector('[data-bus="bus-2"] svg [data-region="stripe"]')).toBeNull();
  expect(el.querySelector('[data-bus="bus-1"] svg [data-region="stripe"]')).not.toBeNull();
});
test('renomear e vender passam pelas janelas', async () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  click('[data-bus="bus-2"] [data-action="rename"]', el); await flush();
  document.querySelector<HTMLInputElement>('[role="dialog"] input')!.value = '<b>Trovão</b>'; click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses[1]!.name).toBe('<b>Trovão</b>');
  expect(el.querySelector('[data-bus="bus-2"] b')).toBeNull();                 // aparece como texto
  click('[data-bus="bus-2"] [data-action="sell"]', el); await flush(); click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses).toHaveLength(1);
  expect(store.getState().cashCents).toBe(3_000_000 + 1_360_000); // 80% do valor justo do novo (85% do preço)
});

test('cada cartão mostra ano e quilometragem', () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  expect(el.querySelector('[data-bus="bus-2"] [data-spec="year"]')!.textContent).toBe('Ano 2026');
  expect(el.querySelector('[data-bus="bus-2"] [data-spec="km"]')!.textContent).toBe('0 km');
});
test('Vender agora usa o valor de sellNowCents', async () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  const value = sellNowCents(testCatalog, store.getState().buses[1]!, store.getState().clockMinutes);
  click('[data-bus="bus-2"] [data-action="sell"]', el); await flush();
  expect(document.querySelector('.dialog-message')!.textContent).toContain('R$ 13.600');
  click('[data-action="confirm"]'); await flush();
  expect(store.getState().cashCents).toBe(3_000_000 + value);
});
const priceInput = () => document.querySelector<HTMLInputElement>('[role="dialog"] input')!;
test('Anunciar abre o diálogo com o valor justo e anuncia pelo preço digitado', async () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  const s = store.getState();
  const fair = fairValueCents(testCatalog, s.buses[1]!, s.clockMinutes);
  click('[data-bus="bus-2"] [data-action="list"]', el); await flush();
  expect(priceInput().value).toBe('17000');
  const max = Math.round(1.15 * fair / 100).toLocaleString('pt-BR');
  expect(document.querySelector('[role="dialog"]')!.textContent).toContain(`Valor justo: R$ 17.000. Quanto mais acima, mais demora; acima de R$ ${max} não vende.`);
  priceInput().value = '18000'; click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses[1]!.listing).toMatchObject({ priceCents: 1_800_000 });
  const card = el.querySelector('[data-bus="bus-2"]')!;
  expect(card.querySelector('[data-badge="listing"]')!.textContent).toBe('Anunciado por R$ 18.000');
  expect(card.querySelector('[data-action="list"]')).toBeNull();
});
test('preço fora dos limites não anuncia e mantém o diálogo', async () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  click('[data-bus="bus-2"] [data-action="list"]', el); await flush();
  priceInput().value = '1000'; click('[data-action="confirm"]'); await flush();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  priceInput().value = '99999'; click('[data-action="confirm"]'); await flush();
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
  expect(store.getState().buses[1]!.listing).toBeNull();
  click('[data-action="cancel"]'); await flush();
});
test('Retirar anúncio volta o cartão ao normal', () => {
  const { store, el } = withTwo();
  store.dispatch((s, c) => listBus(s, c, 'bus-2', 1_800_000));
  mountGarageTab(el, store);
  expect(el.querySelector('[data-bus="bus-2"] [data-badge="listing"]')).not.toBeNull();
  click('[data-bus="bus-2"] [data-action="unlist"]', el);
  expect(store.getState().buses[1]!.listing).toBeNull();
  expect(el.querySelector('[data-bus="bus-2"] [data-badge="listing"]')).toBeNull();
  expect(el.querySelector('[data-bus="bus-2"] [data-action="list"]')).not.toBeNull();
});
test('o último ônibus não pode ser anunciado', () => {
  const { store, el } = setup(); mountGarageTab(el, store);
  expect(el.querySelector<HTMLButtonElement>('[data-action="list"]')!.disabled).toBe(true);
});
test('o valor de venda e a quilometragem acompanham o tempo', () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  const before = el.querySelector('[data-bus="bus-2"] [data-action="sell"]')!.textContent;
  const s = store.getState();
  store.replace({ ...s, buses: s.buses.map(b => b.id === 'bus-2' ? { ...b, odometerKm: 100_000 } : b) });
  store.advance(60);
  expect(el.querySelector('[data-bus="bus-2"] [data-action="sell"]')!.textContent).not.toBe(before);
  expect(el.querySelector('[data-bus="bus-2"] [data-spec="km"]')!.textContent).toBe('100.000 km');
});
test('quando o anúncio vende no tick, o cartão some e a Garagem não quebra', () => {
  const { store, el } = withTwo();
  store.dispatch((s, c) => listBus(s, c, 'bus-2', sellNowCents(c, s.buses[1]!, s.clockMinutes)));
  mountGarageTab(el, store);
  for (let i = 0; i < 400 && store.getState().buses.length > 1; i++) store.advance(60);
  expect(store.getState().buses).toHaveLength(1);
  expect(el.querySelector('[data-bus="bus-2"]')).toBeNull();
});
test('anúncio acima do limite de venda ganha aviso quando o valor justo cai', () => {
  const { store, el } = withTwo();
  store.dispatch((s, c) => listBus(s, c, 'bus-2', 1_800_000)); // justo R$ 17.000: abaixo de 1,15x
  mountGarageTab(el, store);
  const warn = () => el.querySelector<HTMLElement>('[data-bus="bus-2"] [data-listing="warn"]')!;
  expect(el.querySelector('[data-bus="bus-2"] [data-listing="fair"]')!.textContent).toBe('Valor justo hoje: R$ 17.000');
  expect(warn().hidden).toBe(true);
  const s = store.getState();
  store.replace({ ...s, buses: s.buses.map(b => b.id === 'bus-2' ? { ...b, odometerKm: 300_000 } : b) });
  store.advance(60); // vira a hora: atualiza os valores
  expect(warn().hidden).toBe(false);
  expect(warn().textContent).toBe('Acima do limite: não vende');
  expect(el.querySelector('[data-bus="bus-2"] [data-listing="fair"]')!.textContent).not.toBe('Valor justo hoje: R$ 17.000');
});
