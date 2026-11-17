import { expect, test } from 'vitest';
import { acquireTabLock } from './tabLock';

test('primeira aba consegue, segunda não, e sem suporte libera', async () => {
  let held = false;
  const locks = { request: async (_n: string, _o: object, cb: (l: object | null) => unknown) => { if (held) return cb(null); held = true; return cb({}); } } as unknown as Pick<LockManager, 'request'>;
  expect(await acquireTabLock(locks)).toBe(true);
  expect(await acquireTabLock(locks)).toBe(false);
  expect(await acquireTabLock(undefined)).toBe(true); // em Node não existe navigator.locks
});
