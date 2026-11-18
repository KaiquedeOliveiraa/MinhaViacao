// @vitest-environment jsdom
import { expect, test } from 'vitest';
import type { BusShape } from '../sim/types';
import { busSvg, liveryThumb, type BusArt } from './busSvg';

const art = (over: Partial<BusArt> = {}): BusArt => ({ shape: 'micro', primary: '#ff7a00', secondary: '#ffffff', livery: 'diagonal', ...over });
const region = (svg: SVGSVGElement, name: string) => svg.querySelector(`[data-region="${name}"]`);
test('os 3 modelos e os 4 estilos geram um desenho com as cores da empresa', () => {
  for (const shape of ['micro', 'conv', 'rodo'] as const) for (const livery of ['plain', 'stripe', 'diagonal', 'wave'] as const) {
    const svg = busSvg(art({ shape, livery }));
    expect(svg.getAttribute('viewBox')).toBe('0 0 320 120');
    expect(region(svg, 'body')!.getAttribute('fill')).toBe('#ff7a00');
    expect(region(svg, 'windows')).not.toBeNull();
    expect(region(svg, 'wheels')).not.toBeNull();
    expect(region(svg, 'stripe') === null).toBe(livery === 'plain');
    if (livery !== 'plain') expect(region(svg, 'stripe')!.getAttribute('fill')).toBe('#ffffff');
  }
});
test('o rodoviário tem 3 rodas e os outros 2', () => {
  const wheels = (m: BusShape) => busSvg(art({ shape: m })).querySelectorAll('[data-region="wheels"] circle.tire').length;
  expect([wheels('micro'), wheels('conv'), wheels('rodo')]).toEqual([2, 2, 3]);
});
test('modelo desconhecido lança erro', () => { expect(() => busSvg(art({ shape: 'jato' as BusShape }))).toThrow(); });
test('a logo só aparece quando é passada', () => {
  expect(region(busSvg(art()), 'logo')).toBeNull();
  expect(region(busSvg(art({ logo: { kind: 'icon', iconId: 'pine' } })), 'logo')).not.toBeNull();
});
test('a saia usa a cor primária escurecida em 25%', () => {
  expect(region(busSvg(art({ primary: '#ff7a00' })), 'skirt')!.getAttribute('fill')).toBe('#bf5c00');
});
test('dois ônibus na mesma página não dividem o mesmo recorte', () => {
  const ids = [busSvg(art()), busSvg(art())].map(s => s.querySelector('clipPath')!.id);
  expect(ids[0]).not.toBe(ids[1]);
});
test('miniatura da pintura', () => {
  const thumb = liveryThumb('stripe', '#ff7a00', '#ffffff');
  expect(thumb.getAttribute('viewBox')).toBe('0 0 64 40');
  expect(liveryThumb('plain', '#ff7a00', '#ffffff').querySelector('[data-part="stripe"]')).toBeNull();
  expect(thumb.querySelector('[data-part="stripe"]')).not.toBeNull();
});
