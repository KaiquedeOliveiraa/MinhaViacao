import { importText } from '../save/file';
import type { ParseError } from '../save/schema';
import type { SaveStorage } from '../save/storage';
import type { Catalog, GameState } from '../sim/types';
import { renderSiteHeader } from './brand';
import { createLoop } from '../game/loop';
import { createStore } from '../game/store';
import { mountMap } from '../map/mapView';
import { createGame } from '../sim/newGame';
import { busSvg } from './busSvg';
import { renderCreateCompany } from './createCompany';
import { h } from './dom';
import { formatMoney } from './format';
import { renderInstallCard } from './installCard';
import { renderStartScreen } from './startScreen';
import { renderStatsBlock } from './statsBlock';
import { applyTheme, DEFAULT_PRIMARY, DEFAULT_SECONDARY } from './theme';

export type Screen = 'start' | 'create' | 'game';
export interface AppDeps { catalog: Catalog; storage: SaveStorage; }

export const MAX_IMPORT_BYTES = 2_000_000;
const DAMAGED_NOTICE = 'Seu jogo salvo não pôde ser lido. Ele continua guardado neste navegador; você pode importar um arquivo exportado.';
const IMPORT_ERRORS: Record<ParseError, string> = {
  formato: 'Esse arquivo não é um jogo salvo do Minha Viação.',
  versao_futura: 'Esse jogo foi salvo por uma versão mais nova do Minha Viação.',
  referencia: 'Esse jogo salvo usa cidades ou ônibus que esta versão não conhece.',
};

export function mountApp(root: HTMLElement, deps: AppDeps): { go(screen: Screen): void } {
  const loaded = deps.storage.load(deps.catalog);
  let saved: GameState | null = loaded.state;
  let notice: string | null = loaded.state === null && loaded.damaged ? DAMAGED_NOTICE : null;

  async function importFile(file: File) {
    if (file.size > MAX_IMPORT_BYTES) { notice = 'Esse arquivo é grande demais para ser um jogo salvo.'; go('start'); return; }
    if (saved && !window.confirm(`Importar vai substituir o jogo de ${saved.company.name}. Continuar?`)) return;
    const result = importText(await file.text(), deps.catalog);
    if (!result.ok) { notice = IMPORT_ERRORS[result.error]; go('start'); return; }
    saved = result.state;
    notice = null;
    deps.storage.save(saved);
    go('game');
  }

  function renderStart(): HTMLElement {
    return h('div', { class: 'start-page' },
      renderSiteHeader(),
      h('main', { class: 'start-grid' },
        renderStartScreen({
          savedName: saved?.company.name ?? null,
          notice,
          onStart: () => {
            if (saved && !window.confirm(`Isso apaga a viação ${saved.company.name}. Continuar?`)) return;
            go('create');
          },
          onContinue: () => go('game'),
          onImport: (file) => { void importFile(file); },
          art: heroBus(),
        }),
        h('div', { class: 'start-side' }, renderStatsBlock(deps.catalog), renderInstallCard()),
      ),
    );
  }

  /** O ônibus do cartão principal: na pintura da viação salva, ou laranja e branco. */
  function heroBus(): SVGSVGElement {
    const company = saved?.company;
    return busSvg(company
      ? { shape: 'rodo', primary: company.primaryColor, secondary: company.secondaryColor, livery: company.defaultLivery, logo: company.logo }
      : { shape: 'rodo', primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY, livery: 'diagonal', logo: { kind: 'icon', iconId: 'bus' } });
  }

  function renderCreate(): HTMLElement {
    return renderCreateCompany({
      catalog: deps.catalog,
      mode: 'create',
      onCancel: () => go('start'),
      onSubmit: (input) => {
        saved = createGame(deps.catalog, input);
        notice = null;
        deps.storage.save(saved);
        go('game');
      },
    });
  }

  /** Tela do jogo: cria o store e o laço; devolve a função que desmonta tudo. */
  function mountGame(state: GameState): () => void {
    const store = createStore(deps.catalog, state);
    const cash = h('span', { class: 'cash', dataset: { live: 'cash' } });
    const updateCash = () => {
      const cents = store.getState().cashCents;
      cash.textContent = formatMoney(cents);
      cash.classList.toggle('is-negative', cents < 0);
    };
    const mapSlot = h('div', { class: 'game-map' });
    const view = h('div', { class: 'game-screen' },
      h('header', { class: 'game-top' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-compact', onClick: () => go('start') }, 'Sair'),
        h('span', { class: 'game-name' }, store.getState().company.name),
        cash,
      ),
      mapSlot,
      h('aside', { class: 'game-panel' }),
    );
    root.replaceChildren(view);
    updateCash();
    const offTick = store.on('tick', updateCash);
    const offChange = store.on('change', updateCash);
    const unmountMap = mountMap(mapSlot, store);
    const loop = createLoop(store);
    loop.start();
    return () => {
      loop.stop();
      offTick();
      offChange();
      unmountMap();
      saved = store.getState();
      deps.storage.save(saved);
    };
  }

  let teardown: (() => void) | null = null;

  function go(screen: Screen) {
    teardown?.();
    teardown = null;
    if (screen !== 'create') applyTheme(document.documentElement, screen === 'start' ? null : saved?.company ?? null);
    if (screen === 'game' && saved) {
      teardown = mountGame(saved);
    } else {
      root.replaceChildren(screen === 'create' ? renderCreate() : renderStart());
    }
    window.scrollTo?.(0, 0);
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('galeria')) {
    void import('./gallery').then(({ renderGallery }) => root.replaceChildren(renderGallery()));
    return { go };
  }
  go('start');
  return { go };
}
