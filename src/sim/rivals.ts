import type { Rival } from '../data/rivals';
import { fairValueCents } from './market';
import type { Catalog, GameState } from './types';

/** Caixa + valor justo de toda a frota. */
export function companyWorthCents(s: GameState, c: Catalog): number {
  return s.cashCents + s.buses.reduce((sum, bus) => sum + fairValueCents(c, bus, s.clockMinutes), 0);
}

export function rivalProgress(s: GameState, c: Catalog, rival: Rival): { current: number; target: number; met: boolean } {
  const q = rival.requirement;
  const current = q.kind === 'patrimonio' ? companyWorthCents(s, c) : q.kind === 'linhas' ? s.lines.length : s.buses.length;
  const target = q.kind === 'patrimonio' ? q.cents : q.count;
  return { current, target, met: current >= target };
}

export function canUnlockRival(s: GameState, c: Catalog, rival: Rival): boolean {
  return rivalProgress(s, c, rival).met;
}

// gancho: desbloqueio vem depois (aqui entraria `unlockRival`).
