import { LOGO_ICONS } from '../data/logos';
import type { BusShape, LiveryStyle, LogoRef } from '../sim/types';
import { svg } from './dom';

export interface BusArt { shape: BusShape; primary: string; secondary: string; livery: LiveryStyle; logo?: LogoRef; }

/** Cores fixas do desenho (não fazem parte da paleta da interface). */
export const BUS_WINDOW = '#1a2029';
const WINDOW_FRAME = '#0c0e13';
export const BUS_TIRE = '#0b0a0f';
export const BUS_RIM = '#8a8794';
const RIM_DARK = '#5b5864';
const RIM_LIGHT = '#c9c6d1';
const SIDEWALL = '#26242d';
const WHEEL_WELL = '#09080c';
const BUMPER = '#2b2932';
const HEADLIGHT = '#fff3c4';
const SIGNAL = '#f5a524';
const TAILLIGHT = '#d9363e';
const GLASS_SHINE = '#ffffff';
const SHADE = '#000000';

const GROUND = 110;

export const BUS_SHAPES: readonly BusShape[] = ['van', 'micro', 'conv', 'rodo'];

type Pt = [number, number];

/** Contorno e detalhes de um modelo, de lado, com a frente para a direita. */
interface Silhouette {
  /** traseira, dianteira, teto, base da carroceria e chão */
  x0: number; x1: number; top: number; bottom: number; ground: number;
  wheelR: number;
  axles: number[];
  rearR: number;
  /** trecho do contorno do fim do teto até a base dianteira */
  front: string;
  /** topo das janelas e linha de cintura (base das janelas) */
  winTop: number; belt: number;
  /** vidros (para-brisa, janelas e portas), já com cantos arredondados */
  glass: string;
  /** moldura escura atrás das janelas (vidro colado, colunas finas) */
  frame?: string;
  /** vincos de portas e painéis */
  seams: string;
  logoX: number;
  headY: number;
  tail: [number, number];
  roofUnit?: string;
  markers?: number[];
  grille?: boolean;
}

const f = (n: number) => Math.round(n * 100) / 100;

/** Polígono com cantos arredondados (raio limitado à metade de cada lado). */
function roundedPoly(pts: Pt[], r: number): string {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const [cx, cy] = pts[i]!;
    const toward = ([ax, ay]: Pt): Pt => {
      const dx = ax - cx, dy = ay - cy, len = Math.hypot(dx, dy);
      const k = Math.min(r, len / 2) / len;
      return [cx + dx * k, cy + dy * k];
    };
    const a = toward(pts[(i - 1 + n) % n]!);
    const b = toward(pts[(i + 1) % n]!);
    d += `${i === 0 ? 'M' : 'L'}${f(a[0])} ${f(a[1])} Q${f(cx)} ${f(cy)} ${f(b[0])} ${f(b[1])} `;
  }
  return `${d}Z`;
}
const rr = (x: number, y: number, w: number, h: number, r: number) => roundedPoly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], r);

/** Fileira de janelas iguais separadas por colunas. */
function paneRow(from: number, to: number, n: number, y: number, h: number, gap = 5): string {
  const w = (to - from - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => rr(from + i * (w + gap), y, w, h, 3)).join(' ');
}

/** Porta de ônibus: duas folhas de vidro e o vinco em volta. */
function busDoor(x: number, w: number, winTop: number, bottom: number): { glass: string; seam: string } {
  const leaf = w / 2 - 2;
  const y = winTop + 1;
  const h = bottom - 16 - y;
  return {
    glass: `${rr(x + 1.5, y, leaf, h, 2)} ${rr(x + w / 2 + 0.5, y, leaf, h, 2)}`,
    seam: rr(x, winTop - 2, w, bottom - 4 - (winTop - 2), 2.5),
  };
}

