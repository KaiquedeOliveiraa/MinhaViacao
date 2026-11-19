/**
 * Gera os arquivos do mapa próprio em public/map/ (municípios de SC, vizinhos e rodovias).
 * Fontes: IBGE (malhas), Natural Earth 1:50m (domínio público) e OpenStreetMap via Overpass.
 * Roda sob demanda (npm run map); o jogo nunca chama esses serviços.
 */
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { clipRingToBox, mergeLines, ringCentroid, roundPos, simplifyLine, type Pos } from './lib/geoTools';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const OUT = here('../public/map/');
const UA = 'minha-viacao-mapa/1.0';
const ROAD_TOLERANCE = 0.0015;
const OVERPASS = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';
const QUERY =
  '[out:json][timeout:180];area["ISO3166-2"="BR-SC"][admin_level=4]->.sc;' +
  'way(area.sc)["highway"~"^(motorway|trunk|primary)$"]["ref"~"^(BR|SC)-"];out geom tags;';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(url: string, init: RequestInit = {}, tries = 4): Promise<T> {
  let last = '';
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': UA, ...(init.headers as Record<string, string> | undefined) },
        signal: AbortSignal.timeout(240_000),
      });
      if (res.ok) return (await res.json()) as T;
      last = `HTTP ${res.status}`;
      if (![429, 502, 503, 504].includes(res.status)) break;
    } catch (e) {
      last = (e as Error).message;
    }
    if (attempt < tries) await sleep(5000 * attempt);
  }
  throw new Error(`Falha ao baixar ${url}: ${last}`);
}

type Ring = Pos[];
type Geom = { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] };
interface Feat<P = Record<string, unknown>> { type: 'Feature'; properties: P; geometry: Geom }
interface FC<P = Record<string, unknown>> { type: 'FeatureCollection'; features: Feat<P>[] }

const polys = (g: Geom): Ring[][] => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates);
const roundRing = (r: Ring): Ring => r.map((p) => roundPos(p));
const ringArea = (r: Ring) => {
  let s = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i]!;
    const [x2, y2] = r[(i + 1) % r.length]!;
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
};
const roundGeom = (g: Geom): Geom =>
  g.type === 'Polygon'
    ? { type: 'Polygon', coordinates: g.coordinates.map(roundRing) }
    : { type: 'MultiPolygon', coordinates: g.coordinates.map((p) => p.map(roundRing)) };

function write(files: Record<string, unknown>) {
  mkdirSync(OUT, { recursive: true });
  let totalRaw = 0;
  let totalGz = 0;
  const tmp: [string, string][] = [];
  for (const [name, data] of Object.entries(files)) {
    const text = JSON.stringify(data);
    const raw = Buffer.byteLength(text);
    const gz = gzipSync(text).length;
    totalRaw += raw;
    totalGz += gz;
    writeFileSync(OUT + name + '.tmp', text);
    tmp.push([OUT + name + '.tmp', OUT + name]);
    console.log(`${name}: ${(raw / 1024).toFixed(1)} KB cru, ${(gz / 1024).toFixed(1)} KB gzip`);
  }
  for (const [a, b] of tmp) renameSync(a, b);
  console.log(`TOTAL: ${(totalRaw / 1024).toFixed(1)} KB cru, ${(totalGz / 1024).toFixed(1)} KB gzip`);
  return totalGz;
}

/** População do Censo 2022 por código do município (IBGE, agregado 4714, variável 93). */
async function populacao(): Promise<Map<number, number>> {
  type Agregado = { resultados: { series: { localidade: { id: string }; serie: Record<string, string> }[] }[] }[];
  const data = await getJson<Agregado>(
    'https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N6%5BN3%5B42%5D%5D',
  );
  const pop = new Map<number, number>();
  for (const s of data[0]?.resultados[0]?.series ?? []) {
    const n = Number(s.serie['2022']);
    if (Number.isFinite(n) && n > 0) pop.set(Number(s.localidade.id), n);
  }
  return pop;
}

