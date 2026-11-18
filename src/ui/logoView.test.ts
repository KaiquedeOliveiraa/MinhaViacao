// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { LOGO_ICONS } from '../data/logos';
import { logoView } from './logoView';

test('ícone vira SVG; imagem vira <img> com o dataUrl', () => {
  const colors = { primary: '#ff7a00', secondary: '#ffffff' };
  expect(logoView({ kind: 'icon', iconId: 'wave' }, colors, 40).querySelector('svg')).not.toBeNull();
  const img = logoView({ kind: 'image', dataUrl: 'data:image/png;base64,AAAA' }, colors, 40).querySelector('img')!;
  expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  expect(img.getAttribute('alt')).toBe('');
});
test('existem exatamente os 6 ícones', () => {
  expect(Object.keys(LOGO_ICONS).sort()).toEqual(['bus', 'mountain', 'pine', 'road', 'wave', 'wheel']);
});
