import type { Store } from '../game/store';
import { formatMoney } from './format';
import { toast } from './toast';

/**
 * Avisa quando um anúncio vende. A venda acontece dentro do tick: o ônibus anunciado some do estado.
 * O retrato é refeito também em 'change', para que venda imediata ou retirada de anúncio não avisem.
 */
export function watchListingSales(
  store: Store,
  notify: (busName: string, priceCents: number) => void = (name, price) => toast(`${name} foi vendido por ${formatMoney(price)}.`, 'ok'),
): () => void {
  const snapshot = () => new Map(store.getState().buses.map((b) => [b.id, { name: b.name, price: b.listing?.priceCents ?? null }]));
  let previous = snapshot();
  const offChange = store.on('change', () => { previous = snapshot(); });
  const offTick = store.on('tick', () => {
    const now = store.getState().buses;
    const ids = new Set(now.map((b) => b.id));
    for (const [id, bus] of previous) {
      if (bus.price !== null && !ids.has(id)) notify(bus.name, bus.price);
    }
    previous = snapshot();
  });
  return () => { offChange(); offTick(); };
}
