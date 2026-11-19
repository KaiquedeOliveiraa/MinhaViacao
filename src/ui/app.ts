import { createLoop } from '../game/loop';
import { attachAutosave, createStore, type Store } from '../game/store';
import { acquireTabLock } from '../game/tabLock';
import { mountMap } from '../map/mapView';
import { importText } from '../save/file';
import { createStorage, type KeyValue, type SaveStorage } from '../save/storage';
import { updateCompany } from '../sim/actions';
import { createGame } from '../sim/newGame';
import type { Catalog, GameState } from '../sim/types';
import { renderSiteHeader } from './brand';
import { busSvg } from './busSvg';
import { IMPORT_ERRORS, MAX_IMPORT_BYTES, openCompanyMenu } from './companyMenu';
import { renderCreateCompany } from './createCompany';
import { confirmDialog } from './dialog';
import { h } from './dom';
import { errorMessage } from './format';
import { renderInstallCard } from './installCard';
import { openNewLineDialog } from './newLineDialog';
import { mountPanel } from './panel';
import { watchListingSales } from './saleNotice';
import { renderStartScreen } from './startScreen';
import { renderStatsBlock } from './statsBlock';
import { applyTheme, DEFAULT_PRIMARY, DEFAULT_SECONDARY } from './theme';
import { toast } from './toast';
import { mountTopBar } from './topBar';
import { mountTutorialCard } from './tutorialCard';

export type Screen = 'start' | 'create' | 'game';
export interface BootDeps { catalog: Catalog; kv: KeyValue | null; locks?: Pick<LockManager, 'request'>; }

const DAMAGED_NOTICE = 'Seu jogo salvo não pôde ser lido. Ele continua guardado neste navegador até você começar uma viação nova.';
const LOCKED_MESSAGE = 'O jogo já está aberto em outra aba. Feche a outra aba e recarregue esta.';
const SAVE_FAILED = 'Não foi possível salvar neste navegador. Exporte seu jogo pelo menu para não perder o progresso.';

/** Ponto de entrada: trava de aba, leitura do save e tela inicial. */
export async function boot(root: HTMLElement, deps: BootDeps): Promise<void> {
  if (!(await acquireTabLock(deps.locks))) {
    applyTheme(document.documentElement, null);
    root.replaceChildren(h('main', { class: 'locked-screen' },
      h('section', { class: 'card card-stripe' }, h('p', { class: 'lead' }, LOCKED_MESSAGE))));
    return;
  }
  startApp(root, deps.catalog, createStorage(deps.kv));
}

