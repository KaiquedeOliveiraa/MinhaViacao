export const TAB_LOCK_NAME = 'minhaviacao-game';

function defaultLocks(): Pick<LockManager, 'request'> | undefined {
  return typeof navigator !== 'undefined' ? navigator.locks : undefined;
}

/**
 * Garante uma aba jogando por vez. A trava fica presa enquanto a aba viver.
 * Sem suporte a Web Locks no navegador, libera o jogo.
 */
export function acquireTabLock(locks: Pick<LockManager, 'request'> | undefined = defaultLocks()): Promise<boolean> {
  if (!locks) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    locks
      .request(TAB_LOCK_NAME, { ifAvailable: true }, (lock) => {
        if (!lock) { resolve(false); return undefined; }
        resolve(true);
        return new Promise<never>(() => {}); // nunca resolve: segura a trava até a aba fechar
      })
      .catch(() => resolve(true));
  });
}
