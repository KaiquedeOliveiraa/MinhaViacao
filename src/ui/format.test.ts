import { expect, test } from 'vitest';
import { errorMessage, formatClock, formatMoney, formatPeople } from './format';

test('dinheiro', () => {
  expect(formatMoney(1_248_000)).toBe('R$ 12.480');
  expect(formatMoney(0)).toBe('R$ 0');
  expect(formatMoney(-120_000)).toBe('-R$ 1.200');
  expect(formatMoney(2655, { cents: true })).toBe('R$ 26,55');
});
test('relógio', () => {
  expect(formatClock(0)).toBe('Dia 1 · 00:00');
  expect(formatClock(3740)).toBe('Dia 3 · 14:20');
});
test('população', () => { expect(formatPeople(361_000)).toBe('361 mil habitantes'); expect(formatPeople(19_400)).toBe('19 mil habitantes'); });
test('mensagens de erro', () => {
  expect(errorMessage('saldo_insuficiente')).toBe('Caixa insuficiente.');
  expect(errorMessage('ultimo_onibus')).toBe('Sua viação precisa de pelo menos um ônibus.');
  expect(errorMessage('rota_inexistente')).toBe('Não foi possível concluir a ação.');
});