function van(): Silhouette {
  const x0 = 68, x1 = 258, top = GROUND - (x1 - x0) / 2.4, bottom = 99;
  const winTop = 38.5, belt = 60;
  return {
    x0, x1, top, bottom, ground: GROUND, wheelR: 11, axles: [116, 228], rearR: 9,
    front: `H192 Q201 ${f(top)} 204 ${f(top + 4)} L226 60 Q228 62.2 231 62.6 L249 65 Q257 66.5 258 74 V93 Q258 99 252 99`,
    winTop, belt,
    glass: [
      roundedPoly([[198, top - 1], [240, top - 1], [240, 62], [221, 62]], 1.5), // para-brisa
      roundedPoly([[192, winTop], [201, winTop], [215, 58.5], [192, 58.5]], 2.5), // porta do motorista
      rr(146, winTop, 40, belt - 1.5 - winTop, 3), // porta corrediça
      rr(77, winTop, 61, belt - 1.5 - winTop, 3), // janela traseira
    ].join(' '),
    seams: `M189.5 ${f(top + 3)} V95.5 H231 V64 ${rr(142.5, top + 4.5, 47, 95.5 - top - 4.5, 2.5)} M78 63.5 H142.5`,
    logoX: 166, headY: 67.5, tail: [42, 66],
  };
}

function micro(): Silhouette {
  const x0 = 46, x1 = 276, top = GROUND - (x1 - x0) / 3.0, bottom = 100;
  const winTop = top + 8, belt = 65;
  const door = busDoor(245, 19, winTop, bottom);
  return {
    x0, x1, top, bottom, ground: GROUND, wheelR: 12, axles: [104, 228], rearR: 8,
    front: `H${x1 - 16} Q${x1 - 5} ${f(top)} ${x1 - 4} ${f(top + 9)} L${x1} ${bottom - 16} V${bottom - 6} Q${x1} ${bottom} ${x1 - 6} ${bottom}`,
    winTop, belt,
    glass: [
      roundedPoly([[x1 - 10, top - 1], [x1 + 3, top - 1], [x1 + 3, bottom - 23], [x1 - 5, bottom - 23]], 1.5),
      door.glass,
      paneRow(x0 + 9, 239, 4, winTop, belt - 1.5 - winTop),
    ].join(' '),
    seams: door.seam,
    logoX: 166, headY: bottom - 20, tail: [bottom - 38, bottom - 17],
  };
}

function conv(): Silhouette {
  const x0 = 15, x1 = 305, top = GROUND - (x1 - x0) / 3.6, bottom = 100;
  const winTop = top + 8.5, belt = 67;
  const front = busDoor(267, 24, winTop, bottom);
  const middle = busDoor(150, 24, winTop, bottom);
  return {
    x0, x1, top, bottom, ground: GROUND, wheelR: 13.5, axles: [84, 248], rearR: 9,
    front: `H${x1 - 13} Q${x1 - 3} ${f(top)} ${x1 - 2} ${f(top + 10)} L${x1} ${bottom - 14} V${bottom - 6} Q${x1} ${bottom} ${x1 - 6} ${bottom}`,
    winTop, belt,
    glass: [
      roundedPoly([[x1 - 9, top - 1], [x1 + 3, top - 1], [x1 + 3, bottom - 24], [x1 - 5, bottom - 24]], 1.5),
      front.glass, middle.glass,
      paneRow(x0 + 8, 146, 3, winTop, belt - 1.5 - winTop),
      paneRow(178, 263, 2, winTop, belt - 1.5 - winTop),
    ].join(' '),
    seams: `${front.seam} ${middle.seam}`,
    logoX: 204, headY: bottom - 21, tail: [bottom - 40, bottom - 17],
    roofUnit: roundedPoly([[94, top + 2], [101, top - 4], [171, top - 4], [178, top + 2]], 2.5),
  };
}

