// @vitest-environment jsdom
import L from 'leaflet';
import { expect, test } from 'vitest';
import { mountCityLabels, type TownLabel } from './labelLayer';

const measure = (text: string, playable: boolean) => ({ width: text.length * (playable ? 9 : 6), height: playable ? 18 : 14 });

function makeMap(zoom = 9) {
  const div = document.createElement('div');
  Object.defineProperty(div, 'clientWidth', { value: 800 });
  Object.defineProperty(div, 'clientHeight', { value: 600 });
  document.body.replaceChildren(div);
  return L.map(div, { center: [-27, -49], zoom, zoomAnimation: false, fadeAnimation: false });
}

const listenerCount = (map: L.Map) =>
  Object.values((map as unknown as { _events: Record<string, unknown[]> })._events).reduce((n, list) => n + list.length, 0);

const towns: TownLabel[] = [
  { id: 'blumenau', name: 'Blumenau', lat: -26.9, lng: -49.07, pop: 361_261, playable: true },
  { id: 'itajai', name: 'Itajaí', lat: -26.91, lng: -48.69, pop: 264_054, playable: true },
  { id: '4209102', name: 'Joinville', lat: -26.3, lng: -48.85, pop: 616_317, playable: false },
  { id: '4202008', name: 'Brusque', lat: -27.1, lng: -48.92, pop: 141_385, playable: false },
  { id: '4200606', name: 'Aguti', lat: -27.05, lng: -49.1, pop: 3_000, playable: false },
];

const labels = () => [...document.querySelectorAll<HTMLElement>('.map-label')].filter((el) => el.style.display !== 'none');
const names = () => labels().map((el) => el.textContent).sort();

test('mostra jogáveis e as cidades acima do limiar do zoom, com o nome como texto', () => {
  const map = makeMap(9);
  const off = mountCityLabels(map, { towns: () => towns, measure });
  expect(names()).toEqual(['Blumenau', 'Brusque', 'Itajaí', 'Joinville']); // zoom 9: 20 mil ou mais
  expect(document.querySelectorAll('.map-label.is-playable')).toHaveLength(2);
  off();
  map.remove();
});

test('zoom muda quem aparece; durante o zoom a camada some', () => {
  const map = makeMap(9);
  const off = mountCityLabels(map, { towns: () => towns, measure });
  const layer = document.querySelector<HTMLElement>('.map-label-pane')!;
  map.fire('zoomstart');
  expect(layer.style.visibility).toBe('hidden');
  map.setZoom(11);
  expect(layer.style.visibility).toBe('');
  expect(names()).toContain('Aguti');
  map.setZoom(7);
  expect(names()).toEqual(['Blumenau', 'Itajaí', 'Joinville']);
  off();
  map.remove();
});

test('municípios que chegam depois entram no recálculo', async () => {
  const map = makeMap(9);
  let list = towns.filter((t) => t.playable);
  let done!: () => void;
  const ready = new Promise<void>((r) => { done = r; });
  const off = mountCityLabels(map, { towns: () => list, measure, ready });
  expect(names()).toEqual(['Blumenau', 'Itajaí']);
  list = towns;
  done();
  await ready;
  await Promise.resolve();
  expect(names()).toContain('Joinville');
  off();
  map.remove();
});

test('desmontar tira os listeners e os elementos', () => {
  const map = makeMap(9);
  const before = listenerCount(map);
  const off = mountCityLabels(map, { towns: () => towns, measure });
  expect(listenerCount(map)).toBeGreaterThan(before);
  expect(document.querySelectorAll('.map-label').length).toBeGreaterThan(0);
  off();
  expect(listenerCount(map)).toBe(before);
  expect(document.querySelectorAll('.map-label, .map-label-pane')).toHaveLength(0);
  map.fire('moveend'); // nada volta depois de desmontar
  expect(document.querySelectorAll('.map-label')).toHaveLength(0);
  map.remove();
});
