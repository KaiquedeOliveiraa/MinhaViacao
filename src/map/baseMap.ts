import L from 'leaflet';

/**
 * Fundo do mapa desenhado por nós (sem tiles): municípios de SC, contorno dos vizinhos,
 * rodovias e sedes municipais. Tudo num pane próprio abaixo do overlayPane, com um único
 * renderer de canvas e sem interação. Os arquivos vêm de public/map/ (npm run map).
 */

export interface MapColors { sea: string; land: string; landEdge: string; neighborEdge: string; highway: string; town: string }

type Pos = [number, number]; // [lng, lat], como no GeoJSON
type PolyGeom = { type: 'Polygon'; coordinates: Pos[][] } | { type: 'MultiPolygon'; coordinates: Pos[][][] };
type LineGeom = { type: 'LineString'; coordinates: Pos[] } | { type: 'MultiLineString'; coordinates: Pos[][] };
interface Feature<G, P> { type: 'Feature'; geometry: G; properties: P }
interface Collection<G, P> { type: 'FeatureCollection'; features: Feature<G, P>[] }

type Municipios = Collection<PolyGeom, { id: number; nome: string; centro: [number, number] }>;
type Vizinhos = Collection<PolyGeom, { nome: string }>;
type Rodovias = Collection<LineGeom, { ref: string; tipo: 'federal' | 'estadual' }>;

const PANE = 'basePane';
/** Entre o tilePane (200) e o overlayPane (400): fica embaixo das rodovias do jogo, cidades e ônibus. */
const PANE_Z = 300;
/** Trecho reto (mesmo meridiano ou paralelo) com pelo menos isso, em graus, é borda de recorte, não fronteira. */
const CLIP_EDGE_MIN_DEG = 0.5;
/** Anel com menos pontos que isso (triângulo fechado) é lasca da malha: vira um risco solto no meio do nada. */
const MIN_RING_POSITIONS = 5;

const WEIGHT = { landEdge: 0.6, neighborEdge: 1, federal: 1.4, estadual: 0.8 };
const NEIGHBOR_OPACITY = 0.5;
const TOWN_RADIUS = 2;

export function readMapColors(el: Element): MapColors {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    sea: v('--map-sea'),
    land: v('--map-land'),
    landEdge: v('--map-land-edge'),
    neighborEdge: v('--map-neighbor-edge'),
    highway: v('--map-highway'),
    town: v('--map-town'),
  };
}

const defaultLoad = async (file: string): Promise<unknown> => {
  const res = await fetch(`map/${file}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const isCollection = (x: unknown): x is Collection<unknown, unknown> =>
  !!x && typeof x === 'object' && (x as { type?: unknown }).type === 'FeatureCollection' && Array.isArray((x as { features?: unknown }).features);

const polygons = (g: PolyGeom): Pos[][][] => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const lines = (g: LineGeom): Pos[][] => (g.type === 'LineString' ? [g.coordinates] : g.coordinates);
const latLngs = (line: Pos[]): [number, number][] => line.map(([lng, lat]) => [lat, lng]);

function isClipEdge(a: Pos, b: Pos): boolean {
  return (a[0] === b[0] && Math.abs(a[1] - b[1]) >= CLIP_EDGE_MIN_DEG) || (a[1] === b[1] && Math.abs(a[0] - b[0]) >= CLIP_EDGE_MIN_DEG);
}

/**
 * Contorno de um polígono como linhas [lat, lng], sem os trechos retos criados ao recortar
 * a geometria numa caixa (a Argentina vem recortada): desenhados, eles viram uma moldura reta no mapa.
 * Lascas (anéis de 3 pontos) também ficam de fora.
 */
export function outlineParts(g: PolyGeom): [number, number][][] {
  const parts: [number, number][][] = [];
  for (const poly of polygons(g)) {
    for (const ring of poly) {
      if (ring.length < MIN_RING_POSITIONS) continue;
      let run: Pos[] = [];
      const flush = () => { if (run.length >= 2) parts.push(latLngs(run)); run = []; };
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i]!;
        if (run.length === 0) run.push(p);
        const next = ring[i + 1];
        if (!next) break;
        if (isClipEdge(p, next)) flush();
        else run.push(next);
      }
      flush();
    }
  }
  return parts;
}

/** Desenha o fundo. Nunca rejeita: arquivo que falhar só deixa de aparecer (um console.warn). */
export async function addBaseMap(
  map: L.Map,
  opts: { colors: MapColors; hideTowns: ReadonlySet<number>; load?: (file: string) => Promise<unknown> },
): Promise<void> {
  const load = opts.load ?? defaultLoad;
  const { colors } = opts;
  let removed = false;
  map.once('unload', () => { removed = true; });

  const files = ['vizinhos.json', 'sc-municipios.json', 'rodovias.json'] as const;
  const results = await Promise.allSettled(files.map((f) => load(f)));
  if (removed) return;

  const failures: string[] = [];
  const data = new Map<string, unknown>();
  results.forEach((r, i) => {
    const file = files[i]!;
    if (r.status === 'rejected') failures.push(`${file}: ${(r.reason as Error)?.message ?? r.reason}`);
    else if (!isCollection(r.value)) failures.push(`${file}: formato inesperado`);
    else data.set(file, r.value);
  });

  if (data.size > 0) {
    try {
      const pane = map.getPane(PANE) ?? map.createPane(PANE);
      pane.style.zIndex = String(PANE_Z);
      pane.style.pointerEvents = 'none';
      const renderer = L.canvas({ pane: PANE });
      const base = { renderer, pane: PANE, interactive: false } as const;
      const group = L.layerGroup();

      const viz = data.get('vizinhos.json') as Vizinhos | undefined;
      for (const f of viz?.features ?? []) {
        group.addLayer(L.polyline(outlineParts(f.geometry), { ...base, color: colors.neighborEdge, weight: WEIGHT.neighborEdge, opacity: NEIGHBOR_OPACITY }));
      }

      const mun = data.get('sc-municipios.json') as Municipios | undefined;
      for (const f of mun?.features ?? []) {
        const rings = polygons(f.geometry).map((poly) => poly.map(latLngs));
        group.addLayer(L.polygon(rings, {
          ...base, noClip: true, color: colors.landEdge, weight: WEIGHT.landEdge, fillColor: colors.land, fillOpacity: 1,
        }));
      }

      const rod = data.get('rodovias.json') as Rodovias | undefined;
      for (const f of rod?.features ?? []) {
        const federal = f.properties.tipo === 'federal';
        group.addLayer(L.polyline(lines(f.geometry).map(latLngs), {
          ...base, color: colors.highway, weight: federal ? WEIGHT.federal : WEIGHT.estadual, opacity: 1,
        }));
      }

      for (const f of mun?.features ?? []) {
        if (opts.hideTowns.has(f.properties.id)) continue;
        group.addLayer(L.circleMarker(f.properties.centro, { ...base, radius: TOWN_RADIUS, stroke: false, fillColor: colors.town, fillOpacity: 1 }));
      }

      group.addTo(map);
    } catch (e) {
      failures.push(`desenho: ${(e as Error).message}`);
    }
  }

  if (failures.length > 0) console.warn(`Mapa: fundo incompleto (${failures.join('; ')})`);
}
