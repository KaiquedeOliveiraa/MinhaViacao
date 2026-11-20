// @vitest-environment jsdom
import { expect, test } from 'vitest';
import type { BusShape, LiveryStyle } from '../sim/types';
import { catalog } from '../sim/catalog';
import { BUS_SHAPES, BUS_SILHOUETTES, busSvg, liveryThumb, type BusArt } from './busSvg';

const LIVERIES: LiveryStyle[] = ['plain', 'stripe', 'diagonal', 'wave'];
const art = (over: Partial<BusArt> = {}): BusArt => ({ shape: 'micro', primary: '#ff7a00', secondary: '#ffffff', livery: 'diagonal', ...over });
const region = (svg: SVGSVGElement, name: string) => svg.querySelector(`[data-region="${name}"]`);

test('as 5 formas incluem a van e o double deck (este só na galeria)', () => {
  expect([...BUS_SHAPES]).toEqual(['van', 'micro', 'conv', 'rodo', 'dd']);
});

test('cada forma × cada pintura tem as camadas separadas, com as cores da empresa', () => {
  for (const shape of BUS_SHAPES) for (const livery of LIVERIES) {
    const where = `${shape}/${livery}`;
    const svg = busSvg(art({ shape, livery }));
    expect(svg.getAttribute('viewBox'), where).toBe('0 0 320 120');
    expect(region(svg, 'body')!.getAttribute('fill'), where).toBe('#ff7a00');
    for (const name of ['windows', 'wheels', 'skirt', 'lights']) expect(region(svg, name), `${where} ${name}`).not.toBeNull();
    // zonas de pintura recortadas pela carroceria
    const paint = region(svg, 'paint')!;
    expect(paint, where).not.toBeNull();
    const clip = /^url\(#(.+)\)$/.exec(paint.getAttribute('clip-path') ?? '')?.[1];
    expect(clip && svg.querySelector(`clipPath[id="${clip}"]`), where).toBeTruthy();
    // faixa só quando a pintura não é lisa, sempre dentro de paint e na cor secundária
    const stripe = region(svg, 'stripe');
    expect(stripe === null, where).toBe(livery === 'plain');
    if (stripe) {
      expect(paint.contains(stripe), where).toBe(true);
      expect(stripe.getAttribute('fill'), where).toBe('#ffffff');
    }
    expect(region(svg, 'logo'), where).toBeNull();
    expect(region(busSvg(art({ shape, livery, logo: { kind: 'icon', iconId: 'pine' } })), 'logo'), where).not.toBeNull();
  }
});

test('eixos: 2 em cada forma de um andar (o rodoviário de referência é 4×2) e 4 no double deck (8×2)', () => {
  const wheels = (m: BusShape) => busSvg(art({ shape: m })).querySelectorAll('[data-region="wheels"] circle.tire').length;
  expect(BUS_SHAPES.map(wheels)).toEqual([2, 2, 2, 2, 4]);
});

/**
 * Medidas tiradas das referências de proporção (docs/referencias, fora do git), em pixels da imagem:
 * convencional: vista do lado das portas, 218 px (traseira x 15, dianteira x 233), teto y 12, base da carroceria y 70,
 *   chão (base do pneu) y 78, pneu de raio 11, eixos a 44 e 146 px da dianteira, faixa de janelas de y 18 a y 39;
 * rodoviário: 1155 px (x 83→1238), teto y 80, base y 363, chão y 394,5, pneu de raio 45,5,
 *   eixos a 212,5 e 877,5 px da dianteira, faixa de janelas de y 105 a y 194;
 * double deck ("ONIBUS DD", linha de cima, lado das portas, dianteira à direita): 511 px (traseira x 29, dianteira x 540),
 *   teto y 18, base y 149, chão y 161,5, pneu de raio 18,5, eixos a 93,5, 138,5, 367 e 411,75 px da dianteira (8×2),
 *   janelas de cima de y 23,5 a y 57,5 e de baixo de y 81 a y 114.
 */
const REF = {
  conv: { total: 218 / 66, body: 218 / 58, axles: [44 / 218, 146 / 218], winTop: 6 / 66, belt: 27 / 66, wheelR: 11 / 66 },
  rodo: { total: 1155 / 314.5, body: 1155 / 283, axles: [212.5 / 1155, 877.5 / 1155], winTop: 25 / 314.5, belt: 114 / 314.5, wheelR: 45.5 / 314.5 },
  dd: {
    total: 511 / 143.5, body: 511 / 131, axles: [93.5 / 511, 138.5 / 511, 367 / 511, 411.75 / 511],
    winTop: 5.5 / 143.5, belt: 96 / 143.5, wheelR: 18.5 / 143.5, decks: [39.5 / 143.5, 63 / 143.5],
  },
};
const near = (a: number, b: number, tol: number, where: string) => expect(Math.abs(a - b), `${where}: ${a} ≈ ${b}`).toBeLessThan(tol);

test('proporções: comprimento ÷ altura até o chão de cada forma', () => {
  const target: Record<BusShape, number> = { van: 2.4, micro: 3.0, conv: REF.conv.total, rodo: REF.rodo.total, dd: REF.dd.total };
  for (const shape of BUS_SHAPES) {
    const s = BUS_SILHOUETTES[shape];
    near((s.x1 - s.x0) / (s.ground - s.top), target[shape], 0.05, shape);
  }
  // o double deck é o mais alto e cabe no viewBox; entre os de um andar, o rodoviário (piso mais alto)
  expect(Math.min(...BUS_SHAPES.map((m) => BUS_SILHOUETTES[m].top))).toBe(BUS_SILHOUETTES.dd.top);
  expect(BUS_SILHOUETTES.dd.top).toBeGreaterThan(2);
  expect(BUS_SILHOUETTES.dd.x0).toBeGreaterThanOrEqual(2);
  expect(BUS_SILHOUETTES.dd.x1).toBeLessThanOrEqual(318);
  const oneDeck = BUS_SHAPES.filter((m) => m !== 'dd');
  expect(Math.min(...oneDeck.map((m) => BUS_SILHOUETTES[m].top))).toBe(BUS_SILHOUETTES.rodo.top);
});

test('convencional, rodoviário e double deck seguem a referência: carroceria, eixos, janelas e rodas', () => {
  for (const shape of ['conv', 'rodo', 'dd'] as const) {
    const s = BUS_SILHOUETTES[shape], ref = REF[shape];
    const len = s.x1 - s.x0, hgt = s.ground - s.top;
    near(len / (s.bottom - s.top), ref.body, 0.05, `${shape} carroceria sem rodas`);
    const fromFront = s.axles.map((a) => (s.x1 - a) / len).sort((p, q) => p - q);
    fromFront.forEach((k, i) => near(k, ref.axles[i]!, 0.01, `${shape} eixo ${i + 1}`));
    near((s.winTop - s.top) / hgt, ref.winTop, 0.01, `${shape} topo das janelas`);
    near((s.belt - s.top) / hgt, ref.belt, 0.01, `${shape} base das janelas`);
    near(s.wheelR / hgt, ref.wheelR, 0.01, `${shape} raio da roda`);
  }
  // double deck: base da faixa de janelas de cima e topo da de baixo
  const dd = BUS_SILHOUETTES.dd, hgt = dd.ground - dd.top;
  expect(dd.decks).toBeDefined();
  dd.decks!.forEach((y, i) => near((y - dd.top) / hgt, REF.dd.decks[i]!, 0.01, `dd andar ${i + 1}`));
});

test('o double deck não entra no catálogo da loja', () => {
  expect(catalog.models.some((m) => (m.shape as string) === 'dd')).toBe(false);
});

test('modelo desconhecido lança erro', () => { expect(() => busSvg(art({ shape: 'jato' as BusShape }))).toThrow(); });

test('a saia usa a cor primária escurecida em 25%', () => {
  expect(region(busSvg(art({ primary: '#ff7a00' })), 'skirt')!.getAttribute('fill')).toBe('#bf5c00');
});

test('dois ônibus na mesma página não dividem nenhum id (recortes e logo)', () => {
  const ids = (s: SVGSVGElement) => [...s.querySelectorAll('[id]')].map((e) => e.id);
  const logo = { kind: 'image' as const, dataUrl: 'data:image/png;base64,AAAA' };
  const a = ids(busSvg(art({ logo })));
  const b = ids(busSvg(art({ logo })));
  expect(a.length).toBeGreaterThan(0);
  expect(new Set([...a, ...b]).size).toBe(a.length + b.length);
});

test('miniatura da pintura', () => {
  const thumb = liveryThumb('stripe', '#ff7a00', '#ffffff');
  expect(thumb.getAttribute('viewBox')).toBe('0 0 64 40');
  expect(liveryThumb('plain', '#ff7a00', '#ffffff').querySelector('[data-part="stripe"]')).toBeNull();
  expect(thumb.querySelector('[data-part="stripe"]')).not.toBeNull();
});

/** Camadas de baixo para cima (só as que têm data-region direto no desenho). */
const LAYERS = ['body', 'paint', 'skirt', 'details', 'windows', 'lights', 'shade', 'logo', 'wheels'];
const logoArt = (over: Partial<BusArt> = {}) => art({ logo: { kind: 'icon', iconId: 'pine' }, ...over });
const before = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
const clipOf = (el: Element) => /^url\(#(.+)\)$/.exec(el.getAttribute('clip-path') ?? '')?.[1];

test('camadas de realismo: details e shade em cada forma × pintura, na ordem de baixo para cima', () => {
  for (const shape of BUS_SHAPES) for (const livery of LIVERIES) {
    const where = `${shape}/${livery}`;
    const svg = busSvg(logoArt({ shape, livery }));
    const layers = LAYERS.map((name) => {
      const el = region(svg, name);
      expect(el, `${where} ${name}`).not.toBeNull();
      expect(el!.parentNode, `${where} ${name} fica na raiz`).toBe(svg);
      return el!;
    });
    for (let i = 1; i < layers.length; i++) expect(before(layers[i - 1]!, layers[i]!), `${where} ${LAYERS[i - 1]} antes de ${LAYERS[i]}`).toBe(true);
    // sombreado de volume: multiplica sobre pintura, vidros e faróis, recortado pela carroceria
    const shade = region(svg, 'shade')!;
    expect(shade.getAttribute('style') ?? '', where).toMatch(/mix-blend-mode:\s*multiply/);
    expect(clipOf(shade), where).toBe(clipOf(region(svg, 'paint')!));
    // a pintura só tem as zonas da pintura: vincos, frisos e grade ficam em details
    expect(region(svg, 'paint')!.querySelector('[data-part="seams"]'), where).toBeNull();
    expect(region(svg, 'details')!.querySelector('[data-part="seams"]'), where).not.toBeNull();
  }
});

test('detalhes genéricos do desenho completo: retrovisor fora do recorte, frota fictícia, sem placa', () => {
  for (const shape of BUS_SHAPES) {
    const svg = busSvg(art({ shape }));
    const mirror = svg.querySelector('[data-part="mirror"]');
    expect(mirror, shape).not.toBeNull();
    // o retrovisor passa da frente: nenhum ancestral pode recortá-lo
    for (let el = mirror!.parentElement; el && el !== (svg as Element); el = el.parentElement) expect(el.hasAttribute('clip-path'), `${shape} retrovisor recortado`).toBe(false);
    const fleet = svg.querySelector('[data-part="fleet"]');
    expect(fleet?.textContent, shape).toMatch(/^\d{4}$/);
    expect(svg.querySelector('[data-part="plate"]'), shape).toBeNull();
    for (const part of ['step', 'handrail', 'hatch', 'roof', 'clearance', 'reflexo', 'seal', 'ground-shadow']) {
      if ((part === 'step' || part === 'handrail') && shape === 'van') continue; // a van não tem porta de ônibus
      expect(svg.querySelector(`[data-part="${part}"]`), `${shape} ${part}`).not.toBeNull();
    }
    // cavas com profundidade: anel escuro interno; rodas com aro furado
    expect(svg.querySelector('[data-part="well-ring"]'), shape).not.toBeNull();
    expect(svg.querySelectorAll('[data-region="wheels"] [data-part="rim-hole"]').length, shape).toBeGreaterThan(0);
  }
});

test("detail: 'simple' tem a mesma silhueta e pintura, sem sombreado, reflexo e detalhes finos", () => {
  for (const shape of BUS_SHAPES) for (const livery of LIVERIES) {
    const where = `${shape}/${livery}`;
    const full = busSvg(logoArt({ shape, livery }));
    const simple = busSvg(logoArt({ shape, livery }), { detail: 'simple' });
    expect(busSvg(logoArt({ shape, livery }), { detail: 'full' }).querySelectorAll('*').length, where).toBe(full.querySelectorAll('*').length);
    expect(region(simple, 'shade'), where).toBeNull();
    expect(simple.querySelector('[data-part="reflexo"]'), where).toBeNull();
    expect(simple.querySelector('[data-part="mirror"]'), where).toBeNull();
    expect(simple.querySelector('[data-part="fleet"]'), where).toBeNull();
    expect(simple.querySelectorAll('*').length, where).toBeLessThan(full.querySelectorAll('*').length / 2);
    expect(region(simple, 'body')!.getAttribute('d'), where).toBe(region(full, 'body')!.getAttribute('d'));
    expect(region(simple, 'stripe')?.getAttribute('d') ?? null, where).toBe(region(full, 'stripe')?.getAttribute('d') ?? null);
    for (const name of ['body', 'paint', 'skirt', 'windows', 'lights', 'logo', 'wheels']) expect(region(simple, name), `${where} ${name}`).not.toBeNull();
  }
});

test('gradientes e recortes: ids únicos entre dois desenhos e toda referência url(#…) existe no próprio desenho', () => {
  const a = busSvg(art({ shape: 'rodo' }));
  const b = busSvg(art({ shape: 'rodo' }));
  const ids = (s: SVGSVGElement) => [...s.querySelectorAll('[id]')].map((e) => e.id);
  expect(a.querySelectorAll('linearGradient, radialGradient').length).toBeGreaterThan(0);
  expect(new Set([...ids(a), ...ids(b)]).size).toBe(ids(a).length + ids(b).length);
  for (const s of [a, busSvg(art({ shape: 'dd' }), { detail: 'simple' })]) {
    const refs = [...s.querySelectorAll('*')].flatMap((e) => ['fill', 'clip-path', 'stroke'].map((k) => /^url\(#(.+)\)$/.exec(e.getAttribute(k) ?? '')?.[1]).filter(Boolean));
    expect(refs.length).toBeGreaterThan(0);
    for (const id of refs) expect(s.querySelector(`[id="${id}"]`), id).not.toBeNull();
  }
});

test('convencional urbano: portas e janelas de correr como na referência, friso de alumínio e lanternas laterais', () => {
  const s = BUS_SILHOUETTES.conv, len = s.x1 - s.x0;
  // portas medidas na referência (218 px, traseira em x 15): traseira de x 50,5 com 19,5 px; dianteira de x 204 com 20 px
  const doors = [...(s.doors ?? [])].sort((a, b) => a.x - b.x);
  [[50.5, 19.5], [204, 20]].forEach(([px, pw], i) => {
    near((doors[i]!.x - s.x0) / len, (px! - 15) / 218, 0.005, `porta ${i + 1}: início`);
    near(doors[i]!.w / len, pw! / 218, 0.005, `porta ${i + 1}: largura`);
  });
  const full = busSvg(art({ shape: 'conv' }));
  // uma divisão de folha de correr em cada uma das 5 janelas
  expect(full.querySelector('[data-part="mullions"]')!.getAttribute('d')!.match(/M/g)).toHaveLength(5);
  expect(full.querySelector('[data-region="details"] [data-part="rub-rail"]')).not.toBeNull();
  expect(region(full, 'lights')!.querySelectorAll('circle').length).toBeGreaterThanOrEqual(4);
  // no simples (mapa) não há divisões nem friso
  const simple = busSvg(art({ shape: 'conv' }), { detail: 'simple' });
  for (const part of ['mullions', 'rub-rail']) expect(simple.querySelector(`[data-part="${part}"]`), part).toBeNull();
});

test('rodoviário: portinholas com puxadores, para-lamas escuros, catadióptricos e frente envidraçada', () => {
  const full = busSvg(art({ shape: 'rodo' }));
  // um puxador por portinhola (7 bagageiros e o elevador) e o da porta: 8 retângulos
  expect(full.querySelector('[data-region="details"] [data-part="handles"]')!.getAttribute('d')!.match(/M/g)).toHaveLength(8);
  expect(full.querySelector('[data-region="details"] [data-part="arch-trim"]')).not.toBeNull();
  expect(full.querySelector('[data-region="details"] [data-part="trim"]')).not.toBeNull();
  expect(full.querySelectorAll('[data-region="lights"] [data-part="reflectors"] path')).toHaveLength(2);
  expect(full.querySelector('[data-region="lights"] [data-part="markers"]')).not.toBeNull();
  // as janelinhas basculantes ficam sobre os vidros
  expect(full.querySelector('[data-region="windows"] [data-part="mullions"]')).not.toBeNull();
  // o simples (mapa) não leva esses detalhes
  const simple = busSvg(art({ shape: 'rodo' }), { detail: 'simple' });
  for (const part of ['handles', 'arch-trim', 'trim', 'reflectors', 'markers', 'mullions']) expect(simple.querySelector(`[data-part="${part}"]`), part).toBeNull();
});
