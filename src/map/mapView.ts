import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Store } from '../game/store';
import { LAYOVER_MINUTES } from '../data/balance';
import { getCity, getModel, getRoad, travelMinutes } from '../sim/catalog';
import { buildRoadIndex, etaMinutes, lineT, pointAt, type RoadIndex } from '../sim/geo';
import { busesOnLine, servedCities } from '../sim/selectors';
import type { Bus, CityId, GameState, Line, RouteId } from '../sim/types';
import { h } from '../ui/dom';
import { formatPeople } from '../ui/format';
import { addBaseMap, readMapColors } from './baseMap';
import { mountCityLabels, type TownLabel } from './labelLayer';

/** Caixa de Santa Catarina ([sul, oeste], [norte, leste]); a vista e o limite de arraste partem dela. */
const SC_BOX = L.latLngBounds([-29.4, -53.9], [-25.9, -48.3]);
/** Folga do limite de arraste em volta de SC, para ver PR, RS e a Argentina. */
const MAX_BOUNDS_PAD = 0.5;
/** Abaixo deste zoom os nomes das cidades jogáveis se atropelam (celular): a vista inicial enquadra só as cidades. */
const READABLE_ZOOM = 7;
/** Espaço à direita para o nome da cidade mais a leste (o rótulo prefere a direita do ponto). */
const LABEL_ROOM: L.PointExpression = [110, 0];
const ATTRIBUTION =
  'Malhas © <a href="https://www.ibge.gov.br/">IBGE</a> · Rodovias © <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a> (ODbL) · <a href="https://www.naturalearthdata.com/">Natural Earth</a>';
const POPUP_MAX_WIDTH = 260;

type OpenPopup = { kind: 'bus'; id: string } | { kind: 'city'; id: CityId } | null;

