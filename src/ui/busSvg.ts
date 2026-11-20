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
const GLASS_TOP = '#2e3948';
const GLASS_BOTTOM = '#0f1318';
const SEAL = '#050608';
const SHADE = '#000000';
const TREAD = '#1e1c24';
const WELL_LINER = '#1a1820';
const MIRROR = '#141318';
const MIRROR_EDGE = '#55535e';
const HANDRAIL = '#b7bac2';
const STEP = '#1b1a20';
const STEP_EDGE = '#a3a6ae';
const FLEET_DARK = '#16151b';
const FLEET_LIGHT = '#ffffff';
const RUB_RAIL = '#e4e6ea';
const ARCH_TRIM = '#2c2b31';
const REFLECTOR_LIGHT = '#d9dbe0';

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
  /** lanternas laterais retangulares desta largura (sem ela, redondas) */
  markerW?: number;
  /** grade do motor traseiro: x, y, largura e altura */
  grille?: [number, number, number, number];
  /** altura da saia escura (padrão 11) */
  skirtH?: number;
  /** portas de passageiros (x, largura e topo do vinco; vão até a base): degrau e corrimão */
  doors?: Door[];
  /** retrovisor: ponto de fixação na carroceria, topo do espelho (centro) e altura do espelho */
  /** (arm: espessura do braço, padrão 1,1; w: largura do espelho, padrão 2,4) */
  mirror: { at: Pt; head: Pt; h: number; arm?: number; w?: number };
  /** equipamentos no teto (ar-condicionado, escotilhas): início, comprimento e altura; entram no contorno */
  roof: [number, number, number][];
  /** luzes de posição no canto do teto: x da traseira e da dianteira */
  clearance: [number, number];
  /** número de frota fictício e onde fica (padrão: canto traseiro, logo abaixo da cintura) */
  fleet: string;
  fleetAt?: Pt;
  /** perfis escuros sobre os vidros (encontro das folhas de correr, basculantes); só no completo */
  mullions?: string;
  /** altura do friso de alumínio (para-choque lateral) que corre por toda a lateral */
  rubRail?: number;
  /** canto de cima da portinhola de serviço (padrão: à frente da cava traseira, acima da saia) */
  hatch?: Pt;
  /** largura do contorno de plástico escuro em volta das cavas (para-lama); sem ele, borda na cor da carroceria */
  archTrim?: number;
  /** puxadores das portinholas (bagageiros, porta): canto de cima de cada um */
  handles?: Pt[];
  /** catadióptricos laterais (vermelho e branco): x de cada um e a altura */
  reflectors?: number[];
  reflectorY?: number;
  /** friso cromado decorativo (traço) */
  trim?: string;
  /** cada eixo com a sua cava, mesmo nos eixos em tandem (lataria entre as rodas) */
  splitArches?: boolean;
  /** respiros com aletas horizontais (x, y, largura, altura) */
  vents?: [number, number, number, number][];
}

interface Door { x: number; w: number; top: number }

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
    mirror: { at: [223, 58], head: [228.5, 51.5], h: 5.5 }, roof: [[112, 24, 1.4]], clearance: [x0 + 6, 186], fleet: '1204',
  };
}

/**
 * Micro-ônibus de motor dianteiro. Proporções da referência "micro 048" (foto de lado, frente à direita; 468,5 px de
 * comprimento, traseira em x 21,5, dianteira em x 490, teto y 135, base y 272, chão y 286,5), conferidas com a "micro
 * Volare" (foto levemente oblíqua: eixos na mesma fração do comprimento). Balanço dianteiro curto com a porta logo atrás
 * do eixo dianteiro, para-brisa inclinado que desce do teto e se junta ao vidro grande do motorista, faixa de janelas
 * escura de vidro colado (o vidro traseiro sobe na quina), traseira com o canto de baixo recolhido, ar-condicionado no teto.
 */
