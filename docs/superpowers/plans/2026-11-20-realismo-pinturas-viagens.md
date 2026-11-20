# Realismo dos ônibus, pinturas de 3 cores, malha de rotas e viagens — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ônibus com aparência mais convincente (sem copiar ninguém), 8–10 pinturas novas de 3 cores com o save migrado, e um protótipo de fretamento eventual sobre uma malha viária que liga quaisquer duas das 295 cidades de SC.

**Architecture:** Desenho dos ônibus continua em `src/ui/busSvg.ts` (camadas, `refScale`), ganhando sombreamento e detalhes acima da camada de pintura e um nível simplificado para o mapa. Pinturas continuam em `paintZones`/`liveryThumb`, agora com 3 cores. A malha é um grafo estático gerado do OSM (`scripts/`), carregado sob demanda no navegador; um roteador (A*) atende o mapa e as propostas. Fretamento é estado novo do jogo (save v5), avançado pela simulação pura; propostas são geradas por uma ação pura que recebe o roteador.

**Tech Stack:** TypeScript, Vite, Leaflet, Vitest (+ jsdom), Playwright, tsx.

**Spec:** pedido do Kaique de 20/11/2026, registrado no ledger `.superpowers/sdd/2026-11-20-realismo-pinturas-viagens/progress.md` (texto integral das três fases); design base em `docs/superpowers/specs/2026-11-18-fase-2-design.md`.

## Global Constraints

- Cada tarefa: `npm test`, `npm run build` (tsc + vite) e `PW_CHANNEL=msedge npm run e2e` passam; um commit em português terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; sem push (o controlador faz).
- `docs/referencias/` NUNCA é commitada nem copiada para dentro do repositório rastreado. Referências = só medir proporções e entender elementos; proibido vetorizar automaticamente (potrace, vtracer, traçar contorno) e proibido copiar traços, pinturas, logos, nomes de empresas/fabricantes/modelos. SVG desenhado à mão; números de frota e placas fictícios.
- Imagens de comparação/overlay vão para `.superpowers/comparacoes/` (git-ignored). Nunca commitadas.
- Cores da interface em `src/ui/tokens.css`. Cores fixas do desenho (vidro, pneu, aro, faróis, sombras) continuam constantes em `busSvg.ts` (exceção já registrada).
- Sem dependência nova; se inevitável, parar e relatar (motivo + licença).
- Save: v3 (hoje) → v4 (3 cores) → v5 (viagens), um passo por versão em `src/save/migrate.ts`, testados com `src/save/fixtures/save-v3.json` (gerado com o código de hoje, antes da Fase 1) e com os fixtures v1/v2 existentes.
- Não mexer no equilíbrio das linhas (`src/data/balance.ts` existente, preços dos modelos, demanda).
- Texto de jogador só via `h()`/`textContent`. Celular ≥ 360 px sem rolagem horizontal.

## Review Focus

1. **Save de hoje (v3) abre depois de tudo** — cadeia v1→…→v5 e v3→v5 testadas.
2. **Pintura sobre o desenho novo** — as 4 pinturas antigas e as novas, em todos os modelos, ficam sob vidros/faróis/linhas e sob o sombreamento, sem vazar da carroceria.
3. **Mapa com muitos ônibus** — o marcador simplificado não piora o p95 (medir com 12 ônibus).
4. **Rota impossível** (cidade isolada no grafo) — erro claro, nada trava; proposta nunca é gerada para par sem caminho.
5. **Fretamento concorrendo com a linha** — ônibus em fretamento não atende a linha; vender/retirar/anunciar ônibus em fretamento é recusado com mensagem; cancelar cobra multa uma vez.

---

## FASE 0 — Realismo dos ônibus

### Task 1: Infraestrutura de realismo e ferramenta de comparação

**Files:** Modify `src/ui/busSvg.ts`, `src/ui/busSvg.test.ts`; Create `scripts/compare-bus.ts` (+ `package.json` script `"compare:bus": "tsx scripts/compare-bus.ts"`).

