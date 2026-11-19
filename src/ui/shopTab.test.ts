// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { mountShopTab } from './shopTab';
import { click, flush, setup } from './uiTestkit';

const ids = (el: HTMLElement) => [...el.querySelectorAll<HTMLElement>('[data-offer]')].map(e => e.dataset.offer);
const choose = (el: HTMLElement, name: string, value: string) => {
  const sel = el.querySelector<HTMLSelectElement>(`select[data-filter="${name}"]`)!;
  sel.value = value; sel.dispatchEvent(new Event('change'));
};

test('sem caixa, o botão diz quanto falta', () => {
  const { store, el } = setup(); mountShopTab(el, store);
  const buy = el.querySelector<HTMLButtonElement>('[data-model="mini"] [data-action="buy"]')!;
  expect(buy.disabled).toBe(true);
  expect(buy.textContent).toBe('Faltam R$ 5.000');
});
test('o botão libera quando o caixa alcança o preço', () => {
  const { store, el } = setup(1_990_000); mountShopTab(el, store);
  store.advance(61); // a primeira viagem rende R$ 88
  expect(el.querySelector<HTMLButtonElement>('[data-action="buy"]')!.disabled).toBe(true);
  store.replace({ ...store.getState(), cashCents: 2_000_000 });
  expect(el.querySelector<HTMLButtonElement>('[data-action="buy"]')!.disabled).toBe(false);
});
test('comprar pede o nome; cancelar não compra', async () => {
  const { store, el } = setup(5_000_000); mountShopTab(el, store);
  click('[data-action="buy"]', el); await flush(); click('[data-action="cancel"]'); await flush();
  expect(store.getState().buses).toHaveLength(1);
  click('[data-action="buy"]', el); await flush(); click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses).toHaveLength(2);
  expect(store.getState().buses[1]!.name).toMatch(/#2$/);
});
test('um cartão por oferta, com novo/usado, ano e km do usado', () => {
  const { store, el } = setup(); mountShopTab(el, store);
  expect(ids(el).sort()).toEqual(['grande-2020', 'grande-novo', 'mini-novo']);
  const used = el.querySelector('[data-offer="grande-2020"]')!.textContent!;
  expect(used).toContain('Grande');
  expect(used).toContain('Usado');
  expect(used).toContain('2020');
  expect(el.querySelector('[data-offer="grande-2020"] [data-spec="km"]')!.textContent).toBe('300.000 km');
  expect(used).toContain('R$ 40.000');
  const novo = el.querySelector('[data-offer="grande-novo"]')!;
  expect(novo.textContent).toContain('Novo');
  expect(novo.textContent).toContain('R$ 60.000');
  expect(novo.querySelector('[data-spec="km"]')).toBeNull();
  expect(novo.querySelector('[data-spec="year"]')).toBeNull();
});
test('comprar uma oferta usada traz o ônibus com o ano e a quilometragem dela', async () => {
  const { store, el } = setup(5_000_000); mountShopTab(el, store);
  click('[data-offer="grande-2020"] [data-action="buy"]', el); await flush(); click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses[1]).toMatchObject({ modelId: 'grande', year: 2020, odometerKm: 300_000 });
  expect(store.getState().cashCents).toBe(1_000_000);
});
test('o filtro Categoria reduz a lista', () => {
  const { store, el } = setup(); mountShopTab(el, store);
  choose(el, 'category', 'micro');
  expect(ids(el)).toEqual(['mini-novo']);
  choose(el, 'category', 'onibus');
  expect(ids(el)).toEqual(['grande-2020', 'grande-novo']);
  choose(el, 'category', 'van');
  expect(ids(el)).toEqual([]);
  expect(el.textContent).toContain('Nenhuma oferta com esses filtros.');
});
test('o filtro Estado separa novos e usados', () => {
  const { store, el } = setup(); mountShopTab(el, store);
  choose(el, 'condition', 'usado'); expect(ids(el)).toEqual(['grande-2020']);
  choose(el, 'condition', 'novo'); expect(ids(el)).toEqual(['mini-novo', 'grande-novo']);
});
test('as opções dos filtros têm os nomes combinados', () => {
  const { store, el } = setup(); mountShopTab(el, store);
  const labels = (n: string) => [...el.querySelectorAll(`select[data-filter="${n}"] option`)].map(o => o.textContent);
  expect(labels('category')).toEqual(['Todas', 'Vans', 'Micro-ônibus', 'Ônibus', 'Rodoviários']);
  expect(labels('condition')).toEqual(['Todos', 'Novos', 'Usados']);
  expect(labels('sort')).toEqual(['Menor preço', 'Maior preço', 'Mais lugares', 'Mais novo']);
  expect(el.textContent).toContain('Cabe no meu orçamento');
});
test('ordenação: menor preço é o padrão; maior preço, mais lugares, mais novo', () => {
  const { store, el } = setup(); mountShopTab(el, store);
  expect(ids(el)).toEqual(['mini-novo', 'grande-2020', 'grande-novo']);
  choose(el, 'sort', 'preco-desc'); expect(ids(el)).toEqual(['grande-novo', 'grande-2020', 'mini-novo']);
  choose(el, 'sort', 'lugares'); expect(ids(el)[2]).toBe('mini-novo');
  choose(el, 'sort', 'novo'); expect(ids(el)[2]).toBe('grande-2020');
});
test('Cabe no meu orçamento mostra só o que o caixa paga', () => {
  const { store, el } = setup(4_500_000); mountShopTab(el, store);
  click('input[data-filter="budget"]', el);
  expect(ids(el)).toEqual(['mini-novo', 'grande-2020']);
  store.replace({ ...store.getState(), cashCents: 2_000_000 });
  expect(ids(el)).toEqual(['mini-novo']);
});
test('com caixa negativo, o orçamento mostra a mensagem e não quebra', () => {
  const { store, el } = setup(-100_000); mountShopTab(el, store);
  click('input[data-filter="budget"]', el);
  expect(ids(el)).toEqual([]);
  expect(el.querySelector('.empty')!.textContent).toBe('Nenhum veículo cabe no caixa agora.');
});
test('filtros ficam só na tela: não entram no estado salvo', () => {
  const { store, el } = setup(); mountShopTab(el, store);
  const before = JSON.stringify(store.getState());
  choose(el, 'category', 'micro');
  expect(JSON.stringify(store.getState())).toBe(before);
});
