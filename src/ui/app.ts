import { importText } from '../save/file';
import type { ParseError } from '../save/schema';
import type { SaveStorage } from '../save/storage';
import type { Catalog, GameState } from '../sim/types';
import { renderSiteHeader } from './brand';
import { busSvg } from './busSvg';
import { h } from './dom';
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
          onStart: () => go('create'),
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

  /** Provisório: as tarefas 12 a 16 substituem estas telas. */
  function renderPlaceholder(title: string): HTMLElement {
    return h('div', { class: 'start-page' },
      renderSiteHeader(),
      h('main', { class: 'placeholder' },
        h('section', { class: 'card card-stripe' },
          h('h2', { class: 'title' }, title),
          h('p', { class: 'muted' }, 'Esta tela ainda está em construção.'),
          h('div', { class: 'btn-stack' }, h('button', { class: 'btn btn-light', type: 'button', onClick: () => go('start') }, 'Voltar')),
        ),
      ),
    );
  }

  function go(screen: Screen) {
    applyTheme(document.documentElement, screen === 'start' ? null : saved?.company ?? null);
    const view = screen === 'start' ? renderStart() : renderPlaceholder(screen === 'create' ? 'Criar empresa' : 'Jogo');
    root.replaceChildren(view);
    window.scrollTo?.(0, 0);
  }

  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('galeria')) {
    void import('./gallery').then(({ renderGallery }) => root.replaceChildren(renderGallery()));
    return { go };
  }
  go('start');
  return { go };
}
