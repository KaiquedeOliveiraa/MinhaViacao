// @vitest-environment jsdom
import L from 'leaflet';
import { afterEach, expect, test, vi } from 'vitest';
import { addBaseMap, outlineParts, readMapColors, type MapColors } from './baseMap';

const colors: MapColors = { sea: '#000', land: '#111', landEdge: '#222', neighborEdge: '#333', highway: '#444', town: '#555' };

function makeMap() {
  const div = document.createElement('div');
  document.body.replaceChildren(div);
  return L.map(div, { center: [-27, -50], zoom: 7 });
}

afterEach(() => vi.restoreAllMocks());

test('sem rede, addBaseMap resolve sem lançar e avisa uma vez', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const map = makeMap();
  const load = vi.fn(async (file: string) => { throw new Error(`falhou ${file}`); });
  await expect(addBaseMap(map, { colors, hideTowns: new Set(), load })).resolves.toEqual([]);
  expect(load).toHaveBeenCalledTimes(3);
  expect(warn).toHaveBeenCalledTimes(1);
  map.remove();
});

test('arquivo com conteúdo inválido também não derruba o mapa', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const map = makeMap();
  await expect(addBaseMap(map, { colors, hideTowns: new Set(), load: async () => ({ type: 'nada' }) })).resolves.toEqual([]);
  expect(warn).toHaveBeenCalledTimes(1);
  map.remove();
});

test('readMapColors lê as seis variáveis --map-*', () => {
  const el = document.createElement('div');
  document.body.replaceChildren(el);
  el.style.setProperty('--map-sea', '#010203');
  el.style.setProperty('--map-land', '#111111');
  el.style.setProperty('--map-land-edge', '#222222');
  el.style.setProperty('--map-neighbor-edge', '#333333');
  el.style.setProperty('--map-highway', '#444444');
  el.style.setProperty('--map-town', '#555555');
  expect(readMapColors(el)).toEqual({
    sea: '#010203', land: '#111111', landEdge: '#222222', neighborEdge: '#333333', highway: '#444444', town: '#555555',
  });
});

test('contorno de vizinho não desenha as bordas retas do recorte', () => {
  // anel recortado numa caixa: o lado x = -60 e o fundo y = -35 são artificiais
  const ring: [number, number][] = [[-55, -30], [-57.5, -35], [-60, -35], [-60, -24], [-58, -23], [-55, -30]];
  const parts = outlineParts({ type: 'Polygon', coordinates: [ring] });
  expect(parts).toEqual([
    [[-30, -55], [-35, -57.5]],
    [[-24, -60], [-23, -58], [-30, -55]],
  ]);
});

test('contorno sem recorte vira uma linha só, fechada', () => {
  const ring: [number, number][] = [[-50, -27], [-49, -26.5], [-48.6, -27.2], [-49.5, -27.6], [-50, -27]];
  expect(outlineParts({ type: 'MultiPolygon', coordinates: [[ring]] })).toEqual([[[-27, -50], [-26.5, -49], [-27.2, -48.6], [-27.6, -49.5], [-27, -50]]]);
});

test('lasca de 3 pontos no contorno do vizinho não é desenhada', () => {
  const sliver: [number, number][] = [[-53.6542, -25.3509], [-53.6251, -25.3464], [-53.6265, -25.3466], [-53.6542, -25.3509]];
  expect(outlineParts({ type: 'MultiPolygon', coordinates: [[sliver]] })).toEqual([]);
});

test('addBaseMap devolve os municípios carregados, com população quando o arquivo tem', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const map = makeMap();
  const square: [number, number][] = [[-49.2, -27], [-49, -27], [-49, -26.8], [-49.2, -26.8], [-49.2, -27]];
  const mun = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [square] }, properties: { id: 4202404, nome: 'Blumenau', centro: [-26.9, -49.1], pop: 361261 } },
      { type: 'Feature', geometry: { type: 'Polygon', coordinates: [square] }, properties: { id: 4200606, nome: 'Aguti', centro: [-26.9, -49.1] } },
    ],
  };
  const load = async (file: string) => (file === 'sc-municipios.json' ? mun : { type: 'FeatureCollection', features: [] });
  const got = await addBaseMap(map, { colors, hideTowns: new Set(), load });
  expect(got).toEqual([
    { id: 4202404, nome: 'Blumenau', centro: [-26.9, -49.1], pop: 361261 },
    { id: 4200606, nome: 'Aguti', centro: [-26.9, -49.1] },
  ]);
  // sem map.remove(): o canvas do jsdom não tem contexto e o Leaflet quebra ao desmontar o renderer
});
