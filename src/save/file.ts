import type { Catalog, GameState } from '../sim/types';
import { parseSave, serialize, type ParseResult } from './schema';

/** 'minha-viacao-<nome-em-minusculas-com-hifens>.json', sem acentos nem caracteres de caminho. */
export function exportFileName(state: GameState): string {
  const slug = state.company.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `minha-viacao-${slug || 'viacao'}.json`;
}

export function exportBlob(state: GameState): Blob {
  return new Blob([serialize(state)], { type: 'application/json' });
}

export function importText(text: string, c: Catalog): ParseResult {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: 'formato' }; }
  return parseSave(raw, c);
}
