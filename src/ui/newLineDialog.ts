import type { Store } from '../game/store';
import { openLine } from '../sim/actions';
import { getCity, routeId } from '../sim/catalog';
import { openableRoutes } from '../sim/selectors';
import { showDialog } from './dialog';
import { h } from './dom';
import { errorMessage, formatMoney } from './format';
import { toast } from './toast';

/** Janela de nova linha: rotas que tocam a rede, com demanda e taxa de abertura. */
export function openNewLineDialog(store: Store): Promise<void> {
  const c = store.catalog;
  const s = store.getState();
  const name = (id: string) => getCity(c, id)?.name ?? id;
  const routes = openableRoutes(s, c).sort((x, y) => y.potential - x.potential);
  let chosen: (typeof routes)[number] | null = null;

  const cards = routes.map((route) => {
    const id = routeId(route.a, route.b);
    const missing = route.feeCents - s.cashCents;
    const disabled = s.cashCents < 0 || missing > 0;
    const card = h('button', {
      type: 'button', class: 'choice route-card', dataset: { route: id }, 'aria-pressed': 'false', 'aria-disabled': disabled ? 'true' : 'false',
      onClick: () => {
        if (disabled) return;
        chosen = route;
        for (const other of cards) other.setAttribute('aria-pressed', String(other === card));
      },
    },
      h('span', { class: 'route-top' }, h('span', { class: 'route-name' }, `${name(route.a)} ⇄ ${name(route.b)}`), h('span', { class: 'muted small' }, `${Math.round(route.distanceKm)} km`)),
      h('span', { class: 'small' }, `Demanda estimada: ${Math.round(route.potential)} passageiros por dia em cada sentido`),
      h('span', { class: 'small' }, `Taxa de abertura: ${formatMoney(route.feeCents)}`),
      disabled ? h('span', { class: 'small money-down' }, `Faltam ${formatMoney(Math.max(0, missing))}`) : null,
    );
    return card;
  });

  const idle = s.buses.filter((b) => b.lineId === null);
  const busSelect = h('select', { class: 'select', 'aria-label': 'Ônibus para a linha', disabled: idle.length === 0 },
    h('option', { value: '' }, idle.length ? 'Sem ônibus por enquanto' : 'Nenhum ônibus parado'),
    ...idle.map((bus) => h('option', { value: bus.id }, bus.name)),
  );

  const body = routes.length === 0
    ? [h('p', { class: 'dialog-message' }, 'Você já opera todas as linhas que saem da sua rede.')]
    : [
      h('div', { class: 'choice-grid route-grid' }, ...cards),
      h('label', { class: 'field-label' }, 'Ônibus (opcional)'),
      busSelect,
    ];

  return showDialog<true>({
    title: 'Nova linha',
    body,
    confirmLabel: 'Abrir linha',
    cancelValue: true,
    onConfirm: () => {
      if (routes.length === 0) return true;
      if (!chosen) { toast('Escolha uma rota.', 'erro'); return undefined; }
      const route = chosen;
      const busId = busSelect.value || undefined;
      const r = store.dispatch((st, cat) => openLine(st, cat, { a: route.a, b: route.b, busId }));
      if (!r.ok) { toast(errorMessage(r.error), 'erro'); return undefined; }
      toast(`Linha ${name(route.a)} ⇄ ${name(route.b)} aberta.`, 'ok');
      return true;
    },
  }).then(() => undefined);
}
