import { expect, test } from 'vitest';
import { catalog as testCatalog } from '../sim/catalog';
import fixture from './fixtures/save-v1.json';
import fixtureV2 from './fixtures/save-v2.json';
import { migrate } from './migrate';
import { parseSave, serialize, type ParseResult } from './schema';

const v1 = () => JSON.parse(JSON.stringify(fixture));
const v2 = () => JSON.parse(JSON.stringify(fixtureV2));
const error = (r: ParseResult) => (r.ok ? null : r.error);

test('save v1 real migra até a v3 (v1 → v2 → v3)', () => {
  const raw = v1();
  const r = parseSave(raw, testCatalog);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.state.version).toBe(3);
  expect(r.state.tutorial).toBe('fim');
  expect(r.state.buses.length).toBe(2);
  for (const b of r.state.buses) expect(b.driverId).toBeNull();
  expect(r.state.company.name).toBe(raw.company.name);
  expect(r.state.cashCents).toBe(raw.cashCents);
  expect(r.state.clockMinutes).toBe(raw.clockMinutes);
  expect(r.state.buses.map((b) => b.name)).toEqual(raw.buses.map((b: any) => b.name));
  // v2 → v3: o micro vira o usado 2012 com 480.000 km; os outros, novos de 2026; ninguém anunciado
  expect(r.state.buses.map((b) => [b.id, b.modelId, b.year, b.odometerKm, b.listing])).toEqual([
    ['bus-1', 'micro', 2012, 480_000, null],
    ['bus-2', 'conv', 2026, 0, null],
  ]);
  expect(r.state.buses[0]!.trip).toEqual(raw.buses[0].trip);
  expect(r.state.lines).toEqual(raw.lines);
});

test('save v2 real migra para v3 sem mudar mais nada', () => {
  const raw = v2();
  const r = parseSave(raw, testCatalog);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  const extra: Record<string, object> = {
    micro: { year: 2012, odometerKm: 480_000, listing: null },
    conv: { year: 2026, odometerKm: 0, listing: null },
  };
  expect(r.state).toEqual({ ...raw, version: 3, buses: raw.buses.map((b: any) => ({ ...b, ...extra[b.modelId] })) });
});

test('migrate não altera a entrada', () => {
  const raw = v1();
  const before = JSON.stringify(raw);
  const out = migrate(raw) as any;
  expect(JSON.stringify(raw)).toBe(before);
  expect(out).not.toBe(raw);
  expect(out.version).toBe(3);
  const raw2 = v2();
  const before2 = JSON.stringify(raw2);
  expect((migrate(raw2) as any).version).toBe(3);
  expect(JSON.stringify(raw2)).toBe(before2);
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

test('v3 com ano, quilometragem ou anúncio inválidos', () => {
  const v3 = () => { const r = parseSave(v2(), testCatalog); return JSON.parse(serialize((r as any).state)); };
  const bad = (edit: (raw: any) => void) => { const raw = v3(); edit(raw); return error(parseSave(raw, testCatalog)); };
  expect(bad((r) => { r.buses[0].year = 2012.5; })).toBe('formato');
  expect(bad((r) => { r.buses[0].year = 1800; })).toBe('formato');
  expect(bad((r) => { delete r.buses[0].year; })).toBe('formato');
  expect(bad((r) => { r.buses[0].odometerKm = -1; })).toBe('formato');
  expect(bad((r) => { r.buses[0].odometerKm = 1.5; })).toBe('formato');
  expect(bad((r) => { r.buses[0].listing = { priceCents: 0, sinceMinutes: 0 }; })).toBe('formato');
  expect(bad((r) => { r.buses[0].listing = { priceCents: 100, sinceMinutes: -1 }; })).toBe('formato');
  expect(bad((r) => { r.buses[0].listing = 'sim'; })).toBe('formato');
  expect(bad((r) => { delete r.buses[0].listing; })).toBe('formato');
  const listed = v3(); listed.buses[0].listing = { priceCents: 1_500_000, sinceMinutes: 120, extra: 1 };
  const r = parseSave(listed, testCatalog);
  expect(r.ok && r.state.buses[0]!.listing).toEqual({ priceCents: 1_500_000, sinceMinutes: 120 });
});

test('versão 4 é do futuro', () => {
  const raw = v1(); raw.version = 4;
  expect(error(parseSave(raw, testCatalog))).toBe('versao_futura');
});
