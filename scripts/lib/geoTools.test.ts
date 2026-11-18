import { expect, test } from 'vitest';
import { clipRingToBox, mergeLines, ringCentroid, roundPos, simplifyLine, type Pos } from './geoTools';

const area = (ring: Pos[]) => {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[(i + 1) % ring.length]!;
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
};

test('simplifyLine remove pontos colineares', () => {
  expect(simplifyLine([[0, 0], [1, 0.0001], [2, 0]], 0.01)).toEqual([[0, 0], [2, 0]]);
});

test('simplifyLine mantém um bico', () => {
  expect(simplifyLine([[0, 0], [1, 1], [2, 0]], 0.01)).toHaveLength(3);
});

test('roundPos arredonda para 4 casas', () => {
  expect(roundPos([-49.123456, -27.987654])).toEqual([-49.1235, -27.9877]);
});

test('clipRingToBox recorta o quadrado', () => {
  const sq: Pos[] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const out = clipRingToBox(sq, { minX: 0, minY: 0, maxX: 5, maxY: 5 });
  for (const [x, y] of out) {
    expect(x).toBeLessThanOrEqual(5);
    expect(y).toBeLessThanOrEqual(5);
  }
  expect(area(out)).toBeCloseTo(25);
});

test('ringCentroid do quadrado', () => {
  expect(ringCentroid([[0, 0], [2, 0], [2, 2], [0, 2]])).toEqual([1, 1]);
});

test('mergeLines une linhas que compartilham ponta', () => {
  const out = mergeLines([[[0, 0], [1, 0]], [[1, 0], [2, 0]], [[5, 5], [6, 6]]]);
  expect(out).toHaveLength(2);
  const joined = out.find((l) => l.length === 3)!;
  const fwd = [[0, 0], [1, 0], [2, 0]];
  const rev = [[2, 0], [1, 0], [0, 0]];
  expect([fwd, rev]).toContainEqual(joined);
});
