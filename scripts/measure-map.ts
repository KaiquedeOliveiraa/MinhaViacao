/**
 * Mede o mapa num celular simulado (npm run measure:map):
 * tela 390×844 com densidade 3, CPU 4× mais lenta (Chrome DevTools), 8 s de zoom e arraste.
 * Imprime quadros por segundo, quadros lentos e os bytes baixados pelo mapa.
 *
 * Requer um build em dist/ (npm run build). Usa PW_CHANNEL (ex.: msedge) se definido.
 */
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { assignBus, buyBus, openLine } from '../src/sim/actions';
import { catalog, nearestCity, startModel } from '../src/sim/catalog';
import { createGame } from '../src/sim/newGame';
import { serialize } from '../src/save/schema';
import { testCompany } from '../src/sim/testkit';
import type { GameState } from '../src/sim/types';

const PORT = 4174;
const URL = `http://localhost:${PORT}/`;
const CPU_SLOWDOWN = 4;
const SECONDS = 8;

/** Jogo com sede em Blumenau e um ônibus rodando na linha inicial. */
function gameWithBus(): GameState {
  let s = createGame(catalog, { ...testCompany, hqCityId: 'blumenau' });
  if (s.buses.length === 0) {
    s = { ...s, cashCents: 100_000_000 };
    const bought = buyBus(s, catalog, { modelId: startModel(catalog).id });
    if (bought.ok) s = bought.state;
  }
  if (s.lines.length === 0) {
    const opened = openLine(s, catalog, { a: 'blumenau', b: nearestCity(catalog, 'blumenau') });
    if (opened.ok) s = opened.state;
  }
  const idle = s.buses.find((b) => b.lineId === null);
  if (idle && s.lines[0]) {
    const assigned = assignBus(s, catalog, idle.id, s.lines[0].id);
    if (assigned.ok) s = assigned.state;
  }
  return s;
}

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(URL)).ok) return; } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('vite preview não respondeu');
}

async function main() {
  // node direto (sem shell): assim server.kill() derruba o próprio vite e nada fica ouvindo na porta
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
  try {
    await waitForServer();
    const browser = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: false, hasTouch: false });
    const save = serialize(gameWithBus());
    await context.addInitScript((text) => { localStorage.setItem('minhaviacao:save', text); }, save);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    const urls = new Map<string, string>();
    let mapBytes = 0;
    let totalBytes = 0;
    cdp.on('Network.responseReceived', (e) => { urls.set(e.requestId, e.response.url); });
    cdp.on('Network.loadingFinished', (e) => {
      const url = urls.get(e.requestId) ?? '';
      totalBytes += e.encodedDataLength;
      if (/arcgisonline|cartocdn|\/map\/|tile/i.test(url)) mapBytes += e.encodedDataLength;
    });

    await page.goto(URL);
    await page.getByRole('button', { name: /^Continuar/ }).click();
    await page.locator('.leaflet-container').waitFor();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    const loadMapBytes = mapBytes;

    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
    // texto puro: o tsx renomeia funções (__name) e quebraria um callback passado ao navegador
    await page.evaluate(`(() => {
      window.__frames = [];
      window.__run = true;
      const loop = (t) => { window.__frames.push(t); if (window.__run) requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    })()`);

    const box = (await page.locator('.leaflet-container').boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const started = Date.now();
    let step = 0;
    while (Date.now() - started < SECONDS * 1000) {
      const phase = step % 4;
      await page.mouse.move(cx, cy);
      if (phase === 0 || phase === 2) {
        await page.mouse.wheel(0, phase === 0 ? -240 : 240); // zoom in / out
        await page.waitForTimeout(350);
      } else {
        await page.mouse.down();
        for (let i = 1; i <= 12; i++) await page.mouse.move(cx + (phase === 1 ? 10 : -10) * i, cy + (phase === 1 ? 6 : -6) * i);
        await page.mouse.up();
        await page.waitForTimeout(150);
      }
      step++;
    }

    const frames = (await page.evaluate('(() => { window.__run = false; return window.__frames; })()')) as number[];
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.waitForLoadState('networkidle').catch(() => undefined);

    const deltas = frames.slice(1).map((t, i) => t - frames[i]!).sort((a, b) => a - b);
    const duration = (frames.at(-1)! - frames[0]!) / 1000;
    const p = (q: number) => deltas[Math.min(deltas.length - 1, Math.floor(deltas.length * q))]!;
    const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
    console.log(`CPU ${CPU_SLOWDOWN}× mais lenta, 390×844 @3x, ${SECONDS} s de zoom e arraste`);
    console.log(`  quadros/s médio: ${(deltas.length / duration).toFixed(1)}`);
    console.log(`  tempo de quadro: mediana ${p(0.5).toFixed(1)} ms, p95 ${p(0.95).toFixed(1)} ms`);
    console.log(`  quadros acima de 33 ms: ${deltas.filter((d) => d > 33.4).length} de ${deltas.length}`);
    console.log(`  bytes do mapa ao abrir: ${kb(loadMapBytes)}; depois do zoom e arraste: ${kb(mapBytes)}`);
    console.log(`  bytes totais da página: ${kb(totalBytes)}`);
    await browser.close();
  } finally {
    server.kill();
  }
}

void main();
