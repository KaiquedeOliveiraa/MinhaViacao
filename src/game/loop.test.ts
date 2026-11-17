import { expect, test } from 'vitest';
import { createGame } from '../sim/newGame';
import { testCatalog, testCompany } from '../sim/testkit';
import { createLoop, stepMinutes } from './loop';
import { createStore } from './store';

test('converte tempo real em minutos de jogo', () => {
  expect(stepMinutes(0, 1000, 1)).toEqual({ minutes: 1, accMs: 0 });
  expect(stepMinutes(0, 500, 4)).toEqual({ minutes: 2, accMs: 0 });
  expect(stepMinutes(0, 250, 1)).toEqual({ minutes: 0, accMs: 250 });
  expect(stepMinutes(900, 250, 1)).toEqual({ minutes: 1, accMs: 150 });
  expect(stepMinutes(0, 1000, 4)).toEqual({ minutes: 4, accMs: 0 });
});
test('pausado não anda nem acumula', () => { expect(stepMinutes(300, 1000, 0)).toEqual({ minutes: 0, accMs: 300 }); });
test('foco de revisão: horas com a aba escondida valem 1 segundo', () => {
  expect(stepMinutes(0, 3 * 3_600_000, 1)).toEqual({ minutes: 1, accMs: 0 });
  expect(stepMinutes(0, 3 * 3_600_000, 4)).toEqual({ minutes: 4, accMs: 0 });
});
test('o laço avança o store conforme o relógio injetado', () => {
  let t = 0; let frame: (() => void) | null = null;
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  const loop = createLoop(store, { now: () => t, raf: cb => { frame = cb; return 1; }, caf: () => { frame = null; } });
  loop.start(); t = 1000; frame!(); t = 1500; frame!(); t = 2000; frame!();
  expect(store.getState().clockMinutes).toBe(2);
  loop.stop(); expect(frame).toBeNull();
});
