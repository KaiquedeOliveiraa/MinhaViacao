import L from 'leaflet';
import { h } from '../ui/dom';
import { minPopulationForZoom, placeLabels, type Box, type LabelCandidate } from './labels';

/**
 * Nomes das cidades no mapa, numa camada DOM própria dentro do mapPane (coordenadas de camada:
 * no arraste os rótulos andam junto com o mapa, sem trabalho por quadro). A posição de cada um
 * é recalculada só no fim do movimento (zoomend, moveend, resize) e quando os municípios chegam;
 * durante a animação de zoom a camada fica escondida.
 */

export interface TownLabel { id: string; name: string; lat: number; lng: number; pop: number; playable: boolean }
export type MeasureLabel = (text: string, playable: boolean) => { width: number; height: number };

/** Acima das rodovias e pontos das cidades (overlayPane 400), abaixo dos ônibus (markerPane 600). */
const PANE_Z = 550;
/** Distância do ponto ao rótulo: o ponto da jogável tem 7 px (anel da sede 11 px); a sede municipal, 2 px. */
const PLAYABLE_GAP = 13;
const TOWN_GAP = 5;
/** Cidade até esta distância fora da tela ainda entra na conta (o rótulo pode cair para dentro). */
const OFFSCREEN = 160;
/** Folga em volta dos controles do mapa. */
const CONTROL_PAD = 4;

interface LabelStyle { font: string; letterSpacing: number; lineHeight: number; fontSize: number; upper: boolean }

const px = (v: string, fallback: number) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Mede com measureText de um canvas, na fonte do próprio CSS dos rótulos (lida uma vez por tipo).
 * Sem canvas (jsdom), estima pela quantidade de letras.
 */
function canvasMeasure(host: HTMLElement): { measure: MeasureLabel; reset: () => void } {
  let ctx: CanvasRenderingContext2D | null | undefined;
  const styles = new Map<boolean, LabelStyle>();
  const styleOf = (playable: boolean): LabelStyle => {
    let s = styles.get(playable);
    if (!s) {
      const probe = h('div', { class: `map-label ${playable ? 'is-playable' : 'is-town'}` }, 'x');
      probe.style.visibility = 'hidden';
      host.appendChild(probe);
      const cs = getComputedStyle(probe);
      const fontSize = px(cs.fontSize, playable ? 15 : 11);
      s = {
        font: `${cs.fontStyle} ${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`,
        letterSpacing: px(cs.letterSpacing, 0),
        lineHeight: px(cs.lineHeight, Math.ceil(fontSize * 1.25)),
        fontSize,
        upper: cs.textTransform === 'uppercase',
      };
      probe.remove();
      styles.set(playable, s);
    }
    return s;
  };
  const measure: MeasureLabel = (text, playable) => {
    const s = styleOf(playable);
    const shown = s.upper ? text.toLocaleUpperCase('pt-BR') : text;
    if (ctx === undefined) ctx = /jsdom/i.test(navigator.userAgent) ? null : document.createElement('canvas').getContext('2d');
    let width: number;
    if (ctx) {
      ctx.font = s.font;
      width = ctx.measureText(shown).width;
    } else width = shown.length * s.fontSize * 0.6;
    return { width: Math.ceil(width + s.letterSpacing * shown.length) + 1, height: s.lineHeight };
  };
  return { measure, reset: () => styles.clear() };
}