/** Mapa de SC: fundo próprio em vetor, rodovias do jogo, linhas da empresa, cidades e ônibus andando. */
export function mountMap(el: HTMLElement, store: Store): () => void {
  const c = store.catalog;
  const container = h('div', { class: 'map-root' });
  el.replaceChildren(container);

  const map = L.map(container, { minZoom: 6, maxZoom: 12, zoomSnap: 0.25, zoomControl: true, attributionControl: true });
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution(ATTRIBUTION);

  map.fitBounds(SC_BOX, { paddingBottomRight: LABEL_ROOM });
  if (map.getZoom() < READABLE_ZOOM) {
    const cityBounds = L.latLngBounds(c.cities.map((city) => [city.lat, city.lng] as [number, number]));
    map.fitBounds(cityBounds.pad(0.3), { paddingBottomRight: LABEL_ROOM });
  }
  map.setMaxBounds(SC_BOX.pad(MAX_BOUNDS_PAD));
  const playable = new Set(c.cities.flatMap((city) => (city.ibge === undefined ? [] : [city.ibge])));
  const playableTowns: TownLabel[] = c.cities.map((city) => ({
    id: city.id, name: city.name, lat: city.lat, lng: city.lng, pop: city.population, playable: true,
  }));
  let towns = playableTowns;
  // arquivo sem população (cache antigo): só as jogáveis ganham nome
  const baseReady = addBaseMap(map, { colors: readMapColors(container), hideTowns: playable }).then((mun) => {
    towns = playableTowns.concat(mun.flatMap((m) => (playable.has(m.id) || !(typeof m.pop === 'number' && m.pop > 0) ? [] : [{
      id: String(m.id), name: m.nome, lat: m.centro[0], lng: m.centro[1], pop: m.pop, playable: false,
    }])));
  });

  const indexes = new Map<RouteId, RoadIndex>(c.roads.map((road) => [road.id, buildRoadIndex(road)]));
  const roadLayers = new Map<RouteId, L.Polyline>();
  for (const road of c.roads) {
    const poly = L.polyline(road.coords, { className: 'map-road', weight: 2, interactive: false });
    poly.addTo(map);
    roadLayers.set(road.id, poly);
  }

  const cityLayers = new Map<CityId, { dot: L.CircleMarker; ring: L.CircleMarker }>();
  for (const city of c.cities) {
    const ring = L.circleMarker([city.lat, city.lng], { radius: 11, className: 'map-city-ring', weight: 2, fill: false, interactive: false });
    const dot = L.circleMarker([city.lat, city.lng], { radius: 7, className: 'map-city', weight: 2, fillOpacity: 1 });
    dot.on('click', () => openPopup({ kind: 'city', id: city.id }, [city.lat, city.lng]));
    dot.addTo(map);
    cityLayers.set(city.id, { dot, ring });
  }

  const unmountLabels = mountCityLabels(map, { towns: () => towns, ready: baseReady });

  const busMarkers = new Map<string, L.Marker>();
  /**
   * Cores dos ícones atuais. Trocar o ícone recria o miolo do marcador: só quando as cores mudam.
   * Cada marcador tem o próprio ícone (o elemento HTML de um DivIcon não pode ser dividido entre marcadores).
   */
  const colorKey = ({ primaryColor, secondaryColor }: GameState['company']) => `${primaryColor}|${secondaryColor}`;
  let iconKey = colorKey(store.getState().company);
  const popup = L.popup({ maxWidth: POPUP_MAX_WIDTH, className: 'map-popup', autoPan: true, closeButton: true });
  let open: OpenPopup = null;
  popup.on('remove', () => { open = null; });

  function openPopup(target: NonNullable<OpenPopup>, at: L.LatLngExpression) {
    open = target;
    popup.setLatLng(at).setContent(popupContent(store.getState())).openOn(map);
  }

  function lineOf(s: GameState, bus: Bus): Line | undefined {
    return s.lines.find((line) => line.id === bus.lineId);
  }
  const cityName = (id: CityId) => getCity(c, id)?.name ?? id;

  function busPosition(s: GameState, bus: Bus): [number, number] | null {
    const line = lineOf(s, bus);
    if (!line) return null;
    const road = getRoad(c, line.a, line.b);
    const index = road && indexes.get(road.id);
    if (!road || !index) return null;
    const t = lineT(bus, line, road);
    return t === null ? null : pointAt(index, t);
  }

  function busPopup(s: GameState, bus: Bus): HTMLElement {
    const line = lineOf(s, bus);
    const model = getModel(c, bus.modelId);
    const road = line && getRoad(c, line.a, line.b);
    const rows: (Node | string)[] = [h('strong', { class: 'popup-title' }, bus.name)];
    if (line && road) {
      rows.push(h('span', null, `Linha: ${cityName(line.a)} ⇄ ${cityName(line.b)}`));
      const trip = bus.trip;
      if (trip.phase === 'moving') {
        rows.push(h('span', null, `Passageiros: ${trip.passengers} de ${model?.seats ?? '?'}`));
        rows.push(h('span', null, `Chega em ${etaMinutes(bus, road)} min`));
      } else if (trip.phase === 'waiting') {
        const here = cityName(trip.at === 'a' ? line.a : line.b);
        if (line.paused) rows.push(h('span', null, `Em ${here} · linha pausada`));
        else {
          const last = trip.at === 'a' ? line.lastDepartA : line.lastDepartB;
          const interval = (2 * (travelMinutes(road) + LAYOVER_MINUTES)) / Math.max(1, busesOnLine(s, line.id).length);
          const gapLeft = last === null ? 0 : Math.ceil(last + interval - s.clockMinutes);
          rows.push(h('span', null, `Em ${here} · sai em ${Math.max(trip.minutesLeft, gapLeft, 0)} min`));
        }
      }
    }
    return h('div', { class: 'popup-body' }, ...rows);
  }

  function cityPopup(s: GameState, id: CityId): HTMLElement {
    const city = getCity(c, id);
    const rows: (Node | string)[] = [h('strong', { class: 'popup-title' }, city?.name ?? id)];
    if (city) rows.push(h('span', { class: 'muted' }, formatPeople(city.population)));
    if (s.company.hqCityId === id) rows.push(h('span', { class: 'popup-tag' }, 'Sede da viação'));
    for (const line of s.lines) {
      if (line.a !== id && line.b !== id) continue;
      const other = line.a === id ? line.b : line.a;
      const queue = line.a === id ? line.queueA : line.queueB;
      rows.push(h('span', null, `Esperando para ${cityName(other)}: ${Math.floor(queue)}`));
    }
    return h('div', { class: 'popup-body' }, ...rows);
  }

  function popupContent(s: GameState): HTMLElement {
    if (open?.kind === 'bus') {
      const bus = s.buses.find((b) => b.id === open!.id);
      return bus ? busPopup(s, bus) : h('div', null, 'Ônibus fora de linha');
    }
    if (open?.kind === 'city') return cityPopup(s, open.id);
    return h('div');
  }

  function busIcon({ primaryColor, secondaryColor }: GameState['company']): L.DivIcon {
    const body = h('div', { class: 'bus-marker-body' }, h('span', { class: 'bus-marker-stripe' }));
    body.style.background = primaryColor;
    (body.firstChild as HTMLElement).style.background = secondaryColor;
    return L.divIcon({ html: body, className: 'bus-marker', iconSize: [28, 12], iconAnchor: [14, 6] });
  }

  /** Reconciliar traços, cidades e marcadores com o estado (evento change). */
  function reconcile() {
    const s = store.getState();
    const served = new Set(servedCities(s));
    const lines = new Map(s.lines.map((line) => [line.id, line]));
    for (const [id, poly] of roadLayers) {
      const line = lines.get(id);
      const path = poly.getElement() as SVGElement | undefined;
      if (path) {
        path.classList.toggle('is-line', !!line);
        path.classList.toggle('is-paused', !!line?.paused);
        path.style.stroke = line ? s.company.primaryColor : '';
      }
      if (line) poly.bringToFront();
    }
    for (const [id, { dot, ring }] of cityLayers) {
      dot.getElement()?.classList.toggle('is-served', served.has(id));
      dot.bringToFront();
      if (s.company.hqCityId === id) { if (!map.hasLayer(ring)) ring.addTo(map); } else ring.remove();
    }
    const recolor = colorKey(s.company) !== iconKey;
    iconKey = colorKey(s.company);
    const onLine = new Set<string>();
    for (const bus of s.buses) {
      const pos = busPosition(s, bus);
      if (!pos) continue;
      onLine.add(bus.id);
      let marker = busMarkers.get(bus.id);
      if (!marker) {
        marker = L.marker(pos, { icon: busIcon(s.company), keyboard: true, title: bus.name, riseOnHover: true });
        marker.on('click', () => openPopup({ kind: 'bus', id: bus.id }, marker!.getLatLng()));
        marker.addTo(map);
        busMarkers.set(bus.id, marker);
      } else {
        if (recolor) marker.setIcon(busIcon(s.company));
        marker.setLatLng(pos);
        marker.options.title = bus.name;
        const el = marker.getElement();
        if (el && el.title !== bus.name) el.title = bus.name;
      }
    }
    for (const [id, marker] of busMarkers) if (!onLine.has(id)) { marker.remove(); busMarkers.delete(id); }
    if (open?.kind === 'bus' && !onLine.has(open.id)) map.closePopup(popup);
    if (open) popup.setContent(popupContent(s));
    container.style.setProperty('--bus-step', `${1000 / Math.max(1, store.getSpeed())}ms`);
  }

  /** Só mover marcadores e atualizar o balão aberto (evento tick). */
  function tick() {
    const s = store.getState();
    for (const bus of s.buses) {
      const marker = busMarkers.get(bus.id);
      const pos = marker && busPosition(s, bus);
      if (marker && pos) marker.setLatLng(pos);
    }
    if (open) {
      if (open.kind === 'bus') { const m = busMarkers.get(open.id); if (m) popup.setLatLng(m.getLatLng()); }
      popup.setContent(popupContent(s));
    }
  }

  // sem transição de posição durante o zoom, para os ônibus não "voarem"
  map.on('zoomstart', () => container.classList.add('is-zooming'));
  map.on('zoomend', () => requestAnimationFrame(() => container.classList.remove('is-zooming')));

  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => map.invalidateSize()) : null;
  resize?.observe(container);

  reconcile();
  const offChange = store.on('change', reconcile);
  const offTick = store.on('tick', tick);

  return () => {
    offChange();
    offTick();
    resize?.disconnect();
    unmountLabels();
    map.remove();
  };
}
