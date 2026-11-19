import { MINUTES_PER_DAY } from '../data/balance';
import type { ActionError } from '../sim/types';

function thousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 'R$ 12.480'; com `cents`, 'R$ 26,55'. Negativo vira '-R$ 1.200'. */
export function formatMoney(cents: number, opts: { cents?: boolean } = {}): string {
  const value = Number.isFinite(cents) ? Math.round(cents) : 0;
  const abs = Math.abs(value);
  if (opts.cents) {
    const sign = value < 0 ? '-' : '';
    return `${sign}R$ ${thousands(Math.floor(abs / 100))},${String(abs % 100).padStart(2, '0')}`;
  }
  const reais = Math.round(abs / 100);
  const sign = value < 0 && reais > 0 ? '-' : ''; // -R$ 0 não existe
  return `${sign}R$ ${thousands(reais)}`;
}

/** 'Dia 3 · 14:20' */
export function formatClock(clockMinutes: number): string {
  const day = Math.floor(clockMinutes / MINUTES_PER_DAY) + 1;
  const inDay = clockMinutes % MINUTES_PER_DAY;
  const hh = String(Math.floor(inDay / 60)).padStart(2, '0');
  const mm = String(inDay % 60).padStart(2, '0');
  return `Dia ${day} · ${hh}:${mm}`;
}

/** 361000 → '361 mil habitantes' */
export function formatPeople(n: number): string {
  return `${thousands(Math.round(n / 1000))} mil habitantes`;
}

const MESSAGES: Partial<Record<ActionError, string>> = {
  saldo_insuficiente: 'Caixa insuficiente.',
  ultimo_onibus: 'Sua viação precisa de pelo menos um ônibus.',
  fora_da_rede: 'A linha precisa sair de uma cidade que você já atende.',
  linha_existente: 'Você já opera essa linha.',
  onibus_ocupado: 'Esse ônibus já está em uma linha.',
  preco_invalido: 'Esse preço está fora dos limites para este ônibus.',
  oferta_inexistente: 'Essa oferta não existe mais.',
  nome_invalido: 'O nome precisa ter de 1 a 30 letras.',
};

export function errorMessage(e: ActionError): string {
  return MESSAGES[e] ?? 'Não foi possível concluir a ação.';
}
