export type Child = Node | string | number | null | false | undefined;

const FORBIDDEN = new Set(['innerHTML', 'outerHTML']);

/**
 * Cria um elemento. Textos entram sempre como nó de texto, nunca como HTML.
 * attrs: 'class', 'dataset' (objeto), 'on<Evento>' (função); o resto vira setAttribute.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, unknown> | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (FORBIDDEN.has(key)) throw new Error(`atributo proibido: ${key}`);
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class') el.className = String(value);
      else if (key === 'dataset') Object.assign(el.dataset, value as Record<string, string>);
      else if (/^on[A-Z]/.test(key) && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  append(el, ...children);
  return el;
}

export function append(parent: Node, ...children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  }
}

/** Cria um elemento SVG (sem conteúdo do jogador). */
export function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, ...children: SVGElement[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  for (const child of children) el.appendChild(child);
  return el;
}
