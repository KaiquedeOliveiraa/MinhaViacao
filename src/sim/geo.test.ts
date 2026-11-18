import { expect, test } from 'vitest';
import { buildRoadIndex, etaMinutes, lineT, pointAt } from './geo';
import { newLine } from './newGame';
import { testCatalog } from './testkit';
import type { Bus, Road, Trip } from './types';

const road: Road = { id: 'beta-gama', a: 'beta', b: 'gama', distanceKm: 30, coords: [[0, 0], [0, 1], [0, 3]] };
const line = (a: string, b: string) => ({ ...newLine(testCatalog, a, b, 1550) });
const bus = (trip: Trip): Bus => ({ id: 'bus-1', modelId: 'mini', name: 'x', livery: 'plain', lineId: 'beta-gama', trip });

test('ponto ao longo do traçado é proporcional à distância, não ao número de pontos', () => {
  const index = buildRoadIndex(road);
  expect(pointAt(index, 0)).toEqual([0, 0]);
  expect(pointAt(index, 1)).toEqual([0, 3]);
  expect(pointAt(index, 0.5)[1]).toBeCloseTo(1.5, 3);
  expect(pointAt(index, -1)).toEqual([0, 0]);
  expect(pointAt(index, 7)).toEqual([0, 3]);
});
test('posição respeita o sentido em que o jogador criou a linha', () => {
  const forward = line('beta', 'gama'); const backward = line('gama', 'beta');
  expect(lineT(bus({ phase: 'waiting', at: 'a', minutesLeft: 0 }), forward, road)).toBe(0);
  expect(lineT(bus({ phase: 'waiting', at: 'a', minutesLeft: 0 }), backward, road)).toBe(1);
  expect(lineT(bus({ phase: 'moving', from: 'a', progress: 0.25, passengers: 0, fareCents: 0 }), forward, road)).toBe(0.25);
  expect(lineT(bus({ phase: 'moving', from: 'a', progress: 0.25, passengers: 0, fareCents: 0 }), backward, road)).toBe(0.75);
  expect(lineT(bus({ phase: 'moving', from: 'b', progress: 0.25, passengers: 0, fareCents: 0 }), forward, road)).toBe(0.75);
  expect(lineT(bus({ phase: 'idle' }), forward, road)).toBeNull();
});
test('minutos até a chegada', () => {
  expect(etaMinutes(bus({ phase: 'moving', from: 'a', progress: 0.5, passengers: 0, fareCents: 0 }), road)).toBe(15);
  expect(etaMinutes(bus({ phase: 'waiting', at: 'a', minutesLeft: 3 }), road)).toBeNull();
});
