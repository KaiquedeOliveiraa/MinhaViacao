/**
 * Compara o desenho de um modelo com a referência de proporção (npm run compare:bus <modelo> <rodada>).
 * Não builda nada: sobe `vite preview` do dist/ atual (rode `npm run build` antes) numa porta livre, abre
 * /?galeria&comparar com densidade 3, recorta o ônibus do modelo (pintura lisa, cores neutras, sem logo) e monta,
 * na mesma escala (comprimento da carroceria igual), a referência, o desenho, a sobreposição e a imagem de apoio.
 * Saída: .superpowers/comparacoes/<modelo>-r<rodada>.png (fora do git). As referências ficam em docs/referencias/onibus/
 * (fora do git) e só servem para olhar: nada delas é copiado para o desenho.
 *
 * Usa PW_CHANNEL (ex.: msedge) se definido.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = resolve(import.meta.dirname, '..');
const REF_DIR = join(ROOT, 'docs/referencias/onibus');
const OUT_DIR = join(ROOT, '.superpowers/comparacoes');

/** Vista lateral medida na referência, em pixels da imagem (as mesmas medidas do refScale em src/ui/busSvg.ts). */
interface RefSide { front: number; rear: number; top: number; ground: number }
interface Ref { file: string; side?: RefSide; support?: string }

const REFS: Record<string, Ref | null> = {
  conv: { file: 'urbano_parque.png', side: { front: 233, rear: 15, top: 12, ground: 78 } },
  rodo: { file: 'rodoviario_caxiense.png', side: { front: 1238, rear: 83, top: 80, ground: 394.5 }, support: 'rodoviario_g7.png' },
  dd: { file: 'dd_dragao.jpg', side: { front: 540, rear: 29, top: 18, ground: 161.5 }, support: 'dd_catarinense.png' },
  micro: { file: 'micro_048.jfif', side: { front: 490, rear: 21.5, top: 135, ground: 286.5 }, support: 'micro_volare.jfif' },
  van: null,
};

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.jfif': 'image/jpeg' };

function dataUrl(file: string): string {
  const mime = MIME[extname(file).toLowerCase()];
  if (!mime) throw new Error(`formato de imagem não suportado: ${file}`);
  return `data:${mime};base64,${readFileSync(file).toString('base64')}`;
}

function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(p) : statSync(p).mtimeMs);
  }
  return newest;
}

function freePort(): Promise<number> {
  return new Promise((ok, fail) => {
    const srv = createServer();
    srv.once('error', fail);
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      srv.close(() => ok(port));
    });
  });
}

async function waitForServer(url: string): Promise<void> {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) return; } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('vite preview não respondeu');
}

/** Medidas do ônibus desenhado, em unidades do viewBox e na captura. */
interface Drawn { png: string; pxPerUnit: number; padX: number; padY: number; x0: number; x1: number; top: number; ground: number; axles: number[] }

const UNIT_PX = 3; // px de CSS por unidade do viewBox (o svg fica com 960 px de largura)
const DPR = 3;

