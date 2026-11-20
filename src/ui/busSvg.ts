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

/** 'dd' (double deck) só aparece na galeria: não está no catálogo nem na loja. */
export const BUS_SHAPES: readonly BusShape[] = ['van', 'micro', 'conv', 'rodo', 'dd'];

type Pt = [number, number];

/** Contorno e detalhes de um modelo, de lado, com a frente para a direita. */
interface Silhouette {
  /** traseira, dianteira, teto, base da carroceria e chão */
  x0: number; x1: number; top: number; bottom: number; ground: number;
  wheelR: number;
  /** folga entre o pneu e a borda da cava (padrão 3,5) */
  archGap?: number;
  axles: number[];
  rearR: number;
  /** trecho do contorno do fim do teto até a base dianteira */
  front: string;
  /** trecho do contorno da base traseira de volta ao início do teto (padrão: cantos arredondados com rearR) */
  rear?: string;
  /** topo das janelas e linha de cintura (base das janelas) */
  winTop: number; belt: number;
  /** dois andares: base da faixa de janelas de cima e topo da faixa de baixo */
  decks?: [number, number];
  /** vidros (para-brisa, janelas e portas), já com cantos arredondados */
  glass: string;
  /** moldura escura atrás das janelas (vidro colado, colunas finas) */
  frame?: string;
  /** vincos de portas e painéis */
  seams: string;
  logoX: number;
  /** centro e raio do selo do logo (padrão: entre a cintura e a saia) */
  logoY?: number; logoR?: number;
  headY: number;
  tail: [number, number];
  markers?: number[];
  /** altura das lanternas laterais (padrão: 5,5 acima da base) */
  markerY?: number;
  /** grade do motor traseiro: x, y, largura e altura */
  grille?: [number, number, number, number];
  /** altura da saia escura (padrão 11) */
  skirtH?: number;
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
function busDoor(x: number, w: number, winTop: number, bottom: number, glassBottom = bottom - 16): { glass: string; seam: string } {
  const leaf = w / 2 - 2;
  const y = winTop + 1;
  const h = glassBottom - y;
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

/**
 * Converte pixels de uma referência de proporção (vista lateral) em coordenadas do desenho:
 * a dianteira da referência vai para x1 e o chão (base do pneu) para GROUND, na mesma escala nos dois eixos.
 */
function refScale(ref: { front: number; rear: number; ground: number }, x0: number, x1: number) {
  const k = (x1 - x0) / Math.abs(ref.front - ref.rear);
  const dir = Math.sign(ref.front - ref.rear); // a referência pode ter a dianteira à esquerda
  return {
    x: (px: number) => f(x1 - (ref.front - px) * dir * k),
    y: (py: number) => f(GROUND - (ref.ground - py) * k),
    len: (d: number) => f(d * k),
  };
}

/**
 * Convencional urbano de motor dianteiro. Proporções da referência "Convencional urbano", vista do lado das portas
 * (218 px de comprimento, traseira em x 15, dianteira em x 233, teto y 12, base y 70, chão y 78): balanço dianteiro
 * curto com a porta dianteira à frente do eixo, porta traseira atrás do eixo traseiro, canto de baixo da traseira chanfrado.
 */
function conv(): Silhouette {
  const x0 = 26, x1 = 294;
  const r = refScale({ front: 233, rear: 15, ground: 78 }, x0, x1);
  const top = r.y(12), bottom = r.y(70);
  const winTop = r.y(18), belt = r.y(39);
  const doorTop = r.y(24);
  const paneH = belt - 1.5 - winTop;
  // janelas urbanas: vidro de cima e de baixo separados por um trilho escuro (a moldura aparece entre eles)
  const rail = r.y(28.5);
  const sash = (from: number, to: number, n: number, gap = 5) => `${paneRow(from, to, n, winTop, rail - 0.7 - winTop, gap)} ${paneRow(from, to, n, rail + 0.7, belt - 1.5 - rail - 0.7, gap)}`;
  const frontDoor = busDoor(r.x(204), r.len(20), doorTop, bottom, bottom - 9);
  const rearDoor = busDoor(r.x(48), r.len(24), doorTop, bottom, bottom - 9);
  return {
    x0, x1, top, bottom, ground: GROUND, wheelR: r.len(11), archGap: r.len(1), axles: [r.x(87), r.x(189)], rearR: 3,
    front: `H${x1 - 6} Q${x1} ${top} ${x1} ${f(top + 6)} V${f(bottom - 3)} Q${x1} ${bottom} ${x1 - 3} ${bottom}`,
    rear: `H${r.x(42)} C${r.x(30)} ${bottom} ${x0} ${r.y(67)} ${x0} ${r.y(64)} V${f(top + 3)} Q${x0} ${top} ${x0 + 3} ${top} Z`,
    winTop, belt,
    frame: `${paneRow(r.x(21), r.x(47.5), 1, winTop, paneH)} ${paneRow(r.x(72) + 2, r.x(193), 4, winTop, paneH, r.len(3))}`,
    glass: [
      rr(r.x(225.7), r.y(23.5), r.x(233) - r.x(225.7) + 3, r.y(45.5) - r.y(23.5), 1.5), // para-brisa visto de lado (passa da frente; o recorte da carroceria corta)
      rr(r.x(196.5), r.y(24.5), r.len(7), r.y(43) - r.y(24.5), 2), // janela estreita junto à porta dianteira
      frontDoor.glass, rearDoor.glass,
      sash(r.x(72) + 2, r.x(193), 4, r.len(3)),
      sash(r.x(21), r.x(47.5), 1), // última janela, atrás da porta traseira
    ].join(' '),
    seams: [
      frontDoor.seam, rearDoor.seam,
      `M${x0 + 2} ${r.y(16)} H${x1 - 4}`, // calha do teto
      `M${x0} ${r.y(52)} H${x1}`, // friso baixo
    ].join(' '),
    // logo no meio do entre-eixos; farol na altura dos faróis da vista frontal; lanterna vermelha sobre branca na traseira
    logoX: r.x((87 + 189) / 2), headY: r.y(55), tail: [r.y(52.5), r.y(60)], skirtH: 7,
  };
}

/**
 * Rodoviário de um andar, 4×2. Proporções da referência "Rodoviário de um andar"
 * (1155 px de comprimento, teto y 80, base y 363, chão y 394,5): para-brisa inclinado que desce do teto,
 * porta à frente do eixo dianteiro, janelas iguais, bagageiros entre os eixos e grade do motor na traseira.
 */
function rodo(): Silhouette {
  const x0 = 8, x1 = 312;
  const r = refScale({ front: 1238, rear: 83, ground: 394.5 }, x0, x1);
  const top = r.y(80), bottom = r.y(363);
  const winTop = r.y(105), belt = r.y(194);
  const paneH = belt - winTop - 3;
  const pane = ([a, b]: Pt) => rr(r.x(a), winTop + 1.5, r.x(b) - r.x(a), paneH, 2.5);
  const panes: Pt[] = [[125, 204], [210, 289], [300, 424], [435, 559], [570, 694], [705, 829], [840, 964], [975, 1065], [1076, 1116]];
  const poly = (pts: Pt[], rad: number) => roundedPoly(pts.map(([px, py]): Pt => [r.x(px), r.y(py)]), rad);
  const bay = (px: number) => `M${r.x(px)} ${r.y(261)} V${r.y(357)}`;
  return {
    x0, x1, top, bottom, ground: GROUND, wheelR: r.len(45.5), archGap: r.len(8), axles: [r.x(360.5), r.x(1025.5)], rearR: 7,
    front: `H${r.x(760)} C${r.x(900)} ${top} ${r.x(1030)} ${r.y(91)} ${r.x(1093)} ${r.y(100)} C${r.x(1135)} ${r.y(106)} ${r.x(1170)} ${r.y(120)} ${r.x(1186)} ${r.y(150)} `
      + `C${r.x(1204)} ${r.y(186)} ${r.x(1234)} ${r.y(253)} ${x1} ${r.y(305)} V${r.y(340)} Q${x1} ${bottom} ${r.x(1222)} ${bottom}`,
    rear: `H${r.x(140)} C${r.x(110)} ${bottom} ${r.x(87)} ${r.y(357)} ${x0} ${r.y(345)} V${r.y(150)} C${x0} ${r.y(118)} ${r.x(92)} ${r.y(84)} ${r.x(110)} ${top} Z`,
    winTop, belt,
    frame: [
      rr(r.x(116), winTop, r.x(1072) - r.x(116), belt - winTop, 3),
      poly([[1060, 105], [1120, 104], [1152, 112], [1174, 128], [1188, 152], [1211, 202], [1226, 250], [1235, 296], [1200, 302], [1118, 302], [1118, 194], [1060, 194]], 3),
    ].join(' '),
    glass: [
      ...panes.map(pane),
      rr(r.x(84), r.y(112), r.len(8), r.y(180) - r.y(112), 2), // vidro do canto traseiro
      rr(r.x(1122), r.y(172), r.x(1182) - r.x(1122), r.y(297) - r.y(172), 3), // vidro da porta
      // para-brisa: os pontos em x 1260 passam da frente (1238) de propósito; o recorte da carroceria corta o excesso
      poly([[1128, 102], [1260, 102], [1260, 292], [1225, 292], [1213, 240], [1193, 180], [1160, 126]], 2),
    ].join(' '),
    seams: [
      `M${r.x(86)} ${r.y(261)} H${r.x(1124)}`, // linha dos bagageiros
      ...[208, 290, 441, 497, 656, 765, 791, 953].map(bay),
      `M${r.x(1124)} ${r.y(300)} V${f(bottom - 1)} M${r.x(1198)} ${r.y(302)} L${r.x(1190)} ${f(bottom - 1)}`, // porta
    ].join(' '),
    logoX: r.x(645), headY: r.y(306), tail: [r.y(246), r.y(306)],
    markers: [420, 620, 799, 932].map((px) => r.x(px)), markerY: r.y(311),
    grille: [r.x(112), r.y(268), r.x(205) - r.x(112), r.y(349) - r.y(268)], skirtH: 6,
  };
}

/**
 * Rodoviário de dois andares (double deck), 8×2: dois eixos dianteiros e o truque traseiro. Proporções da referência
 * "ONIBUS DD", linha de cima, lado das portas com a dianteira à direita (511 px de comprimento, traseira em x 29,
 * dianteira em x 540, teto y 18, base y 149, chão y 161,5). Detalhes de apoio (porta, grade do motor) da "ONIBUS DD 2".
 * Na escala do rodoviário não caberia nos 320 de largura: ocupa quase toda a largura (6 a 314) e fica o mais alto de todos.
 */
function dd(): Silhouette {
  const x0 = 6, x1 = 314;
  const r = refScale({ front: 540, rear: 29, ground: 161.5 }, x0, x1);
  const top = r.y(18), bottom = r.y(149);
  const rearR = r.len(19);
  const poly = (pts: Pt[], rad: number) => roundedPoly(pts.map(([px, py]): Pt => [r.x(px), r.y(py)]), rad);
  const vline = (px: number, y0: number, y1: number) => `M${r.x(px)} ${r.y(y0)} V${r.y(y1)}`;
  return {
    x0, x1, top, bottom, ground: GROUND, wheelR: r.len(18.5), archGap: r.len(2.5), rearR,
    axles: [128.25, 173, 401.5, 446.5].map((px) => r.x(px)),
    // frente: o teto desce numa curva e a frente inclina até o para-choque (x 540 a partir de y 112)
    front: `H${r.x(468)} C${r.x(482)} ${top} ${r.x(497)} ${r.y(19.5)} ${r.x(507)} ${r.y(24.5)} C${r.x(512)} ${r.y(28)} ${r.x(521)} ${r.y(41)} ${r.x(526)} ${r.y(55.5)} `
      + `C${r.x(531)} ${r.y(70)} ${r.x(537)} ${r.y(90)} ${x1} ${r.y(112)} V${r.y(146)} Q${x1} ${bottom} ${r.x(537)} ${bottom}`,
    // traseira quase vertical (x 29), canto de cima arredondado e canto de baixo puxado até x 69
    rear: `H${r.x(69)} C${r.x(45)} ${bottom} ${x0} ${r.y(147)} ${x0} ${r.y(141)} V${r.y(48)} C${x0} ${r.y(30)} ${r.x(33)} ${top} ${f(x0 + rearR)} ${top} Z`,
    winTop: r.y(23.5), belt: r.y(114), decks: [r.y(57.5), r.y(81)],
    glass: [
      // andar de cima: faixa contínua que, na frente, desce até y 121 entre a faixa branca inclinada e a coluna
      poly([[42.5, 23.5], [474, 23.5], [480, 24], [485, 25], [498, 28], [504, 35], [510, 45], [514, 55], [516, 60], [519, 70], [522, 80], [524, 90], [525, 100],
        [526, 110], [527, 115], [526, 121.5], [514, 121.5], [502, 118.5], [497, 116.5], [490, 110], [486, 105], [482, 100], [479, 95], [475, 90], [471, 85],
        [465, 80], [458, 75], [451, 70], [444, 65], [437, 60], [433, 57.5], [42.5, 57.5]], 2),
      // para-brisa visto de lado, à frente da coluna; os pontos em x 560 passam da frente e o recorte da carroceria corta
      poly([[487, 20.5], [497, 24], [503, 28], [508, 35], [514, 45], [518, 55], [521, 60], [523, 70], [525, 80], [527, 90], [529, 100], [530, 110], [532, 115],
        [536, 117.5], [560, 117.5], [560, 10], [487, 10]], 1.5),
      // andar de baixo: da traseira do truque até a ponta inclinada junto à faixa branca
      poly([[186, 81], [432, 81], [438, 85], [444, 90], [450, 95], [454, 100], [457, 105], [461, 110], [463, 114], [186, 114]], 2),
    ].join(' '),
    seams: [
      `M${r.x(31)} ${r.y(79.5)} H${r.x(186)}`, // painel traseiro, abaixo da faixa entre os andares
      vline(107, 80, 146),
      rr(r.x(50.5), r.y(87), r.len(16.5), r.len(11), 1.5), // respiro
      ...[226, 282, 339, 368].map((px) => vline(px, 116.5, 145)), // bagageiros
      vline(493, 118, 146), vline(526, 122, 146), // porta, à frente dos eixos dianteiros
    ].join(' '),
    // selo no painel traseiro (sem janelas no andar de baixo), entre o respiro e a faixa de baixo
    logoX: r.x(146.5), logoY: r.y(101.5), logoR: 9.5,
    headY: r.y(136.5), tail: [r.y(96), r.y(126)],
    markers: [255, 315, 367].map((px) => r.x(px)), markerY: r.y(136.5),
    grille: [r.x(45), r.y(107.5), r.x(77) - r.x(45), r.y(133.5) - r.y(107.5)], skirtH: 6,
  };
}

export const BUS_SILHOUETTES: Readonly<Record<BusShape, Silhouette>> = { van: van(), micro: micro(), conv: conv(), rodo: rodo(), dd: dd() };

const archR = (s: Silhouette) => s.wheelR + (s.archGap ?? 3.5);
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
  const rear = s.rear ?? `H${x0 + 5} Q${x0} ${bottom} ${x0} ${f(bottom - 5)} V${f(top + r)} Q${x0} ${f(top)} ${x0 + r} ${f(top)} Z`;
  return `M${x0 + r} ${f(top)} ${s.front} ${arches} ${rear}`;
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
  if (s.decks) g.appendChild(svg('rect', { x: s.x0, y: f(s.decks[0] + 1.5), width: len, height: 1.6, fill: SHADE, opacity: 0.2 }));
  // vincos de portas e bagageiros
  g.appendChild(svg('path', { d: s.seams, fill: 'none', stroke: SHADE, 'stroke-opacity': 0.28, 'stroke-width': 1 }));
  // grade do motor (traseira): frisos verticais
  if (s.grille) {
    const [gx, gy, gw, gh] = s.grille;
    const n = Math.floor(gw / 2.6);
    const d = Array.from({ length: n }, (_, i) => `M${f(gx + 1.3 + i * 2.6)} ${f(gy)} v${f(gh)}`).join(' ');
    g.appendChild(svg('path', { d, stroke: SHADE, 'stroke-opacity': 0.4, 'stroke-width': 1.3, 'stroke-linecap': 'round' }));
  }
  // borda das cavas de roda
  const lips = axleGroups(s).map((grp) => `M${f(grp.at(-1)! + archHalf(s))} ${s.bottom} ${archArcs(s, grp).replace(/^H[^A]*/, '')}`).join(' ');
  g.appendChild(svg('path', { d: lips, fill: 'none', stroke: darken(art.primary, 0.4), 'stroke-width': 2.5 }));
  return g;
}

function skirt(art: BusArt, s: Silhouette, bodyClip: string): SVGElement {
  const { x0, x1, bottom } = s;
  const h = s.skirtH ?? 11;
  const g = svg('g', { 'data-region': 'skirt', fill: darken(art.primary, 0.25), 'clip-path': `url(#${bodyClip})` });
  g.appendChild(svg('rect', { x: x0 - 2, y: f(bottom - h), width: x1 - x0 + 4, height: h + 1 }));
  g.appendChild(svg('path', { d: `${rr(x1 - 14, bottom - h + 2, 16, h - 1, 2)} ${rr(x0 - 2, bottom - h + 2, 14, h - 1, 2)}`, fill: BUMPER }));
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
  if (s.decks) sh.appendChild(svg('rect', { x: s.x0, y: f(s.decks[1] - 1), width: s.x1 - s.x0 + 4, height: 3, fill: GLASS_SHINE, opacity: 0.06 }));
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
  for (const x of s.markers ?? []) g.appendChild(svg('circle', { cx: x, cy: f(s.markerY ?? s.bottom - 5.5), r: 1.4, fill: SIGNAL }));
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
  const cy = s.logoY ?? f(s.belt + space / 2 + 1);
  const r = s.logoR ?? Math.min(11, space / 2 - 2);
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
