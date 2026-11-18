import '@fontsource-variable/inter';
import '@fontsource/barlow-condensed/800.css';
import './ui/tokens.css';
import './ui/styles.css';
import { createStorage, type SaveStorage } from './save/storage';
import { catalog } from './sim/catalog';
import { mountApp } from './ui/app';

function browserStorage(): SaveStorage {
  try {
    const kv = window.localStorage;
    kv.getItem('minhaviacao:probe');
    return createStorage(kv);
  } catch {
    return createStorage(null);
  }
}

const root = document.querySelector<HTMLDivElement>('#app');
if (root) mountApp(root, { catalog, storage: browserStorage() });
