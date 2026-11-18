type Obj = Record<string, unknown>;

/** v1 → v2: ônibus ganham `driverId: null`; quem já joga pula o tutorial. */
function v1ToV2(raw: Obj): Obj {
  const buses = Array.isArray(raw.buses)
    ? raw.buses.map((b) => (b && typeof b === 'object' && !Array.isArray(b) ? { ...(b as Obj), driverId: null } : b))
    : raw.buses;
  return { ...raw, buses, tutorial: 'fim', version: 2 };
}

/**
 * v2 → v3: ônibus ganham ano, quilometragem e anúncio. O `micro` da v2 era o micro usado da loja antiga
 * (o de R$ 20.000), então vira o usado 2012 com 480.000 km; os outros eram novos: 2026, 0 km.
 */
function v2ToV3(raw: Obj): Obj {
  const buses = Array.isArray(raw.buses)
    ? raw.buses.map((b) => {
      if (!b || typeof b !== 'object' || Array.isArray(b)) return b;
      const used = (b as Obj).modelId === 'micro';
      return { ...(b as Obj), year: used ? 2012 : 2026, odometerKm: used ? 480_000 : 0, listing: null };
    })
    : raw.buses;
  return { ...raw, buses, version: 3 };
}

const STEPS: Record<number, (raw: Obj) => Obj> = { 1: v1ToV2, 2: v2ToV3 };

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