async function municipios() {
  const [mesh, names, pop] = await Promise.all([
    getJson<FC<{ codarea: string }>>(
      'https://servicodados.ibge.gov.br/api/v3/malhas/estados/42?formato=application/vnd.geo%2Bjson&qualidade=minima&intrarregiao=municipio',
    ),
    getJson<{ id: number; nome: string }[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados/42/municipios'),
    populacao(),
  ]);
  const nome = new Map(names.map((n) => [n.id, n.nome]));
  const features = mesh.features.map((f) => {
    const id = Number(f.properties.codarea);
    const geometry = roundGeom(f.geometry);
    const biggest = polys(geometry).map((p) => p[0]!).sort((a, b) => ringArea(b) - ringArea(a))[0]!;
    const [lng, lat] = roundPos(ringCentroid(biggest));
    return { type: 'Feature', properties: { id, nome: nome.get(id) ?? String(id), centro: [lat, lng], pop: pop.get(id) ?? 0 }, geometry };
  });
  if (features.length !== 295) throw new Error(`Esperava 295 municípios, veio ${features.length}`);
  const semPop = features.filter((f) => f.properties.pop <= 0).map((f) => f.properties.nome);
  if (semPop.length > 0) throw new Error(`Municípios sem população: ${semPop.join(', ')}`);
  return { type: 'FeatureCollection', features };
}

async function vizinhos() {
  const out: Feat[] = [];
  for (const [code, nome] of [['41', 'Paraná'], ['43', 'Rio Grande do Sul']] as const) {
    const fc = await getJson<FC>(
      `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${code}?formato=application/vnd.geo%2Bjson&qualidade=minima`,
    );
    const f = fc.features[0];
    if (!f) throw new Error(`Malha vazia para ${nome}`);
    out.push({ type: 'Feature', properties: { nome }, geometry: roundGeom(f.geometry) });
  }
  const world = await getJson<FC<{ ADM0_A3: string }>>(
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
  );
  const arg = world.features.find((f) => f.properties.ADM0_A3 === 'ARG');
  if (!arg) throw new Error('Argentina não encontrada no Natural Earth');
  const box = { minX: -60, minY: -35, maxX: -44, maxY: -20 };
  const parts: Ring[][] = [];
  for (const p of polys(arg.geometry)) {
    const outer = clipRingToBox(p[0]!, box);
    if (outer.length >= 3) parts.push([roundRing(outer)]);
  }
  out.push({ type: 'Feature', properties: { nome: 'Argentina' }, geometry: { type: 'MultiPolygon', coordinates: parts } });
  return { type: 'FeatureCollection', features: out };
}

interface OsmWay { tags?: Record<string, string>; geometry?: { lat: number; lon: number }[] }

async function rodovias() {
  const data = await getJson<{ elements: OsmWay[] }>(OVERPASS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(QUERY),
  });
  const byRef = new Map<string, Pos[][]>();
  for (const w of data.elements) {
    const ref = w.tags?.ref?.split(';')[0]?.trim();
    if (!ref || !w.geometry || w.geometry.length < 2) continue;
    const arr = byRef.get(ref) ?? [];
    arr.push(w.geometry.map((g): Pos => [g.lon, g.lat]));
    byRef.set(ref, arr);
  }
  const features = [...byRef.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ref, lines]) => {
      const merged = mergeLines(lines).map((l) => simplifyLine(l, ROAD_TOLERANCE).map((p) => roundPos(p)));
      const coords = merged.filter((l) => l.length > 1);
      return {
        type: 'Feature',
        properties: { ref, tipo: ref.startsWith('BR-') ? 'federal' : 'estadual' },
        geometry: coords.length === 1 ? { type: 'LineString', coordinates: coords[0] } : { type: 'MultiLineString', coordinates: coords },
      };
    });
  for (const need of ['BR-101', 'BR-470', 'BR-282', 'BR-116']) {
    if (!features.some((f) => f.properties.ref === need)) throw new Error(`Rodovia ${need} ausente`);
  }
  console.log(`Overpass: ${OVERPASS}`);
  console.log(`rodovias (${features.length}): ${features.map((f) => f.properties.ref).join(' ')}`);
  return { type: 'FeatureCollection', features };
}

async function main() {
  try {
    const m = await municipios();
    const v = await vizinhos();
    const r = await rodovias();
    console.log(`${m.features.length} municípios, ${v.features.length} vizinhos, ${r.features.length} rodovias`);
    const gz = write({ 'sc-municipios.json': m, 'vizinhos.json': v, 'rodovias.json': r });
    if (gz > 1.5 * 1024 * 1024) throw new Error('Total gzip passou de 1,5 MB');
  } catch (e) {
    console.error('Erro ao gerar o mapa (arquivos existentes mantidos):', (e as Error).message);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
