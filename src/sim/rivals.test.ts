import { expect, test } from 'vitest';
import { RIVALS, type Rival } from '../data/rivals';
import { canUnlockRival, companyWorthCents, rivalProgress } from './rivals';
import { fairValueCents } from './market';
import { createGame } from './newGame';
import { startedGame, testCatalog, testCompany } from './testkit';
import type { Line } from './types';

const base = createGame(testCatalog, testCompany);
const rival = (kind: Rival['requirement']['kind']) => RIVALS.find(r => r.requirement.kind === kind)!;
const target = (r: Rival) => { const q = r.requirement; return q.kind === 'patrimonio' ? q.cents : q.count; };

test('ids únicos e lista não vazia', () => {
  expect(RIVALS.length).toBe(18);
  expect(new Set(RIVALS.map(r => r.id)).size).toBe(RIVALS.length);
});
test('requisitos estritamente crescentes dentro de cada tipo', () => {
  for (const kind of ['patrimonio', 'linhas', 'frota'] as const) {
    const values = RIVALS.filter(r => r.requirement.kind === kind).map(target);
    expect(values.length).toBeGreaterThan(1);
    values.forEach((v, i) => { if (i > 0) expect(v).toBeGreaterThan(values[i - 1]!); });
  }
});
test('patrimônio = caixa + valor justo da frota', () => {
  const s = startedGame(testCatalog);
  const fleet = s.buses.reduce((sum, b) => sum + fairValueCents(testCatalog, b, s.clockMinutes), 0);
  expect(companyWorthCents(s, testCatalog)).toBe(s.cashCents + fleet);
  expect(companyWorthCents(base, testCatalog)).toBe(base.cashCents);
});
test('progresso de patrimônio', () => {
  const r = rival('patrimonio'); const t = target(r);
  const p = rivalProgress({ ...base, cashCents: t - 1 }, testCatalog, r);
  expect(p).toEqual({ current: t - 1, target: t, met: false });
  const q = rivalProgress({ ...base, cashCents: t }, testCatalog, r);
  expect(q.met).toBe(true);
});
test('progresso de linhas e de frota; canUnlockRival muda ao cumprir', () => {
  const s = startedGame(testCatalog);
  const rl = rival('linhas'); const rf = rival('frota');
  expect(rivalProgress(s, testCatalog, rl)).toEqual({ current: s.lines.length, target: target(rl), met: s.lines.length >= target(rl) });
  expect(rivalProgress(s, testCatalog, rf).current).toBe(s.buses.length);
  const lines = Array.from({ length: target(rl) }, (_, i) => ({ ...s.lines[0]!, id: `l${i}` }) as Line);
  expect(canUnlockRival(s, testCatalog, rl)).toBe(false);
  expect(canUnlockRival({ ...s, lines }, testCatalog, rl)).toBe(true);
  const buses = Array.from({ length: target(rf) }, (_, i) => ({ ...s.buses[0]!, id: `b${i}` }));
  expect(canUnlockRival(s, testCatalog, rf)).toBe(false);
  expect(canUnlockRival({ ...s, buses }, testCatalog, rf)).toBe(true);
});
