// @vitest-environment jsdom
import { expect, test } from 'vitest';
import { applyTheme, BG, contrastRatio, DEFAULT_ACCENT, onAccent, uiAccent } from './theme';

test('contraste', () => { expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1); });
test('cor clara fica como está', () => { expect(uiAccent('#ff7a00')).toBe('#ff7a00'); });
test('cor escura é clareada até dar leitura no fundo escuro', () => {
  for (const dark of ['#0a1a3a', '#000000', '#3b0000']) {
    const out = uiAccent(dark);
    expect(out).not.toBe(dark);
    expect(contrastRatio(out, BG)).toBeGreaterThanOrEqual(4.5);
  }
});
test('texto sobre a cor de destaque', () => {
  expect(onAccent('#ffee00')).toBe('#000000');
  expect(onAccent('#1a237e')).toBe('#ffffff');
});
test('applyTheme escreve as variáveis; sem empresa usa o padrão', () => {
  const root = document.createElement('div');
  applyTheme(root, { primaryColor: '#ff7a00', secondaryColor: '#ffffff' });
  expect(root.style.getPropertyValue('--accent')).toBe('#ff7a00');
  expect(root.style.getPropertyValue('--brand-secondary')).toBe('#ffffff');
  applyTheme(root, null);
  expect(root.style.getPropertyValue('--accent')).toBe(DEFAULT_ACCENT);
});