function startApp(root: HTMLElement, catalog: Catalog, storage: SaveStorage): void {
  const loaded = storage.load(catalog);
  let saved: GameState | null = loaded.state;
  let fromBackup = loaded.state !== null && loaded.source === 'backup';
  let notice: string | null = loaded.state === null && loaded.damaged ? DAMAGED_NOTICE : null;
  let teardown: ((opts?: { save?: boolean }) => void) | null = null;
  let saveWarned = false;
  /** O aviso de que não dá para salvar aparece uma única vez por sessão. */
  const warnSaveFailed = () => { if (saveWarned) return; saveWarned = true; toast(SAVE_FAILED, 'erro'); };

  async function importFile(file: File) {
    if (file.size > MAX_IMPORT_BYTES) { notice = 'Esse arquivo é grande demais para ser um jogo salvo.'; go('start'); return; }
    if (saved && !(await confirmDialog(`Importar vai substituir o jogo de ${saved.company.name}. Continuar?`, 'Importar'))) return;
    const result = importText(await file.text(), catalog);
    if (!result.ok) { notice = IMPORT_ERRORS[result.error]; go('start'); return; }
    saved = result.state;
    fromBackup = false;
    notice = null;
    storage.save(saved);
    go('game');
  }

  /** O ônibus do cartão principal: na pintura da viação salva, ou laranja e branco. */
  function heroBus(): SVGSVGElement {
    const company = saved?.company;
    return busSvg(company
      ? { shape: 'rodo', primary: company.primaryColor, secondary: company.secondaryColor, livery: company.defaultLivery, logo: company.logo }
      : { shape: 'rodo', primary: DEFAULT_PRIMARY, secondary: DEFAULT_SECONDARY, livery: 'diagonal', logo: { kind: 'icon', iconId: 'bus' } });
  }

  function renderStart(): HTMLElement {
    return h('div', { class: 'start-page' },
      renderSiteHeader(),
      h('main', { class: 'start-grid' },
        renderStartScreen({
          savedName: saved?.company.name ?? null,
          notice,
          onStart: async () => {
            if (saved && !(await confirmDialog(`Isso apaga a viação ${saved.company.name}. Continuar?`, 'Apagar e começar'))) return;
            go('create');
          },
          onContinue: () => {
            if (fromBackup) { toast('Recuperamos seu jogo da cópia de segurança.', 'info'); fromBackup = false; }
            go('game');
          },
          onImport: (file) => { void importFile(file); },
          art: heroBus(),
        }),
        h('div', { class: 'start-side' }, renderStatsBlock(catalog), renderInstallCard()),
      ),
    );
  }

  function renderCreate(): HTMLElement {
    return renderCreateCompany({
      catalog,
      mode: 'create',
      onCancel: () => go('start'),
      onSubmit: (input) => {
        saved = createGame(catalog, input);
        fromBackup = false;
        notice = null;
        if (!storage.save(saved)) warnSaveFailed();
        go('game');
      },
    });
  }

  /** Editar identidade: a tela de criação no modo edição, por cima do jogo (que continua rodando). */
  function openIdentityEditor(store: Store) {
    const company = store.getState().company;
    const close = () => { overlay.remove(); applyTheme(document.documentElement, store.getState().company); };
    const overlay = h('div', { class: 'identity-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Editar identidade' },
      renderCreateCompany({
        catalog,
        mode: 'edit',
        initial: company,
        onCancel: close,
        onSubmit: (input) => {
          const { hqCityId: _hq, ...patch } = input;
          const r = store.dispatch((s, c) => updateCompany(s, c, patch));
          if (!r.ok) { toast(errorMessage(r.error), 'erro'); return; }
          close();
          toast('Identidade atualizada.', 'ok');
        },
      }),
    );
    document.body.appendChild(overlay);
  }

  /** Tela do jogo: cria o store, o laço e o salvamento automático; devolve a função que desmonta tudo. */
  function mountGame(state: GameState): (opts?: { save?: boolean }) => void {
    const store = createStore(catalog, state);
    const topSlot = h('div', { class: 'game-top' });
    const mapSlot = h('div', { class: 'game-map' });
    const panelSlot = h('aside', { class: 'game-panel' });
    const tutorialSlot = h('div', { class: 'game-tutorial' });
    root.replaceChildren(h('div', { class: 'game-screen' }, topSlot, mapSlot, panelSlot, tutorialSlot));

    const detachAutosave = attachAutosave(store, storage, warnSaveFailed);
    const unmountTop = mountTopBar(topSlot, store, {
      onMenu: () => openCompanyMenu({
        store,
        storage,
        onEditIdentity: () => openIdentityEditor(store),
        onExit: () => go('start'),
        onNewGame: () => {
          teardown?.({ save: false });
          teardown = null;
          storage.clear();
          saved = null;
          notice = null;
          go('start');
        },
      }),
    });
    const unmountMap = mountMap(mapSlot, store);
    const panel = mountPanel(panelSlot, store);
    const unmountTutorial = mountTutorialCard(tutorialSlot, store, {
      openTab: (tab) => panel.select(tab),
      openNewLine: () => { void openNewLineDialog(store); },
    });
    const offTheme = store.on('change', () => {
      if (!document.querySelector('.identity-overlay')) applyTheme(document.documentElement, store.getState().company);
    });
    const unwatchSales = watchListingSales(store);
    const loop = createLoop(store);
    loop.start();

    return ({ save = true } = {}) => {
      loop.stop();
      offTheme();
      unwatchSales();
      detachAutosave();
      unmountTop();
      unmountTutorial();
      panel.unmount();
      unmountMap();
      if (save) {
        saved = store.getState();
        storage.save(saved);
      }
    };
  }

  function go(screen: Screen) {
    teardown?.();
    teardown = null;
    if (screen !== 'create') applyTheme(document.documentElement, screen === 'start' ? null : saved?.company ?? null);
    if (screen === 'game' && saved) {
      teardown = mountGame(saved);
    } else {
      root.replaceChildren(screen === 'create' ? renderCreate() : renderStart());
    }
    if (window.scrollY > 0) window.scrollTo(0, 0);
  }

  if (new URLSearchParams(window.location.search).has('galeria')) {
    void import('./gallery').then(({ renderGallery }) => root.replaceChildren(renderGallery()));
    return;
  }
  go('start');
}