function rodo(): Silhouette {
  const x0 = 10, x1 = 310, top = GROUND - (x1 - x0) / 3.4, bottom = 99;
  const winTop = top + 8, belt = 63;
  const door = busDoor(266, 22, winTop, bottom);
  const paneH = belt - 1.5 - winTop;
  const bays = [120, 156, 192].map((x) => rr(x, belt + 6, 33, bottom - 13 - belt - 6, 2)).join(' ');
  return {
    x0, x1, top, bottom, ground: GROUND, wheelR: 14, axles: [64, 98, 246], rearR: 10,
    front: `H${x1 - 30} C${x1 - 12} ${f(top)} ${x1 - 5} ${f(top + 9)} ${x1 - 3} ${f(top + 26)} L${x1} ${bottom - 14} V${bottom - 6} Q${x1} ${bottom} ${x1 - 6} ${bottom}`,
    winTop, belt,
    glass: [
      roundedPoly([[x1 - 34, top - 1], [x1 + 3, top - 1], [x1 + 3, bottom - 25], [x1 - 6, bottom - 25], [x1 - 11, top + 16]], 2),
      door.glass,
      paneRow(x0 + 10, 259, 6, winTop, paneH, 2.5),
    ].join(' '),
    frame: rr(x0 + 7, winTop - 2.5, 255 - x0, paneH + 5, 4),
    seams: `${door.seam} ${bays}`,
    logoX: 172, headY: bottom - 21, tail: [bottom - 44, bottom - 18],
    markers: [130, 172, 214], grille: true,
  };
}

export const BUS_SILHOUETTES: Readonly<Record<BusShape, Silhouette>> = { van: van(), micro: micro(), conv: conv(), rodo: rodo() };

const archR = (s: Silhouette) => s.wheelR + 3.5;
const wheelY = (s: Silhouette) => s.ground - s.wheelR;
/** meia-largura da cava na linha da base da carroceria */
const archHalf = (s: Silhouette) => Math.sqrt(archR(s) ** 2 - Math.max(0, s.bottom - wheelY(s)) ** 2);

/** Eixos agrupados: eixos muito próximos (truque) dividem a mesma cava. */
function axleGroups(s: Silhouette): number[][] {
  const groups: number[][] = [];
  for (const a of [...s.axles].sort((p, q) => p - q)) {
    const last = groups.at(-1);
    if (last && a - last.at(-1)! < archHalf(s) * 2 + 6) last.push(a);
    else groups.push([a]);
  }
  return groups;
}

/** Arcos de uma cava, da direita para a esquerda, começando e terminando na base. */
function archArcs(s: Silhouette, g: number[]): string {
  const R = archR(s), w = archHalf(s), b = s.bottom;
  const lo = g[0]!, hi = g.at(-1)!;
  if (g.length === 1) return `H${f(hi + w)} A${R} ${R} 0 1 0 ${f(lo - w)} ${b}`;
  const y = f(wheelY(s) - R);
  return `H${f(hi + w)} A${R} ${R} 0 0 0 ${hi} ${y} H${lo} A${R} ${R} 0 0 0 ${f(lo - w)} ${b}`;
}

/** Contorno da carroceria com as cavas de roda recortadas. */
function bodyPath(s: Silhouette): string {
  const { x0, top, bottom, rearR: r } = s;
  const arches = axleGroups(s).reverse().map((g) => archArcs(s, g)).join(' ');
  return `M${x0 + r} ${f(top)} ${s.front} ${arches} H${x0 + 5} Q${x0} ${bottom} ${x0} ${bottom - 5} V${f(top + r)} Q${x0} ${f(top)} ${x0 + r} ${f(top)} Z`;
}

let clipCounter = 0;