**Interfaces:**
- `busSvg(art: BusArt, opts?: { detail?: 'full' | 'simple' })` — `'full'` é o padrão (galeria, garagem, loja, criação); `'simple'` para o mapa (sem sombreamento, sem reflexos, sem detalhes finos; mesma silhueta e pintura).
- Ordem das camadas (de baixo para cima): sombra no chão → `body` (cor primária) → `paint` (zonas de pintura, recortadas pela carroceria) → `skirt` → `details` (linhas de painel, portinholas, degraus, frisos — novo `data-region`) → `windows` (vidro com gradiente de reflexo e vedação de borracha) → `lights` → `shade` (novo `data-region`: gradiente vertical sutil de volume, `mix-blend-mode: multiply`, recortado pela carroceria) → `logo` → `wheels` (pneu, aro com furos/calota, cubo).
- `scripts/compare-bus.ts <modelo> <rodada>`: builda nada; sobe `vite preview` (porta livre), abre `?galeria` com Playwright a `deviceScaleFactor: 3`, recorta o ônibus do modelo pedido (pintura lisa, cores neutras) e monta uma imagem lado a lado com a referência (`docs/referencias/onibus/<arquivo>`) em `.superpowers/comparacoes/<modelo>-r<rodada>.png` (HTML temporário em `.superpowers/` + captura; sem dependência nova). Mapa modelo→referência: `conv`→`urbano_parque.png`, `rodo`→`rodoviario_caxiense.png` (apoio `rodoviario_g7.png`), `dd`→`dd_dragao.jpg` (apoio `dd_catarinense.png`), `micro`→`micro_048.jfif` (apoio `micro_volare.jfif`; .jfif é JPEG — converter/carregar como JPEG); `van` sem referência (só o desenho).

- [ ] Testes: para cada forma × pintura, existem `details` e `shade`; `shade` vem depois de `paint` e de `windows` na ordem do DOM e tem `mix-blend-mode: multiply`; `detail: 'simple'` não tem `shade` nem reflexo e tem menos elementos que `'full'`; ids de gradiente/clip únicos entre dois desenhos.
- [ ] Implementar a reestruturação e os detalhes genéricos do checklist (aplicar o que couber a todas as formas): cavas com profundidade (anel escuro interno), pneu com banda e aro com furos, vidros com colunas + reflexo em gradiente + vedação de borracha, porta com vidro e corrimão, retrovisor (braço curvo), farol + lanterna + luz de posição, AC/escotilha no teto, degrau, sombreado de volume, sombra no chão, número de frota fictício pequeno (ex.: "1024") — sem placa legível.
- [ ] `npm run compare:bus conv 0` funciona e gera a imagem; olhar a imagem.
- [ ] Commit `feat: camadas de realismo nos ônibus e ferramenta de comparação`.

### Task 2: Convencional urbano — ciclo visual (até 4 rodadas)

**Files:** Modify `src/ui/busSvg.ts` (silhueta/detalhes do `conv`), `src/ui/busSvg.test.ts`.
- [ ] Para cada rodada r = 1..4: `npm run build`, `npm run compare:bus conv r`, olhar o PNG, listar no relatório as 5 maiores diferenças de forma e de detalhe, corrigir. Parar antes de 4 se ficar bom. Proporções medidas existentes (refScale) continuam valendo.
- [ ] Commit `feat: convencional urbano mais realista`.

### Task 3: Rodoviário — ciclo visual (até 4 rodadas)
Igual à Task 2 para `rodo` (incluir portinholas de bagageiro e saias laterais). Commit `feat: rodoviário mais realista`.

### Task 4: Double deck — ciclo visual (até 4 rodadas)
Igual à Task 2 para `dd`. Continua só na galeria. Commit `feat: double deck mais realista`.

### Task 5: Micro — ciclo visual (até 4 rodadas)
Referências: `docs/referencias/onibus/micro_048.jfif` (BASE da silhueta, vista lateral reta) e `micro_volare.jfif` (conferir proporções). Primeiro medir proporções (como a rodada passada fez com conv/rodo, via `refScale`, conferindo a orientação — frente para a direita), depois o ciclo igual à Task 2 para `micro`. Commit `feat: micro mais realista pelas proporções de referência`.

### Task 6: Van (sem referência) + marcador do mapa + medições + plano B

**Files:** `src/ui/busSvg.ts`, `src/map/mapView.ts`, `src/ui/styles.css`, `scripts/measure-map.ts`, testes.
- Van: aplicar o checklist sem ciclo de referência (registrar "aguarda referência").
- Marcador do mapa: trocar a `div` listrada por `busSvg({...}, { detail: 'simple' })` pequeno (vista lateral, cores e pintura da viação), um por ônibus, recriado só quando as cores/pintura mudam (manter a correção antiga do marcador).
- Medições: KB por SVG (serializado) de cada forma em `full` e `simple`; `scripts/measure-map.ts` ganha a opção de semear 12 ônibus em linhas (`--onibus 12`); medir antes/depois intercalado (worktree do commit anterior, como na rodada passada) e registrar; o p95 não pode piorar — se piorar, simplificar mais o `'simple'`.
- Plano B: se o controlador marcar algum modelo como "não convenceu" após as 4 rodadas, criar a variante estilizada (formas simples e fortes) e a chave `?estilo=realista|plano` (lida da URL, guardada em `localStorage` com try/catch; padrão `realista`). Se nenhum modelo precisar, registrar e não implementar.
- [ ] Testes do marcador (um ícone por ônibus; `detail: 'simple'`), da opção `--onibus`, e (se houver plano B) da chave.
- [ ] Commit `feat: van com detalhes, marcador simplificado no mapa e medições`.

