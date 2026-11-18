import { LOGO_ICONS } from '../data/logos';
import type { BusShape, LiveryStyle, LogoRef } from '../sim/types';
import { svg } from './dom';

export interface BusArt { shape: BusShape; primary: string; secondary: string; livery: LiveryStyle; logo?: LogoRef; }

/** Cores fixas do desenho (não fazem parte da paleta da interface). */
export const BUS_WINDOW = '#14121a';
export const BUS_TIRE = '#0b0a0f';
export const BUS_RIM = '#8a8794';
const HEADLIGHT = '#fff3c4';
const TAILLIGHT = '#d9363e';

const GLASS_SHINE = '#ffffff';

const GROUND = 110;
const WHEEL_R = 13;
const WHEEL_Y = GROUND - WHEEL_R;
const BOTTOM = 100; // base da carroceria (as rodas passam dela)

interface Box { x0: number; x1: number; top: number; }
interface Silhouette extends Box {
  axles: number[];
  winTop: number;
  winH: number;
  /** portas: posição x do começo de cada uma */
  doors: number[];
}
const SHAPES: Record<BusShape, Silhouette> = {
  micro: { x0: 60, x1: 260, top: 42, axles: [100, 222], winTop: 48, winH: 20, doors: [238] },
  conv: { x0: 20, x1: 300, top: 34, axles: [66, 256], winTop: 41, winH: 22, doors: [276] },
  rodo: { x0: 10, x1: 310, top: 14, axles: [50, 80, 270], winTop: 22, winH: 30, doors: [287] },
};

let clipCounter = 0;

export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount)).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

function bodyPath({ x0, x1, top }: Box): string {
  const b = BOTTOM;
  return [
    `M${x0 + 10} ${top}`,
    `H${x1 - 26}`,
    `Q${x1 - 6} ${top} ${x1 - 2} ${top + 18}`,
    `L${x1} ${b - 8}`,
    `Q${x1} ${b} ${x1 - 8} ${b}`,
    `H${x0 + 6}`,
    `Q${x0} ${b} ${x0} ${b - 6}`,
    `V${top + 10}`,
    `Q${x0} ${top} ${x0 + 10} ${top}`,
    'Z',
  ].join(' ');
}

/** Faixa da pintura, sempre recortada pela carroceria. */
function stripeShape(style: LiveryStyle, s: Silhouette, fill: string): SVGElement | null {
  const { x0, x1, top } = s;
  const w = x1 - x0;
  const winBottom = s.winTop + s.winH;
  const below = BOTTOM - winBottom; // lateral pintável abaixo das janelas
  if (style === 'plain') return null;
  if (style === 'stripe') {
    const hgt = Math.max(8, below * 0.24);
    return svg('rect', { 'data-region': 'stripe', x: x0 - 2, y: winBottom + below * 0.3, width: w + 4, height: hgt, fill });
  }
  if (style === 'diagonal') {
    const hgt = BOTTOM - top;
    const dx = hgt / Math.tan(Math.PI / 3); // 60°
    const band = Math.max(14, w * 0.065);
    const d = [0.1, 0.27].map((f) => {
      const a = x0 + w * f;
      return `M${a} ${BOTTOM + 2} L${a + band} ${BOTTOM + 2} L${a + band + dx} ${top - 2} L${a + dx} ${top - 2} Z`;
    }).join(' ');
    return svg('path', { 'data-region': 'stripe', d, fill });
  }
  // wave: faixa curva que sobe da traseira (perto da saia) até a dianteira (logo abaixo das janelas)
  const t = Math.max(9, below * 0.24);
  const yRear = BOTTOM - 14 - t;
  const yFront = winBottom + 2;
  const d = [
    `M${x0 - 2} ${yRear}`,
    `C${x0 + w * 0.4} ${yRear + 4}, ${x0 + w * 0.55} ${yFront + 4}, ${x1 + 2} ${yFront}`,
    `L${x1 + 2} ${yFront + t}`,
    `C${x0 + w * 0.55} ${yFront + t + 6}, ${x0 + w * 0.4} ${yRear + t + 4}, ${x0 - 2} ${yRear + t}`,
    'Z',
  ].join(' ');
  return svg('path', { 'data-region': 'stripe', d, fill });
}

