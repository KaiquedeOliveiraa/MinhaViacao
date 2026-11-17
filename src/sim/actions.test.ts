import { expect, test } from 'vitest';
import {
  assignBus, buyBus, closeLine, openLine, renameBus, sellBus, setBusLivery, setLinePaused, setLinePrice, unassignBus, updateCompany,
} from './actions';
import { createGame } from './newGame';
import { testCatalog, testCompany } from './testkit';
import { advance } from './tick';
import type { ActionResult, LiveryStyle } from './types';

const fresh = () => createGame(testCatalog, testCompany);
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