export function mountCityLabels(
  map: L.Map,
  opts: { towns: () => TownLabel[]; measure?: MeasureLabel; ready?: Promise<unknown> },
): () => void {
  const layer = h('div', { class: 'leaflet-pane map-label-pane' });
  layer.style.zIndex = String(PANE_Z);
  map.getPane('mapPane')!.appendChild(layer);

  const own = opts.measure ? null : canvasMeasure(layer);
  const rawMeasure = opts.measure ?? own!.measure;
  const sizes = new Map<string, { width: number; height: number }>();
  const measure = (text: string, playable: boolean) => {
    const key = `${playable ? 1 : 0}|${text}`;
    let m = sizes.get(key);
    if (!m) { m = rawMeasure(text, playable); sizes.set(key, m); }
    return m;
  };

  const els = new Map<string, HTMLElement>();
  const shown = new Set<string>();
  let disposed = false;
  let version = 0;
  let lastKey = '';
  /** Controles do mapa (zoom, atribuição) por cima dos rótulos; só mudam quando o tamanho muda. */
  let controls: Box[] = [];
  let controlsKey = '';

  function controlBoxes(): Box[] {
    const root = map.getContainer().getBoundingClientRect();
    return [...map.getContainer().querySelectorAll<HTMLElement>('.leaflet-control')].flatMap((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 ? [{
        x: r.left - root.left - CONTROL_PAD, y: r.top - root.top - CONTROL_PAD, w: r.width + 2 * CONTROL_PAD, h: r.height + 2 * CONTROL_PAD,
      }] : [];
    });
  }

  function element(t: TownLabel): HTMLElement {
    let el = els.get(t.id);
    if (!el) {
      el = h('div', { class: `map-label ${t.playable ? 'is-playable' : 'is-town'}`, dataset: { label: t.id } }, t.name);
      layer.appendChild(el);
      els.set(t.id, el);
    }
    return el;
  }

  function recompute() {
    if (disposed || !(map as unknown as { _loaded?: boolean })._loaded) return;
    const size = map.getSize();
    const zoom = map.getZoom();
    const origin = map.getPixelBounds().min!;
    const key = `${zoom}|${origin.x}|${origin.y}|${size.x}|${size.y}|${version}`;
    if (key !== lastKey) {
      lastKey = key;
      const sizeKey = `${size.x}|${size.y}|${version}`;
      if (sizeKey !== controlsKey) { controlsKey = sizeKey; controls = controlBoxes(); }
      const min = minPopulationForZoom(zoom);
      const byId = new Map<string, TownLabel>();
      const cands: LabelCandidate[] = [];
      for (const t of opts.towns()) {
        if (!t.playable && !(t.pop >= min)) continue;
        const p = map.latLngToContainerPoint([t.lat, t.lng]);
        if (p.x < -OFFSCREEN || p.y < -OFFSCREEN || p.x > size.x + OFFSCREEN || p.y > size.y + OFFSCREEN) continue;
        const m = measure(t.name, t.playable);
        byId.set(t.id, t);
        cands.push({
          id: t.id, text: t.name, x: p.x, y: p.y, priority: t.pop, playable: t.playable,
          width: m.width, height: m.height, gap: t.playable ? PLAYABLE_GAP : TOWN_GAP,
        });
      }
      const placed = placeLabels(cands, { width: size.x, height: size.y }, undefined, controls);
      const next = new Set<string>();
      for (const p of placed) {
        const el = element(byId.get(p.id)!);
        const at = map.containerPointToLayerPoint([p.box.x, p.box.y]);
        el.style.transform = `translate(${Math.round(at.x)}px, ${Math.round(at.y)}px)`;
        el.style.width = `${p.box.w}px`;
        if (el.dataset.side !== p.side) el.dataset.side = p.side;
        if (el.style.display) el.style.display = '';
        next.add(p.id);
      }
      for (const id of shown) if (!next.has(id)) els.get(id)!.style.display = 'none';
      shown.clear();
      for (const id of next) shown.add(id);
    }
    layer.style.visibility = '';
  }

  const hide = () => { layer.style.visibility = 'hidden'; };
  const refresh = () => { version++; recompute(); };
  const onFonts = () => { sizes.clear(); own?.reset(); refresh(); };

  const events = { zoomstart: hide, zoomend: recompute, moveend: recompute, resize: recompute } as const;
  map.on(events);
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
  fonts?.addEventListener?.('loadingdone', onFonts);
  void opts.ready?.then(refresh, () => undefined);
  recompute();

  return () => {
    disposed = true;
    map.off(events);
    fonts?.removeEventListener?.('loadingdone', onFonts);
    layer.remove();
    els.clear();
    shown.clear();
  };
}