## FASE 1 — Pinturas

### Task 7: Bug "Lisa" + "Inspirada na Águia Branca" selecionadas juntas

**Files:** `src/ui/createCompany.ts`, `src/ui/createCompany.test.ts`, `src/data/rivals.ts`.
- Diagnóstico (superpowers:systematic-debugging) registrado no relatório. Decisão de design (controlador): a grade "Pintura padrão" e a seção "Inspiradas em viações conhecidas" são **mutuamente exclusivas na seleção visual** — escolher um preset desmarca a grade padrão; escolher um estilo padrão (ou mexer numa cor) desmarca o preset. Nenhum preset usa `plain` (a Águia Branca deixa de ser "lisa creme": estilo e cores próprios e visivelmente diferentes de uma lisa).
- [ ] Teste que reproduz o bug (falha antes): após tocar a Águia Branca, só ela fica `aria-pressed="true"`; teste de que nenhum preset é `plain`.
- [ ] Commit `fix: pintura padrão e inspirada não ficam selecionadas juntas`.

### Task 8: Terceira cor (destaque) e save v4

**Files:** `src/sim/types.ts` (`Company.accentColor: string`), `src/sim/newGame.ts` (validação), `src/save/schema.ts`, `src/save/migrate.ts`, `src/save/fixtures/save-v3.json` (gerar ANTES de mudar tipos), `src/ui/createCompany.ts` (seletor "Cor de destaque" em criar e editar), `src/ui/busSvg.ts` (`BusArt.accent?: string`), chamadores de `busSvg`, `src/data/rivals.ts` (presets ganham `accent`), testes.
- Migração v3→v4: `accentColor = secondaryColor` (pinturas antigas continuam idênticas). `SAVE_VERSION = 4`.
- [ ] Testes: v3→v4 com o fixture real; cadeia v1→v4; cor inválida rejeitada; criação/edição gravam a cor de destaque.
- [ ] Commit `feat: cor de destaque na viação e save versão 4`.

### Task 9: Dez pinturas novas de 3 cores

**Files:** `src/sim/types.ts` (`LiveryStyle`), `src/sim/newGame.ts` (`LIVERY_STYLES`), `src/ui/busSvg.ts` (`paintZones`, `liveryThumb`), `src/ui/garageTab.ts`/`createCompany.ts` (rótulos), `src/ui/gallery.ts`, testes.
- Novas (ids e rótulos exatos): `double` "Faixa dupla", `skirt` "Saia", `roof` "Teto colorido", `chevron` "Chevron", `gradient` "Degradê", `nose` "Ponta da frente", `triple` "Diagonal tripla", `waves2` "Ondas duplas", `diamonds` "Losangos". Todas usam primária, secundária e destaque; funcionam em van, micro, conv, rodo e dd (zonas proporcionais à silhueta) e na miniatura. Saves v4 com estilos antigos continuam válidos (sem migração).
- Presets "Inspiradas…" podem usar os estilos novos, sempre com cores e formas próprias, sem réplica de pintura real.
- [ ] Testes: cada estilo × cada forma tem `stripe`/zonas dentro de `paint`, usa a cor de destaque, e não vaza (zonas recortadas pela carroceria); galeria mostra todas (captura conferida).
- [ ] Commit `feat: dez pinturas novas com três cores`.

## FASE 2 — Rotas e viagens

### Task 10: Malha viária e roteador