function windows(s: Silhouette): SVGElement {
  const { x0, x1, winTop: y, winH } = s;
  const g = svg('g', { 'data-region': 'windows', fill: BUS_WINDOW });
  // para-brisa, descendo pela dianteira
  g.appendChild(svg('path', { d: `M${x1 - 24} ${y - 2} Q${x1 - 8} ${y - 2} ${x1 - 4} ${y + 12} L${x1 - 2} ${y + winH + 14} H${x1 - 22} Z` }));
  // portas
  for (const dx of s.doors) {
    g.appendChild(svg('rect', { x: dx - 16, y, width: 16, height: BOTTOM - 14 - y, rx: 2 }));
  }
  // janelas laterais, da traseira até a porta
  const start = x0 + 10;
  const end = Math.min(...s.doors) - 22;
  const panes = Math.max(2, Math.round((end - start) / 38));
  const gap = 4;
  const paneW = (end - start - gap * (panes - 1)) / panes;
  for (let i = 0; i < panes; i++) {
    g.appendChild(svg('rect', { x: start + i * (paneW + gap), y, width: paneW, height: winH, rx: 3 }));
  }
  return g;
}

function logoBadge(logo: LogoRef, s: Silhouette, primary: string, secondary: string, clipId: string): SVGElement {
  const [first, ...rest] = s.axles;
  const last = rest.at(-1) ?? first!;
  const cx = (first! + last) / 2;
  const winBottom = s.winTop + s.winH;
  const cy = winBottom + (BOTTOM - 14 - winBottom) / 2;
  const r = Math.min(11, (BOTTOM - 14 - winBottom) / 2 - 2);
  const g = svg('g', { 'data-region': 'logo' });
  g.appendChild(svg('circle', { cx, cy, r: r + 1.5, fill: primary }));
  g.appendChild(svg('circle', { cx, cy, r, fill: secondary }));
  if (logo.kind === 'icon') {
    const scale = (r * 1.45) / 24;
    g.appendChild(svg('path', {
      d: LOGO_ICONS[logo.iconId].path, fill: primary, 'fill-rule': 'evenodd',
      transform: `translate(${cx - 12 * scale} ${cy - 12 * scale}) scale(${scale})`,
    }));
  } else {
    const id = `${clipId}-logo`;
    g.appendChild(svg('clipPath', { id }, svg('circle', { cx, cy, r: r - 0.5 })));
    const img = svg('image', { x: cx - r, y: cy - r, width: r * 2, height: r * 2, 'clip-path': `url(#${id})`, preserveAspectRatio: 'xMidYMid meet' });
    img.setAttribute('href', logo.dataUrl);
    g.appendChild(img);
  }
  return g;
}

