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

### Task 2: Convencional e rodoviário redesenhados pelas referências de proporção

Pedido do Kaique (19/11): refazer os SVGs seguindo proporção e silhueta das referências (comprimento × altura, posição e tamanho das janelas, rodas, para-brisa, saias), mantendo as camadas e as 4 pinturas; comparar por captura da galeria e iterar até 3 vezes por tipo; nomes fictícios; nada de logo, nome de empresa/fabricante/modelo, texto ou grafismo das referências.

Referências (só consulta local, ignoradas pelo git — NUNCA commitar nem copiar para outro lugar do repositório):
- Convencional urbano: `docs/referencias/Convencional urbano.png` (desenho de terceiros, vista lateral dos dois lados + frente/traseira).
- Rodoviário de um andar: `docs/referencias/Rodoviário de um andar.png` (base da silhueta) e `docs/referencias/Rodoviário de um andar 2.png` (apoio).
- Micro e van: SEM referência nesta rodada → desenho atual mantido (registrar "aguardam referência").

**Files:**
- Modify: `src/ui/busSvg.ts` (silhuetas `conv` e `rodo`), `src/ui/busSvg.test.ts`, `README.md` (créditos: linha exata `Referências de proporção: RJF Desenhos de ônibus (Ramon França)`)

**Interfaces:** `busSvg(art)` e o `viewBox` 320×120 inalterados; camadas `data-region` iguais (body, paint, stripe, skirt, windows, lights, logo, wheels). O número de eixos e a razão comprimento ÷ altura passam a seguir a referência base de cada tipo (medir na imagem: comprimento total ÷ altura da carroceria sem rodas, posição dos eixos como fração do comprimento, altura da faixa de janelas, recuo do para-brisa). Atualizar o teste de proporção com os valores medidos (anotar no relatório como mediu).

- [ ] **Step 1:** Medir as referências (proporções, eixos, janelas) e anotar no relatório.
- [ ] **Step 2:** Ajustar os testes de proporção/eixos para os valores medidos; ver falhar.
- [ ] **Step 3:** Redesenhar `conv` e `rodo`; galeria (`?galeria`) lado a lado com a referência em captura; até 3 iterações por tipo; anotar o que mudou em cada uma.
- [ ] **Step 4:** README (créditos). `npm test`, `npm run build`, e2e passam.
- [ ] **Step 5: Commit** `feat: convencional e rodoviário redesenhados pelas proporções de referência`.

### Task 3: Pinturas inspiradas em viações conhecidas na criação (opção a)

Pedido do Kaique (19/11): na criação da viação, abaixo das pinturas padrão, pinturas pré-definidas inspiradas em Catarinense, Reunidas, Gontijo, Águia Branca, Cometa, 1001 e Guanabara, com cores e formas PRÓPRIAS, sem reproduzir identidade visual real e sem logotipos; nomes num único arquivo de dados.

**Files:**
- Modify: `src/data/rivals.ts` (continua o ÚNICO arquivo com nomes reais: acrescentar `LIVERY_PRESETS`), `src/ui/createCompany.ts`, `src/ui/createCompany.test.ts`, `src/ui/styles.css`
- Test: `src/data/rivals.test.ts` ou o teste existente dos rivais

**Interfaces:**
- `export interface LiveryPreset { id: string; inspiredBy: string; primary: string; secondary: string; livery: LiveryStyle }` e `export const LIVERY_PRESETS: readonly LiveryPreset[]` (7 itens, na ordem: Catarinense, Reunidas, Gontijo, Águia Branca, Cometa, 1001, Guanabara; `inspiredBy` é o texto mostrado, ex.: "Catarinense").
- Cores: tons próprios, deliberadamente diferentes dos oficiais (outro matiz/saturação/combinação), em hex `#rrggbb` válido; estilo entre os 4 existentes (`plain`, `stripe`, `diagonal`, `wave`). Comentário no arquivo explicando que as cores são próprias e não reproduzem a identidade real.
- UI: seção "Inspiradas em viações conhecidas" logo abaixo de "Pintura padrão": um botão por preset com a miniatura (`liveryThumb`) nas cores do preset e o texto "Inspirada na <nome>" (ou "no" quando soar melhor — usar campo opcional `article?: 'na' | 'no'`); tocar aplica as duas cores e o estilo ao formulário (o jogador ainda pode mudar tudo depois). Nada de logo.
- Também no modo "Editar identidade" (mesma tela).

- [ ] **Step 1: Testes:** 7 presets, ids únicos, cores válidas (`isValidColor`), estilo válido (`isValidLivery`); na tela, tocar um preset muda as cores e o estilo do estado e da prévia, e o envio cria a empresa com eles; nomes vêm de `LIVERY_PRESETS` (sem literal de nome real nos testes).
- [ ] **Step 2:** Implementar; conferir em 360 px sem rolagem horizontal (captura).
- [ ] **Step 3:** `npm test`, `npm run build`, e2e passam. **Commit** `feat: pinturas inspiradas em viações conhecidas na criação`.

### Task 4 (EXTRA, só com 1–3 concluídas e verdes): Ônibus double deck (só o desenho)

Referências: `docs/referencias/ONIBUS DD.jpg` (base da silhueta) e `docs/referencias/ONIBUS DD 2.png` (apoio de detalhes). Mesmas regras de uso.

**Interfaces:** `BusShape` ganha `'dd'`; `BUS_SHAPES` inclui `'dd'`; silhueta de dois andares (duas faixas de janelas, eixos conforme a referência base), camadas e as 4 pinturas funcionando; aparece na galeria. NÃO entra no catálogo/loja (sem mecânica nova nesta rodada).

- [ ] **Step 1:** Testes (camadas, pinturas, eixos, proporção medida). **Step 2:** Desenho + galeria, até 3 iterações. **Step 3:** `npm test`, `npm run build`, e2e. **Commit** `feat: desenho do ônibus double deck na galeria`.