function micro(): Silhouette {
  const x0 = 46, x1 = 276;
  const r = refScale({ front: 490, rear: 21.5, ground: 286.5 }, x0, x1);
  const top = r.y(135), bottom = r.y(272);
  const winTop = r.y(146), belt = r.y(204);
  const rearR = r.len(24.5);
  const poly = (pts: Pt[], rad: number) => roundedPoly(pts.map(([px, py]): Pt => [r.x(px), r.y(py)]), rad);
  const pane = (a: number, b: number) => rr(r.x(a), r.y(148.5), r.x(b) - r.x(a), r.y(203) - r.y(148.5), 1.2);
  const vline = (px: number, y0: number, y1: number) => `M${r.x(px)} ${r.y(y0)} V${r.y(y1)}`;
  return {
    x0, x1, top, bottom, ground: GROUND, wheelR: r.len(20), archGap: r.len(3), axles: [r.x(175), r.x(425)], rearR,
    // frente: o teto arredonda na quina, o para-brisa desce inclinado até o farol e a frente fica vertical até o para-choque
    front: `H${r.x(405)} C${r.x(432)} ${top} ${r.x(450)} ${r.y(140)} ${r.x(458)} ${r.y(156)} L${r.x(488)} ${r.y(227)} `
      + `Q${x1} ${r.y(232)} ${x1} ${r.y(240)} V${r.y(266)} Q${x1} ${bottom} ${r.x(484)} ${bottom}`,
    // traseira: quase vertical, canto de cima largo e o de baixo recolhido (ângulo de saída)
    rear: `H${r.x(37)} Q${r.x(28)} ${bottom} ${r.x(26)} ${r.y(262)} L${x0} ${r.y(242)} V${r.y(160)} C${x0} ${r.y(141)} ${r.x(30)} ${top} ${f(x0 + rearR)} ${top} Z`,
    winTop, belt,
    // faixa escura das janelas (vidro colado): o canto de baixo sobe na traseira
    frame: poly([[30, 147], [347, 147], [347, 205], [111, 205], [34, 190], [30, 186]], 1.5),
    glass: [
      poly([[31.5, 148.5], [109.5, 148.5], [109.5, 203], [34, 188.5], [31.5, 185]], 1.2), // vidro traseiro, que sobe na quina
      pane(112.5, 188), pane(190.5, 266.5), pane(269.5, 345.5),
      poly([[350.5, 148], [355, 148], [389, 204], [350.5, 204]], 1.2), // vidro da porta (a coluna inclinada fica na frente)
      // vidro do motorista e para-brisa: a borda de cima acompanha o teto e a da frente fica atrás da coluna da quina
      poly([[361, 144], [436, 144], [446, 147.5], [452, 156], [480, 225], [478, 229], [396, 211], [393.5, 207]], 1.5),
    ].join(' '),
    // janelinha de correr no vidro traseiro
    mullions: rr(r.x(57), r.y(152), r.len(11), r.len(21), 0.8),
    seams: [
      `M${r.x(30)} ${r.y(243)} H${r.x(347)}`, // linha dos painéis baixos
      ...[111, 145, 220, 262, 292].map((px) => vline(px, 243, 270)), // portinholas
      rr(r.x(349), r.y(145), r.len(46), r.y(270.5) - r.y(145), 1.5), // porta
      vline(458, 246, 270), // painel do para-choque dianteiro
    ].join(' '),
    handles: [[r.x(358), r.y(231)]],
    logoX: r.x(262), headY: r.y(231), tail: [r.y(205), r.y(230)], skirtH: 2.5,
    markers: [37, 136, 205, 265, 318, 368].map((px) => r.x(px)), markerY: r.y(244.5), markerW: r.len(7),
    doors: [{ x: r.x(349), w: r.len(46), top: r.y(145) }],
    mirror: { at: [r.x(450), r.y(148)], head: [r.x(477), r.y(160)], h: r.len(24) },
    roof: [[r.x(140), r.len(97), r.len(5)]], clearance: [r.x(45), r.x(420)], fleet: '2310',
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
 * curto com a porta dianteira à frente do eixo, porta traseira atrás do eixo traseiro, canto de baixo da traseira em rampa,
 * frente inclinada (para-brisa), janelas com vidro de correr em cima, portas de moldura escura com travessa,
 * friso de alumínio e lanternas laterais ao longo da lateral.
 */
function conv(): Silhouette {
  const x0 = 26, x1 = 294;
  const r = refScale({ front: 233, rear: 15, ground: 78 }, x0, x1);
  const top = r.y(12), bottom = r.y(70);
  const winTop = r.y(18), belt = r.y(39);
  const doorTop = r.y(24);
  const paneH = belt - 1.5 - winTop;
  // janelas urbanas: vidro de cima (de correr) e de baixo separados por um trilho escuro (a moldura aparece entre eles)
  const rail = r.y(28.5);
  const sash = (from: number, to: number, n: number, gap = 5) => `${paneRow(from, to, n, winTop, rail - 0.7 - winTop, gap)} ${paneRow(from, to, n, rail + 0.7, belt - 1.5 - rail - 0.7, gap)}`;
  /** centro de cada janela de uma fileira (onde as duas folhas de correr se encontram) */
  const mids = (from: number, to: number, n: number, gap = 5) => {
    const w = (to - from - gap * (n - 1)) / n;
    return Array.from({ length: n }, (_, i) => f(from + i * (w + gap) + w / 2));
  };
  // portas urbanas: moldura escura cheia, coluna central, cada folha com vidro de cima e de baixo (travessa na cintura)
  const doorRail = r.y(41), doorGlassBottom = r.y(65);
  const door = (px: number, pw: number) => {
    const x = r.x(px), w = r.len(pw), b = 1.2, post = 0.8, leaf = w / 2 - b - post;
    const pane = (lx: number) => `${rr(lx, doorTop + b, leaf, doorRail - 0.7 - doorTop - b, 1.5)} ${rr(lx, doorRail + 0.7, leaf, doorGlassBottom - doorRail - 0.7, 1.5)}`;
    return {
      frame: rr(x, doorTop, w, bottom - 3.6 - doorTop, 2),
      glass: `${pane(x + b)} ${pane(x + w / 2 + post)}`,
      door: { x, w, top: doorTop },
    };
  };
  const frontDoor = door(204, 20), rearDoor = door(50.5, 19.5);
  const mid4 = mids(r.x(72) + 2, r.x(193), 4, r.len(3)), mid1 = mids(r.x(21), r.x(47.5), 1);
  return {
    x0, x1, top, bottom, ground: GROUND, wheelR: r.len(11), archGap: r.len(1), axles: [r.x(87), r.x(189)], rearR: 3,
    // frente inclinada: o teto arredonda na quina e o para-brisa desce para a frente até a altura do para-choque
    front: `H${r.x(223)} Q${r.x(228.5)} ${top} ${r.x(229.6)} ${r.y(19.5)} L${x1} ${r.y(48)} V${f(bottom - 3)} Q${x1} ${bottom} ${x1 - 3} ${bottom}`,
    // canto de baixo da traseira: rampa reta (ângulo de saída) da traseira até a porta traseira
    rear: `H${r.x(50)} L${f(x0 + 2)} ${r.y(65.2)} Q${x0} ${r.y(65)} ${x0} ${r.y(63.8)} V${f(top + 3)} Q${x0} ${top} ${x0 + 3} ${top} Z`,
    winTop, belt,
    frame: [
      paneRow(r.x(21), r.x(47.5), 1, winTop, paneH), paneRow(r.x(72) + 2, r.x(193), 4, winTop, paneH, r.len(3)),
      frontDoor.frame, rearDoor.frame,
    ].join(' '),
    glass: [
      roundedPoly([[r.x(225.3), r.y(21.5)], [r.x(228.8), r.y(21.5)], [r.x(232.2), r.y(48.3)], [r.x(225.3), r.y(48.3)]], 1.5), // para-brisa visto de lado, acompanhando a frente inclinada
      rr(r.x(196.5), r.y(24.5), r.len(7), r.y(43) - r.y(24.5), 2), // janela estreita junto à porta dianteira
      frontDoor.glass, rearDoor.glass,
      sash(r.x(72) + 2, r.x(193), 4, r.len(3)),
      sash(r.x(21), r.x(47.5), 1), // última janela, atrás da porta traseira
    ].join(' '),
    mullions: [...mid4, ...mid1].map((x) => `M${x} ${f(winTop)} V${f(rail)}`).join(' '),
    rubRail: r.y(52.5),
    markers: [22, 104, 124, 150, 169].map((px) => r.x(px)), markerY: r.y(61),
    seams: [
      `M${x0 + 2} ${r.y(16)} H${r.x(228)}`, // calha do teto
      `M${r.x(16.8)} ${r.y(15)} V${r.y(64.5)}`, // junta do painel do canto traseiro
    ].join(' '),
    // logo no meio do entre-eixos; farol na altura dos faróis da vista frontal; lanterna vermelha sobre branca na traseira
    logoX: r.x((87 + 189) / 2), headY: r.y(55), tail: [r.y(52.5), r.y(60)], skirtH: 7,
    doors: [frontDoor.door, rearDoor.door], mirror: { at: [r.x(228.5), r.y(15)], head: [x1 + 3, r.y(21)], h: r.len(10) }, hatch: [r.x(137), r.y(55.5)],
    roof: [[r.x(50), 7, 1.1], [r.x(86), 7, 1.1], [r.x(129), 7, 1.1], [r.x(172), 16, 1.4]], clearance: [x0 + 4, r.x(221)], fleet: '1024',
  };
}

/**
 * Rodoviário de um andar, 4×2. Proporções da referência "Rodoviário de um andar"
 * (1155 px de comprimento, teto y 80, base y 363, chão y 394,5): para-brisa inclinado que desce do teto,
 * porta à frente do eixo dianteiro, janelas iguais, bagageiros entre os eixos e grade do motor na traseira.
 * Realismo: portinholas dos bagageiros com puxadores (e a porta mais alta do elevador), para-lamas de plástico escuro,
 * lanternas âmbar e catadióptricos na lateral, sanitário com janelinha na traseira, faixa das janelas que curva na
 * traseira e mergulha na frente envidraçada (com friso cromado), basculantes e retrovisor de braço longo.
 */
function rodo(): Silhouette {
  const x0 = 8, x1 = 312;
  const r = refScale({ front: 1238, rear: 83, ground: 394.5 }, x0, x1);
  const top = r.y(80), bottom = r.y(363);
  const winTop = r.y(105), belt = r.y(194);
  const paneH = belt - winTop - 3;
  const pane = ([a, b]: Pt) => rr(r.x(a), winTop + 1.5, r.x(b) - r.x(a), paneH, 2.5);
  // a primeira seção (sanitário) é fechada, com uma janelinha alta; as outras são as janelas dos passageiros
  const panes: Pt[] = [[210, 289], [300, 424], [435, 559], [570, 694], [705, 829], [840, 964], [975, 1065], [1076, 1116]];
  const poly = (pts: Pt[], rad: number) => roundedPoly(pts.map(([px, py]): Pt => [r.x(px), r.y(py)]), rad);
  const bay = (px: number) => `M${r.x(px)} ${r.y(261)} V${r.y(357)}`;
  return {
    x0, x1, top, bottom, ground: GROUND, wheelR: r.len(45.5), archGap: r.len(8), axles: [r.x(360.5), r.x(1025.5)], rearR: 7,
    front: `H${r.x(760)} C${r.x(900)} ${top} ${r.x(1030)} ${r.y(91)} ${r.x(1093)} ${r.y(100)} C${r.x(1135)} ${r.y(106)} ${r.x(1170)} ${r.y(120)} ${r.x(1186)} ${r.y(150)} `
      + `C${r.x(1204)} ${r.y(186)} ${r.x(1234)} ${r.y(253)} ${x1} ${r.y(305)} V${r.y(340)} Q${x1} ${bottom} ${r.x(1222)} ${bottom}`,
    rear: `H${r.x(140)} C${r.x(110)} ${bottom} ${r.x(87)} ${r.y(357)} ${x0} ${r.y(345)} V${r.y(150)} C${x0} ${r.y(118)} ${r.x(92)} ${r.y(84)} ${r.x(110)} ${top} Z`,
    winTop, belt,
    frame: [
      // faixa preta das janelas: o canto de baixo da traseira desce numa curva larga
      `M${r.x(119)} ${winTop} H${r.x(1072)} V${belt} H${r.x(170)} C${r.x(138)} ${belt} ${r.x(116)} ${r.y(172)} ${r.x(116)} ${r.y(140)} V${r.y(108)} Q${r.x(116)} ${winTop} ${r.x(119)} ${winTop} Z`,
      // frente envidraçada: a linha das janelas mergulha da cintura até a porta
      poly([[985, 105], [1120, 104], [1152, 112], [1174, 128], [1188, 152], [1211, 202], [1226, 250], [1235, 296], [1200, 300], [1118, 268], [1040, 212], [985, 196]], 3),
    ].join(' '),
    glass: [
      ...panes.map(pane),
      rr(r.x(145), r.y(120), r.len(38), r.len(18), 1.5), // janelinha do sanitário
      rr(r.x(84), r.y(112), r.len(8), r.y(180) - r.y(112), 2), // vidro do canto traseiro
      rr(r.x(1122), r.y(172), r.x(1182) - r.x(1122), r.y(297) - r.y(172), 3), // vidro da porta
      // para-brisa: os pontos em x 1260 passam da frente (1238) de propósito; o recorte da carroceria corta o excesso
      poly([[1128, 102], [1260, 102], [1260, 292], [1225, 292], [1213, 240], [1193, 180], [1160, 126]], 2),
    ].join(' '),
    seams: [
      `M${r.x(86)} ${r.y(261)} H${r.x(1124)}`, // linha dos bagageiros
      ...[208, 250, 291, 442, 497, 641, 791, 954].map(bay), // portinholas dos bagageiros
      `M${r.x(655)} ${r.y(357)} V${r.y(216)} H${r.x(764)} V${r.y(357)}`, // porta do elevador de acessibilidade, mais alta
      `M${r.x(1124)} ${r.y(300)} V${f(bottom - 1)} M${r.x(1198)} ${r.y(302)} L${r.x(1190)} ${f(bottom - 1)}`, // porta
    ].join(' '),
    logoX: r.x(645), headY: r.y(306), tail: [r.y(246), r.y(306)],
    markers: [320, 569, 714, 871, 985].map((px) => r.x(px)), markerY: r.y(289), markerW: r.len(10),
    reflectors: [275, 425, 627, 805, 940, 1102].map((px) => r.x(px)), reflectorY: r.y(308),
    handles: [122, 222, 266, 457, 569, 714, 872, 1135].map((px): Pt => [r.x(px), r.y(311)]),
    archTrim: r.len(12), hatch: [r.x(900), r.y(318)],
    // janelinhas basculantes (saída de emergência) no alto de duas janelas
    mullions: [337, 742].map((px) => rr(r.x(px), r.y(112), r.len(50), r.len(22), 1)).join(' '),
    // friso cromado que acompanha o mergulho da frente envidraçada
    trim: `M${r.x(960)} ${r.y(202)} C${r.x(1000)} ${r.y(210)} ${r.x(1030)} ${r.y(215)} ${r.x(1060)} ${r.y(234)} S${r.x(1150)} ${r.y(292)} ${r.x(1196)} ${r.y(306)}`,
    grille: [r.x(112), r.y(268), r.x(205) - r.x(112), r.y(349) - r.y(268)], skirtH: 3.5,
    doors: [{ x: r.x(1124), w: r.len(74), top: r.y(160) }], mirror: { at: [r.x(1180), r.y(157)], head: [r.x(1248), r.y(168)], h: r.len(45), arm: r.len(6), w: r.len(13) },
    roof: [[r.x(330), r.len(70), 0.9], [r.x(700), r.len(70), 0.9]], clearance: [r.x(140), r.x(960)], fleet: '4108',
  };
}

/**
 * Rodoviário de dois andares (double deck), 8×2: dois eixos dianteiros e o truque traseiro. Proporções da referência
 * "ONIBUS DD", linha de cima, lado das portas com a dianteira à direita (511 px de comprimento, traseira em x 29,
 * dianteira em x 540, teto y 18, base y 149, chão y 161,5). Detalhes de apoio (porta, grade do motor) da "ONIBUS DD 2".
 * Na escala do rodoviário não caberia nos 320 de largura: ocupa quase toda a largura (6 a 314) e fica o mais alto de todos.
 * Realismo: uma cava por eixo (lataria entre as rodas do tandem), lateral na cor da carroceria até a base, respiro com
 * aletas e tampa do motor na traseira, lanternas retangulares e catadióptricos, retrovisor pendendo à frente do para-brisa.
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
      vline(103, 80, 146), vline(72, 80, 146), `M${r.x(31)} ${r.y(102.5)} H${r.x(72)}`, // painéis traseiros (tampa do motor)
      ...[226, 282, 339, 368].map((px) => vline(px, 116.5, 145)), // bagageiros
      vline(493, 118, 146), vline(526, 122, 146), // porta, à frente dos eixos dianteiros
    ].join(' '),
    // selo no painel traseiro (sem janelas no andar de baixo), entre o respiro e a faixa de baixo
    logoX: r.x(146.5), logoY: r.y(101.5), logoR: 9.5,
    headY: r.y(136.5), tail: [r.y(96), r.y(126)],
    markers: [255, 315, 367].map((px) => r.x(px)), markerY: r.y(136.5), markerW: r.len(6),
    reflectors: [44, 92, 474].map((px) => r.x(px)), reflectorY: r.y(136),
    vents: [[r.x(50.5), r.y(86.5), r.len(17), r.len(11)]], // respiro com aletas
    grille: [r.x(44), r.y(107.5), r.x(70) - r.x(44), r.y(133.5) - r.y(107.5)], skirtH: 3, splitArches: true,
    hatch: [r.x(198.5), r.y(127)], // portinhola logo atrás do truque (com as cavas separadas, o padrão cairia entre as rodas)
    doors: [{ x: r.x(493), w: r.len(33), top: r.y(118) }], mirror: { at: [r.x(524), r.y(60)], head: [r.x(544), r.y(86)], h: r.len(25) },
    roof: [[r.x(120), 14, 1], [r.x(300), 14, 1]], clearance: [f(x0 + rearR + 2), r.x(455)], fleet: '7015', fleetAt: [x0 + 5, r.y(72)],
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
    if (last && !s.splitArches && a - last.at(-1)! < archHalf(s) * 2 + 6) last.push(a);
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

/** Equipamentos do teto (ar-condicionado, escotilhas) como trechos do contorno, da traseira para a frente. */
function roofPath(s: Silhouette): string {
  return [...s.roof].sort((a, b) => a[0] - b[0]).map(([x, w, h]) => {
    const t = f(s.top - h), e = Math.min(3, w / 4);
    return `H${f(x)} C${f(x + e * 0.6)} ${f(s.top)} ${f(x + e * 0.4)} ${t} ${f(x + e)} ${t} H${f(x + w - e)} C${f(x + w - e * 0.4)} ${t} ${f(x + w - e * 0.6)} ${f(s.top)} ${f(x + w)} ${f(s.top)}`;
  }).join(' ');
}

/** Contorno da carroceria com as cavas de roda recortadas. */
function bodyPath(s: Silhouette): string {
  const { x0, top, bottom, rearR: r } = s;
  const arches = axleGroups(s).reverse().map((g) => archArcs(s, g)).join(' ');
  const rear = s.rear ?? `H${x0 + 5} Q${x0} ${bottom} ${x0} ${f(bottom - 5)} V${f(top + r)} Q${x0} ${f(top)} ${x0 + r} ${f(top)} Z`;
  return `M${x0 + r} ${f(top)} ${roofPath(s)} ${s.front} ${arches} ${rear}`;
}

/** Bordas das cavas (só os arcos, sem fechar pela base). */
const archEdges = (s: Silhouette) => axleGroups(s).map((grp) => `M${f(grp.at(-1)! + archHalf(s))} ${s.bottom} ${archArcs(s, grp).replace(/^H[^A]*/, '')}`).join(' ');

let clipCounter = 0;

export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - amount)).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}

