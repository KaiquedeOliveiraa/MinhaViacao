import type { Catalog, GameState } from '../sim/types';
import { parseSave, serialize } from './schema';

export const SAVE_KEY = 'minhaviacao:save';
export const BACKUP_KEY = 'minhaviacao:backup';

export interface KeyValue { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; }
export type LoadResult = { state: GameState; source: 'principal' | 'backup' } | { state: null; damaged: boolean };
export interface SaveStorage { save(state: GameState): boolean; load(c: Catalog): LoadResult; clear(): void; }

function read(kv: KeyValue, key: string): string | null {
  try { return kv.getItem(key); } catch { return null; }
}

function decode(text: string, c: Catalog): GameState | null {
  try {
    const result = parseSave(JSON.parse(text), c);
    return result.ok ? result.state : null;
  } catch {
    return null;
  }
}

/** `kv` null = navegador sem armazenamento (aba anônima bloqueada, por exemplo). */
export function createStorage(kv: KeyValue | null): SaveStorage {
  return {
    save(state) {
      if (!kv) return false;
      try {
        const previous = kv.getItem(SAVE_KEY);
        if (previous !== null) kv.setItem(BACKUP_KEY, previous);
        kv.setItem(SAVE_KEY, serialize(state));
        return true;
      } catch {
        return false;
      }
    },
    load(c) {
      if (!kv) return { state: null, damaged: false };
      const main = read(kv, SAVE_KEY);
      const backup = read(kv, BACKUP_KEY);
      if (main !== null) {
        const state = decode(main, c);
        if (state) return { state, source: 'principal' };
      }
      if (backup !== null) {
        const state = decode(backup, c);
        if (state) return { state, source: 'backup' };
      }
      return { state: null, damaged: main !== null || backup !== null };
    },
    clear() {
      if (!kv) return;
      try { kv.removeItem(SAVE_KEY); kv.removeItem(BACKUP_KEY); } catch { /* sem armazenamento: nada a apagar */ }
    },
  };
}
