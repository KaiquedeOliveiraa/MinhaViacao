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

/**
 * Mapa-base escuro. A CARTO (escolha original do plano) passou a exigir chave de API em 2026;
 * a Esri World Dark Gray Base responde sem chave. Conferir os termos de uso antes de publicar.
 * Trocar de provedor é mudar só este objeto.
 */
const BASEMAP = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles © <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, © OpenStreetMap contributors',
  maxNativeZoom: 16,
};
const POPUP_MAX_WIDTH = 260;

type OpenPopup = { kind: 'bus'; id: string } | { kind: 'city'; id: CityId } | null;

/** Mapa de SC: fundo escuro, rodovias, linhas da empresa, cidades e ônibus andando. */
export function mountMap(el: HTMLElement, store: Store): () => void {
  const c = store.catalog;
  const container = h('div', { class: 'map-root' });
  el.replaceChildren(container);

  const map = L.map(container, { minZoom: 7, maxZoom: 12, zoomSnap: 0.25, zoomControl: true, attributionControl: true });
  L.tileLayer(BASEMAP.url, { attribution: BASEMAP.attribution, maxNativeZoom: BASEMAP.maxNativeZoom, maxZoom: 12, minZoom: 7 }).addTo(map);
  map.attributionControl.setPrefix(false);

  const cityBounds = L.latLngBounds(c.cities.map((city) => [city.lat, city.lng] as [number, number]));
  map.fitBounds(cityBounds.pad(0.3));
  map.setMaxBounds(cityBounds.pad(1));

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
    dot.bindTooltip(h('span', null, city.name), { permanent: true, direction: 'right', offset: [10, 0], className: 'map-label' });
    dot.on('click', () => openPopup({ kind: 'city', id: city.id }, [city.lat, city.lng]));
    dot.addTo(map);
    cityLayers.set(city.id, { dot, ring });
  }

  const busMarkers = new Map<string, L.Marker>();
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

  function busIcon(): L.DivIcon {
    const { primaryColor, secondaryColor } = store.getState().company;
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
    const icon = busIcon();
    const onLine = new Set<string>();
    for (const bus of s.buses) {
      const pos = busPosition(s, bus);
      if (!pos) continue;
      onLine.add(bus.id);
      let marker = busMarkers.get(bus.id);
      if (!marker) {
        marker = L.marker(pos, { icon, keyboard: true, title: bus.name, riseOnHover: true });
        marker.on('click', () => openPopup({ kind: 'bus', id: bus.id }, marker!.getLatLng()));
        marker.addTo(map);
        busMarkers.set(bus.id, marker);
      } else {
        marker.setIcon(icon);
        marker.setLatLng(pos);
        marker.options.title = bus.name;
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
    map.remove();
  };
}
