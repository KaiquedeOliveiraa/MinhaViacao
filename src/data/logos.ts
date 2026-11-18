import type { LogoIconId } from '../sim/types';

/** Ícones próprios, cada um um único `path` em 24×24, desenhado com fill-rule evenodd. */
export const LOGO_ICONS: Record<LogoIconId, { label: string; path: string }> = {
  wheel: {
    label: 'Roda com asas',
    path: 'M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zm0 3.3a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z'
      + 'M6.2 8.6H.8l1.4 1.6h3.7zM5.9 11.2H2.1l1.2 1.5h2.6zM6.2 13.8H3.4l1.1 1.4h2z'
      + 'M17.8 8.6h5.4l-1.4 1.6h-3.7zM18.1 11.2h3.8l-1.2 1.5h-2.6zM17.8 13.8h2.8l-1.1 1.4h-2z',
  },
  road: {
    label: 'Estrada',
    path: 'M8.6 3h6.8L21.5 21h-19zM11.3 5.5l-.2 3h1.8l-.2-3zM10.9 10.5l-.3 3.8h2.8l-.3-3.8zM10.4 16.3l-.3 3.7h3.8l-.3-3.7z',
  },
  bus: {
    label: 'Ônibus',
    path: 'M6 2.5h12a2.5 2.5 0 0 1 2.5 2.5v13a1 1 0 0 1-1 1h-1v2.5h-3V19h-7v2.5h-3V19h-1a1 1 0 0 1-1-1V5A2.5 2.5 0 0 1 6 2.5z'
      + 'M6.5 5.5v6h11v-6zM7.7 14a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6zM16.3 14a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6z',
  },
  pine: {
    label: 'Pinheiro',
    path: 'M12 1.5l5.2 6.3h-2.6l4.3 5.3h-2.6l4.9 5.6H13.2V22h-2.4v-3.3H3.8l4.9-5.6H6.1l4.3-5.3H7.8z',
  },
  mountain: {
    label: 'Montanha',
    path: 'M1.5 20.5L9 7.5l3.9 6.4 2.8-4.2 6.8 10.8zM9 7.5l-2.4 4.1 1.3-.7 1.1 1 1.1-1 1.2.7z',
  },
  wave: {
    label: 'Onda',
    path: 'M2 15.2c2.6 0 3.6-2.1 6.2-2.1s3.6 2.1 6.2 2.1 3.6-2.1 6.2-2.1c.6 0 1 .1 1.4.3V21H2z'
      + 'M2 12.6C4.6 6.4 10.8 3.2 16.4 5.2c-3.2.1-5.4 1.8-6 4.3 1.6-1.4 3.6-1.7 5.6-.8-2.6.4-4.4 2.3-4.9 4.6-2.8-1.6-6.1-2.2-9.1-.7z',
  },
};