/** Ônibus de lado, com a pintura da empresa. viewBox 320×120; o tamanho vem do CSS. */
export function busSvg(art: BusArt): SVGSVGElement {
  const s = SHAPES[art.shape];
  if (!s) throw new Error(`modelo de ônibus desconhecido: ${String(art.shape)}`);
  const clipId = `bus-clip-${++clipCounter}`;
  const d = bodyPath(s);
  const root = svg('svg', { viewBox: '0 0 320 120', class: 'bus-svg', role: 'img', 'aria-hidden': 'true' });

  root.appendChild(svg('clipPath', { id: clipId }, svg('path', { d })));
  root.appendChild(svg('ellipse', { cx: (s.x0 + s.x1) / 2, cy: GROUND + 1, rx: (s.x1 - s.x0) / 2 + 4, ry: 4, fill: '#000', opacity: 0.4 }));
  root.appendChild(svg('path', { 'data-region': 'body', d, fill: art.primary }));

  const painted = svg('g', { 'clip-path': `url(#${clipId})` });
  const stripe = stripeShape(art.livery, s, art.secondary);
  if (stripe) painted.appendChild(stripe);
  painted.appendChild(svg('rect', { 'data-region': 'skirt', x: s.x0, y: BOTTOM - 13, width: s.x1 - s.x0, height: 13, fill: darken(art.primary, 0.25) }));
  painted.appendChild(windows(s));
  // brilho no para-brisa
  painted.appendChild(svg('path', { d: `M${s.x1 - 18} ${s.winTop} L${s.x1 - 10} ${s.winTop} L${s.x1 - 16} ${s.winTop + s.winH + 10} L${s.x1 - 21} ${s.winTop + s.winH + 10} Z`, fill: GLASS_SHINE, opacity: 0.1 }));
  // caixas de roda
  for (const x of s.axles) painted.appendChild(svg('circle', { cx: x, cy: WHEEL_Y, r: WHEEL_R + 3.5, fill: BUS_TIRE }));
  painted.appendChild(svg('rect', { x: s.x1 - 9, y: BOTTOM - 24, width: 9, height: 6, rx: 2, fill: HEADLIGHT }));
  painted.appendChild(svg('rect', { x: s.x0, y: BOTTOM - 30, width: 4, height: 11, rx: 1, fill: TAILLIGHT }));
  root.appendChild(painted);

  if (art.logo) root.appendChild(logoBadge(art.logo, s, art.primary, art.secondary, clipId));

  const wheels = svg('g', { 'data-region': 'wheels' });
  for (const x of s.axles) {
    wheels.appendChild(svg('circle', { class: 'tire', cx: x, cy: WHEEL_Y, r: WHEEL_R, fill: BUS_TIRE }));
    wheels.appendChild(svg('circle', { cx: x, cy: WHEEL_Y, r: 6.5, fill: BUS_RIM }));
    wheels.appendChild(svg('circle', { cx: x, cy: WHEEL_Y, r: 2.2, fill: BUS_TIRE }));
  }
  root.appendChild(wheels);
  return root;
}

/** Miniatura 64×40 de um estilo de pintura. */
export function liveryThumb(style: LiveryStyle, primary: string, secondary: string): SVGSVGElement {
  const root = svg('svg', { viewBox: '0 0 64 40', class: 'livery-thumb', 'aria-hidden': 'true' });
  const clipId = `thumb-clip-${++clipCounter}`;
  root.appendChild(svg('clipPath', { id: clipId }, svg('rect', { x: 2, y: 4, width: 60, height: 32, rx: 6 })));
  const g = svg('g', { 'clip-path': `url(#${clipId})` });
  g.appendChild(svg('rect', { x: 0, y: 0, width: 64, height: 40, fill: primary }));
  const mini: Box = { x0: 2, x1: 62, top: 4 };
  const stripe = thumbStripe(style, mini, secondary);
  if (stripe) g.appendChild(stripe);
  root.appendChild(g);
  return root;
}

function thumbStripe(style: LiveryStyle, s: Box, fill: string): SVGElement | null {
  const top = s.top;
  const bottom = 36;
  const w = s.x1 - s.x0;
  const h = bottom - top;
  if (style === 'plain') return null;
  if (style === 'stripe') return svg('rect', { 'data-part': 'stripe', x: 0, y: top + h * 0.5, width: 64, height: 6, fill });
  if (style === 'diagonal') {
    const dx = h / Math.tan(Math.PI / 3);
    const d = [0.15, 0.4].map((f) => { const a = s.x0 + w * f; return `M${a} ${bottom} L${a + 6} ${bottom} L${a + 6 + dx} ${top} L${a + dx} ${top} Z`; }).join(' ');
    return svg('path', { 'data-part': 'stripe', d, fill });
  }
  return svg('path', { 'data-part': 'stripe', d: `M0 30 C22 30 34 16 64 12 L64 19 C34 23 22 37 0 37 Z`, fill });
}
