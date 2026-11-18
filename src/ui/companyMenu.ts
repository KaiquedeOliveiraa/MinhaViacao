import type { Store } from '../game/store';
import { exportBlob, exportFileName, importText } from '../save/file';
import type { ParseError } from '../save/schema';
import type { SaveStorage } from '../save/storage';
import { confirmDialog } from './dialog';
import { h } from './dom';
import { renderInstallCard } from './installCard';
import { logoView } from './logoView';
import { toast } from './toast';

export interface MenuDeps { store: Store; storage: SaveStorage; onEditIdentity(): void; onExit(): void; onNewGame(): void; }

export const MAX_IMPORT_BYTES = 2_000_000;
export const IMPORT_ERRORS: Record<ParseError, string> = {
  formato: 'Esse arquivo não é um jogo salvo válido.',
  referencia: 'Esse arquivo não é um jogo salvo válido.',
  versao_futura: 'Esse jogo salvo é de uma versão mais nova do jogo.',
};

/** Troca o jogo atual pelo arquivo importado. Arquivo inválido não toca no jogo. */
export function importIntoGame(store: Store, storage: SaveStorage, text: string): boolean {
  const result = importText(text, store.catalog);
  if (!result.ok) { toast(IMPORT_ERRORS[result.error], 'erro'); return false; }
  store.replace(result.state);
  storage.save(result.state);
  toast(`Jogo de ${result.state.company.name} importado.`, 'ok');
  return true;
}

/** Baixa o jogo salvo como arquivo .json. */
export function downloadSave(store: Store): void {
  const state = store.getState();
  const url = URL.createObjectURL(exportBlob(state));
  const a = h('a', { href: url, download: exportFileName(state) });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Pede um arquivo ao jogador e devolve o texto (ou null se cancelou / grande demais). */
export function pickSaveFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) { resolve(null); return; }
      if (file.size > MAX_IMPORT_BYTES) { toast('Esse arquivo é grande demais para ser um jogo salvo.', 'erro'); resolve(null); return; }
      resolve(await file.text());
    });
    document.body.appendChild(input);
    input.click();
  });
}

/** Menu da viação, aberto pelo botão à esquerda da logo. */
export function openCompanyMenu(deps: MenuDeps): void {
  const { store, storage } = deps;
  const company = store.getState().company;

  const close = () => { document.removeEventListener('keydown', onKey, true); backdrop.remove(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };

  const item = (key: string, label: string, hint: string, action: () => void | Promise<void>, danger = false) =>
    h('button', { type: 'button', class: `menu-item${danger ? ' is-danger' : ''}`, dataset: { menu: key }, onClick: () => { close(); void action(); } },
      h('span', { class: 'menu-label' }, label),
      h('span', { class: 'muted small' }, hint),
    );

  const items = [
    item('edit', 'Editar identidade', 'Nome, cores, logo e pintura', deps.onEditIdentity),
    item('export', 'Exportar jogo salvo', 'Baixa um arquivo de cópia', () => { downloadSave(store); toast('Arquivo do jogo baixado.', 'ok'); }),
    item('import', 'Importar jogo salvo', 'Troca a viação por um arquivo', async () => {
      if (!(await confirmDialog('Isso substitui a viação atual. Continuar?', 'Importar'))) return;
      const text = await pickSaveFile();
      if (text !== null) importIntoGame(store, storage, text);
    }),
    item('new', 'Novo jogo', 'Apaga esta viação', async () => {
      const ok = await confirmDialog(`Isso apaga a viação ${store.getState().company.name} e todo o progresso. Não dá para desfazer.`, 'Apagar');
      if (ok) deps.onNewGame();
    }, true),
    item('exit', 'Sair para a tela inicial', 'O jogo fica salvo', deps.onExit),
  ];

  const panel = h('div', { class: 'dialog-panel menu-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Menu da viação' },
    h('div', { class: 'menu-head' },
      logoView(company.logo, { primary: company.primaryColor, secondary: company.secondaryColor }, 44),
      h('span', { class: 'title menu-title' }, company.name),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Fechar menu', onClick: close }, '✕'),
    ),
    h('nav', { class: 'menu-list' }, ...items),
    renderInstallCard(),
  );
  const backdrop = h('div', { class: 'dialog-backdrop menu-backdrop', onClick: (e: Event) => { if (e.target === backdrop) close(); } }, panel);
  document.body.appendChild(backdrop);
  document.addEventListener('keydown', onKey, true);
  items[0]!.focus();
}
