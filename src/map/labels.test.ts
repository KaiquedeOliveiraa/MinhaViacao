import { expect, test } from 'vitest';
import { minPopulationForZoom, placeLabels, type LabelCandidate, type PlacedLabel } from './labels';

const view = { width: 400, height: 300 };

function cand(id: string, x: number, y: number, priority: number, extra: Partial<LabelCandidate> = {}): LabelCandidate {
  return { id, text: id, x, y, priority, playable: false, width: 60, height: 14, ...extra };
}

const byId = (placed: PlacedLabel[]) => new Map(placed.map((p) => [p.id, p]));

function intersects(a: PlacedLabel['box'], b: PlacedLabel['box']): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function inside(box: PlacedLabel['box'], margin = 4): boolean {
  return box.x >= margin && box.y >= margin && box.x + box.w <= view.width - margin && box.y + box.h <= view.height - margin;
}

test('população mínima por zoom: de longe só as grandes, de perto todas', () => {
  expect(minPopulationForZoom(6)).toBe(150_000);
  expect(minPopulationForZoom(7)).toBe(150_000);
  expect(minPopulationForZoom(8)).toBe(50_000);
  expect(minPopulationForZoom(9)).toBe(20_000);
  expect(minPopulationForZoom(10)).toBe(8_000);
  expect(minPopulationForZoom(11)).toBe(0);
  expect(minPopulationForZoom(12)).toBe(0);
});

test('zoom fracionado usa o limiar do zoom inteiro de baixo', () => {
  expect(minPopulationForZoom(7.75)).toBe(150_000);
  expect(minPopulationForZoom(8.25)).toBe(50_000);
});

test('sem conflito, o rótulo fica à direita do ponto', () => {
  const [p] = placeLabels([cand('a', 100, 100, 10)], view, 5);
  expect(p).toEqual({ id: 'a', side: 'right', box: { x: 105, y: 93, w: 60, h: 14 } });
});

test('duas caixas que colidem: a de menor prioridade muda de lado', () => {
  const placed = byId(placeLabels([cand('menor', 130, 90, 1), cand('maior', 100, 100, 9)], view, 5));
  expect(placed.get('maior')!.side).toBe('right');
  expect(placed.get('menor')).toBeDefined();
  expect(placed.get('menor')!.side).not.toBe('right');
  expect(intersects(placed.get('maior')!.box, placed.get('menor')!.box)).toBe(false);
});

test('sem lado livre, a de menor prioridade fica sem rótulo', () => {
  // a grande no meio; a pequena a 1 px dela: qualquer lado da pequena cruza a da grande ou sai da tela
  const tight = { width: 140, height: 30 };
  const placed = placeLabels([cand('grande', 40, 15, 9), cand('pequena', 41, 15, 1)], tight, 5);
  expect(placed.map((p) => p.id)).toEqual(['grande']);
});

test('perto da borda direita, o rótulo vai para a esquerda', () => {
  const [p] = placeLabels([cand('borda', 380, 150, 5)], view, 5);
  expect(p!.side).toBe('left');
  expect(inside(p!.box)).toBe(true);
});

test('jogáveis vêm antes das maiores não jogáveis', () => {
  const placed = placeLabels([cand('grande', 100, 100, 1_000_000), cand('jogavel', 100, 100, 10, { playable: true })], view, 5);
  const got = byId(placed);
  expect(got.get('jogavel')!.side).toBe('right');
  if (got.has('grande')) expect(intersects(got.get('grande')!.box, got.get('jogavel')!.box)).toBe(false);
});

test('rótulo não jogável não cobre o ponto de uma jogável', () => {
  const placed = byId(placeLabels([cand('j', 130, 100, 1, { playable: true, width: 40 }), cand('t', 100, 100, 9, { width: 28 })], view, 5));
  const t = placed.get('t')!;
  expect(t.side).not.toBe('right'); // à direita passaria por cima do ponto da jogável em (130, 100)
  expect(t.box.x > 130 || t.box.x + t.box.w < 130 || t.box.y > 100 || t.box.y + t.box.h < 100).toBe(true);
});

test('jogável cercada ainda ganha rótulo, inteiro na tela', () => {
  const small = { width: 200, height: 120 };
  const ring = [
    cand('j1', 100, 60, 9, { playable: true, width: 80, height: 18 }),
    cand('j2', 110, 60, 8, { playable: true, width: 80, height: 18 }),
    cand('j3', 100, 70, 7, { playable: true, width: 80, height: 18 }),
    cand('j4', 95, 55, 6, { playable: true, width: 80, height: 18 }),
  ];
  const placed = placeLabels(ring, small, 12);
  expect(placed.map((p) => p.id).sort()).toEqual(['j1', 'j2', 'j3', 'j4']);
  for (const p of placed) {
    expect(p.box.x).toBeGreaterThanOrEqual(4);
    expect(p.box.y).toBeGreaterThanOrEqual(4);
    expect(p.box.x + p.box.w).toBeLessThanOrEqual(small.width - 4);
    expect(p.box.y + p.box.h).toBeLessThanOrEqual(small.height - 4);
  }
});

test('jogável perto da borda direita (Florianópolis no celular) não sai cortada', () => {
  const [p] = placeLabels([cand('florianopolis', 370, 150, 537_211, { playable: true, width: 110, height: 18 })], view, 12);
  expect(p!.side).toBe('left');
  expect(inside(p!.box)).toBe(true);
});

test('duas jogáveis próximas (Blumenau e Itajaí) não se sobrepõem', () => {
  const placed = byId(placeLabels([
    cand('itajai', 184, 150, 264_054, { playable: true, width: 56, height: 18 }),
    cand('blumenau', 150, 150, 361_261, { playable: true, width: 80, height: 18 }),
  ], view, 12));
  expect(placed.size).toBe(2);
  expect(intersects(placed.get('blumenau')!.box, placed.get('itajai')!.box)).toBe(false);
});

test('ordem estável: mesma entrada, mesma saída, mesmo com empates', () => {
  const cands = [cand('b', 100, 100, 5), cand('a', 100, 100, 5), cand('c', 90, 110, 5), cand('d', 300, 200, 7)];
  const first = placeLabels(cands, view, 5);
  expect(placeLabels(cands, view, 5)).toEqual(first);
  expect(placeLabels([...cands].reverse(), view, 5)).toEqual(first);
});

test('áreas ocupadas (controles do mapa) contam como obstáculo', () => {
  const zoomControl = { x: 0, y: 0, w: 50, h: 80 };
  const [town] = placeLabels([cand('t', 60, 30, 5)], view, 5, [zoomControl]);
  expect(town!.side).toBe('right');
  expect(town!.box.x).toBeGreaterThanOrEqual(50);
  const blocked = placeLabels([cand('t', 20, 30, 5, { width: 20 })], { width: 60, height: 90 }, 5, [zoomControl]);
  expect(blocked).toEqual([]);
});
