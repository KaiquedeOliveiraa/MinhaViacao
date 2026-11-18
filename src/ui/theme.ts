import type { Company } from '../sim/types';

export const BG = '#0d0a14';
export const DEFAULT_ACCENT = '#8b7cf6';
export const DEFAULT_PRIMARY = '#ff7a00';
export const DEFAULT_SECONDARY = '#ffffff';

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
}

function luminance(hex: string): number {
  const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = parseHex(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Razão de contraste WCAG entre duas cores. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = luminance(hexA);
  const b = luminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Clareia a cor em passos de 10% na direção do branco até dar contraste 4,5 com o fundo. */
export function uiAccent(hex: string, bg: string = BG): string {
  const base = parseHex(hex);
  const original = toHex(base);
  if (contrastRatio(original, bg) >= 4.5) return original;
  for (let step = 1; step <= 10; step++) {
    const t = step / 10;
    const mixed = toHex(base.map((v) => v + (255 - v) * t) as Rgb);
    if (contrastRatio(mixed, bg) >= 4.5) return mixed;
  }
  return '#ffffff';
}

/** Cor do texto sobre a cor de destaque. */
export function onAccent(hex: string): '#000000' | '#ffffff' {
  return contrastRatio(hex, '#000000') >= contrastRatio(hex, '#ffffff') ? '#000000' : '#ffffff';
}

/** Define --accent, --on-accent, --brand-primary e --brand-secondary. Sem empresa, usa o padrão do jogo. */
export function applyTheme(root: HTMLElement, company: Pick<Company, 'primaryColor' | 'secondaryColor'> | null): void {
  const accent = company ? uiAccent(company.primaryColor) : DEFAULT_ACCENT;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--on-accent', onAccent(accent));
  root.style.setProperty('--brand-primary', company?.primaryColor ?? DEFAULT_PRIMARY);
  root.style.setProperty('--brand-secondary', company?.secondaryColor ?? DEFAULT_SECONDARY);
}