export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount)).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** Faixa da pintura (cor secundária); fica dentro do grupo `paint`, recortado pela carroceria. */
function stripeShape(style: LiveryStyle, s: Silhouette, fill: string): SVGElement | null {
  const { x0, x1, top, belt, bottom } = s;
  const w = x1 - x0;
  const below = bottom - belt; // lateral pintável abaixo das janelas
  if (style === 'plain') return null;
  if (style === 'stripe') {
    const hgt = Math.max(8, below * 0.24);
    return svg('rect', { 'data-region': 'stripe', x: x0 - 2, y: f(belt + below * 0.3), width: w + 4, height: f(hgt), fill });
  }
  if (style === 'diagonal') {
    const dx = (bottom - top) / Math.tan(Math.PI / 3); // 60°
    const band = Math.max(14, w * 0.065);
    const d = [0.1, 0.27].map((k) => {
      const a = x0 + w * k;
      return `M${f(a)} ${bottom + 2} L${f(a + band)} ${bottom + 2} L${f(a + band + dx)} ${f(top - 6)} L${f(a + dx)} ${f(top - 6)} Z`;
    }).join(' ');
    return svg('path', { 'data-region': 'stripe', d, fill });
  }
  // onda: faixa curva que sobe da traseira (perto da saia) até a dianteira (logo abaixo das janelas)
  const t = Math.max(9, below * 0.24);
  const yRear = bottom - 14 - t;
  const yFront = belt + 3;
  const d = [
    `M${x0 - 2} ${f(yRear)}`,
    `C${f(x0 + w * 0.4)} ${f(yRear + 4)}, ${f(x0 + w * 0.55)} ${f(yFront + 4)}, ${x1 + 2} ${f(yFront)}`,
    `L${x1 + 2} ${f(yFront + t)}`,
    `C${f(x0 + w * 0.55)} ${f(yFront + t + 6)}, ${f(x0 + w * 0.4)} ${f(yRear + t + 4)}, ${x0 - 2} ${f(yRear + t)}`,
    'Z',
  ].join(' ');
  return svg('path', { 'data-region': 'stripe', d, fill });
}