/** Cor clara? (luminância relativa aproximada) — escolhe a cor do número de frota. */
function isLight(hex: string): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
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

/** Zonas da pintura (só as cores da viação); recortadas pela carroceria, ficam sob detalhes, vidros e sombreado. */
function paintZones(art: BusArt, s: Silhouette, bodyClip: string): SVGElement {
  const g = svg('g', { 'data-region': 'paint', 'clip-path': `url(#${bodyClip})` });
  const stripe = stripeShape(art.livery, s, art.secondary);
  if (stripe) g.appendChild(stripe);
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

/** Retrovisor: braço curvo (na cor da carroceria, escurecida) e o espelho pendurado; fora do recorte, porque passa da frente. */
function mirror(s: Silhouette, primary: string): SVGElement {
  const { at: [ax, ay], head: [hx, hy], h, arm = 1.1, w = 2.4 } = s.mirror;
  const g = svg('g', { 'data-part': 'mirror' });
  const lift = Math.max(2, Math.abs(hx - ax) * 0.25);
  g.appendChild(svg('path', {
    d: `M${f(ax)} ${f(ay)} C${f(ax + (hx - ax) * 0.45)} ${f(Math.min(ay, hy) - lift)} ${f(hx)} ${f(hy - lift)} ${f(hx)} ${f(hy + 0.6)}`,
    fill: 'none', stroke: darken(primary, 0.2), 'stroke-width': arm, 'stroke-linecap': 'round',
  }));
  g.appendChild(svg('path', { d: rr(hx - w / 2, hy, w, h, 1), fill: MIRROR, stroke: MIRROR_EDGE, 'stroke-width': 0.5 }));
  g.appendChild(svg('path', { d: `M${f(hx + w / 4)} ${f(hy + 1)} v${f(h - 2)}`, stroke: GLASS_SHINE, 'stroke-opacity': 0.25, 'stroke-width': 0.5 }));
  return g;
}

/**
 * Detalhes da lataria sobre a pintura: frisos, vincos, grade, portinhola, degraus, bordas das cavas, base dos
 * equipamentos do teto e número de frota (recortados pela carroceria); o retrovisor fica fora do recorte.
 */
function details(art: BusArt, s: Silhouette, bodyClip: string): SVGElement {
  const len = s.x1 - s.x0;
  const g = svg('g', { 'data-region': 'details' });
  const c = svg('g', { 'clip-path': `url(#${bodyClip})` });
  // brilho do teto e frisos da cintura (e entre os andares)
  c.appendChild(svg('rect', { x: s.x0, y: f(s.top - 4), width: len, height: 7.5, fill: GLASS_SHINE, opacity: 0.16 }));
  c.appendChild(svg('rect', { x: s.x0, y: s.belt + 1.5, width: len, height: 1.6, fill: SHADE, opacity: 0.2 }));
  if (s.decks) c.appendChild(svg('rect', { x: s.x0, y: f(s.decks[0] + 1.5), width: len, height: 1.6, fill: SHADE, opacity: 0.2 }));
  // base dos equipamentos do teto
  c.appendChild(svg('path', {
    'data-part': 'roof', d: s.roof.map(([x, w]) => `M${f(x + 1)} ${f(s.top + 0.3)} h${f(w - 2)}`).join(' '),
    fill: 'none', stroke: SHADE, 'stroke-opacity': 0.3, 'stroke-width': 0.7,
  }));
  // vincos de portas e bagageiros
  c.appendChild(svg('path', { 'data-part': 'seams', d: s.seams, fill: 'none', stroke: SHADE, 'stroke-opacity': 0.28, 'stroke-width': 1 }));
  // friso de alumínio ao longo da lateral: filete claro com a sombra logo abaixo
  if (s.rubRail !== undefined) {
    c.appendChild(svg('rect', { 'data-part': 'rub-rail', x: s.x0 - 2, y: f(s.rubRail - 0.7), width: len + 4, height: 1.4, fill: RUB_RAIL, opacity: 0.6 }));
    c.appendChild(svg('rect', { x: s.x0 - 2, y: f(s.rubRail + 0.7), width: len + 4, height: 0.6, fill: SHADE, opacity: 0.25 }));
  }
  if (s.trim) c.appendChild(svg('path', { 'data-part': 'trim', d: s.trim, fill: 'none', stroke: RUB_RAIL, 'stroke-opacity': 0.75, 'stroke-width': 1.2, 'stroke-linecap': 'round' }));
  // grade do motor (traseira): frisos verticais
  if (s.grille) {
    const [gx, gy, gw, gh] = s.grille;
    const n = Math.floor(gw / 2.6);
    const d = Array.from({ length: n }, (_, i) => `M${f(gx + 1.3 + i * 2.6)} ${f(gy)} v${f(gh)}`).join(' ');
    c.appendChild(svg('path', { d, stroke: SHADE, 'stroke-opacity': 0.4, 'stroke-width': 1.3, 'stroke-linecap': 'round' }));
  }
  // respiros: vão escuro com aletas horizontais
  if (s.vents?.length) {
    const v = svg('g', { 'data-part': 'vents' });
    v.appendChild(svg('path', { d: s.vents.map(([x, y, w, h]) => rr(x, y, w, h, 1)).join(' '), fill: WINDOW_FRAME, 'fill-opacity': 0.85 }));
    v.appendChild(svg('path', {
      d: s.vents.map(([x, y, w, h]) => Array.from({ length: Math.max(1, Math.floor(h / 1.6) - 1) }, (_, i) => `M${f(x + 1)} ${f(y + 1.6 * (i + 1))} h${f(w - 2)}`).join(' ')).join(' '),
      stroke: RUB_RAIL, 'stroke-opacity': 0.35, 'stroke-width': 0.5,
    }));
    c.appendChild(v);
  }
  // portinhola de serviço (bocal, bateria): por padrão à frente da cava traseira
  const [hx, hy] = s.hatch ?? [axleGroups(s)[0]!.at(-1)! + archHalf(s) + 3, s.bottom - (s.skirtH ?? 11) - 7.5];
  c.appendChild(svg('path', { 'data-part': 'hatch', d: rr(hx, hy, 7, 5, 1.2), fill: 'none', stroke: SHADE, 'stroke-opacity': 0.32, 'stroke-width': 0.7 }));
  // degraus das portas: vão escuro com a quina de alumínio
  for (const door of s.doors ?? []) {
    c.appendChild(svg('path', { 'data-part': 'step', d: rr(door.x + 1, s.bottom - 3.6, door.w - 2, 2.8, 0.6), fill: STEP }));
    c.appendChild(svg('path', { d: `M${f(door.x + 1.6)} ${f(s.bottom - 3.6)} h${f(door.w - 3.2)}`, stroke: STEP_EDGE, 'stroke-width': 0.6 }));
  }
  // borda das cavas de roda (ou para-lama de plástico escuro)
  if (s.archTrim) c.appendChild(svg('path', { 'data-part': 'arch-trim', d: archEdges(s), fill: 'none', stroke: ARCH_TRIM, 'stroke-width': s.archTrim }));
  else c.appendChild(svg('path', { d: archEdges(s), fill: 'none', stroke: darken(art.primary, 0.4), 'stroke-width': 2.5 }));
  // puxadores das portinholas: rebaixo escuro com a borda marcada
  if (s.handles?.length) {
    c.appendChild(svg('path', {
      'data-part': 'handles', d: s.handles.map(([x, y]) => rr(x - 0.85, y, 1.7, 3.4, 0.7)).join(' '),
      fill: SHADE, 'fill-opacity': 0.18, stroke: SHADE, 'stroke-opacity': 0.45, 'stroke-width': 0.45,
    }));
  }
  // número de frota fictício, pequeno (sem placa)
  const [fx, fy] = s.fleetAt ?? [s.x0 + 5, s.belt + 8];
  const fleet = svg('text', {
    'data-part': 'fleet', x: f(fx), y: f(fy), fill: isLight(art.primary) ? FLEET_DARK : FLEET_LIGHT,
    'font-family': "'Barlow Condensed', 'Arial Narrow', sans-serif", 'font-size': 4.4, 'font-weight': 700,
  });
  fleet.textContent = s.fleet;
  c.appendChild(fleet);
  g.appendChild(c);
  g.appendChild(mirror(s, art.primary));
  return g;
}

function windows(s: Silhouette, bodyClip: string, glassClip: string, full: boolean, glassFill: string): SVGElement {
  const g = svg('g', { 'data-region': 'windows', 'clip-path': `url(#${bodyClip})` });
  if (s.frame) g.appendChild(svg('path', { d: s.frame, fill: WINDOW_FRAME }));
  g.appendChild(svg('path', { d: s.glass, fill: glassFill }));
  if (!full) return g;
  const inGlass = svg('g', { 'clip-path': `url(#${glassClip})` });
  // corrimãos atrás do vidro das portas
  const rails = (s.doors ?? []).map((d) => `M${f(d.x + 2.6)} ${f(d.top + 5)} V${f(s.bottom - 7)} M${f(d.x + d.w - 2.6)} ${f(d.top + 5)} V${f(s.bottom - 7)}`).join(' ');
  if (rails) inGlass.appendChild(svg('path', { 'data-part': 'handrail', d: rails, stroke: HANDRAIL, 'stroke-opacity': 0.75, 'stroke-width': 0.7, 'stroke-linecap': 'round' }));
  // reflexos inclinados, só sobre o vidro
  const h = s.bottom - s.top;
  const shine = Array.from({ length: Math.ceil((s.x1 - s.x0) / 46) + 1 }, (_, i) => {
    const x = s.x0 + 14 + i * 46;
    return `M${f(x)} ${f(s.top - 2)} h13 l${f(-h * 0.35)} ${f(h)} h-13 Z`;
  }).join(' ');
  const sh = svg('g', { 'data-part': 'reflexo' });
  sh.appendChild(svg('path', { d: shine, fill: GLASS_SHINE, opacity: 0.07 }));
  sh.appendChild(svg('rect', { x: s.x0, y: f(s.winTop - 1), width: s.x1 - s.x0 + 4, height: 3, fill: GLASS_SHINE, opacity: 0.06 }));
  if (s.decks) sh.appendChild(svg('rect', { x: s.x0, y: f(s.decks[1] - 1), width: s.x1 - s.x0 + 4, height: 3, fill: GLASS_SHINE, opacity: 0.06 }));
  inGlass.appendChild(sh);
  g.appendChild(inGlass);
  // encontro das folhas de correr: perfis escuros sobre o vidro
  if (s.mullions) g.appendChild(svg('path', { 'data-part': 'mullions', d: s.mullions, stroke: WINDOW_FRAME, 'stroke-width': 1.1 }));
  // vedação de borracha em volta dos vidros
  g.appendChild(svg('path', { 'data-part': 'seal', d: s.glass, fill: 'none', stroke: SEAL, 'stroke-width': 0.8 }));
  return g;
}

function lights(s: Silhouette, bodyClip: string, full: boolean): SVGElement {
  const { x0, x1, tail: [t0, t1] } = s;
  const g = svg('g', { 'data-region': 'lights' });
  g.appendChild(svg('path', { d: rr(x1 - 7.5, s.headY, 8.5, 5, 1.8), fill: HEADLIGHT }));
  g.appendChild(svg('path', { d: rr(x0 - 1, t0, 4, t1 - t0, 1.6), fill: TAILLIGHT }));
  if (!full) return g;
  g.appendChild(svg('path', { d: rr(x1 - 11, s.headY + 0.5, 3, 4, 1), fill: SIGNAL }));
  g.appendChild(svg('path', { d: rr(x0 - 1, t1 + 1.5, 4, 3.5, 1), fill: SIGNAL }));
  const my = s.markerY ?? s.bottom - 5.5;
  if (s.markerW) g.appendChild(svg('path', { 'data-part': 'markers', d: (s.markers ?? []).map((x) => rr(x - s.markerW! / 2, my - 0.55, s.markerW!, 1.1, 0.4)).join(' '), fill: SIGNAL }));
  else for (const x of s.markers ?? []) g.appendChild(svg('circle', { cx: x, cy: f(my), r: 1.4, fill: SIGNAL }));
  if (s.reflectors?.length) {
    const y = s.reflectorY ?? s.bottom - 8;
    const rf = svg('g', { 'data-part': 'reflectors' });
    rf.appendChild(svg('path', { d: s.reflectors.map((x) => rr(x - 1.7, y, 1.7, 1.1, 0.3)).join(' '), fill: TAILLIGHT }));
    rf.appendChild(svg('path', { d: s.reflectors.map((x) => rr(x, y, 1.7, 1.1, 0.3)).join(' '), fill: REFLECTOR_LIGHT }));
    g.appendChild(rf);
  }
  // luzes de posição nos cantos do teto (vermelha atrás, âmbar na frente), dentro da carroceria
  const [cr, cf] = s.clearance;
  const pos = svg('g', { 'data-part': 'clearance', 'clip-path': `url(#${bodyClip})` });
  pos.appendChild(svg('path', { d: rr(cr - 1.6, s.top + 0.9, 3.2, 1.5, 0.6), fill: TAILLIGHT }));
  pos.appendChild(svg('path', { d: rr(cf - 1.6, s.top + 0.9, 3.2, 1.5, 0.6), fill: SIGNAL }));
  g.appendChild(pos);
  return g;
}

/** Sombreado de volume: escurece a quina do teto, a base e as pontas, multiplicando sobre tudo que está embaixo. */
function shade(s: Silhouette, bodyClip: string, vId: string, hId: string): SVGElement {
  const g = svg('g', { 'data-region': 'shade', 'clip-path': `url(#${bodyClip})`, style: 'mix-blend-mode: multiply', 'pointer-events': 'none' });
  const top = s.top - 4;
  for (const id of [vId, hId]) g.appendChild(svg('rect', { x: s.x0 - 2, y: f(top), width: s.x1 - s.x0 + 4, height: f(s.bottom - top + 1), fill: `url(#${id})` }));
  return g;
}

function wheels(s: Silhouette, full: boolean): SVGElement {
  const R = s.wheelR, cy = wheelY(s);
  const g = svg('g', { 'data-region': 'wheels' });
  for (const cx of s.axles) {
    g.appendChild(svg('circle', { class: 'tire', cx, cy, r: R, fill: BUS_TIRE }));
    if (!full) {
      g.appendChild(svg('circle', { cx, cy, r: f(R * 0.6), fill: BUS_RIM }));
      continue;
    }
    // banda de rodagem e flanco
    g.appendChild(svg('circle', { cx, cy, r: f(R - 0.9), fill: 'none', stroke: TREAD, 'stroke-width': 0.7 }));
    g.appendChild(svg('circle', { cx, cy, r: f(R * 0.78), fill: 'none', stroke: SIDEWALL, 'stroke-width': 1.2 }));
    // aro com borda clara, prato com furos de ventilação, cubo e porcas
    g.appendChild(svg('circle', { cx, cy, r: f(R * 0.62), fill: BUS_RIM, stroke: RIM_LIGHT, 'stroke-width': 0.6 }));
    g.appendChild(svg('circle', { cx, cy, r: f(R * 0.5), fill: RIM_DARK }));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      g.appendChild(svg('circle', { 'data-part': 'rim-hole', cx: f(cx + Math.cos(a) * R * 0.37), cy: f(cy + Math.sin(a) * R * 0.37), r: f(R * 0.075), fill: BUS_TIRE }));
    }
    g.appendChild(svg('circle', { cx, cy, r: f(R * 0.22), fill: RIM_LIGHT }));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.appendChild(svg('circle', { cx: f(cx + Math.cos(a) * R * 0.14), cy: f(cy + Math.sin(a) * R * 0.14), r: f(R * 0.035), fill: RIM_DARK }));
    }
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

function gradient(tag: 'linearGradient' | 'radialGradient', id: string, attrs: Record<string, string | number>, stops: [number, string, number][]): SVGElement {
  return svg(tag, { id, ...attrs }, ...stops.map(([offset, color, opacity]) => svg('stop', { offset, 'stop-color': color, 'stop-opacity': opacity })));
}

export interface BusSvgOptions {
  /** 'full' (padrão): galeria, garagem, loja, criação; 'simple': marcador do mapa (sem sombreado, reflexos e detalhes finos). */
  detail?: 'full' | 'simple';
}

/**
 * Ônibus de lado, com a pintura da empresa. viewBox 320×120; o tamanho vem do CSS.
 * Camadas (de baixo para cima): sombra no chão e cavas → body → paint (com stripe) → skirt → details → windows → lights
 * → shade (multiply) → logo → wheels. No nível 'simple' não há details nem shade, e vidros, luzes e rodas são lisos.
 */
export function busSvg(art: BusArt, opts: BusSvgOptions = {}): SVGSVGElement {
  const s = BUS_SILHOUETTES[art.shape];
  if (!s) throw new Error(`modelo de ônibus desconhecido: ${String(art.shape)}`);
  const full = (opts.detail ?? 'full') === 'full';
  const id = `bus-${++clipCounter}`;
  const bodyClip = `${id}-body`, glassClip = `${id}-glass`;
  const d = bodyPath(s);
  const root = svg('svg', { viewBox: '0 0 320 120', class: 'bus-svg', role: 'img', 'aria-hidden': 'true' });
  root.appendChild(svg('clipPath', { id: bodyClip }, svg('path', { d })));
  const mid = (s.x0 + s.x1) / 2, half = (s.x1 - s.x0) / 2;
  const wells = axleGroups(s).map((g) => `M${f(g.at(-1)! + archHalf(s))} ${s.bottom} ${archArcs(s, g).replace(/^H[^A]*/, '')} Z`).join(' ');

  if (!full) {
    root.appendChild(svg('ellipse', { cx: mid, cy: s.ground + 1, rx: half + 4, ry: 4, fill: SHADE, opacity: 0.4 }));
    root.appendChild(svg('path', { d: wells, fill: WHEEL_WELL }));
    root.appendChild(svg('path', { 'data-region': 'body', d, fill: art.primary }));
    root.appendChild(paintZones(art, s, bodyClip));
    root.appendChild(skirt(art, s, bodyClip));
    root.appendChild(windows(s, bodyClip, glassClip, false, BUS_WINDOW));
    root.appendChild(lights(s, bodyClip, false));
    if (art.logo) root.appendChild(logoBadge(art.logo, s, art.primary, art.secondary, `${id}-logo`));
    root.appendChild(wheels(s, false));
    return root;
  }

  const ids = { glass: `${id}-glassfill`, shadeV: `${id}-shade-v`, shadeH: `${id}-shade-h`, ground: `${id}-ground` };
  const user = { gradientUnits: 'userSpaceOnUse' };
  root.appendChild(svg('defs', {},
    svg('clipPath', { id: glassClip }, svg('path', { d: s.glass })),
    gradient('linearGradient', ids.glass, { ...user, x1: 0, y1: f(s.winTop), x2: 0, y2: f(s.belt) }, [[0, GLASS_TOP, 1], [0.55, BUS_WINDOW, 1], [1, GLASS_BOTTOM, 1]]),
    gradient('linearGradient', ids.shadeV, { ...user, x1: 0, y1: f(s.top - 4), x2: 0, y2: f(s.bottom) },
      [[0, SHADE, 0.2], [0.08, SHADE, 0], [0.55, SHADE, 0], [0.82, SHADE, 0.07], [1, SHADE, 0.26]]),
    gradient('linearGradient', ids.shadeH, { ...user, x1: s.x0, y1: 0, x2: s.x1, y2: 0 },
      [[0, SHADE, 0.16], [0.035, SHADE, 0], [0.965, SHADE, 0], [1, SHADE, 0.14]]),
    gradient('radialGradient', ids.ground, {}, [[0, SHADE, 0.5], [0.7, SHADE, 0.3], [1, SHADE, 0]]),
  ));
  // sombra no chão: mancha suave sob o ônibus e sombra de contato sob cada cava
  const shadow = svg('g', { 'data-part': 'ground-shadow' });
  shadow.appendChild(svg('ellipse', { cx: mid, cy: s.ground + 0.5, rx: half + 9, ry: 5, fill: `url(#${ids.ground})` }));
  for (const grp of axleGroups(s)) {
    const cx = (grp[0]! + grp.at(-1)!) / 2, rx = (grp.at(-1)! - grp[0]!) / 2 + s.wheelR * 1.1;
    shadow.appendChild(svg('ellipse', { cx: f(cx), cy: s.ground + 0.3, rx: f(rx), ry: 1.6, fill: SHADE, opacity: 0.55 }));
  }
  root.appendChild(shadow);
  // cavas com profundidade: forro escuro e anel mais escuro junto à borda (a metade de fora fica sob a carroceria)
  root.appendChild(svg('path', { d: wells, fill: WELL_LINER }));
  root.appendChild(svg('path', { 'data-part': 'well-ring', d: archEdges(s), fill: 'none', stroke: WHEEL_WELL, 'stroke-width': 4.5 }));
  root.appendChild(svg('path', { 'data-region': 'body', d, fill: art.primary }));
  root.appendChild(paintZones(art, s, bodyClip));
  root.appendChild(skirt(art, s, bodyClip));
  root.appendChild(details(art, s, bodyClip));
  root.appendChild(windows(s, bodyClip, glassClip, true, `url(#${ids.glass})`));
  root.appendChild(lights(s, bodyClip, true));
  root.appendChild(shade(s, bodyClip, ids.shadeV, ids.shadeH));
  if (art.logo) root.appendChild(logoBadge(art.logo, s, art.primary, art.secondary, `${id}-logo`));
  root.appendChild(wheels(s, true));
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
