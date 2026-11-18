// @vitest-environment jsdom
import { expect, test } from 'vitest';
import type { BusShape, LiveryStyle } from '../sim/types';
import { BUS_SHAPES, BUS_SILHOUETTES, busSvg, liveryThumb, type BusArt } from './busSvg';

const LIVERIES: LiveryStyle[] = ['plain', 'stripe', 'diagonal', 'wave'];
const art = (over: Partial<BusArt> = {}): BusArt => ({ shape: 'micro', primary: '#ff7a00', secondary: '#ffffff', livery: 'diagonal', ...over });
const region = (svg: SVGSVGElement, name: string) => svg.querySelector(`[data-region="${name}"]`);

test('as 4 formas incluem a van', () => {
  expect([...BUS_SHAPES]).toEqual(['van', 'micro', 'conv', 'rodo']);
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

test('o rodoviário tem 3 rodas e os outros 2', () => {
  const wheels = (m: BusShape) => busSvg(art({ shape: m })).querySelectorAll('[data-region="wheels"] circle.tire').length;
  expect(BUS_SHAPES.map(wheels)).toEqual([2, 2, 2, 3]);
});

test('proporções reais: comprimento ÷ altura de cada forma', () => {
  const target: Record<BusShape, number> = { van: 2.4, micro: 3.0, conv: 3.6, rodo: 3.4 };
  for (const shape of BUS_SHAPES) {
    const s = BUS_SILHOUETTES[shape];
    expect((s.x1 - s.x0) / (s.ground - s.top), shape).toBeCloseTo(target[shape], 1);
  }
  // o rodoviário é o mais alto (piso mais alto)
  expect(Math.min(...BUS_SHAPES.map((m) => BUS_SILHOUETTES[m].top))).toBe(BUS_SILHOUETTES.rodo.top);
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
