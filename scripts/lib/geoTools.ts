/** Ferramentas geométricas simples para o script do mapa. Coordenadas [x, y] = [lng, lat]. */
export type Pos = [number, number];
export interface Box { minX: number; minY: number; maxX: number; maxY: number; }

function distToSegment(p: Pos, a: Pos, b: Pos): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas-Peucker (iterativo). Mantém o primeiro e o último ponto. */
export function simplifyLine(points: Pos[], tolerance: number): Pos[] {
  if (points.length < 3) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = -1;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = distToSegment(points[i]!, points[s]!, points[e]!);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx >= 0 && maxD > tolerance) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

export function roundPos(p: Pos, decimals = 4): Pos {
  const f = 10 ** decimals;
  return [Math.round(p[0] * f) / f, Math.round(p[1] * f) / f];
}

/** Sutherland–Hodgman contra uma caixa. Anel aberto (sem repetir o primeiro ponto no fim). */
export function clipRingToBox(ring: Pos[], box: Box): Pos[] {
  type Edge = { inside: (p: Pos) => boolean; cut: (a: Pos, b: Pos) => Pos };
  const edges: Edge[] = [
    { inside: (p) => p[0] >= box.minX, cut: (a, b) => [box.minX, a[1] + ((b[1] - a[1]) * (box.minX - a[0])) / (b[0] - a[0])] },
    { inside: (p) => p[0] <= box.maxX, cut: (a, b) => [box.maxX, a[1] + ((b[1] - a[1]) * (box.maxX - a[0])) / (b[0] - a[0])] },
    { inside: (p) => p[1] >= box.minY, cut: (a, b) => [a[0] + ((b[0] - a[0]) * (box.minY - a[1])) / (b[1] - a[1]), box.minY] },
    { inside: (p) => p[1] <= box.maxY, cut: (a, b) => [a[0] + ((b[0] - a[0]) * (box.maxY - a[1])) / (b[1] - a[1]), box.maxY] },
  ];
  let out = ring.slice();
  for (const e of edges) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i]!;
      const prev = input[(i + input.length - 1) % input.length]!;
      if (e.inside(cur)) {
        if (!e.inside(prev)) out.push(e.cut(prev, cur));
        out.push(cur);
      } else if (e.inside(prev)) {
        out.push(e.cut(prev, cur));
      }
    }
    if (out.length === 0) break;
  }
  return out;
}

/** Centroide de área de um anel (aberto ou fechado). */
export function ringCentroid(ring: Pos[]): Pos {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[(i + 1) % ring.length]!;
    const f = x1 * y2 - x2 * y1;
    a += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  if (Math.abs(a) < 1e-12) {
    const n = ring.length || 1;
    return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n];
  }
  return [cx / (3 * a), cy / (3 * a)];
}

const key = (p: Pos) => `${p[0]},${p[1]}`;

/** Une linhas que compartilham uma ponta (só quando a ponta é usada por exatamente duas linhas). */
export function mergeLines(lines: Pos[][]): Pos[][] {
  let work = lines.filter((l) => l.length > 1).map((l) => l.slice());
  for (;;) {
    const ends = new Map<string, number[]>();
    work.forEach((l, i) => {
      for (const p of [l[0]!, l[l.length - 1]!]) {
        const k = key(p);
        const arr = ends.get(k) ?? [];
        if (!arr.includes(i)) arr.push(i);
        ends.set(k, arr);
      }
    });
    let merged = false;
    for (const idxs of ends.values()) {
      if (idxs.length !== 2) continue;
      const [i, j] = idxs as [number, number];
      const a = work[i]!;
      const b = work[j]!;
      let res: Pos[] | null = null;
      if (key(a[a.length - 1]!) === key(b[0]!)) res = [...a, ...b.slice(1)];
      else if (key(a[a.length - 1]!) === key(b[b.length - 1]!)) res = [...a, ...b.slice(0, -1).reverse()];
      else if (key(a[0]!) === key(b[0]!)) res = [...a.slice(1).reverse(), ...b];
      else if (key(a[0]!) === key(b[b.length - 1]!)) res = [...b, ...a.slice(1)];
      if (res) {
        work = work.filter((_, k) => k !== i && k !== j);
        work.push(res);
        merged = true;
        break;
      }
    }
    if (!merged) return work;
  }
}
