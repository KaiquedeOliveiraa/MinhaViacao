import { expect, test } from 'vitest';
import {
  assignBus, buyBus, closeLine, confirmPaint, openLine, renameBus, sellBus, setBusLivery, setLinePaused, setLinePrice, skipTutorial,
  unassignBus, updateCompany,
} from './actions';
import { createGame } from './newGame';
import { startedGame, testCatalog, testCompany } from './testkit';
import { advance } from './tick';
import type { ActionResult, GameState, LiveryStyle, TutorialStep } from './types';

const fresh = () => startedGame(testCatalog);
const rich = () => ({ ...fresh(), cashCents: 5_000_000 });
const err = (r: ActionResult) => (r.ok ? null : r.error);
const ok = (r: ActionResult) => { if (!r.ok) throw new Error(r.error); return r.state; };

test('comprar ônibus', () => {
  expect(err(buyBus(fresh(), testCatalog, { modelId: 'mini' }))).toBe('saldo_insuficiente');
  expect(err(buyBus(rich(), testCatalog, { modelId: 'jato' }))).toBe('modelo_inexistente');
  expect(err(buyBus(rich(), testCatalog, { modelId: 'mini', name: 'x'.repeat(31) }))).toBe('nome_invalido');
  const s = ok(buyBus(rich(), testCatalog, { modelId: 'mini', name: '  Guerreiro  ' }));
  expect(s.cashCents).toBe(3_000_000);
  expect(s.buses[1]).toMatchObject({ name: 'Guerreiro', lineId: null, livery: 'diagonal', trip: { phase: 'idle' } });
  expect(s.nextBusNumber).toBe(3);
  expect(ok(buyBus(rich(), testCatalog, { modelId: 'mini' })).buses[1]!.name).toMatch(/#2$/);
});
test('caixa negativo bloqueia compras', () => {
  expect(err(buyBus({ ...fresh(), cashCents: -1 }, testCatalog, { modelId: 'mini' }))).toBe('saldo_insuficiente');
});
test('vender ônibus', () => {
  expect(err(sellBus(fresh(), testCatalog, fresh().buses[0]!.id))).toBe('ultimo_onibus');
  const two = ok(buyBus(rich(), testCatalog, { modelId: 'mini' }));
  const sold = ok(sellBus(two, testCatalog, two.buses[0]!.id)); // o que está na linha
  expect(sold.buses).toHaveLength(1);
  expect(sold.cashCents).toBe(3_000_000 + 1_000_000);
  expect(err(sellBus(two, testCatalog, 'fantasma'))).toBe('onibus_inexistente');
});
test('abrir linha', () => {
  const s = ok(openLine(fresh(), testCatalog, { a: 'beta', b: 'gama' })); // beta já é atendida
  expect(s.cashCents).toBe(1_500_000 - 1_000_000);
  expect(s.lines[1]).toMatchObject({ id: 'beta-gama', a: 'beta', b: 'gama', priceCents: 1550 });
  expect(err(openLine(fresh(), testCatalog, { a: 'alfa', b: 'beta' }))).toBe('linha_existente');
  expect(err(openLine(fresh(), testCatalog, { a: 'alfa', b: 'alfa' }))).toBe('rota_inexistente');
  expect(err(openLine(fresh(), testCatalog, { a: 'alfa', b: 'curitiba' }))).toBe('rota_inexistente');
  expect(err(openLine({ ...fresh(), cashCents: 999_999 }, testCatalog, { a: 'beta', b: 'gama' }))).toBe('saldo_insuficiente');
  expect(err(openLine(fresh(), testCatalog, { a: 'beta', b: 'gama', busId: fresh().buses[0]!.id }))).toBe('onibus_ocupado');
});
test('linha nova precisa tocar a rede', () => {
  const alone = ok(closeLine(rich(), testCatalog, 'alfa-beta')); // sobra só a sede alfa
  expect(err(openLine(alone, testCatalog, { a: 'beta', b: 'gama' }))).toBe('fora_da_rede');
  expect(openLine(alone, testCatalog, { a: 'gama', b: 'alfa' }).ok).toBe(true);
});
test('fechar linha deixa os ônibus parados e não devolve a taxa', () => {
  const moving = advance(fresh(), testCatalog, 5);
  const s = ok(closeLine(moving, testCatalog, 'alfa-beta'));
  expect(s.lines).toHaveLength(0);
  expect(s.buses[0]).toMatchObject({ lineId: null, trip: { phase: 'idle' } });
  expect(s.cashCents).toBe(moving.cashCents);
});
test('preço é preso aos limites', () => {
  const price = (v: number) => ok(setLinePrice(fresh(), testCatalog, 'alfa-beta', v)).lines[0]!.priceCents;
  expect(price(1)).toBe(780);
  expect(price(999_999)).toBe(7800);
  expect(price(3000.6)).toBe(3001);
  expect(price(NaN)).toBe(2600);
  expect(price(Infinity)).toBe(2600);
});
test('alocar e desalocar', () => {
  const two = ok(buyBus(rich(), testCatalog, { modelId: 'mini' }));
  const id = two.buses[1]!.id;
  const on = ok(assignBus(two, testCatalog, id, 'alfa-beta'));
  expect(on.buses[1]).toMatchObject({ lineId: 'alfa-beta', trip: { phase: 'waiting', at: 'a', minutesLeft: 0 } });
  expect(err(assignBus(on, testCatalog, id, 'alfa-beta'))).toBe('onibus_ocupado');
  expect(ok(unassignBus(on, testCatalog, id)).buses[1]).toMatchObject({ lineId: null, trip: { phase: 'idle' } });
  expect(err(assignBus(two, testCatalog, id, 'beta-gama'))).toBe('linha_inexistente');
});
test('editar a empresa valida como na criação e nunca muda a sede', () => {
  const { hqCityId: _hq, ...rest } = testCompany;
  expect(err(updateCompany(fresh(), testCatalog, { ...rest, name: '' }))).toBe('empresa_invalida');
  const s = ok(updateCompany(fresh(), testCatalog, { ...rest, name: 'Nova' }));
  expect(s.company).toMatchObject({ name: 'Nova', hqCityId: 'alfa' });
});
test('nenhuma ação altera o estado recebido', () => {
  const s = rich(); const copy = structuredClone(s);
  buyBus(s, testCatalog, { modelId: 'mini' }); openLine(s, testCatalog, { a: 'beta', b: 'gama' }); setLinePrice(s, testCatalog, 'alfa-beta', 5000);
  expect(s).toEqual(copy);
});

// Além do plano: ações que ele lista sem teste próprio.
test('renomear ônibus', () => {
  const id = fresh().buses[0]!.id;
  expect(ok(renameBus(fresh(), testCatalog, id, '  Guerreiro ')).buses[0]!.name).toBe('Guerreiro');
  expect(ok(renameBus(fresh(), testCatalog, id, '   ')).buses[0]!.name).toBe('Mini #1');
  expect(err(renameBus(fresh(), testCatalog, id, 'x'.repeat(31)))).toBe('nome_invalido');
  expect(err(renameBus(fresh(), testCatalog, 'fantasma', 'A'))).toBe('onibus_inexistente');
});
test('trocar a pintura de um ônibus', () => {
  const id = fresh().buses[0]!.id;
  expect(ok(setBusLivery(fresh(), testCatalog, id, 'wave')).buses[0]!.livery).toBe('wave');
  expect(err(setBusLivery(fresh(), testCatalog, id, 'xadrez' as LiveryStyle))).toBe('pintura_invalida');
});
test('pausar linha', () => {
  expect(ok(setLinePaused(fresh(), testCatalog, 'alfa-beta', true)).lines[0]!.paused).toBe(true);
  expect(err(setLinePaused(fresh(), testCatalog, 'beta-gama', true))).toBe('linha_inexistente');
});
test('abrir linha já com um ônibus parado', () => {
  const two = ok(buyBus(rich(), testCatalog, { modelId: 'mini' }));
  const s = ok(openLine(two, testCatalog, { a: 'beta', b: 'gama', busId: two.buses[1]!.id }));
  expect(s.buses[1]).toMatchObject({ lineId: 'beta-gama', trip: { phase: 'waiting', at: 'a', minutesLeft: 0 } });
});

// Começo sem ônibus (fase 2): primeira linha sem taxa e o tutorial.
const blank = () => createGame(testCatalog, testCompany);
const at = (tutorial: TutorialStep, s: GameState = blank()): GameState => ({ ...s, tutorial });
const withBus = () => ok(buyBus(blank(), testCatalog, { modelId: 'mini' }));

test('a primeira linha da viação não cobra taxa e a segunda cobra', () => {
  const first = ok(openLine(withBus(), testCatalog, { a: 'alfa', b: 'beta' }));
  expect(first.cashCents).toBe(1_500_000);
  const second = ok(openLine(first, testCatalog, { a: 'beta', b: 'gama' }));
  expect(second.cashCents).toBe(1_500_000 - 1_000_000);
});
test('a primeira linha abre mesmo sem caixa para a taxa normal', () => {
  expect(ok(openLine({ ...blank(), cashCents: 0 }, testCatalog, { a: 'alfa', b: 'beta' })).lines).toHaveLength(1);
});
test('tutorial: comprar um ônibus no passo comprar leva a pintar', () => {
  expect(withBus().tutorial).toBe('pintar');
});
test('tutorial: comprar fora do passo comprar não mexe no tutorial', () => {
  const s = { ...withBus(), cashCents: 5_000_000 };
  expect(ok(buyBus(at('linha', s), testCatalog, { modelId: 'mini' })).tutorial).toBe('linha');
  expect(ok(buyBus(at('fim', s), testCatalog, { modelId: 'mini' })).tutorial).toBe('fim');
});
test('tutorial: trocar a pintura no passo pintar leva a linha', () => {
  const s = withBus();
  expect(ok(setBusLivery(s, testCatalog, s.buses[0]!.id, 'wave')).tutorial).toBe('linha');
  expect(ok(setBusLivery(at('comprar', s), testCatalog, s.buses[0]!.id, 'wave')).tutorial).toBe('comprar');
});
test('tutorial: manter a pintura no passo pintar leva a linha', () => {
  const s = withBus();
  const kept = ok(confirmPaint(s, testCatalog));
  expect(kept.tutorial).toBe('linha');
  expect(kept.buses).toEqual(s.buses);
  expect(ok(confirmPaint(at('comprar'), testCatalog)).tutorial).toBe('comprar');
  expect(ok(confirmPaint(at('fim'), testCatalog)).tutorial).toBe('fim');
});
test('tutorial: abrir a linha com o ônibus nela termina o tutorial', () => {
  const s = at('linha', withBus());
  expect(ok(openLine(s, testCatalog, { a: 'alfa', b: 'beta', busId: s.buses[0]!.id })).tutorial).toBe('fim');
});
test('tutorial: abrir a linha com o ônibus antes de pintar também termina o tutorial', () => {
  const s = withBus(); // passo pintar
  expect(ok(openLine(s, testCatalog, { a: 'alfa', b: 'beta', busId: s.buses[0]!.id })).tutorial).toBe('fim');
});
test('tutorial: linha aberta sem ônibus não termina o tutorial; colocar o ônibus nela termina', () => {
  const s = at('linha', withBus());
  const open = ok(openLine(s, testCatalog, { a: 'alfa', b: 'beta' }));
  expect(open.tutorial).toBe('linha');
  expect(ok(assignBus(open, testCatalog, s.buses[0]!.id, 'alfa-beta')).tutorial).toBe('fim');
});
test('pular o tutorial vai direto para o fim', () => {
  for (const step of ['comprar', 'pintar', 'linha', 'fim'] as const) expect(ok(skipTutorial(at(step), testCatalog)).tutorial).toBe('fim');
});
test('as outras ações não mexem no tutorial', () => {
  const s = at('pintar', ok(openLine(at('linha', withBus()), testCatalog, { a: 'alfa', b: 'beta' })));
  const id = s.buses[0]!.id;
  expect(ok(renameBus(s, testCatalog, id, 'Novo')).tutorial).toBe('pintar');
  expect(ok(setLinePrice(s, testCatalog, 'alfa-beta', 3000)).tutorial).toBe('pintar');
  expect(ok(setLinePaused(s, testCatalog, 'alfa-beta', true)).tutorial).toBe('pintar');
  expect(ok(closeLine(s, testCatalog, 'alfa-beta')).tutorial).toBe('pintar');
  expect(ok(unassignBus(s, testCatalog, id)).tutorial).toBe('pintar');
});
