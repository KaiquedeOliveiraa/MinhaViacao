import { expect, test } from 'vitest';
import { catalog as testCatalog } from '../sim/catalog';
import fixture from './fixtures/save-v1.json';
import { migrate } from './migrate';
import { parseSave, serialize, type ParseResult } from './schema';

const v1 = () => JSON.parse(JSON.stringify(fixture));
const error = (r: ParseResult) => (r.ok ? null : r.error);

test('save v1 real migra para v2', () => {
  const raw = v1();
  const r = parseSave(raw, testCatalog);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.state.version).toBe(2);
  expect(r.state.tutorial).toBe('fim');
  expect(r.state.buses.length).toBe(2);
  for (const b of r.state.buses) expect(b.driverId).toBeNull();
  expect(r.state.company.name).toBe(raw.company.name);
  expect(r.state.cashCents).toBe(raw.cashCents);
  expect(r.state.clockMinutes).toBe(raw.clockMinutes);
  expect(r.state.buses.map((b) => b.name)).toEqual(raw.buses.map((b: any) => b.name));
});

test('migrate não altera a entrada', () => {
  const raw = v1();
  const before = JSON.stringify(raw);
  const out = migrate(raw) as any;
  expect(JSON.stringify(raw)).toBe(before);
  expect(out).not.toBe(raw);
  expect(out.version).toBe(2);
});

test('serializar e ler de novo dá o mesmo estado', () => {
  const r = parseSave(v1(), testCatalog);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const again = parseSave(JSON.parse(serialize(r.state)), testCatalog);
  expect(again.ok && again.state).toEqual(r.state);
});

test('v2 com driverId ou tutorial inválidos', () => {
  const v2 = () => { const r = parseSave(v1(), testCatalog); return JSON.parse(serialize((r as any).state)); };
  const a = v2(); a.buses[0].driverId = '';
  expect(error(parseSave(a, testCatalog))).toBe('formato');
  const b = v2(); b.buses[0].driverId = 'x'.repeat(41);
  expect(error(parseSave(b, testCatalog))).toBe('formato');
  const c = v2(); c.tutorial = 'xyz';
  expect(error(parseSave(c, testCatalog))).toBe('formato');
  const d = v2(); d.buses[0].driverId = 'mot-1';
  expect(parseSave(d, testCatalog).ok).toBe(true);
});

test('versão 3 é do futuro', () => {
  const raw = v1(); raw.version = 3;
  expect(error(parseSave(raw, testCatalog))).toBe('versao_futura');
});
