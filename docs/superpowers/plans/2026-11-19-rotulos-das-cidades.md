# Rótulos das cidades no mapa — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nomes das 295 cidades de SC aparecem por nível de zoom (de longe só as maiores), sem colidir entre si nem ficar cortados na borda, com as 4 jogáveis destacadas.

**Architecture:** A população entra nos dados do mapa (`npm run map`). Uma função pura escolhe quais rótulos mostrar e de que lado de cada ponto (prioridade: jogáveis, depois população; caixas que não se sobrepõem e cabem na tela). Uma camada DOM própria num pane do Leaflet desenha só os rótulos escolhidos e recalcula ao terminar zoom/arraste.

**Tech Stack:** TypeScript, Leaflet 1.9, Vitest (+ jsdom), Playwright.

**Spec:** pedido do Kaique de 19/11/2026 (registrado no ledger `.superpowers/sdd/2026-11-19-rotulos/progress.md`); design visual do mapa em `docs/superpowers/specs/2026-11-18-fase-2-design.md`.

## Global Constraints

- `npm test`, `npm run build` e `PW_CHANNEL=msedge npm run e2e` passam. Um commit, mensagem em português terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sem push (o controlador faz).
- Cores só por variáveis CSS em `src/ui/tokens.css`. Sem dependência nova.
- Nome de cidade entra no DOM só por `h()`/`textContent`.
- O p95 de quadros da medição `npm run measure:map` (Edge, 390×844 @3x, CPU 4× mais lenta) não pode piorar. Referência atual (19/11, commit dc69635): 138,8 q/s; mediana 6,9 ms; p95 7,0 ms; 0 de 1145 quadros > 33 ms; mapa 66,1 KB.
- Celular a partir de 360 px sem rolagem horizontal.

## Review Focus

1. **Rótulo de cidade jogável perto da borda** (Florianópolis no celular) — escolhe outro lado e nunca sai cortado.
2. **Duas jogáveis muito próximas** (Blumenau e Itajaí no zoom inicial do celular) — não se sobrepõem; uma muda de lado ou a de menor prioridade cede.
3. **Zoom/arraste rápidos e repetidos** — recálculo só no fim do movimento; nada de trabalho por quadro.
4. **Arquivo de geometria sem a população** (cache antigo, rede) — o mapa continua funcionando, sem rótulos das não jogáveis.
5. **Sair e voltar para a tela do jogo** — nenhum listener ou elemento sobra.

---

### Task 1: Rótulos das cidades por zoom, sem colisão nem corte

**Files:**
- Modify: `scripts/generate-map.ts` (população), `public/map/sc-municipios.json` (regerado), `src/map/baseMap.ts` (expor os municípios carregados), `src/map/mapView.ts`, `src/ui/tokens.css`, `src/ui/styles.css`, `e2e/smoke.spec.ts`, `README.md` (fonte da população)
- Create: `src/map/labels.ts` (função pura), `src/map/labels.test.ts`, `src/map/labelLayer.ts` (camada DOM no Leaflet)

**Interfaces:**
- Produces: `properties.pop: number` em cada município de `sc-municipios.json` (Censo 2022, IBGE: `https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N6%5BN3%5B42%5D%5D` → `[0].resultados[0].series[]` com `localidade.id` e `serie['2022']`; conferido em 19/11: 295 municípios, Blumenau 361261).
- Produces (`src/map/labels.ts`):
  - `export interface LabelCandidate { id: string; text: string; x: number; y: number; priority: number; playable: boolean; width: number; height: number }` (x/y = ponto da cidade em pixels da tela).
  - `export type LabelSide = 'right' | 'left' | 'top' | 'bottom';`
  - `export interface PlacedLabel { id: string; side: LabelSide; box: { x: number; y: number; w: number; h: number } }`
  - `export function minPopulationForZoom(zoom: number): number` — zoom ≤ 7: 150 000; 8: 50 000; 9: 20 000; 10: 8 000; ≥ 11: 0 (todas).
  - `export function placeLabels(cands: LabelCandidate[], view: { width: number; height: number }, gap?: number): PlacedLabel[]` — guloso: ordena jogáveis primeiro e depois por `priority` (população) decrescente; para cada candidato tenta os lados na ordem right, left, top, bottom; aceita o primeiro cuja caixa fica inteira dentro de `view` (margem de 4 px) e não cruza nenhuma caixa já aceita nem os pontos das jogáveis; se nenhum lado serve, a cidade fica sem rótulo — exceto jogável, que pega o lado que fica inteiro na tela com menor sobreposição (jogável nunca some e nunca fica cortada).
- Produces: `mountCityLabels(map: L.Map, opts: { towns: () => TownLabel[]; measure?: (text: string, playable: boolean) => { width: number; height: number } }): () => void` em `labelLayer.ts`, com `TownLabel = { id: string; name: string; lat: number; lng: number; pop: number; playable: boolean }`. Recalcula em `zoomend`, `moveend`, `resize` e quando os municípios terminam de carregar; esconde os rótulos durante a animação de zoom (`zoomstart`); devolve a função que tira listeners e elementos.
- Consumes: `addBaseMap` (Task 2 da fase 2) — passa a devolver/repassar os municípios carregados (id, nome, centro, pop) para a camada de rótulos, sem mudar o "nunca rejeita".

Visual: rótulos das não jogáveis em cinza discreto (token novo `--map-town-label`, fonte pequena ~11 px, sem caixa, com contorno escuro sutil para ler sobre o mapa); as 4 jogáveis continuam com o estilo atual de destaque (os tooltips permanentes do Leaflet saem — a camada nova desenha as jogáveis também, para a colisão valer entre todas). Clique nas jogáveis continua no ponto (o rótulo não precisa ser clicável).

- [ ] **Step 1: Testes de `labels.ts`**: `minPopulationForZoom` nos zooms 6, 8, 11; duas caixas que colidem → a de menor prioridade muda de lado ou some; candidato perto da borda direita → lado `left`; jogável sempre colocada e dentro da tela mesmo cercada; ordem estável (mesma entrada → mesma saída).
- [ ] **Step 2:** `npx vitest run src/map/labels.test.ts` falha; implementar; passa.
- [ ] **Step 3:** População no `generate-map.ts`; rodar `npm run map`; conferir 295 municípios com `pop` > 0 e anotar os novos tamanhos (cru e gzip).
- [ ] **Step 4:** `labelLayer.ts` + integração em `mapView.ts` (remover os `bindTooltip` permanentes das jogáveis), tokens e CSS. Teste jsdom de que desmontar remove listeners/elementos.
- [ ] **Step 5: Conferência visual** (Edge, 390×844 e 1440×900): zoom inicial, um zoom a mais, zoom máximo. Conferir: BLUMENAU e ITAJAÍ sem sobreposição no celular; FLORIANÓPOLIS inteira; cinzas discretos; sem rótulo cortado na borda. Capturas fora do repositório.
- [ ] **Step 6: Medição:** `npm run build && PW_CHANNEL=msedge npm run measure:map` três vezes; anotar números; p95 não pode ficar acima da referência (7,0–7,1 ms). Se piorar, investigar antes de seguir.
- [ ] **Step 7:** e2e: no celular, os rótulos das 4 jogáveis estão visíveis, dentro da tela e sem se sobrepor (comparar `getBoundingClientRect`). `npm test`, `npm run build`, e2e passam.
- [ ] **Step 8: Commit** `feat: nomes das cidades no mapa por zoom, sem colisão nem corte`.
