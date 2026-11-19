import { expect, test } from 'vitest';
import { errorMessage, formatClock, formatMoney, formatPeople, logoKey } from './format';

test('dinheiro', () => {
  expect(formatMoney(1_248_000)).toBe('R$ 12.480');
  expect(formatMoney(0)).toBe('R$ 0');
  expect(formatMoney(-120_000)).toBe('-R$ 1.200');
  expect(formatMoney(2655, { cents: true })).toBe('R$ 26,55');
});
test('valor negativo que arredonda para zero não mostra sinal', () => {
  expect(formatMoney(-40)).toBe('R$ 0');
  expect(formatMoney(-50)).toBe('-R$ 1');
});
test('relógio', () => {
  expect(formatClock(0)).toBe('Dia 1 · 00:00');
  expect(formatClock(3740)).toBe('Dia 3 · 14:20');
});
test('população', () => { expect(formatPeople(361_000)).toBe('361 mil habitantes'); expect(formatPeople(19_400)).toBe('19 mil habitantes'); });
test('mensagens de erro', () => {
  expect(errorMessage('saldo_insuficiente')).toBe('Caixa insuficiente.');
  expect(errorMessage('onibus_inexistente')).toBe('Esse ônibus não existe mais.');
  expect(errorMessage('ultimo_onibus')).toBe('Sua viação precisa de pelo menos um ônibus.');
  expect(errorMessage('rota_inexistente')).toBe('Não foi possível concluir a ação.');
});
test('logoKey é curta para imagem grande e distingue logos', () => {
  const big = `data:image/png;base64,${'A'.repeat(150_000)}`;
  expect(logoKey({ kind: 'image', dataUrl: big }).length).toBeLessThan(100);
  expect(logoKey({ kind: 'image', dataUrl: big })).not.toBe(logoKey({ kind: 'image', dataUrl: `${big}B` }));
  expect(logoKey({ kind: 'icon', iconId: 'star' as never })).toBe('icon:star');
});