function paintZones(art: BusArt, s: Silhouette, bodyClip: string): SVGElement {
  const len = s.x1 - s.x0;
  const g = svg('g', { 'data-region': 'paint', 'clip-path': `url(#${bodyClip})` });
  const stripe = stripeShape(art.livery, s, art.secondary);
  if (stripe) g.appendChild(stripe);
  // brilho do teto e friso da cintura
  g.appendChild(svg('rect', { x: s.x0, y: f(s.top), width: len, height: 3.5, fill: GLASS_SHINE, opacity: 0.16 }));
  g.appendChild(svg('rect', { x: s.x0, y: s.belt + 1.5, width: len, height: 1.6, fill: SHADE, opacity: 0.2 }));
  // vincos de portas e bagageiros
  g.appendChild(svg('path', { d: s.seams, fill: 'none', stroke: SHADE, 'stroke-opacity': 0.28, 'stroke-width': 1 }));
  // grade do motor (traseira)
  if (s.grille) {
    const d = [0, 4, 8].map((dy) => `M${s.x0 + 5} ${s.bottom - 32 + dy} H${s.x0 + 30}`).join(' ');
    g.appendChild(svg('path', { d, stroke: SHADE, 'stroke-opacity': 0.35, 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
  }
  // borda das cavas de roda
  const lips = axleGroups(s).map((grp) => `M${f(grp.at(-1)! + archHalf(s))} ${s.bottom} ${archArcs(s, grp).replace(/^H[^A]*/, '')}`).join(' ');
  g.appendChild(svg('path', { d: lips, fill: 'none', stroke: darken(art.primary, 0.4), 'stroke-width': 2.5 }));
  return g;
}

function skirt(art: BusArt, s: Silhouette, bodyClip: string): SVGElement {
  const { x0, x1, bottom } = s;
  const g = svg('g', { 'data-region': 'skirt', fill: darken(art.primary, 0.25), 'clip-path': `url(#${bodyClip})` });
  g.appendChild(svg('rect', { x: x0 - 2, y: bottom - 11, width: x1 - x0 + 4, height: 12 }));
  g.appendChild(svg('path', { d: `${rr(x1 - 14, bottom - 9, 16, 10, 2)} ${rr(x0 - 2, bottom - 9, 14, 10, 2)}`, fill: BUMPER }));
  return g;
}

function windows(s: Silhouette, bodyClip: string, glassClip: string): SVGElement {
  const g = svg('g', { 'data-region': 'windows', 'clip-path': `url(#${bodyClip})` });
  if (s.frame) g.appendChild(svg('path', { d: s.frame, fill: WINDOW_FRAME }));
  g.appendChild(svg('path', { d: s.glass, fill: BUS_WINDOW }));
  // reflexos inclinados, só sobre o vidro
  const h = s.bottom - s.top;
  const shine = Array.from({ length: Math.ceil((s.x1 - s.x0) / 46) + 1 }, (_, i) => {
    const x = s.x0 + 14 + i * 46;
    return `M${f(x)} ${f(s.top - 2)} h13 l${f(-h * 0.35)} ${f(h)} h-13 Z`;
  }).join(' ');
  const sh = svg('g', { 'clip-path': `url(#${glassClip})` });
  sh.appendChild(svg('path', { d: shine, fill: GLASS_SHINE, opacity: 0.07 }));
  sh.appendChild(svg('rect', { x: s.x0, y: f(s.winTop - 1), width: s.x1 - s.x0 + 4, height: 3, fill: GLASS_SHINE, opacity: 0.06 }));
  g.appendChild(sh);
  return g;
}

function lights(s: Silhouette): SVGElement {
  const { x0, x1, tail: [t0, t1] } = s;
  const g = svg('g', { 'data-region': 'lights' });
  g.appendChild(svg('path', { d: rr(x1 - 7.5, s.headY, 8.5, 5, 1.8), fill: HEADLIGHT }));
  g.appendChild(svg('path', { d: rr(x1 - 11, s.headY + 0.5, 3, 4, 1), fill: SIGNAL }));
  g.appendChild(svg('path', { d: rr(x0 - 1, t0, 4, t1 - t0, 1.6), fill: TAILLIGHT }));
  g.appendChild(svg('path', { d: rr(x0 - 1, t1 + 1.5, 4, 3.5, 1), fill: SIGNAL }));
  for (const x of s.markers ?? []) g.appendChild(svg('circle', { cx: x, cy: s.bottom - 5.5, r: 1.4, fill: SIGNAL }));
  return g;
}

function wheels(s: Silhouette): SVGElement {
  const R = s.wheelR, cy = wheelY(s);
  const g = svg('g', { 'data-region': 'wheels' });
  for (const cx of s.axles) {
    g.appendChild(svg('circle', { class: 'tire', cx, cy, r: R, fill: BUS_TIRE }));
    g.appendChild(svg('circle', { cx, cy, r: f(R - 2.4), fill: 'none', stroke: SIDEWALL, 'stroke-width': 1.2 }));
    g.appendChild(svg('circle', { cx, cy, r: f(R * 0.6), fill: BUS_RIM }));
    g.appendChild(svg('circle', { cx, cy, r: f(R * 0.46), fill: RIM_DARK }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.appendChild(svg('circle', { cx: f(cx + Math.cos(a) * R * 0.32), cy: f(cy + Math.sin(a) * R * 0.32), r: 0.9, fill: RIM_LIGHT }));
    }
    g.appendChild(svg('circle', { cx, cy, r: f(R * 0.17), fill: RIM_LIGHT }));
  }
  return g;
}

function logoBadge(logo: LogoRef, s: Silhouette, primary: string, secondary: string, id: string): SVGElement {
  const cx = s.logoX;
  const space = s.bottom - 11 - s.belt;
  const cy = f(s.belt + space / 2 + 1);
  const r = Math.min(11, space / 2 - 2);
  const g = svg('g', { 'data-region': 'logo' });
  g.appendChild(svg('circle', { cx, cy, r: r + 1.5, fill: primary }));
  g.appendChild(svg('circle', { cx, cy, r, fill: secondary }));
  if (logo.kind === 'icon') {
    const scale = (r * 1.45) / 24;
    g.appendChild(svg('path', {
      d: LOGO_ICONS[logo.iconId].path, fill: primary, 'fill-rule': 'evenodd',
      transform: `translate(${f(cx - 12 * scale)} ${f(cy - 12 * scale)}) scale(${f(scale)})`,
    }));
  } else {
    g.appendChild(svg('clipPath', { id }, svg('circle', { cx, cy, r: r - 0.5 })));
    const img = svg('image', { x: cx - r, y: cy - r, width: r * 2, height: r * 2, 'clip-path': `url(#${id})`, preserveAspectRatio: 'xMidYMid meet' });
    img.setAttribute('href', logo.dataUrl);
    g.appendChild(img);
  }
  return g;
}

/**
 * Ônibus de lado, com a pintura da empresa. viewBox 320×120; o tamanho vem do CSS.
 * Camadas (data-region): body, paint (com stripe), skirt, windows, lights, logo, wheels.
 */
export function busSvg(art: BusArt): SVGSVGElement {
  const s = BUS_SILHOUETTES[art.shape];
  if (!s) throw new Error(`modelo de ônibus desconhecido: ${String(art.shape)}`);
  const id = `bus-${++clipCounter}`;
  const bodyClip = `${id}-body`, glassClip = `${id}-glass`;
  const d = bodyPath(s);
  const root = svg('svg', { viewBox: '0 0 320 120', class: 'bus-svg', role: 'img', 'aria-hidden': 'true' });

  root.appendChild(svg('clipPath', { id: bodyClip }, svg('path', { d })));
  root.appendChild(svg('clipPath', { id: glassClip }, svg('path', { d: s.glass })));
  root.appendChild(svg('ellipse', { cx: (s.x0 + s.x1) / 2, cy: s.ground + 1, rx: (s.x1 - s.x0) / 2 + 4, ry: 4, fill: SHADE, opacity: 0.4 }));
  const wells = axleGroups(s).map((g) => `M${f(g.at(-1)! + archHalf(s))} ${s.bottom} ${archArcs(s, g).replace(/^H[^A]*/, '')} Z`).join(' ');
  root.appendChild(svg('path', { d: wells, fill: WHEEL_WELL }));
  if (s.roofUnit) root.appendChild(svg('path', { d: s.roofUnit, fill: darken(art.primary, 0.12) }));
  root.appendChild(svg('path', { 'data-region': 'body', d, fill: art.primary }));
  root.appendChild(paintZones(art, s, bodyClip));
  root.appendChild(skirt(art, s, bodyClip));
  root.appendChild(windows(s, bodyClip, glassClip));
  root.appendChild(lights(s));
  if (art.logo) root.appendChild(logoBadge(art.logo, s, art.primary, art.secondary, `${id}-logo`));
  root.appendChild(wheels(s));
  return root;
}

/** Miniatura 64×40 de um estilo de pintura. */
export function liveryThumb(style: LiveryStyle, primary: string, secondary: string): SVGSVGElement {
  const root = svg('svg', { viewBox: '0 0 64 40', class: 'livery-thumb', 'aria-hidden': 'true' });
  const clipId = `thumb-clip-${++clipCounter}`;
  root.appendChild(svg('clipPath', { id: clipId }, svg('rect', { x: 2, y: 4, width: 60, height: 32, rx: 6 })));
  const g = svg('g', { 'clip-path': `url(#${clipId})` });
  g.appendChild(svg('rect', { x: 0, y: 0, width: 64, height: 40, fill: primary }));
  const stripe = thumbStripe(style, { x0: 2, x1: 62, top: 4 }, secondary);
  if (stripe) g.appendChild(stripe);
  root.appendChild(g);
  return root;
}

function thumbStripe(style: LiveryStyle, s: { x0: number; x1: number; top: number }, fill: string): SVGElement | null {
  const top = s.top;
  const bottom = 36;
  const w = s.x1 - s.x0;
  const h = bottom - top;
  if (style === 'plain') return null;
  if (style === 'stripe') return svg('rect', { 'data-part': 'stripe', x: 0, y: top + h * 0.5, width: 64, height: 6, fill });
  if (style === 'diagonal') {
    const dx = h / Math.tan(Math.PI / 3);
    const d = [0.15, 0.4].map((k) => { const a = s.x0 + w * k; return `M${a} ${bottom} L${a + 6} ${bottom} L${a + 6 + dx} ${top} L${a + dx} ${top} Z`; }).join(' ');
    return svg('path', { 'data-part': 'stripe', d, fill });
  }
  return svg('path', { 'data-part': 'stripe', d: `M0 30 C22 30 34 16 64 12 L64 19 C34 23 22 37 0 37 Z`, fill });
}