**Files:** Create `scripts/generate-graph.ts` (+ `"graph"` em package.json), `scripts/lib/graphTools.ts`(+teste), `public/map/malha.json` (gerado), `src/sim/router.ts`, `src/sim/router.test.ts`; README (fonte e comando).
- Fonte: Overpass, ways `highway~^(motorway|trunk|primary|secondary)(_link)?$` em SC (mesma área da Fase 2), mais a malha mínima para ligar todas as 295 sedes (se alguma ficar isolada, incluir `tertiary` só perto dela). Grafo: nós nas interseções/pontas, contração de nós de grau 2 (geometria guardada na aresta, simplificada), arestas com comprimento em km. Cada cidade (295, ponto = `centro` do município; para as 4 jogáveis, o ponto do terminal de `cities.json`) liga ao nó mais próximo por uma aresta de acesso.
- Formato compacto (coordenadas inteiras ×1e4, arrays planos), meta < 2 MB gzip (esperado bem menos).
- `src/sim/router.ts`: `createRouter(data): Router` com `route(fromIbge: number, toIbge: number): { km: number; path: [number, number][] } | { error: 'sem_caminho' | 'cidade_desconhecida' }`, A* com heurística haversine, cache em memória (Map). Puro, sem DOM.
- Medições no relatório: tamanho cru/gzip; tempo por rota (mediana/p95 de 200 pares aleatórios no Node e no navegador com CPU 4× mais lenta — meta < 50 ms); diferença contra as 6 rodovias OSRM atuais (aceitar até 15%; listar as maiores).
- [ ] Testes: Ibirama–Blumenau e Florianópolis–Joinville dentro da tolerância de valores conhecidos (registrar os valores de referência e a fonte); par com cidade isolada (grafo de teste) → `sem_caminho` sem travar; cache devolve o mesmo objeto.
- [ ] Commit `feat: malha viária de SC e roteador entre quaisquer cidades`.

### Task 11: Propostas de viagem (fretamento) — protótipo

**Files:** Create `src/data/charter.ts` (todos os parâmetros), `src/sim/charter.ts`(+teste), `src/ui/tripsTab.ts`(+teste); Modify `src/sim/types.ts`, `src/sim/tick.ts`, `src/sim/actions.ts`, `src/save/schema.ts`, `src/save/migrate.ts` (v4→v5), `src/ui/panel.ts` (aba "Viagens"), `src/map/mapView.ts` (desenhar o trajeto da viagem ativa), `src/game/store.ts`/`app.ts` (carregar o roteador e gerar propostas).
- Estado: `GameState.proposals: Proposal[]`, `GameState.charters: Charter[]`, `version: 5` (migração v4→v5: listas vazias). `Proposal { id; fromIbge; toIbge; km; passengers; kind: 'turismo'|'excursao'|'evento'|'escolar'; valueCents; expiresAt; departFrom; departTo }`; `Charter { proposalId; busId; km; phase: 'ida'|'volta'; progress; valueCents; fromIbge; toIbge }`. Bus em fretamento: `lineId` fica `null` e a viagem é dele no fretamento (sem atender linha).
- Geração (ação pura `offerProposals(s, c, router, seed)`, chamada pelo store a cada `CHARTER_EVERY_MINUTES` de jogo quando o roteador estiver pronto): no máximo `MAX_OPEN_PROPOSALS` abertas; origem/destino sorteados com peso maior perto da sede e para cidades grandes; nunca par sem caminho; sorteio determinístico (hash do relógio, como os anúncios).
- Valor = (custo de operar ida+volta: diesel do menor ônibus que comporta + custo fixo proporcional ao tempo) × (1 + margem sorteada entre `MARGIN_MIN` e `MARGIN_MAX`) + por passageiro. Calibrar com `npm run calibrate` (nova seção): lucro por hora de jogo do fretamento < lucro por hora de um micro numa linha cheia; registrar fórmula, números e racional.
- Ações: `acceptProposal(s, c, proposalId, busId)` (ônibus parado — `lineId === null`, sem anúncio — e com lugares ≥ passageiros; dentro da janela); `declineProposal`; `cancelCharter` (multa `CANCEL_FEE_FRACTION` × valor, só antes de sair... ou a qualquer momento: o ônibus volta à garagem). Pagamento na chegada de volta. Expiração automática no tick. Sem reputação.
- UI aba "Viagens": propostas abertas (origem ⇄ destino, km, passageiros, tipo, prazo, janela, valor, escolher ônibus + Aceitar/Recusar), viagens em andamento (progresso, Cancelar com multa mostrada). Mapa desenha o trajeto (rota do roteador) da viagem ativa e move o ônibus nela.
- [ ] Testes: migração v4→v5 e cadeia completa v1/v2/v3→v5; geração respeita limite e pesos (estatística simples com semente fixa), nunca gera sem caminho; aceitar exige ônibus livre com lugares; ônibus em fretamento não aparece na linha e é recusado em vender/anunciar/atribuir; pagamento uma vez na chegada; expirar sem multa; cancelar com multa; avanço em pedaços = de uma vez.
- [ ] Commit `feat: propostas de viagem (fretamento) com save versão 5`.
