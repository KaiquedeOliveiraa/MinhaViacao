import { expect, test } from 'vitest';
import {
  assignBus, buyBus, buyOffer, closeLine, confirmPaint, listBus, openLine, renameBus, sellBus, setBusLivery, setLinePaused, setLinePrice,
  skipTutorial, unassignBus, unlistBus, updateCompany,
} from './actions';
import { fairValueCents, sellNowCents } from './market';
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
  expect(sold.cashCents).toBe(3_000_000 + 1_360_000); // 80% do valor justo do novo (85% do preço)
  const worn = structuredClone(two); worn.buses[0]!.odometerKm = 150_000; worn.clockMinutes = 365 * 1440;
  expect(ok(sellBus(worn, testCatalog, worn.buses[0]!.id)).cashCents).toBe(3_000_000 + Math.round(0.8 * Math.round(2_000_000 * 0.85 * 0.9 * 0.9)));
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

// Loja realista (fase 2, tarefa 8): ofertas, venda imediata e anúncio.
test('comprar uma oferta usada cria o ônibus com o ano e a quilometragem dela', () => {
  const s = ok(buyOffer(rich(), testCatalog, { offerId: 'grande-2020', name: 'Velhinho' }));
  expect(s.buses[1]).toMatchObject({
    id: 'bus-2', modelId: 'grande', name: 'Velhinho', year: 2020, odometerKm: 300_000, listing: null,
    lineId: null, trip: { phase: 'idle' }, driverId: null, livery: 'diagonal',
  });
  expect(s.cashCents).toBe(5_000_000 - 4_000_000);
  expect(s.nextBusNumber).toBe(3);
  expect(ok(buyOffer(rich(), testCatalog, { offerId: 'grande-2020' })).buses[1]!.name).toBe('Grande #2');
});
test('comprar oferta: erros', () => {
  expect(err(buyOffer(rich(), testCatalog, { offerId: 'fantasma' }))).toBe('oferta_inexistente');
  expect(err(buyOffer(fresh(), testCatalog, { offerId: 'grande-2020' }))).toBe('saldo_insuficiente');
  expect(err(buyOffer({ ...rich(), cashCents: -1 }, testCatalog, { offerId: 'mini-novo' }))).toBe('saldo_insuficiente');
  expect(err(buyOffer(rich(), testCatalog, { offerId: 'mini-novo', name: 'x'.repeat(31) }))).toBe('nome_invalido');
});
test('comprar oferta no passo comprar leva o tutorial a pintar', () => {
  const s = { ...blank(), cashCents: 5_000_000 };
  expect(ok(buyOffer(s, testCatalog, { offerId: 'grande-2020' })).tutorial).toBe('pintar');
  expect(ok(buyOffer(at('fim', s), testCatalog, { offerId: 'grande-2020' })).tutorial).toBe('fim');
});
test('oferta nova comprada depois da virada do ano sai com o ano do jogo', () => {
  const s = { ...rich(), clockMinutes: 400 * 1440 };
  expect(ok(buyOffer(s, testCatalog, { offerId: 'mini-novo' })).buses[1]).toMatchObject({ year: 2027, odometerKm: 0 });
  expect(ok(buyOffer(s, testCatalog, { offerId: 'grande-2020' })).buses[1]!.year).toBe(2020);
});
test('buyBus continua como atalho para a oferta nova do modelo', () => {
  const s = ok(buyBus({ ...rich(), cashCents: 9_000_000 }, testCatalog, { modelId: 'grande' }));
  expect(s.buses[1]).toMatchObject({ modelId: 'grande', year: 2026, odometerKm: 0, listing: null });
  expect(s.cashCents).toBe(3_000_000); // preço do novo, não o do usado
  expect(err(buyBus(rich(), testCatalog, { modelId: 'grande' }))).toBe('saldo_insuficiente');
});

const two = () => ok(buyBus(rich(), testCatalog, { modelId: 'mini', name: 'Reserva' })); // bus-1 na linha, bus-2 parado
test('anunciar: preço entre a venda imediata e 2× o valor justo', () => {
  const s = two();
  const bus = s.buses[1]!;
  const fair = fairValueCents(testCatalog, bus, s.clockMinutes);
  const now = sellNowCents(testCatalog, bus, s.clockMinutes);
  expect(fair).toBe(1_700_000);
  expect(err(listBus(s, testCatalog, bus.id, now - 1))).toBe('preco_invalido');
  expect(err(listBus(s, testCatalog, bus.id, 2 * fair + 1))).toBe('preco_invalido');
  expect(err(listBus(s, testCatalog, bus.id, NaN))).toBe('preco_invalido');
  expect(err(listBus(s, testCatalog, bus.id, Infinity))).toBe('preco_invalido');
  expect(ok(listBus(s, testCatalog, bus.id, now)).buses[1]!.listing).toEqual({ priceCents: now, sinceMinutes: 0 });
  const later = { ...s, clockMinutes: 500 };
  const listed = ok(listBus(later, testCatalog, bus.id, 2 * fair));
  expect(listed.buses[1]!.listing).toEqual({ priceCents: 2 * fair, sinceMinutes: 500 });
  expect(listed.cashCents).toBe(s.cashCents);
  expect(ok(listBus(listed, testCatalog, bus.id, fair)).buses[1]!.listing).toEqual({ priceCents: fair, sinceMinutes: 500 });
});
test('anunciar: o único ônibus não pode ser anunciado; ônibus que não existe dá erro', () => {
  expect(err(listBus(fresh(), testCatalog, 'bus-1', 2_000_000))).toBe('ultimo_onibus');
  expect(err(listBus(two(), testCatalog, 'fantasma', 2_000_000))).toBe('onibus_inexistente');
});
test('última não anunciada: nem anunciar nem vender o único ônibus fora de anúncio', () => {
  const listed = ok(listBus(two(), testCatalog, 'bus-2', 2_000_000));
  expect(err(listBus(listed, testCatalog, 'bus-1', 2_000_000))).toBe('ultimo_onibus'); // sobraria zero sem anúncio
  expect(err(sellBus(listed, testCatalog, 'bus-1'))).toBe('ultimo_onibus');
  expect(ok(sellBus(listed, testCatalog, 'bus-2')).buses.map((b) => b.id)).toEqual(['bus-1']); // vender o anunciado pode
  expect(ok(listBus(listed, testCatalog, 'bus-2', 2_100_000)).buses[1]!.listing!.priceCents).toBe(2_100_000); // trocar o preço pode
});
test('retirar o anúncio', () => {
  const listed = ok(listBus(two(), testCatalog, 'bus-2', 2_000_000));
  const s = ok(unlistBus(listed, testCatalog, 'bus-2'));
  expect(s.buses[1]!.listing).toBeNull();
  expect(ok(unlistBus(s, testCatalog, 'bus-2')).buses[1]!.listing).toBeNull();
  expect(err(unlistBus(s, testCatalog, 'fantasma'))).toBe('onibus_inexistente');
});
test('vender agora um ônibus anunciado paga a venda imediata, não o preço do anúncio', () => {
  const listed = ok(listBus(two(), testCatalog, 'bus-2', 3_000_000));
  const s = ok(sellBus(listed, testCatalog, 'bus-2'));
  expect(s.cashCents).toBe(listed.cashCents + 1_360_000);
});
