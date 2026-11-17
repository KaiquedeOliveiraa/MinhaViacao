/**
 * Converte um save de versões anteriores para a versão atual.
 * Cada versão nova acrescenta aqui um passo `vN → vN+1`.
 */
export function migrate(raw: unknown): unknown | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const version = (raw as { version?: unknown }).version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) return null;
  // versão 1 é a atual: passa direto
  return raw;
}
