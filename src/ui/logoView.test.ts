// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { LOGO_ICONS } from '../data/logos';
import { isValidLogo, LOGO_ICON_IDS } from '../sim/newGame';
import { logoView } from './logoView';

test('ícone vira SVG; imagem vira <img> com o dataUrl', () => {
  const colors = { primary: '#ff7a00', secondary: '#ffffff' };
  expect(logoView({ kind: 'icon', iconId: 'wave' }, colors, 40).querySelector('svg')).not.toBeNull();
  const img = logoView({ kind: 'image', dataUrl: 'data:image/png;base64,AAAA' }, colors, 40).querySelector('img')!;
  expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  expect(img.getAttribute('alt')).toBe('');
});
const OLD_ICONS = ['bus', 'mountain', 'pine', 'road', 'wave', 'wheel'];
const NEW_ICONS = ['arrow', 'bird', 'chevrons', 'circles', 'compass', 'diamond', 'fish', 'horse', 'peaks', 'star', 'sun', 'waves'];

test('existem os 6 ícones antigos e os 12 novos, nada além', () => {
  expect(Object.keys(LOGO_ICONS).sort()).toEqual([...OLD_ICONS, ...NEW_ICONS].sort());
  expect([...LOGO_ICON_IDS].sort()).toEqual([...OLD_ICONS, ...NEW_ICONS].sort());
});
test('todo id de LOGO_ICON_IDS tem rótulo e path, e é aceito como logo', () => {
  for (const id of LOGO_ICON_IDS) {
    const icon = LOGO_ICONS[id];
    expect(icon, id).toBeDefined();
    expect(icon.label.trim(), id).not.toBe('');
    expect(icon.path, id).toMatch(/^M/);
    expect(isValidLogo({ kind: 'icon', iconId: id }), id).toBe(true);
  }
  expect(isValidLogo({ kind: 'icon', iconId: 'dragao' })).toBe(false);
});
test('os 6 ícones antigos continuam com o mesmo desenho', () => {
  expect(LOGO_ICONS.road.path).toBe('M8.6 3h6.8L21.5 21h-19zM11.3 5.5l-.2 3h1.8l-.2-3zM10.9 10.5l-.3 3.8h2.8l-.3-3.8zM10.4 16.3l-.3 3.7h3.8l-.3-3.7z');
  expect(LOGO_ICONS.pine.path).toBe('M12 1.5l5.2 6.3h-2.6l4.3 5.3h-2.6l4.9 5.6H13.2V22h-2.4v-3.3H3.8l4.9-5.6H6.1l4.3-5.3H7.8z');
  expect(LOGO_ICONS.wave.label).toBe('Onda');
});
