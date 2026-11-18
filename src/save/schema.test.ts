import { expect, test } from 'vitest';
import { startedGame, testCatalog } from '../sim/testkit';
import { advance } from '../sim/tick';
import { parseSave, serialize, type ParseResult } from './schema';

const good = () => advance(startedGame(testCatalog), testCatalog, 95); // tem ônibus em viagem
const parse = (mutate: (raw: any) => void) => { const raw = JSON.parse(serialize(good())); mutate(raw); return parseSave(raw, testCatalog); };
const error = (r: ParseResult) => (r.ok ? null : r.error);

test('ida e volta devolve o mesmo estado', () => {
  const r = parseSave(JSON.parse(serialize(good())), testCatalog);
  expect(r.ok && r.state).toEqual(good());
});
test('lixo é recusado como formato', () => {
  for (const raw of [null, 42, 'oi', [], {}, { version: 1 }]) expect(error(parseSave(raw, testCatalog))).toBe('formato');
});
test('versão do futuro', () => { expect(error(parse(r => { r.version = 99; }))).toBe('versao_futura'); });
test('referências que não existem no catálogo', () => {
  expect(error(parse(r => { r.buses[0].modelId = 'jato'; }))).toBe('referencia');
  expect(error(parse(r => { r.company.hqCityId = 'curitiba'; }))).toBe('formato'); // empresa inválida
  expect(error(parse(r => { r.lines[0].b = 'curitiba'; }))).toBe('referencia');
});
test('números estragados', () => {
  expect(error(parse(r => { r.cashCents = 'muito'; }))).toBe('formato');
  expect(error(parse(r => { r.cashCents = 1.5; }))).toBe('formato');
  expect(error(parse(r => { r.cashCents = null; }))).toBe('formato');   // é no que NaN vira em JSON
  expect(error(parse(r => { r.clockMinutes = -1; }))).toBe('formato');
  expect(error(parse(r => { r.lines[0].queueA = -3; }))).toBe('formato');
  expect(error(parse(r => { r.buses[0].trip = { phase: 'moving', from: 'a', progress: 2, passengers: 1, fareCents: 100 }; }))).toBe('formato');
  expect(error(parse(r => { r.buses[0].trip = { phase: 'moving', from: 'a', progress: 0.5, passengers: 999, fareCents: 100 }; }))).toBe('formato');
});
test('estado incoerente', () => {
  expect(error(parse(r => { r.buses[0].lineId = 'beta-gama'; }))).toBe('formato');  // linha que o jogo não tem
  expect(error(parse(r => { r.buses[0].trip = { phase: 'idle' }; }))).toBe('formato'); // parado, mas com linha
  expect(error(parse(r => { r.lines.push(r.lines[0]); }))).toBe('formato');            // linha repetida
  expect(error(parse(r => { r.buses[0].name = 'x'.repeat(31); }))).toBe('formato');
});
test('texto com HTML é aceito e guardado como texto', () => {
  const r = parse(raw => { raw.company.name = '<img src=x onerror=alert(1)>'; });
  expect(r.ok && r.state.company.name).toBe('<img src=x onerror=alert(1)>');
});
test('campos desconhecidos são descartados', () => {
  const r = parse(raw => { raw.hack = true; raw.buses[0].turbo = 9; });
  expect(r.ok && 'hack' in r.state).toBe(false);
  expect(r.ok && 'turbo' in r.state.buses[0]!).toBe(false);
});
test('foco de revisão: logo gigante é recusada', () => {
  expect(error(parse(r => { r.company.logo = { kind: 'image', dataUrl: 'data:image/png;base64,' + 'A'.repeat(200_001) }; }))).toBe('formato');
});
