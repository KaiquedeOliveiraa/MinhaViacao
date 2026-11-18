import '@fontsource-variable/inter';
import '@fontsource/barlow-condensed/800.css';
import './ui/tokens.css';
import './ui/styles.css';
import type { KeyValue } from './save/storage';
import { catalog } from './sim/catalog';
import { boot } from './ui/app';

/** localStorage pode lançar erro (aba anônima, dados bloqueados): nesse caso o jogo roda sem salvar. */
function browserKv(): KeyValue | null {
  try {
    const kv = window.localStorage;
    kv.getItem('minhaviacao:probe');
    return kv;
  } catch {
    return null;
  }
}

const root = document.querySelector<HTMLDivElement>('#app');
if (root) void boot(root, { catalog, kv: browserKv() });
