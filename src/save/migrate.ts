type Obj = Record<string, unknown>;

/** v1 → v2: ônibus ganham `driverId: null`; quem já joga pula o tutorial. */
function v1ToV2(raw: Obj): Obj {
  const buses = Array.isArray(raw.buses)
    ? raw.buses.map((b) => (b && typeof b === 'object' && !Array.isArray(b) ? { ...(b as Obj), driverId: null } : b))
    : raw.buses;
  return { ...raw, buses, tutorial: 'fim', version: 2 };
}

const STEPS: Record<number, (raw: Obj) => Obj> = { 1: v1ToV2 };

/**
 * Converte um save de versões anteriores para a versão atual, sem alterar a entrada.
 * Cada versão nova acrescenta aqui um passo `vN → vN+1` em STEPS.
 */
export function migrate(raw: unknown): unknown | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const version = (raw as { version?: unknown }).version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return null;
  let cur: Obj = { ...(raw as Obj) };
  for (let step = STEPS[cur.version as number]; step; step = STEPS[cur.version as number]) cur = step(cur);
  return cur;
}