async function main() {
  const [model, round] = process.argv.slice(2);
  if (!model || !(model in REFS) || !round || !/^\d+$/.test(round)) {
    console.error(`uso: npm run compare:bus <${Object.keys(REFS).join('|')}> <rodada>`);
    process.exit(1);
  }
  const ref = REFS[model]!;
  const dist = join(ROOT, 'dist/index.html');
  if (!existsSync(dist)) throw new Error('dist/ não existe: rode npm run build antes');
  if (newestMtime(join(ROOT, 'src')) > statSync(dist).mtimeMs) console.warn('aviso: src/ mudou depois do último build; rode npm run build para comparar o desenho atual');
  if (ref && !existsSync(join(REF_DIR, ref.file))) throw new Error(`referência não encontrada: docs/referencias/onibus/${ref.file}`);

  const port = await freePort();
  const base = `http://localhost:${port}/`;
  // node direto (sem shell): assim server.kill() derruba o próprio vite e nada fica ouvindo na porta
  const server = spawn(process.execPath, [join(ROOT, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  mkdirSync(OUT_DIR, { recursive: true });
  const tmpHtml = join(OUT_DIR, `tmp-compare-${model}.html`);
  try {
    await waitForServer(base);
    const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
    const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: DPR });
    const page = await context.newPage();
    await page.goto(`${base}?galeria&comparar`);
    const figure = page.locator(`[data-compare] figure[data-shape="${model}"]`);
    await figure.waitFor();
    // só o desenho fica visível, a 960 px de largura, sobre fundo transparente (a captura sai sem o resto da página)
    const target = `[data-compare] figure[data-shape="${model}"]`;
    await page.addStyleTag({ content: `
      html, body, .start-page { background: transparent !important; }
      body * { visibility: hidden !important; }
      ${target}, ${target} * { visibility: visible !important; }
      ${target} { position: fixed; left: 60px; top: 60px; z-index: 10; margin: 0; padding: 0; background: transparent; border: 0; box-shadow: none; }
      ${target} .bus-svg { width: ${320 * UNIT_PX}px; max-width: none; max-height: none; }
      ${target} figcaption { display: none; }` });
    await page.evaluate(() => document.fonts.ready);
    const m = await figure.locator('svg').evaluate((el) => {
      const svgEl = el as SVGSVGElement;
      const body = svgEl.querySelector<SVGGraphicsElement>('[data-region="body"]')!.getBBox();
      const tires = [...svgEl.querySelectorAll<SVGCircleElement>('circle.tire')];
      const rect = svgEl.getBoundingClientRect();
      return {
        left: rect.left, top: rect.top, width: rect.width,
        x0: body.x, x1: body.x + body.width, top0: body.y,
        ground: Math.max(...tires.map((t) => t.cy.baseVal.value + t.r.baseVal.value)),
        axles: tires.map((t) => t.cx.baseVal.value),
      };
    });
    const unit = m.width / 320;
    const padX = 14, padY = 8; // folga em volta do viewBox (retrovisor, sombra no chão)
    const shot = await page.screenshot({ omitBackground: true, clip: { x: m.left - padX * unit, y: m.top - padY * unit, width: m.width + 2 * padX * unit, height: 120 * unit + 2 * padY * unit } });
    const drawn: Drawn = {
      png: `data:image/png;base64,${shot.toString('base64')}`, pxPerUnit: unit * DPR, padX, padY,
      x0: m.x0, x1: m.x1, top: m.top0, ground: m.ground, axles: m.axles,
    };

    // composição num HTML temporário (fora do git) com canvas; o PNG sai de canvas.toDataURL
    const refData = ref ? { src: dataUrl(join(REF_DIR, ref.file)), side: ref.side ?? null, name: ref.file } : null;
    const support = ref?.support && existsSync(join(REF_DIR, ref.support)) ? { src: dataUrl(join(REF_DIR, ref.support)), name: ref.support } : null;
    writeFileSync(tmpHtml, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff"><canvas id="c"></canvas>
<script>window.INPUT = ${JSON.stringify({ model, round, drawn, ref: refData, support })};</script>
<script>${composeSource}</script>`);
    const comp = await context.newPage();
    await comp.goto(pathToFileURL(tmpHtml).href);
    const png = await comp.evaluate(() => (window as unknown as { RESULT: Promise<string> }).RESULT);
    const out = join(OUT_DIR, `${model}-r${round}.png`);
    writeFileSync(out, Buffer.from(png.replace(/^data:image\/png;base64,/, ''), 'base64'));
    console.log(`comparação salva em ${out}`);
    await browser.close();
  } finally {
    server.kill();
    rmSync(tmpHtml, { force: true });
  }
}

/** Roda dentro do HTML temporário: desenha os painéis num canvas e devolve o PNG em window.RESULT. */
const composeSource = String.raw`
(function () {
  const { model, round, drawn, ref, support } = window.INPUT;
  const L = 1400;            // comprimento da carroceria em px em todos os painéis
  const M = 60;              // margem lateral
  const W = L + 2 * M + 120;
  const load = (src) => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
  window.RESULT = (async () => {
    const bus = await load(drawn.png);
    const refImg = ref ? await load(ref.src) : null;
    const supImg = support ? await load(support.src) : null;
    // desenho: escala para o comprimento L; posição da traseira (x0) e do chão em px da captura
    const k = L / ((drawn.x1 - drawn.x0) * drawn.pxPerUnit);
    const bx = (u) => (u + drawn.padX) * drawn.pxPerUnit * k;      // unidade do viewBox -> px no painel (antes de deslocar)
    const by = (u) => (u + drawn.padY) * drawn.pxPerUnit * k;
    const busW = bus.width * k, busH = bus.height * k;
    const busPanelH = busH;
    // referência: recorte da vista lateral medida, na mesma escala
    let side = null;
    if (refImg && ref.side) {
      const s = ref.side, len = Math.abs(s.front - s.rear), kr = L / len, flip = s.front < s.rear;
      const padPx = len * 0.06, left = Math.min(s.front, s.rear) - padPx, right = Math.max(s.front, s.rear) + padPx;
      const top = s.top - (s.ground - s.top) * 0.18, bottom = s.ground + (s.ground - s.top) * 0.08;
      side = { s, kr, flip, sx: Math.max(0, left), sy: Math.max(0, top), sw: Math.min(refImg.width, right) - Math.max(0, left), sh: Math.min(refImg.height, bottom) - Math.max(0, top) };
    }
    const LABEL = 34;
    const panels = [];
    if (side) panels.push({ kind: 'ref', h: side.sh * side.kr });
    else if (refImg) panels.push({ kind: 'reffull', h: refImg.height * (L + 120) / refImg.width });
    panels.push({ kind: 'bus', h: busPanelH });
    if (side) panels.push({ kind: 'overlay', h: Math.max(side.sh * side.kr, busPanelH) });
    if (supImg) panels.push({ kind: 'support', h: supImg.height * (L + 120) / supImg.width });
    const H = panels.reduce((a, p) => a + p.h + LABEL + 24, 70);
    const c = document.getElementById('c');
    c.width = W; c.height = Math.ceil(H);
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#111'; g.font = 'bold 30px sans-serif';
    g.fillText(model + ' · rodada ' + round + (ref ? ' · referência ' + ref.name : ' · sem referência'), M, 46);
    let y = 70;
    const rearX = M + 60; // onde fica a traseira da carroceria
    const label = (t) => { g.fillStyle = '#444'; g.font = '24px sans-serif'; g.fillText(t, M, y + 26); y += LABEL; };
    // desenha a referência recortada com a traseira em rearX e o chão em groundY
    const drawRef = (groundY, alpha) => {
      const s = side.s, kr = side.kr;
      g.save(); g.globalAlpha = alpha;
      if (!side.flip) g.drawImage(refImg, side.sx, side.sy, side.sw, side.sh, rearX - (s.rear - side.sx) * kr, groundY - (s.ground - side.sy) * kr, side.sw * kr, side.sh * kr);
      else { g.translate(rearX + (side.sx + side.sw - s.rear) * kr, 0); g.scale(-1, 1); g.drawImage(refImg, side.sx, side.sy, side.sw, side.sh, 0, groundY - (s.ground - side.sy) * kr, side.sw * kr, side.sh * kr); }
      g.restore();
    };
    const drawBus = (groundY, alpha) => {
      g.save(); g.globalAlpha = alpha;
      g.drawImage(bus, rearX - bx(drawn.x0), groundY - by(drawn.ground), busW, busH);
      g.restore();
    };
    const guides = (top, groundY) => {
      g.save(); g.strokeStyle = 'rgba(220,0,90,0.55)'; g.lineWidth = 1.5; g.setLineDash([8, 6]);
      for (const yy of [top, groundY]) { g.beginPath(); g.moveTo(M, yy); g.lineTo(W - M, yy); g.stroke(); }
      for (const xx of [rearX, rearX + L]) { g.beginPath(); g.moveTo(xx, top - 20); g.lineTo(xx, groundY + 10); g.stroke(); }
      g.restore();
    };
    for (const p of panels) {
      if (p.kind === 'ref') {
        label('Referência (vista lateral medida) — só para olhar');
        const groundY = y + (side.s.ground - side.sy) * side.kr;
        drawRef(groundY, 1);
        guides(groundY - (side.s.ground - side.s.top) * side.kr, groundY);
      } else if (p.kind === 'reffull') {
        label('Referência (inteira, ainda sem medidas da vista lateral)');
        g.drawImage(refImg, M, y, L + 120, p.h);
      } else if (p.kind === 'bus') {
        label('Desenho (pintura lisa, cores neutras)');
        const groundY = y + by(drawn.ground);
        drawBus(groundY, 1);
        guides(groundY - (drawn.ground - drawn.top) * drawn.pxPerUnit * k, groundY);
      } else if (p.kind === 'overlay') {
        label('Sobreposição (desenho a 60% sobre a referência)');
        const groundY = y + Math.max((side.s.ground - side.sy) * side.kr, by(drawn.ground));
        drawRef(groundY, 1);
        drawBus(groundY, 0.6);
      } else {
        label('Apoio: ' + support.name);
        g.drawImage(supImg, M, y, L + 120, p.h);
      }
      y += p.h + 24;
    }
    return c.toDataURL('image/png');
  })();
})();
`;

main().catch((e) => { console.error(e); process.exit(1); });
