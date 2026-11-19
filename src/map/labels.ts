/**
 * Onde pôr o nome de cada cidade no mapa (função pura, em pixels da tela).
 * Guloso: jogáveis primeiro, depois a maior população; cada rótulo tenta a direita, a esquerda,
 * em cima e embaixo do ponto e fica no primeiro lado inteiro na tela que não cruza outro rótulo
 * nem o ponto de uma jogável. Não jogável sem lado livre fica sem nome; jogável nunca some.
 */

export interface LabelCandidate {
  id: string;
  text: string;
  /** Ponto da cidade em pixels da tela. */
  x: number;
  y: number;
  /** Maior vale mais (população). */
  priority: number;
  playable: boolean;
  width: number;
  height: number;
  /** Distância do ponto ao rótulo; sem ela vale o `gap` de placeLabels. */
  gap?: number;
}

export type LabelSide = 'right' | 'left' | 'top' | 'bottom';

export interface Box { x: number; y: number; w: number; h: number }

export interface PlacedLabel { id: string; side: LabelSide; box: Box }

const SIDES: readonly LabelSide[] = ['right', 'left', 'top', 'bottom'];
/** Rótulo não encosta na borda da tela. */
const VIEW_MARGIN = 4;
/** Meio lado do quadrado em volta do ponto de uma jogável (ponto de 7 px e anel da sede de 11 px). */
const PLAYABLE_POINT = 12;
/** Folga entre dois rótulos. */
const LABEL_PAD = 2;

/** Menor população com nome no mapa neste zoom (zoom fracionado conta como o inteiro de baixo). */
export function minPopulationForZoom(zoom: number): number {
  const z = Math.floor(zoom);
  if (z <= 7) return 150_000;
  if (z === 8) return 50_000;
  if (z === 9) return 20_000;
  if (z === 10) return 8_000;
  return 0;
}

function boxAt(c: LabelCandidate, side: LabelSide, gap: number): Box {
  const { x, y, width: w, height: h } = c;
  switch (side) {
    case 'right': return { x: x + gap, y: y - h / 2, w, h };
    case 'left': return { x: x - gap - w, y: y - h / 2, w, h };
    case 'top': return { x: x - w / 2, y: y - gap - h, w, h };
    case 'bottom': return { x: x - w / 2, y: y + gap, w, h };
  }
}

function overlapArea(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

const pad = (b: Box, p: number): Box => ({ x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p });

function fits(b: Box, view: { width: number; height: number }): boolean {
  return b.x >= VIEW_MARGIN && b.y >= VIEW_MARGIN && b.x + b.w <= view.width - VIEW_MARGIN && b.y + b.h <= view.height - VIEW_MARGIN;
}

/** Empurra a caixa para dentro da tela (só quando cabe). */
function clampInto(b: Box, view: { width: number; height: number }): Box | null {
  const maxX = view.width - VIEW_MARGIN - b.w;
  const maxY = view.height - VIEW_MARGIN - b.h;
  if (maxX < VIEW_MARGIN || maxY < VIEW_MARGIN) return null;
  return { ...b, x: Math.min(Math.max(b.x, VIEW_MARGIN), maxX), y: Math.min(Math.max(b.y, VIEW_MARGIN), maxY) };
}

function compare(a: LabelCandidate, b: LabelCandidate): number {
  if (a.playable !== b.playable) return a.playable ? -1 : 1;
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** `obstacles`: áreas da tela já ocupadas (controles do mapa), em pixels da tela. */
export function placeLabels(
  cands: LabelCandidate[],
  view: { width: number; height: number },
  gap = 10,
  obstacles: readonly Box[] = [],
): PlacedLabel[] {
  const order = [...cands].sort(compare);
  const points = order
    .filter((c) => c.playable)
    .map((c) => ({ id: c.id, box: { x: c.x - PLAYABLE_POINT, y: c.y - PLAYABLE_POINT, w: 2 * PLAYABLE_POINT, h: 2 * PLAYABLE_POINT } }));
  const placed: PlacedLabel[] = [];

  /** Soma das sobreposições com rótulos aceitos, obstáculos e pontos de jogáveis (o próprio ponto não conta). */
  const cost = (c: LabelCandidate, b: Box, stopAtFirst: boolean): number => {
    let total = 0;
    const padded = pad(b, LABEL_PAD);
    for (const p of placed) {
      total += overlapArea(padded, p.box);
      if (stopAtFirst && total > 0) return total;
    }
    for (const o of obstacles) {
      total += overlapArea(b, o);
      if (stopAtFirst && total > 0) return total;
    }
    for (const p of points) {
      if (p.id === c.id) continue;
      total += overlapArea(b, p.box);
      if (stopAtFirst && total > 0) return total;
    }
    return total;
  };

  for (const c of order) {
    const g = c.gap ?? gap;
    let chosen: PlacedLabel | null = null;
    for (const side of SIDES) {
      const box = boxAt(c, side, g);
      if (fits(box, view) && cost(c, box, true) === 0) { chosen = { id: c.id, side, box }; break; }
    }
    if (!chosen && c.playable && c.x >= 0 && c.y >= 0 && c.x <= view.width && c.y <= view.height) {
      // jogável na tela sem lado livre: o lado com menos sobreposição, empurrado para dentro da tela
      let best = Infinity;
      for (const side of SIDES) {
        const raw = boxAt(c, side, g);
        const box = fits(raw, view) ? raw : clampInto(raw, view);
        if (!box) continue;
        const k = cost(c, box, false);
        if (k < best) { best = k; chosen = { id: c.id, side, box }; }
      }
    }
    if (chosen) placed.push(chosen);
  }
  return placed;
}
