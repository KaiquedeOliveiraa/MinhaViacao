# Minha Viação — Plano de Implementação do MVP

Nov 13, 2026 · @Kaique de Oliveira

> **Para quem for executar com agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa por tarefa. Os passos usam caixas de marcar (`- [ ]`) para acompanhamento.

**Objetivo:** entregar o MVP do Minha Viação jogável de ponta a ponta no GitHub Pages: criar a viação, operar linhas entre 4 cidades de SC, ganhar dinheiro, comprar ônibus e abrir linhas, com tudo salvo no navegador.

**Arquitetura:** site estático em que a simulação (`src/sim`) é feita de funções puras sobre um único objeto de estado, sem tocar na tela. Um store (`src/game`) guarda o estado, roda o laço de tempo e avisa a interface (`src/ui`) e o mapa (`src/map`), que só leem o estado e disparam ações. O salvamento (`src/save`) valida tudo o que lê.

**Stack:** Node 20+, Vite, TypeScript (strict), Vitest + jsdom, Leaflet, Playwright (um teste de ponta a ponta), GitHub Actions + GitHub Pages.

**Design:** [Minha Viação — Design do MVP](https://claude.ai/artifact/P2krXQu2zsyWPngeyikzzh). Na tarefa 1 ele é exportado para `docs/superpowers/specs/2026-11-12-minha-viacao-mvp-design.md`, e este plano para `docs/superpowers/plans/2026-11-13-minha-viacao-mvp.md`. Quem executa lê os dois.

**Tamanho:** 17 tarefas em 6 fases. Cada tarefa termina com testes passando e um commit. A partir da tarefa 10, cada tarefa também termina com algo visível no navegador.

## Restrições globais

Valem para todas as tarefas, mesmo quando a tarefa não repete.

- **Sem servidor.** Em execução, a única chamada de rede permitida é a das imagens do mapa-base.
- **Dependências de execução:** só `leaflet` e `@fontsource-variable/inter`. Também a fonte de títulos Barlow Condensed (pacote @fontsource/barlow-condensed). Qualquer outra precisa de aprovação do Kaique.
- **Dinheiro em centavos inteiros.** Todo campo de dinheiro termina em `Cents` e passa por `Math.round` ao ser calculado.
- **Nenhuma hora real no estado nem no save.** Só `clockMinutes` (minutos de jogo) e frações de trajeto.
- **`src/sim` e `src/save` não importam DOM, Leaflet nem `window`.** Rodam em Node puro.
- **O save guarda identificadores,** nunca cópias de preço, distância ou traçado.
- **Texto do jogador só entra na tela como texto** (`textContent` ou o helper `h`). É proibido `innerHTML` com qualquer valor vindo do estado.
- **Código em inglês, textos da interface em português do Brasil.**
- **Celular e desktop, a partir de 360 px de largura.** As regras estão na seção “Celular primeiro e estilo”.
- **Modelos de ônibus com nomes inventados.** Nenhuma marca real.
- **Verde `#10B981` e vermelho `#EF4444` são só para dinheiro** e não mudam com a cor da empresa.
- **TDD:** teste que falha, código mínimo, teste que passa, commit. Mensagens de commit no padrão `feat:`, `test:`, `chore:`, `fix:`.
- **Números de equilíbrio só em `src/data/balance.ts`.** Nenhum valor de preço, custo ou demanda fica solto em outro arquivo.

## Foco de revisão

O design não descreve estas cinco situações em detalhe, mas elas vão acontecer com quem jogar. Cada uma tem um teste na tarefa indicada.

| Situação | O que a pessoa espera | Tarefa com o teste |
| --- | --- | --- |
| O save no navegador está ilegível ou foi alterado à mão | O jogo abre na tela inicial com um aviso, nunca em tela branca, e não apaga o save sozinho | 8 e 16 |
| A aba ficou escondida por horas | Ao voltar, o relógio do jogo avança no máximo 1 segundo real, sem salto de dias | 9 |
| O armazenamento do navegador está cheio ou bloqueado (aba anônima) | O jogo funciona normalmente e avisa uma única vez que não conseguiu salvar | 8 e 16 |
| A logo enviada é uma foto de 20 MB ou um arquivo que não é imagem | O envio é recusado com mensagem clara e o save não cresce | 8 e 11 |
| Preço arrastado aos extremos com o jogo em 4x por vários dias | O caixa continua um número inteiro e finito; nada vira `NaN` | 5 e 6 |

## Celular primeiro e estilo

Decisão do Kaique em 13/11: o jogo precisa funcionar muito bem no celular, e o estilo visual segue a referência que ele enviou (capturas do Brasileirinho FC no celular). Esta seção vale para as tarefas 10 a 17 e prevalece sobre qualquer texto delas que diga o contrário. As fases 1 a 3 não mudam.

**O que vem da referência.** Só o jeito de fazer, com identidade própria. Nada de marca, textos, fotos ou imagens deles.

- **Títulos** em Barlow Condensed, peso 800, em maiúsculas (via CSS, o texto no HTML fica normal). Corpo em Inter.
- **Rótulos pequenos** em maiúsculas com espaçamento de 0,18em e cor `--text-dim`.
- **Cartões** com cantos de 16 px (24 px nos grandes), borda de 1 px e, nos cartões de destaque, uma faixa de 6 px na cor `--accent` no topo.
- **Dois botões empilhados** nas telas de entrada: o principal preenchido com `--accent`, o secundário branco com texto escuro, ambos de largura total no celular.
- **Números grandes** em blocos de 2 colunas para mostrar o que o jogo tem.
- **Ilustrações próprias:** onde a referência usa fotos, o jogo usa os ônibus desenhados da tarefa 11, na pintura da viação.

**Regras de layout**

| Regra | Valor |
| --- | --- |
| Ponto de quebra | celular abaixo de 900 px de largura; desktop a partir de 900 px |
| Ordem de trabalho | escrever o CSS do celular primeiro e abrir para o desktop com `@media (min-width: 900px)` |
| Área de toque | mínimo de 44 × 44 px em todo botão, aba e miniatura |
| Campos de texto | fonte de 16 px ou mais, para o iPhone não dar zoom ao focar |
| Altura da tela | `100dvh`, com `env(safe-area-inset-*)` nas bordas; `viewport-fit=cover` no `index.html` |
| Rolagem horizontal | proibida em qualquer tela, de 360 px para cima |
| Grades de cartões | 1 coluna abaixo de 600 px, 2 até 900 px, 3 no desktop |

**Mudanças por tarefa**

- **Tarefa 10 (tela inicial).** Vira uma página de entrada em blocos: (1) cartão principal com o rótulo `Santa Catarina · rodovias reais`, o título `Monte a sua viação` com a última palavra em `--accent`, a frase e os botões; (2) bloco `No jogo` com quatro números tirados do catálogo: cidades, rodovias reais, modelos de ônibus e estilos de pintura; (3) o cartão de instalação descrito abaixo. Os testes da tarefa continuam valendo: `renderStartScreen` contém só os botões `Começar uma viação`, `Continuar: <nome>` e `Importar jogo salvo`; os blocos 2 e 3 são componentes à parte, montados por `app.ts` abaixo dela. O ponto de aprovação visual passa a ser feito em 390 × 844 e em 1440 × 900.
- **Tarefa 11 (ônibus).** Ao final, colocar um ônibus desenhado no cartão principal da tela inicial: na pintura da viação salva, ou em laranja e branco quando não há jogo salvo. A galeria também é conferida em 390 px.
- **Tarefa 12 (criação).** No celular, a prévia do ônibus fica fixa no topo e o formulário rola por baixo; o botão `Começar` fica fixo no rodapé. No desktop, formulário à esquerda e prévia à direita.
- **Tarefa 13 (mapa).** No celular, o mapa ocupa a tela inteira entre a barra superior e a barra de abas. Os balões têm largura máxima de 260 px.
- **Tarefa 14 (barra e linhas).** No celular: a barra superior tem duas linhas (logo, nome e menu em cima; caixa, relógio e velocidade embaixo); o painel vira uma barra de abas fixa no rodapé com `Mapa`, `Linhas`, `Garagem` e `Loja`; escolher uma aba que não seja `Mapa` abre o conteúdo em tela cheia por cima do mapa. `mountPanel` começa na aba `map` quando `matchMedia('(max-width: 899px)')` casa, e em `lines` caso contrário ou quando `matchMedia` não existe (jsdom), o que mantém os testes escritos. Acrescentar a aba `data-tab="map"`, escondida no desktop por CSS. As janelas de `dialog.ts` sobem do rodapé no celular.
- **Tarefa 15 (garagem e loja).** Seguem a regra das grades. O botão `Voltar ao mapa` só aparece no desktop; no celular, a aba `Mapa` cumpre esse papel.
- **Tarefa 16 (menu).** Acrescentar o cartão `Jogue como aplicativo` e o arquivo `public/manifest.webmanifest` (nome, ícones de 192 e 512 px, `display: standalone`, cores do tema), ligado no `index.html`. O cartão explica como adicionar à tela inicial do celular e traz este aviso, que é obrigatório: `No iPhone, o aplicativo guarda o jogo separado do navegador. Exporte seu jogo antes e importe no aplicativo.` Sem service worker nesta versão.
- **Tarefa 17 (entrega).** O teste de ponta a ponta roda em dois projetos do Playwright: desktop (1440 × 900) e `devices['iPhone 13']`. No celular, o roteiro troca de aba pela barra do rodapé e, ao fim de cada tela, confere `document.documentElement.scrollWidth <= window.innerWidth`. O roteiro manual é repetido em um celular de verdade, com o endereço publicado.

**Arquivos novos desta seção:** `src/ui/statsBlock.ts`, `src/ui/installCard.ts`, `public/manifest.webmanifest`, `public/icons/icon-192.png`, `public/icons/icon-512.png`.

## Mapa de arquivos

Cada arquivo tem uma responsabilidade. Os testes ficam ao lado do arquivo, com o sufixo `.test.ts`.

```
src/
  main.ts                 liga tudo: trava de aba, carrega o save, monta a tela
  data/
    cities.json           4 cidades: id, nome, população, coordenada da rodoviária, dificuldade
    models.json           3 modelos de ônibus
    roads.json            6 traçados gerados (não editar à mão)
    balance.ts            todas as constantes de equilíbrio
    logos.ts              6 ícones de logo em SVG
  sim/
    types.ts              todos os tipos do jogo
    catalog.ts            carrega os dados e responde consultas (rota, cidade mais próxima)
    demand.ts             potencial, preço de referência, fator de preço, fila
    newGame.ts            valida a empresa e cria o estado inicial
    tick.ts               avança o tempo: filas, viagens, dinheiro, virada do dia
    actions.ts            tudo o que o jogador faz
    selectors.ts          contas derivadas para a interface
    geo.ts                posição de um ônibus ao longo do traçado
    testkit.ts            catálogo pequeno e fixo, só para testes
  save/
    schema.ts             valida e converte um save lido
    migrate.ts            conversão entre versões do save
    storage.ts            grava, lê e mantém a cópia de segurança
    file.ts               exportar e importar arquivo
  game/
    store.ts              guarda o estado, despacha ações, emite eventos
    loop.ts               laço de tempo real para tempo de jogo
    tabLock.ts            garante uma aba por vez
  map/
    mapView.ts            Leaflet: fundo, cidades, traçados, ônibus, balões
  ui/
    tokens.css            cores, espaços, fonte
    theme.ts              cor de destaque a partir da cor da empresa
    dom.ts                helper h() para criar elementos com texto seguro
    format.ts             dinheiro e relógio em texto
    dialog.ts             confirmação e campo de texto em janela
    toast.ts              avisos rápidos
    app.ts                troca entre as telas: inicial, criação, jogo
    startScreen.ts        tela inicial
    createCompany.ts      criação e edição da empresa
    busSvg.ts             desenho do ônibus com a pintura
    logoView.ts           mostra a logo (ícone ou imagem)
    logoUpload.ts         reduz a imagem enviada para 128 × 128
    topBar.ts             logo, nome, caixa, relógio, velocidade
    panel.ts              painel direito com as três abas
    linesTab.ts           aba Linhas
    newLineDialog.ts      janela de criar linha
    garageTab.ts          aba Garagem
    shopTab.ts            aba Loja
    companyMenu.ts        menu da empresa
scripts/
  generate-roads.ts       gera roads.json a partir do serviço de rotas
  calibrate.ts            roda a simulação sem tela e imprime a tabela de equilíbrio
e2e/
  smoke.spec.ts           teste de ponta a ponta no navegador
.github/workflows/deploy.yml
```

## Fase 1 — Base

### Tarefa 1: Projeto base e publicação

Ao fim desta tarefa existe uma página publicada no GitHub Pages, com testes rodando a cada envio.

**Arquivos:**

- Criar: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/sanity.test.ts`, `.gitignore`, `README.md`, `.github/workflows/deploy.yml`
- Criar: `docs/superpowers/specs/2026-11-12-minha-viacao-mvp-design.md` e `docs/superpowers/plans/2026-11-13-minha-viacao-mvp.md` (exportados dos dois documentos em Markdown)

**Interfaces:**

- Produz: os comandos `npm run dev`, `npm test`, `npm run build`, `npm run roads`, `npm run calibrate`, `npm run e2e`, usados por todas as tarefas seguintes.

* [ ] **Passo 1: Criar o projeto**

```bash
npm create vite@latest . -- --template vanilla-ts
# rodar dentro da pasta minha-viacao; se o Vite perguntar sobre arquivos existentes, escolher ignorar e continuar
npm install leaflet @fontsource-variable/inter
npm install -D vitest jsdom tsx @types/leaflet @types/node
git init -b main
```

Esperado: pasta `minha-viacao` com `package.json` e `node_modules`. Apagar os arquivos de exemplo do template (`src/counter.ts`, `src/typescript.svg`, `public/vite.svg`, o conteúdo de `src/style.css`).

- [ ] **Passo 2: Configurar**

`vite.config.ts`: `base: './'` (caminho relativo, funciona no GitHub Pages sem depender do nome do repositório) e `test: { environment: 'node' }`. Testes de interface pedem jsdom com o comentário `// @vitest-environment jsdom` na primeira linha do arquivo.

`tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `resolveJsonModule`, `noEmit`.

`package.json`, seção `scripts`:

```json
{
  "dev": "vite",
  "build": "tsc --noEmit && vite build",
  "test": "vitest run",
  "roads": "tsx scripts/generate-roads.ts",
  "calibrate": "tsx scripts/calibrate.ts",
  "e2e": "playwright test"
}
```

- [ ] **Passo 3: Teste de sanidade**

`src/sanity.test.ts`:

```ts
import { expect, test } from 'vitest';
test('o ambiente de testes funciona', () => { expect(1 + 1).toBe(2); });
```

Rodar: `npm test`. Esperado: `1 passed`.

- [ ] **Passo 4: Página mínima**

`index.html` com `<html lang="pt-BR">`, `<title>Minha Viação</title>` e `<div id="app"></div>`. `src/main.ts` escreve um `<h1>` com o texto `Minha Viação` dentro de `#app`.

Rodar: `npm run dev` e abrir `http://localhost:5173`. Esperado: o título na tela. Rodar: `npm run build`. Esperado: pasta `dist/` criada, sem erros.

- [ ] **Passo 5: Publicação automática**

`.github/workflows/deploy.yml`: dispara em `push` na `main`; permissões `pages: write` e `id-token: write`; passos `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, cache npm), `npm ci`, `npm test`, `npm run build`, `actions/upload-pages-artifact@v3` com `path: dist`, `actions/deploy-pages@v4`.

No GitHub: criar o repositório `minha-viacao`, depois Settings → Pages → Source: **GitHub Actions**.

- [ ] **Passo 6: Guardar os documentos e enviar**

Exportar o design e este plano em Markdown para as duas pastas de `docs/superpowers/`.

```bash
git add -A
git commit -m "chore: projeto base com Vite, Vitest e publicação no GitHub Pages"
git remote add origin https://github.com/<usuario>/minha-viacao.git
git push -u origin main
```

Esperado: a aba Actions do repositório mostra o fluxo verde, e `https://<usuario>.github.io/minha-viacao/` mostra o título.

### Tarefa 2: Tipos, dados e catálogo

Ao fim desta tarefa os dados reais das 4 cidades e das 6 rodovias estão no repositório, com testes que garantem que estão coerentes.

**Arquivos:**

- Criar: `src/sim/types.ts`, `src/sim/catalog.ts`, `src/sim/catalog.test.ts`, `src/sim/testkit.ts`
- Criar: `src/data/cities.json`, `src/data/models.json`, `src/data/balance.ts`, `src/data/roads.json`
- Criar: `scripts/generate-roads.ts`

**Interfaces:**

- Produz: todos os tipos abaixo; `catalog` (o catálogo real); `routeId`, `getRoad`, `getCity`, `getModel`, `travelMinutes`, `nearestCity`; `testCatalog` em `testkit.ts`.

* [ ] **Passo 1: Escrever `src/sim/types.ts`**

```ts
export type CityId = string;
export type ModelId = string;
export type BusId = string;
export type RouteId = string; // os dois CityId em ordem alfabética, unidos por '-'
export type End = 'a' | 'b';
export type Difficulty = 'facil' | 'medio' | 'dificil';
export type LiveryStyle = 'plain' | 'stripe' | 'diagonal' | 'wave';
export type LogoIconId = 'wheel' | 'road' | 'bus' | 'pine' | 'mountain' | 'wave';

export interface City { id: CityId; name: string; population: number; lat: number; lng: number; difficulty: Difficulty; }
export type BusShape = 'micro' | 'conv' | 'rodo'; export interface BusModel { id: ModelId; name: string; shape: BusShape; seats: number; comfort: number; kmPerLiter: number; priceCents: number; }
/** coords vão da cidade `a` até a `b`, com a < b em ordem alfabética. Cada ponto é [lat, lng]. */
export interface Road { id: RouteId; a: CityId; b: CityId; distanceKm: number; coords: [number, number][]; }
export interface Catalog { cities: City[]; models: BusModel[]; roads: Road[]; }

export type LogoRef = { kind: 'icon'; iconId: LogoIconId } | { kind: 'image'; dataUrl: string };
export interface Company { name: string; hqCityId: CityId; primaryColor: string; secondaryColor: string; logo: LogoRef; defaultLivery: LiveryStyle; }

export type Trip =
  | { phase: 'idle' }
  | { phase: 'waiting'; at: End; minutesLeft: number }
  | { phase: 'moving'; from: End; progress: number; passengers: number; fareCents: number };
export interface Bus { id: BusId; modelId: ModelId; name: string; livery: LiveryStyle; lineId: RouteId | null; trip: Trip; }

export interface DayStats { revenueCents: number; dieselCents: number; passengers: number; seatsOffered: number; }
/** `a` e `b` ficam na ordem em que o jogador escolheu; `id` é sempre o RouteId ordenado. */
export interface Line { id: RouteId; a: CityId; b: CityId; priceCents: number; paused: boolean; queueA: number; queueB: number; lastDepartA: number | null; lastDepartB: number | null; today: DayStats; yesterday: DayStats; }

export interface GameState { version: 1; company: Company; cashCents: number; clockMinutes: number; buses: Bus[]; lines: Line[]; nextBusNumber: number; }

export type ActionError =
  | 'saldo_insuficiente' | 'modelo_inexistente' | 'onibus_inexistente' | 'ultimo_onibus'
  | 'linha_existente' | 'linha_inexistente' | 'rota_inexistente' | 'fora_da_rede'
  | 'onibus_ocupado' | 'nome_invalido' | 'empresa_invalida';
export type ActionResult = { ok: true; state: GameState } | { ok: false; error: ActionError };
```

- [ ] **Passo 2: Escrever `src/data/balance.ts`**

Valores iniciais do design. A tarefa 7 ajusta os marcados com `// calibrar`.

```ts
export const AVG_SPEED_KMH = 60;
export const LAYOVER_MINUTES = 10;
export const MINUTES_PER_DAY = 1440;
export const DEMAND_K = 120;               // calibrar
export const POP_EXPONENT = 0.5;           // calibrar
export const REF_PRICE_BASE_REAIS = 5;
export const REF_PRICE_PER_KM_REAIS = 0.35;
export const PRICE_ELASTICITY = 1.5;
export const MAX_PRICE_FACTOR = 1.5;
export const PRICE_MIN_MULT = 0.3;
export const PRICE_MAX_MULT = 3;
export const QUEUE_MAX_HOURS = 3;
export const INITIAL_QUEUE_HOURS = 1;
export const DIESEL_CENTS_PER_LITER = 600;
export const DAILY_FIXED_CENTS_PER_BUS = 35_000;   // calibrar
export const START_CASH_CENTS = 1_500_000;         // calibrar
export const SELL_FRACTION = 0.5;
export const OPEN_FEE_CENTS_PER_PASSENGER = 5_000; // calibrar
// o ônibus inicial é o modelo mais barato do catálogo: startModel() em catalog.ts
export const MAX_NAME_LENGTH = 30;
```

`INITIAL_QUEUE_HOURS` é uma decisão deste plano: uma linha nova já nasce com 1 hora de passageiros em cada ponta, para o primeiro ônibus não sair vazio.

- [ ] **Passo 3: Escrever `src/data/models.json`**

| id | name | seats | comfort | kmPerLiter | priceCents |
| --- | --- | --- | --- | --- | --- |
| `micro` | Micro Vale 24 (usado) | 24 | 0.9 | 4.5 | 6000000 |
| `conv` | Convencional Serra 44 | 44 | 1.0 | 3.2 | 18000000 |
| `rodo` | Rodoviário Litoral 46 | 46 | 1.2 | 2.8 | 35000000 |

Cada modelo tem ainda o campo `shape`, igual ao próprio id (`micro`, `conv` ou `rodo`), que diz qual desenho de ônibus usar.

- [ ] **Passo 4: Levantar os dados reais das cidades**

População (Censo 2022, IBGE):

```bash
curl -s "https://servicodados.ibge.gov.br/api/v3/agregados/4714/periodos/2022/variaveis/93?localidades=N6[4206900,4202404,4208203,4205407]"
```

Esperado: um JSON com quatro localidades. Conferir pelo **nome** que são Ibirama, Blumenau, Itajaí e Florianópolis; os códigos acima foram escritos de memória e, se algum nome não bater, buscar o código certo em `https://servicodados.ibge.gov.br/api/v1/localidades/estados/42/municipios`.

Rodoviárias: buscar no OpenStreetMap o terminal rodoviário de cada cidade (marcação `amenity=bus_station`), abrir o ponto no mapa e confirmar visualmente que é a rodoviária intermunicipal, não um terminal urbano. Se a cidade não tiver, usar o centro. Anotar no `README.md` a fonte de cada coordenada.

Gravar `src/data/cities.json` com os ids `ibirama`, `blumenau`, `itajai`, `florianopolis` e a dificuldade: Ibirama `dificil`, Florianópolis `medio`, Blumenau `facil`, Itajaí `facil`.

- [ ] **Passo 5: Escrever o teste do catálogo (falha)**

`src/sim/catalog.test.ts`:

```ts
test('routeId é o mesmo nos dois sentidos', () => {
  expect(routeId('ibirama', 'blumenau')).toBe('blumenau-ibirama');
  expect(routeId('blumenau', 'ibirama')).toBe('blumenau-ibirama');
});
test('existem 4 cidades, 3 modelos e 6 rodovias', () => {
  expect(catalog.cities).toHaveLength(4);
  expect(catalog.models).toHaveLength(3);
  expect(catalog.roads).toHaveLength(6);
});
test('cada rodovia começa e termina a menos de 2 km das suas cidades', () => {
  for (const road of catalog.roads) {
    expect(road.a < road.b).toBe(true);
    expect(road.coords.length).toBeGreaterThanOrEqual(2);
    expect(kmBetween(road.coords[0]!, cityPoint(road.a))).toBeLessThan(2);
    expect(kmBetween(road.coords.at(-1)!, cityPoint(road.b))).toBeLessThan(2);
    expect(road.distanceKm).toBeGreaterThan(0);
  }
});
test('tempo de viagem a 60 km/h', () => {
  expect(travelMinutes({ distanceKm: 70 } as Road)).toBe(70);
  expect(travelMinutes({ distanceKm: 50.4 } as Road)).toBe(50);
});
test('a cidade mais próxima de Ibirama é Blumenau', () => {
  expect(nearestCity(catalog, 'ibirama')).toBe('blumenau');
});
```

Rodar: `npm test -- catalog`. Esperado: FALHA, porque `catalog.ts` e `roads.json` não existem.

- [ ] **Passo 6: Escrever `scripts/generate-roads.ts` e gerar `roads.json`**

Para cada um dos 6 pares de cidades (em ordem alfabética de id), chamar o serviço público do OSRM:

```
https://router.project-osrm.org/route/v1/driving/{lngA},{latA};{lngB},{latB}?overview=full&geometries=geojson
```

Da resposta, usar `routes[0].distance` (metros, virar km com 1 casa decimal) e `routes[0].geometry.coordinates` (vêm como `[lng, lat]`; inverter para `[lat, lng]`). Reduzir cada traçado para no máximo 400 pontos mantendo o primeiro e o último, e arredondar para 5 casas decimais. Esperar 1 segundo entre chamadas. Gravar `src/data/roads.json` e imprimir uma tabela `rota | km | pontos`.

Rodar: `npm run roads`. Esperado: 6 linhas. As distâncias devem ficar a até 25% destes valores do design: Blumenau–Itajaí 50, Florianópolis–Itajaí 95, Blumenau–Florianópolis 140, Blumenau–Ibirama 70, Ibirama–Itajaí 120, Florianópolis–Ibirama 210. Uma diferença maior indica coordenada errada.

- [ ] **Passo 7: Implementar `src/sim/catalog.ts`**

```ts
export const catalog: Catalog;                                  // montado a partir dos três JSON
export function routeId(x: CityId, y: CityId): RouteId;
export function getCity(c: Catalog, id: CityId): City | undefined;
export function getModel(c: Catalog, id: ModelId): BusModel | undefined; export function startModel(c: Catalog): BusModel; // o mais barato
export function getRoad(c: Catalog, x: CityId, y: CityId): Road | undefined;
export function travelMinutes(road: Pick<Road, 'distanceKm'>): number; // Math.round(distanceKm / AVG_SPEED_KMH * 60), mínimo 1
export function nearestCity(c: Catalog, from: CityId): CityId;         // menor distanceKm entre as rodovias que tocam `from`
```

- [ ] **Passo 8: Escrever `src/sim/testkit.ts`**

Um catálogo pequeno e fixo, usado pelos testes das tarefas 3 a 9 para que as contas fechem em números redondos e não mudem com a calibração:

```ts
// 3 cidades em linha: alfa (100 mil hab.), beta (100 mil), gama (25 mil)
// rodovias: alfa-beta 60 km, beta-gama 30 km, alfa-gama 90 km (2 pontos cada)
// modelo único 'mini': shape 'micro', 10 lugares, conforto 1.0, 3 km/l, 2_000_000 centavos
export const testCatalog: Catalog;
export const testCompany: Company; // sede 'alfa', cores '#ff7a00' e '#ffffff', ícone 'bus', pintura 'diagonal'
```

- [ ] **Passo 9: Rodar e enviar**

Rodar: `npm test`. Esperado: todos passam.

```bash
git add -A
git commit -m "feat: tipos, dados das cidades, modelos e rodovias geradas"
```

## Fase 2 — Regras do jogo

Tudo nesta fase roda sem tela. Os testes usam o `testCatalog` da tarefa 2, em que a linha alfa–beta tem 60 km, potencial de 200 passageiros por dia, preço de referência de R$ 26,00 e diesel de R$ 120,00 por viagem.

### Tarefa 3: Demanda e preço

**Arquivos:**

- Criar: `src/sim/demand.ts`, `src/sim/demand.test.ts`

**Interfaces:**

- Consome: `City`, constantes de `balance.ts`.
- Produz:

```ts
export function potentialPerDay(a: City, b: City, distanceKm: number): number;
// DEMAND_K * ((a.population / 1000) * (b.population / 1000)) ** POP_EXPONENT / distanceKm
export function baseRefPriceCents(distanceKm: number): number;            // conforto 1.0
export function refPriceCents(distanceKm: number, comfort: number): number;
export function priceBoundsCents(distanceKm: number): { min: number; max: number }; // 0.3x e 3x do baseRefPriceCents
export function priceFactor(refCents: number, priceCents: number): number;
export function arrivalsPerMinute(potential: number, factor: number): number;
export function queueCap(potential: number, factor: number): number;      // potential * factor * QUEUE_MAX_HOURS / 24
export function growQueue(queue: number, potential: number, factor: number): number; // soma 1 minuto e limita ao queueCap
```

Os limites de preço usam o preço de referência com conforto 1,0, para não mudarem quando o jogador troca o ônibus da linha. O fator de preço usa a referência com o conforto real.

- [ ] **Passo 1: Escrever os testes (falham)**

```ts
const city = (population: number) => ({ population } as City);
test('potencial pelo modelo gravitacional', () => {
  expect(potentialPerDay(city(361_000), city(264_000), 50)).toBeCloseTo(740.9, 1);
  expect(potentialPerDay(city(19_000), city(361_000), 70)).toBeCloseTo(142.0, 1);
  expect(potentialPerDay(city(100_000), city(100_000), 60)).toBeCloseTo(200, 6);
});
test('preço de referência em centavos inteiros', () => {
  expect(baseRefPriceCents(70)).toBe(2950);
  expect(refPriceCents(70, 0.9)).toBe(2655);
  expect(refPriceCents(70, 1.2)).toBe(3540);
});
test('limites do preço', () => {
  expect(priceBoundsCents(70)).toEqual({ min: 885, max: 8850 });
});
test('fator de preço', () => {
  expect(priceFactor(2600, 2600)).toBe(1);
  expect(priceFactor(2600, 5200)).toBeCloseTo(0.3536, 4);
  expect(priceFactor(2600, 260)).toBe(1.5);      // teto
  expect(priceFactor(2600, 0)).toBe(1.5);        // nunca divide por zero
  expect(Number.isFinite(priceFactor(2600, -5))).toBe(true);
});
test('fila cresce e para no teto de 3 horas', () => {
  expect(arrivalsPerMinute(200, 1)).toBeCloseTo(0.13889, 5);
  expect(queueCap(200, 1)).toBe(25);
  expect(growQueue(0, 200, 1)).toBeCloseTo(0.13889, 5);
  expect(growQueue(24.95, 200, 1)).toBe(25);
  expect(growQueue(40, 200, 1)).toBe(25);        // fila acima do teto encolhe para o teto
});
```

Rodar: `npm test -- demand`. Esperado: FALHA com "demand.ts não encontrado".

- [ ] **Passo 2: Implementar `demand.ts`** com as assinaturas acima. `priceFactor` trata preço menor ou igual a zero como o teto `MAX_PRICE_FACTOR`.
- [ ] **Passo 3: Rodar** `npm test -- demand`. Esperado: 5 testes passam.
- [ ] **Passo 4: Commit**

```bash
git add src/sim/demand.ts src/sim/demand.test.ts
git commit -m "feat: modelo de demanda, preço de referência e fila"
```

### Tarefa 4: Novo jogo

**Arquivos:**

- Criar: `src/sim/newGame.ts`, `src/sim/newGame.test.ts`

**Interfaces:**

- Consome: `catalog.ts`, `demand.ts`.
- Produz:

```ts
export type CompanyInput = Company; // mesmo formato; chega da tela sem validação
export type CompanyInputError = 'nome' | 'sede' | 'cor' | 'logo' | 'pintura';
export function validateCompanyInput(input: CompanyInput, c: Catalog): CompanyInputError[];
export function createGame(c: Catalog, input: CompanyInput): GameState; // lança erro se a entrada for inválida
export function emptyDayStats(): DayStats;
export function newLine(c: Catalog, a: CityId, b: CityId, priceCents: number): Line; // filas já com INITIAL_QUEUE_HOURS
```

Regras de validação: nome com 1 a 30 caracteres depois de `trim()`; sede existente no catálogo; cores no formato `#rrggbb`; logo com ícone conhecido, ou imagem cujo `dataUrl` começa com `data:image/png`, `data:image/jpeg` ou `data:image/webp` e tem até 200.000 caracteres; pintura entre as quatro.

- [ ] **Passo 1: Escrever os testes (falham)**

```ts
test('jogo novo começa com caixa, um ônibus e a linha até a cidade mais próxima', () => {
  const s = createGame(testCatalog, testCompany);
  expect(s.version).toBe(1);
  expect(s.cashCents).toBe(1_500_000);
  expect(s.clockMinutes).toBe(0);
  expect(s.buses).toHaveLength(1);
  expect(s.buses[0]).toMatchObject({ modelId: 'mini', lineId: 'alfa-beta', livery: 'diagonal', trip: { phase: 'waiting', at: 'a', minutesLeft: 0 } });
  expect(s.lines).toHaveLength(1);
  expect(s.lines[0]).toMatchObject({ id: 'alfa-beta', a: 'alfa', b: 'beta', priceCents: 2600, paused: false });
  expect(s.lines[0]!.queueA).toBeCloseTo(200 / 24, 6);
  expect(s.lines[0]!.queueB).toBeCloseTo(200 / 24, 6);
  expect(s.nextBusNumber).toBe(2);
});
test('a linha inicial sai da sede mesmo quando a sede vem depois no alfabeto', () => {
  const s = createGame(testCatalog, { ...testCompany, hqCityId: 'gama' });
  expect(s.lines[0]).toMatchObject({ id: 'beta-gama', a: 'gama', b: 'beta' });
});
test('validação da empresa', () => {
  expect(validateCompanyInput(testCompany, testCatalog)).toEqual([]);
  expect(validateCompanyInput({ ...testCompany, name: '   ' }, testCatalog)).toEqual(['nome']);
  expect(validateCompanyInput({ ...testCompany, name: 'x'.repeat(31) }, testCatalog)).toEqual(['nome']);
  expect(validateCompanyInput({ ...testCompany, hqCityId: 'curitiba' }, testCatalog)).toEqual(['sede']);
  expect(validateCompanyInput({ ...testCompany, primaryColor: 'laranja' }, testCatalog)).toEqual(['cor']);
  expect(validateCompanyInput({ ...testCompany, logo: { kind: 'image', dataUrl: 'javascript:alert(1)' } }, testCatalog)).toEqual(['logo']);
  expect(validateCompanyInput({ ...testCompany, logo: { kind: 'image', dataUrl: 'data:image/png;base64,' + 'A'.repeat(200_001) } }, testCatalog)).toEqual(['logo']);
});
test('o nome da empresa é guardado sem espaços nas pontas', () => {
  expect(createGame(testCatalog, { ...testCompany, name: '  Expresso  ' }).company.name).toBe('Expresso');
});
```

Rodar: `npm test -- newGame`. Esperado: FALHA.

- [ ] **Passo 2: Implementar `newGame.ts`.** O preço inicial da linha é `refPriceCents(distância, conforto do modelo inicial)`. O ônibus inicial se chama `<nome do modelo> #1`. A linha inicial não cobra taxa de abertura.
- [ ] **Passo 3: Rodar** `npm test -- newGame`. Esperado: 4 testes passam.
- [ ] **Passo 4: Commit**

```bash
git add src/sim/newGame.ts src/sim/newGame.test.ts
git commit -m "feat: criação do jogo e validação da empresa"
```

### Tarefa 5: O tempo passa

**Arquivos:**

- Criar: `src/sim/tick.ts`, `src/sim/tick.test.ts`

**Interfaces:**

- Consome: `demand.ts`, `catalog.ts`, `newGame.ts`.
- Produz: `export function advance(state: GameState, c: Catalog, minutes: number): GameState;` (pura: não altera `state`; `minutes` é inteiro ≥ 0).

**O algoritmo,** que a assinatura não determina. Para cada minuto, nesta ordem:

1. **Filas.** Em cada linha ativa (não pausada e com pelo menos um ônibus), `queueA` e `queueB` passam por `growQueue`. O fator usa o conforto médio dos ônibus da linha.
2. **Ônibus,** na ordem em que estão em `state.buses`:
   - **Esperando com `minutesLeft > 0`:** diminui 1.
   - **Esperando com `minutesLeft === 0`:** parte se a linha não está pausada e se `lastDepart` daquela ponta é `null` ou `clockMinutes - lastDepart >= intervalo`, com `intervalo = 2 * (travelMinutes + LAYOVER_MINUTES) / ônibus na linha`. Ao partir: embarca `min(Math.floor(fila), lugares)`, desconta da fila, grava `lastDepart = clockMinutes`, soma `seatsOffered` e `passengers` em `today`, e vira `moving` com `progress: 0` e `fareCents` igual ao preço da linha naquele momento.
   - **Em viagem:** `progress += 1 / travelMinutes`. Se `progress > 1 - 1e-9`, chegou: o caixa recebe `passengers * fareCents` e paga `Math.round(distanceKm / kmPerLiter * DIESEL_CENTS_PER_LITER)`; os dois valores entram em `today`; o ônibus vira `waiting` na outra ponta com `minutesLeft = LAYOVER_MINUTES`.
3. **Relógio.** `clockMinutes += 1`. Se virou múltiplo de 1440: o caixa paga `DAILY_FIXED_CENTS_PER_BUS` por ônibus (todos, inclusive parados) e, em cada linha, `yesterday = today` e `today` zera.

- [ ] **Passo 1: Escrever os testes (falham)**

```ts
const fresh = () => createGame(testCatalog, testCompany);

test('avançar zero minutos não muda nada, e não altera o estado recebido', () => {
  const s = fresh(); const copy = structuredClone(s);
  expect(advance(s, testCatalog, 0)).toEqual(s);
  advance(s, testCatalog, 500);
  expect(s).toEqual(copy);
});
test('avançar em pedaços dá o mesmo resultado que avançar de uma vez', () => {
  const a = advance(advance(fresh(), testCatalog, 700), testCatalog, 800);
  expect(a).toEqual(advance(fresh(), testCatalog, 1500));
});
test('primeira viagem: parte no minuto 1 com 8 passageiros e chega no minuto 61', () => {
  const s1 = advance(fresh(), testCatalog, 1);
  expect(s1.buses[0]!.trip).toMatchObject({ phase: 'moving', from: 'a', passengers: 8, fareCents: 2600 });
  const s61 = advance(fresh(), testCatalog, 61);
  expect(s61.buses[0]!.trip).toEqual({ phase: 'waiting', at: 'b', minutesLeft: 10 });
  expect(s61.cashCents).toBe(1_500_000 + 8 * 2600 - 12_000);
  expect(s61.lines[0]!.today).toEqual({ revenueCents: 20_800, dieselCents: 12_000, passengers: 8, seatsOffered: 10 });
});
test('volta: parte da outra ponta no minuto 72 com o ônibus cheio', () => {
  const s = advance(fresh(), testCatalog, 72);
  expect(s.buses[0]!.trip).toMatchObject({ phase: 'moving', from: 'b', passengers: 10 });
});
test('mudar o preço durante a viagem não muda a passagem de quem já embarcou', () => {
  const s = advance(fresh(), testCatalog, 1);
  s.lines[0]!.priceCents = 7800;
  expect(advance(s, testCatalog, 60).cashCents).toBe(1_500_000 + 8 * 2600 - 12_000);
});
test('virada do dia cobra o custo fixo e gira as estatísticas', () => {
  const s = fresh();
  s.clockMinutes = 1439; s.buses[0]!.lineId = null; s.buses[0]!.trip = { phase: 'idle' };
  s.lines[0]!.today.passengers = 7;
  const next = advance(s, testCatalog, 1);
  expect(next.cashCents).toBe(1_500_000 - 35_000);
  expect(next.lines[0]!.yesterday.passengers).toBe(7);
  expect(next.lines[0]!.today.passengers).toBe(0);
});
test('linha pausada não acumula fila nem solta ônibus', () => {
  const s = fresh(); s.lines[0]!.paused = true;
  const next = advance(s, testCatalog, 120);
  expect(next.lines[0]!.queueA).toBeCloseTo(200 / 24, 6);
  expect(next.buses[0]!.trip.phase).toBe('waiting');
});
test('dois ônibus na mesma ponta saem com 70 minutos de intervalo', () => {
  const s = fresh();
  s.buses.push({ ...structuredClone(s.buses[0]!), id: 'b2', name: 'mini #2' });
  expect(advance(s, testCatalog, 70).buses[1]!.trip.phase).toBe('waiting');
  expect(advance(s, testCatalog, 71).buses[1]!.trip.phase).toBe('moving');
});
test('a fila nunca passa do teto de 3 horas', () => {
  let s = fresh();
  for (let i = 0; i < 100; i++) {
    s = advance(s, testCatalog, 60);
    expect(s.lines[0]!.queueA).toBeLessThanOrEqual(25 + 1e-9);
    expect(s.lines[0]!.queueB).toBeLessThanOrEqual(25 + 1e-9);
  }
});
test('foco de revisão: nos extremos de preço, 10 dias depois o caixa segue inteiro e finito', () => {
  for (const price of [780, 7800]) {
    const s = fresh(); s.lines[0]!.priceCents = price;
    const end = advance(s, testCatalog, 14_400);
    expect(Number.isInteger(end.cashCents)).toBe(true);
    expect(Number.isFinite(end.lines[0]!.queueA)).toBe(true);
    expect(end.clockMinutes).toBe(14_400);
  }
});
```

Rodar: `npm test -- tick`. Esperado: FALHA.

- [ ] **Passo 2: Implementar `advance`** seguindo o algoritmo. Copiar o estado uma vez no início (`structuredClone`) e alterar a cópia dentro do laço.
- [ ] **Passo 3: Rodar** `npm test -- tick`. Esperado: 10 testes passam.
- [ ] **Passo 4: Commit**

```bash
git add src/sim/tick.ts src/sim/tick.test.ts
git commit -m "feat: simulação do tempo com filas, viagens e custos"
```

### Tarefa 6: Ações do jogador

**Arquivos:**

- Criar: `src/sim/actions.ts`, `src/sim/actions.test.ts`, `src/sim/selectors.ts`, `src/sim/selectors.test.ts`

**Interfaces:**

- Consome: tudo das tarefas 2 a 5.
- Produz, em `actions.ts` (todas puras, devolvem `ActionResult`):

```ts
buyBus(s, c, input: { modelId: ModelId; name?: string }): ActionResult
sellBus(s, c, busId: BusId): ActionResult
renameBus(s, c, busId: BusId, name: string): ActionResult
setBusLivery(s, c, busId: BusId, livery: LiveryStyle): ActionResult
openLine(s, c, input: { a: CityId; b: CityId; priceCents?: number; busId?: BusId }): ActionResult
closeLine(s, c, lineId: RouteId): ActionResult
setLinePrice(s, c, lineId: RouteId, priceCents: number): ActionResult
setLinePaused(s, c, lineId: RouteId, paused: boolean): ActionResult
assignBus(s, c, busId: BusId, lineId: RouteId): ActionResult
unassignBus(s, c, busId: BusId): ActionResult
updateCompany(s, c, patch: Omit<Company, 'hqCityId'>): ActionResult
```

- Produz, em `selectors.ts`:

```ts
servedCities(s: GameState): CityId[]                 // a sede mais as pontas de todas as linhas
openFeeCents(c: Catalog, a: CityId, b: CityId): number // Math.round(potentialPerDay * OPEN_FEE_CENTS_PER_PASSENGER)
openableRoutes(s, c): { a: CityId; b: CityId; feeCents: number; potential: number; distanceKm: number }[] // `a` é sempre a cidade já atendida
busesOnLine(s, lineId): Bus[]
lineComfort(s, c, line): number                      // média; 1.0 sem ônibus
lineRefPriceCents(s, c, line): number
lineOccupancy(line): number | null                   // passageiros / lugares de hoje + ontem; null sem viagens
lineProfitTodayCents(s, line): number                // receita - diesel - custo fixo dos ônibus da linha, proporcional à hora do dia
sellValueCents(c, bus): number                       // Math.round(preço do modelo * SELL_FRACTION)
```

**Regras que os testes fixam:**

- Compra exige `cashCents >= preço`. Com caixa negativo, toda compra e toda abertura de linha falham com `saldo_insuficiente`.
- Nome de ônibus: `trim()`, até 30 caracteres; vazio usa `<nome do modelo> #<nextBusNumber>`.
- Vender, desalocar ou fechar a linha com o ônibus em viagem cancela a viagem: sem receita e sem diesel.
- `setLinePrice` nunca falha por valor: arredonda para inteiro e prende o valor em `priceBoundsCents`. Valor não finito mantém o preço atual.
- `openLine` sem `priceCents` usa o preço de referência com conforto 1,0.
- Um ônibus alocado entra `waiting` na ponta `a` com `minutesLeft: 0`.

* [ ] **Passo 1: Escrever os testes de `actions` (falham)**

```ts
const fresh = () => createGame(testCatalog, testCompany);
const rich = () => ({ ...fresh(), cashCents: 5_000_000 });
const err = (r: ActionResult) => (r.ok ? null : r.error);
const ok = (r: ActionResult) => { if (!r.ok) throw new Error(r.error); return r.state; };

test('comprar ônibus', () => {
  expect(err(buyBus(fresh(), testCatalog, { modelId: 'mini' }))).toBe('saldo_insuficiente');
  expect(err(buyBus(rich(), testCatalog, { modelId: 'jato' }))).toBe('modelo_inexistente');
  expect(err(buyBus(rich(), testCatalog, { modelId: 'mini', name: 'x'.repeat(31) }))).toBe('nome_invalido');
  const s = ok(buyBus(rich(), testCatalog, { modelId: 'mini', name: '  Guerreiro  ' }));
  expect(s.cashCents).toBe(3_000_000);
  expect(s.buses[1]).toMatchObject({ name: 'Guerreiro', lineId: null, livery: 'diagonal', trip: { phase: 'idle' } });
  expect(s.nextBusNumber).toBe(3);
  expect(ok(buyBus(rich(), testCatalog, { modelId: 'mini' })).buses[1]!.name).toMatch(/#2$/);
});
test('caixa negativo bloqueia compras', () => {
  expect(err(buyBus({ ...fresh(), cashCents: -1 }, testCatalog, { modelId: 'mini' }))).toBe('saldo_insuficiente');
});
test('vender ônibus', () => {
  expect(err(sellBus(fresh(), testCatalog, fresh().buses[0]!.id))).toBe('ultimo_onibus');
  const two = ok(buyBus(rich(), testCatalog, { modelId: 'mini' }));
  const sold = ok(sellBus(two, testCatalog, two.buses[0]!.id)); // o que está na linha
  expect(sold.buses).toHaveLength(1);
  expect(sold.cashCents).toBe(3_000_000 + 1_000_000);
  expect(err(sellBus(two, testCatalog, 'fantasma'))).toBe('onibus_inexistente');
});
test('abrir linha', () => {
  const s = ok(openLine(fresh(), testCatalog, { a: 'beta', b: 'gama' })); // beta já é atendida
  expect(s.cashCents).toBe(1_500_000 - 1_000_000);
  expect(s.lines[1]).toMatchObject({ id: 'beta-gama', a: 'beta', b: 'gama', priceCents: 1550 });
  expect(err(openLine(fresh(), testCatalog, { a: 'alfa', b: 'beta' }))).toBe('linha_existente');
  expect(err(openLine(fresh(), testCatalog, { a: 'alfa', b: 'alfa' }))).toBe('rota_inexistente');
  expect(err(openLine(fresh(), testCatalog, { a: 'alfa', b: 'curitiba' }))).toBe('rota_inexistente');
  expect(err(openLine({ ...fresh(), cashCents: 999_999 }, testCatalog, { a: 'beta', b: 'gama' }))).toBe('saldo_insuficiente');
  expect(err(openLine(fresh(), testCatalog, { a: 'beta', b: 'gama', busId: fresh().buses[0]!.id }))).toBe('onibus_ocupado');
});
test('linha nova precisa tocar a rede', () => {
  const alone = ok(closeLine(rich(), testCatalog, 'alfa-beta')); // sobra só a sede alfa
  expect(err(openLine(alone, testCatalog, { a: 'beta', b: 'gama' }))).toBe('fora_da_rede');
  expect(openLine(alone, testCatalog, { a: 'gama', b: 'alfa' }).ok).toBe(true);
});
test('fechar linha deixa os ônibus parados e não devolve a taxa', () => {
  const moving = advance(fresh(), testCatalog, 5);
  const s = ok(closeLine(moving, testCatalog, 'alfa-beta'));
  expect(s.lines).toHaveLength(0);
  expect(s.buses[0]).toMatchObject({ lineId: null, trip: { phase: 'idle' } });
  expect(s.cashCents).toBe(moving.cashCents);
});
test('preço é preso aos limites', () => {
  const price = (v: number) => ok(setLinePrice(fresh(), testCatalog, 'alfa-beta', v)).lines[0]!.priceCents;
  expect(price(1)).toBe(780);
  expect(price(999_999)).toBe(7800);
  expect(price(3000.6)).toBe(3001);
  expect(price(NaN)).toBe(2600);
  expect(price(Infinity)).toBe(2600);
});
test('alocar e desalocar', () => {
  const two = ok(buyBus(rich(), testCatalog, { modelId: 'mini' }));
  const id = two.buses[1]!.id;
  const on = ok(assignBus(two, testCatalog, id, 'alfa-beta'));
  expect(on.buses[1]).toMatchObject({ lineId: 'alfa-beta', trip: { phase: 'waiting', at: 'a', minutesLeft: 0 } });
  expect(err(assignBus(on, testCatalog, id, 'alfa-beta'))).toBe('onibus_ocupado');
  expect(ok(unassignBus(on, testCatalog, id)).buses[1]).toMatchObject({ lineId: null, trip: { phase: 'idle' } });
  expect(err(assignBus(two, testCatalog, id, 'beta-gama'))).toBe('linha_inexistente');
});
test('editar a empresa valida como na criação e nunca muda a sede', () => {
  const { hqCityId, ...rest } = testCompany;
  expect(err(updateCompany(fresh(), testCatalog, { ...rest, name: '' }))).toBe('empresa_invalida');
  const s = ok(updateCompany(fresh(), testCatalog, { ...rest, name: 'Nova' }));
  expect(s.company).toMatchObject({ name: 'Nova', hqCityId: 'alfa' });
});
test('nenhuma ação altera o estado recebido', () => {
  const s = rich(); const copy = structuredClone(s);
  buyBus(s, testCatalog, { modelId: 'mini' }); openLine(s, testCatalog, { a: 'beta', b: 'gama' }); setLinePrice(s, testCatalog, 'alfa-beta', 5000);
  expect(s).toEqual(copy);
});
```

- [ ] **Passo 2: Escrever os testes de `selectors` (falham)**

```ts
test('cidades atendidas e rotas que podem ser abertas', () => {
  const s = createGame(testCatalog, testCompany);
  expect(servedCities(s).sort()).toEqual(['alfa', 'beta']);
  expect(openableRoutes(s, testCatalog).map(r => `${r.a}>${r.b}`).sort()).toEqual(['alfa>gama', 'beta>gama']);
  expect(openFeeCents(testCatalog, 'beta', 'gama')).toBe(1_000_000);
});
test('lotação e lucro do dia', () => {
  const s = advance(createGame(testCatalog, testCompany), testCatalog, 720); // meio-dia
  const line = s.lines[0]!;
  expect(lineOccupancy({ ...line, today: emptyDayStats(), yesterday: emptyDayStats() })).toBeNull();
  expect(lineOccupancy(line)).toBe(line.today.passengers / line.today.seatsOffered);
  expect(lineProfitTodayCents(s, line)).toBe(line.today.revenueCents - line.today.dieselCents - 17_500);
  expect(sellValueCents(testCatalog, s.buses[0]!)).toBe(1_000_000);
});
```

Rodar: `npm test -- actions selectors`. Esperado: FALHA.

- [ ] **Passo 3: Implementar `selectors.ts` e depois `actions.ts`.** Os identificadores de ônibus são `bus-<nextBusNumber>`, sem aleatoriedade, para o jogo ser reproduzível nos testes.
- [ ] **Passo 4: Rodar** `npm test`. Esperado: todos passam.
- [ ] **Passo 5: Commit**

```bash
git add src/sim
git commit -m "feat: ações do jogador e contas derivadas"
```

### Tarefa 7: Calibração

Até aqui os números são os do design, que a simulação já mostrou estarem errados: o segundo ônibus levaria mais de 4 horas reais. Esta tarefa ajusta os números com as regras de verdade, antes de existir qualquer tela.

**Arquivos:**

- Criar: `scripts/calibrate.ts`, `src/sim/balance.test.ts`
- Modificar: `src/data/balance.ts`, `src/data/models.json`
- Modificar: `docs/superpowers/specs/2026-11-12-minha-viacao-mvp-design.md` (tabelas de números)

**Interfaces:**

- Consome: `catalog` (o real), `createGame`, `advance`, `openLine`, `buyBus`, `assignBus`.
- Produz: os valores finais de `balance.ts` e `models.json`. Nenhuma assinatura nova.

**Critérios de aceite.** Lembrando que 1 dia de jogo são 1440 minutos de jogo e 24 minutos reais em 1x:

| # | Medida | Faixa aceita |
| --- | --- | --- |
| 1 | Sede Ibirama, sem o jogador mexer em nada: minutos de jogo até o caixa pagar um segundo micro-ônibus | 1200 a 1800 |
| 2 | A mesma medida com sede em Blumenau e em Itajaí | 400 ou mais |
| 3 | Lotação média da linha inicial de Ibirama no preço padrão, do dia 2 ao dia 3 | 50% a 90% |
| 4 | Para cada rodovia e modelo, com 1 ônibus no preço de referência: dias de jogo para o lucro pagar o ônibus | nunca menos de 1,5 |
| 5 | Convencional e rodoviário na melhor linha de cada um: dias de jogo para se pagar | 3 a 8 |
| 6 | Taxa de abertura de Blumenau–Itajaí comparada ao lucro diário de um micro-ônibus nela | 2 a 5 vezes |

- [ ] **Passo 1: Escrever `scripts/calibrate.ts`**

O script imprime três tabelas: (a) por sede, os minutos até `cashCents >= preço do micro` avançando de 10 em 10 minutos, com limite de 20 dias; (b) por rodovia e modelo, lucro diário e dias para se pagar, medidos do dia 2 ao dia 4 de um estado montado com 1 ônibus naquela linha; (c) a taxa de abertura de cada rodovia. Ao fim, imprime `OK` ou `FORA` para cada critério.

Rodar: `npm run calibrate`. Esperado nesta primeira vez: o critério 1 aparece `FORA`, com cerca de 11.000 minutos.

- [ ] **Passo 2: Ajustar os números**

Mexer apenas nestes botões, nesta ordem de preferência: preços dos modelos, `START_CASH_CENTS`, `DAILY_FIXED_CENTS_PER_BUS`, `OPEN_FEE_CENTS_PER_PASSENGER`, `DEMAND_K`, `POP_EXPONENT`. Não mexer na fórmula do preço de referência nem na velocidade. Ponto de partida sugerido: micro-ônibus a R$ 20 mil, o que já aproxima o critério 1 sem tocar na demanda.

Repetir `npm run calibrate` até os seis critérios mostrarem `OK`. Se dois critérios forem impossíveis de cumprir juntos, parar e levar a tabela ao Kaique em vez de afrouxar um critério por conta própria.

- [ ] **Passo 3: Travar o resultado com um teste**

`src/sim/balance.test.ts`, usando o catálogo real:

```ts
test('com sede em Ibirama, o segundo micro-ônibus chega entre 20 e 30 minutos reais', () => {
  let s = createGame(catalog, { ...testCompany, hqCityId: 'ibirama' });
  const price = startModel(catalog).priceCents;
  let minutes = 0;
  while (s.cashCents < price && minutes < 5000) { s = advance(s, catalog, 10); minutes += 10; }
  expect(minutes).toBeGreaterThanOrEqual(1200);
  expect(minutes).toBeLessThanOrEqual(1800);
});
```

Rodar: `npm test -- balance`. Esperado: passa.

- [ ] **Passo 4: Atualizar o design.** Copiar para o documento de design os valores finais (tabela de modelos, caixa inicial, custo fixo, taxa de abertura, constantes de demanda) e a tabela de potenciais com as distâncias e populações reais.
- [ ] **Passo 5: Commit**

```bash
git add -A
git commit -m "feat: calibração da economia com simulação sem tela"
```

## Fase 3 — Salvamento e motor

### Tarefa 8: Salvamento

**Arquivos:**

- Criar: `src/save/schema.ts`, `src/save/migrate.ts`, `src/save/storage.ts`, `src/save/file.ts`
- Criar: `src/save/schema.test.ts`, `src/save/storage.test.ts`, `src/save/file.test.ts`

**Interfaces:**

- Consome: `GameState`, `Catalog`, `validateCompanyInput`.
- Produz:

```ts
// schema.ts
export const SAVE_VERSION = 1;
export type ParseError = 'formato' | 'versao_futura' | 'referencia';
export type ParseResult = { ok: true; state: GameState } | { ok: false; error: ParseError };
export function serialize(state: GameState): string;
export function parseSave(raw: unknown, c: Catalog): ParseResult; // chama migrate e depois valida campo a campo

// migrate.ts
export function migrate(raw: unknown): unknown | null; // devolve o objeto na versão atual; null se não souber converter

// storage.ts
export const SAVE_KEY = 'minhaviacao:save';
export const BACKUP_KEY = 'minhaviacao:backup';
export interface KeyValue { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; }
export type LoadResult = { state: GameState; source: 'principal' | 'backup' } | { state: null; damaged: boolean };
export interface SaveStorage { save(state: GameState): boolean; load(c: Catalog): LoadResult; clear(): void; }
export function createStorage(kv: KeyValue | null): SaveStorage; // kv null = navegador sem armazenamento

// file.ts
export function exportFileName(state: GameState): string; // 'minha-viacao-<nome-em-minusculas-com-hifens>.json'
export function exportBlob(state: GameState): Blob;       // application/json
export function importText(text: string, c: Catalog): ParseResult;
```

**O que `parseSave` confere,** além dos tipos de cada campo. Qualquer falha abaixo é `formato`, salvo indicação:

- `version` maior que `SAVE_VERSION` é `versao_futura`.
- Cidade, modelo ou rota que não existe no catálogo é `referencia`.
- `cashCents` e `clockMinutes` são inteiros seguros; `clockMinutes >= 0`.
- A empresa passa em `validateCompanyInput`. Nomes de ônibus têm de 1 a 30 caracteres.
- No máximo 500 ônibus. Linhas com `id` único, igual ao `routeId(a, b)`.
- `lineId` de cada ônibus aponta para uma linha existente; viagem `idle` se e somente se `lineId` é `null`.
- `progress` entre 0 e 1; `passengers` inteiro entre 0 e os lugares do modelo; filas finitas e não negativas.
- O estado devolvido é montado campo a campo. Campos desconhecidos no arquivo são descartados.

**Como `save` e `load` se comportam:**

- `save`: se já existe um save principal, copia para o backup; depois grava o novo. Qualquer exceção vira `false`, sem propagar.
- `load`: tenta o principal; se não validar, tenta o backup. Sem nenhum dos dois: `{ state: null, damaged: false }`. Com algum presente e nenhum válido: `{ state: null, damaged: true }`. `load` nunca apaga nada.

* [ ] **Passo 1: Escrever os testes de `schema` (falham)**

```ts
const good = () => advance(createGame(testCatalog, testCompany), testCatalog, 95); // tem ônibus em viagem
const parse = (mutate: (raw: any) => void) => { const raw = JSON.parse(serialize(good())); mutate(raw); return parseSave(raw, testCatalog); };
const error = (r: ParseResult) => (r.ok ? null : r.error);

test('ida e volta devolve o mesmo estado', () => {
  const r = parseSave(JSON.parse(serialize(good())), testCatalog);
  expect(r.ok && r.state).toEqual(good());
});
test('lixo é recusado como formato', () => {
  for (const raw of [null, 42, 'oi', [], {}, { version: 1 }]) expect(error(parseSave(raw, testCatalog))).toBe('formato');
});
test('versão do futuro', () => { expect(error(parse(r => { r.version = 99; }))).toBe('versao_futura'); });
test('referências que não existem no catálogo', () => {
  expect(error(parse(r => { r.buses[0].modelId = 'jato'; }))).toBe('referencia');
  expect(error(parse(r => { r.company.hqCityId = 'curitiba'; }))).toBe('formato'); // empresa inválida
  expect(error(parse(r => { r.lines[0].b = 'curitiba'; }))).toBe('referencia');
});
test('números estragados', () => {
  expect(error(parse(r => { r.cashCents = 'muito'; }))).toBe('formato');
  expect(error(parse(r => { r.cashCents = 1.5; }))).toBe('formato');
  expect(error(parse(r => { r.cashCents = null; }))).toBe('formato');   // é no que NaN vira em JSON
  expect(error(parse(r => { r.clockMinutes = -1; }))).toBe('formato');
  expect(error(parse(r => { r.lines[0].queueA = -3; }))).toBe('formato');
  expect(error(parse(r => { r.buses[0].trip = { phase: 'moving', from: 'a', progress: 2, passengers: 1, fareCents: 100 }; }))).toBe('formato');
  expect(error(parse(r => { r.buses[0].trip = { phase: 'moving', from: 'a', progress: 0.5, passengers: 999, fareCents: 100 }; }))).toBe('formato');
});
test('estado incoerente', () => {
  expect(error(parse(r => { r.buses[0].lineId = 'beta-gama'; }))).toBe('formato');  // linha que o jogo não tem
  expect(error(parse(r => { r.buses[0].trip = { phase: 'idle' }; }))).toBe('formato'); // parado, mas com linha
  expect(error(parse(r => { r.lines.push(r.lines[0]); }))).toBe('formato');            // linha repetida
  expect(error(parse(r => { r.buses[0].name = 'x'.repeat(31); }))).toBe('formato');
});
test('texto com HTML é aceito e guardado como texto', () => {
  const r = parse(raw => { raw.company.name = '<img src=x onerror=alert(1)>'; });
  expect(r.ok && r.state.company.name).toBe('<img src=x onerror=alert(1)>');
});
test('campos desconhecidos são descartados', () => {
  const r = parse(raw => { raw.hack = true; raw.buses[0].turbo = 9; });
  expect(r.ok && 'hack' in r.state).toBe(false);
  expect(r.ok && 'turbo' in r.state.buses[0]!).toBe(false);
});
test('foco de revisão: logo gigante é recusada', () => {
  expect(error(parse(r => { r.company.logo = { kind: 'image', dataUrl: 'data:image/png;base64,' + 'A'.repeat(200_001) }; }))).toBe('formato');
});
```

- [ ] **Passo 2: Escrever os testes de `storage` e `file` (falham)**

```ts
const memory = (): KeyValue & { data: Map<string, string> } => { const data = new Map<string, string>(); return { data, getItem: k => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: k => void data.delete(k) }; };
const s1 = () => createGame(testCatalog, testCompany);
const s2 = () => advance(s1(), testCatalog, 300);

test('sem nada gravado', () => { expect(createStorage(memory()).load(testCatalog)).toEqual({ state: null, damaged: false }); });
test('grava e lê', () => {
  const st = createStorage(memory());
  expect(st.save(s1())).toBe(true);
  expect(st.load(testCatalog)).toEqual({ state: s1(), source: 'principal' });
});
test('a gravação anterior vira backup', () => {
  const kv = memory(); const st = createStorage(kv);
  st.save(s1()); st.save(s2());
  expect(JSON.parse(kv.data.get(BACKUP_KEY)!)).toEqual(JSON.parse(serialize(s1())));
});
test('principal corrompido: volta para o backup', () => {
  const kv = memory(); const st = createStorage(kv);
  st.save(s1()); st.save(s2()); kv.data.set(SAVE_KEY, '{"version":1,"cash');
  expect(st.load(testCatalog)).toEqual({ state: s1(), source: 'backup' });
});
test('foco de revisão: os dois ilegíveis, avisa e não apaga', () => {
  const kv = memory(); kv.data.set(SAVE_KEY, 'lixo'); kv.data.set(BACKUP_KEY, '[]');
  expect(createStorage(kv).load(testCatalog)).toEqual({ state: null, damaged: true });
  expect(kv.data.get(SAVE_KEY)).toBe('lixo');
});
test('foco de revisão: armazenamento cheio ou ausente não derruba o jogo', () => {
  const full = { ...memory(), setItem: () => { throw new DOMException('cheio', 'QuotaExceededError'); } };
  expect(createStorage(full).save(s1())).toBe(false);
  expect(createStorage(null).save(s1())).toBe(false);
  expect(createStorage(null).load(testCatalog)).toEqual({ state: null, damaged: false });
});
test('clear apaga principal e backup', () => {
  const kv = memory(); const st = createStorage(kv); st.save(s1()); st.save(s2()); st.clear();
  expect(kv.data.size).toBe(0);
});
// file.test.ts
test('nome do arquivo exportado', () => {
  expect(exportFileName({ ...s1(), company: { ...testCompany, name: 'Expresso Catarina' } })).toBe('minha-viacao-expresso-catarina.json');
  expect(exportFileName({ ...s1(), company: { ...testCompany, name: '../../<x>' } })).toBe('minha-viacao-x.json');
  expect(exportFileName({ ...s1(), company: { ...testCompany, name: '???' } })).toBe('minha-viacao-viacao.json');
});
test('importar texto', () => {
  expect(importText(serialize(s2()), testCatalog)).toEqual({ ok: true, state: s2() });
  expect(importText('não é json', testCatalog)).toEqual({ ok: false, error: 'formato' });
});
```

Rodar: `npm test -- save`. Esperado: FALHA.

- [ ] **Passo 3: Implementar** `migrate.ts` (versão 1 passa direto; sem `version` numérico devolve `null`), `schema.ts`, `storage.ts`, `file.ts`. O nome do arquivo remove acentos, troca tudo que não for letra ou número por hífen e corta hífens das pontas.
- [ ] **Passo 4: Rodar** `npm test -- save`. Esperado: 18 testes passam.
- [ ] **Passo 5: Commit**

```bash
git add src/save
git commit -m "feat: salvamento com validação, backup e exportação"
```

### Tarefa 9: Store, laço do jogo e trava de aba

**Arquivos:**

- Criar: `src/game/store.ts`, `src/game/loop.ts`, `src/game/tabLock.ts`
- Criar: `src/game/store.test.ts`, `src/game/loop.test.ts`, `src/game/tabLock.test.ts`

**Interfaces:**

- Consome: `advance`, `ActionResult`.
- Produz:

```ts
// store.ts
export type Speed = 0 | 1 | 2 | 4;            // 0 = pausado
export type StoreEvent = 'change' | 'tick' | 'hour';
export interface Store {
  readonly catalog: Catalog;
  getState(): GameState;
  getSpeed(): Speed;
  setSpeed(speed: Speed): void;                                   // emite 'change'
  dispatch(action: (s: GameState, c: Catalog) => ActionResult): ActionResult; // 'change' só quando ok
  replace(state: GameState): void;                                // emite 'change'
  advance(minutes: number): void;                                 // emite 'tick'; emite 'hour' se cruzou uma hora cheia
  on(event: StoreEvent, fn: () => void): () => void;              // devolve a função que cancela
}
export function createStore(c: Catalog, initial: GameState, speed?: Speed): Store; // velocidade inicial 1

// loop.ts
export const MS_PER_GAME_MINUTE = 1000;
export const MAX_FRAME_MS = 1000;
export function stepMinutes(accMs: number, deltaMs: number, speed: Speed): { minutes: number; accMs: number };
export function createLoop(store: Store, deps?: { now(): number; raf(cb: () => void): number; caf(id: number): void }): { start(): void; stop(): void };

// tabLock.ts
export function acquireTabLock(locks?: Pick<LockManager, 'request'>): Promise<boolean>; // padrão: navigator.locks
```

Regra de eventos que a interface inteira usa: em `change` a tela pode reconstruir pedaços; em `tick` ela só atualiza números que já estão na tela.

`stepMinutes` limita `deltaMs` a `MAX_FRAME_MS`. É isso que impede o progresso offline: o navegador para de chamar o laço com a aba escondida, e na volta o intervalo enorme é cortado para 1 segundo.

`acquireTabLock` usa a Web Locks API com o nome `minhaviacao-game` e `ifAvailable: true`, e segura a trava enquanto a aba viver. Sem suporte no navegador, devolve `true`.

- [ ] **Passo 1: Escrever os testes (falham)**

```ts
// loop.test.ts
test('converte tempo real em minutos de jogo', () => {
  expect(stepMinutes(0, 1000, 1)).toEqual({ minutes: 1, accMs: 0 });
  expect(stepMinutes(0, 500, 4)).toEqual({ minutes: 2, accMs: 0 });
  expect(stepMinutes(0, 250, 1)).toEqual({ minutes: 0, accMs: 250 });
  expect(stepMinutes(900, 250, 1)).toEqual({ minutes: 1, accMs: 150 });
  expect(stepMinutes(0, 1000, 4)).toEqual({ minutes: 4, accMs: 0 });
});
test('pausado não anda nem acumula', () => { expect(stepMinutes(300, 1000, 0)).toEqual({ minutes: 0, accMs: 300 }); });
test('foco de revisão: horas com a aba escondida valem 1 segundo', () => {
  expect(stepMinutes(0, 3 * 3_600_000, 1)).toEqual({ minutes: 1, accMs: 0 });
  expect(stepMinutes(0, 3 * 3_600_000, 4)).toEqual({ minutes: 4, accMs: 0 });
});
test('o laço avança o store conforme o relógio injetado', () => {
  let t = 0; let frame: (() => void) | null = null;
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  const loop = createLoop(store, { now: () => t, raf: cb => { frame = cb; return 1; }, caf: () => { frame = null; } });
  loop.start(); t = 1000; frame!(); t = 1500; frame!(); t = 2000; frame!();
  expect(store.getState().clockMinutes).toBe(2);
  loop.stop(); expect(frame).toBeNull();
});

// store.test.ts
test('ação com erro não muda o estado nem emite change', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  const before = store.getState(); let changes = 0; store.on('change', () => changes++);
  expect(store.dispatch((s, c) => buyBus(s, c, { modelId: 'mini' })).ok).toBe(false);
  expect(store.getState()).toBe(before); expect(changes).toBe(0);
});
test('ação com sucesso troca o estado e emite change uma vez', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  let changes = 0; store.on('change', () => changes++);
  store.dispatch((s, c) => setLinePrice(s, c, 'alfa-beta', 3000));
  expect(store.getState().lines[0]!.priceCents).toBe(3000); expect(changes).toBe(1);
});
test('tick a cada avanço e hour só ao cruzar a hora', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  let ticks = 0, hours = 0; store.on('tick', () => ticks++); store.on('hour', () => hours++);
  store.advance(59); store.advance(1); store.advance(30); store.advance(0);
  expect(ticks).toBe(3); expect(hours).toBe(1);
});
test('cancelar a inscrição para de receber eventos', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  let n = 0; const off = store.on('tick', () => n++); store.advance(1); off(); store.advance(1);
  expect(n).toBe(1);
});

// tabLock.test.ts
test('primeira aba consegue, segunda não, e sem suporte libera', async () => {
  let held = false;
  const locks = { request: async (_n: string, _o: object, cb: (l: object | null) => unknown) => { if (held) return cb(null); held = true; return cb({}); } } as unknown as Pick<LockManager, 'request'>;
  expect(await acquireTabLock(locks)).toBe(true);
  expect(await acquireTabLock(locks)).toBe(false);
  expect(await acquireTabLock(undefined)).toBe(true); // em Node não existe navigator.locks
});
```

Rodar: `npm test -- game`. Esperado: FALHA.

- [ ] **Passo 2: Implementar** `store.ts`, `loop.ts`, `tabLock.ts`.
- [ ] **Passo 3: Rodar** `npm test`. Esperado: todos passam.
- [ ] **Passo 4: Commit**

```bash
git add src/game
git commit -m "feat: store, laço de tempo sem progresso offline e trava de aba"
```

## Fase 4 — Identidade

A partir daqui cada tarefa termina com algo para ver no navegador. Os testes de interface começam com `// @vitest-environment jsdom`. As imagens que o Kaique gerou (criação da empresa, mapa e garagem) são a referência de layout e de clima; textos e detalhes seguem o design, não as imagens.

### Tarefa 10: Base visual e tela inicial

**Arquivos:**

- Criar: `src/ui/tokens.css`, `src/ui/theme.ts`, `src/ui/dom.ts`, `src/ui/format.ts`, `src/ui/app.ts`, `src/ui/startScreen.ts`
- Criar: `src/ui/theme.test.ts`, `src/ui/dom.test.ts`, `src/ui/format.test.ts`, `src/ui/startScreen.test.ts`
- Modificar: `src/main.ts`, `index.html`

**Interfaces:**

- Consome: `Company`, `ActionError`, `SaveStorage`, `Catalog`.
- Produz:

```ts
// dom.ts
type Child = Node | string | number | null | false | undefined;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, unknown> | null, ...children: Child[]): HTMLElementTagNameMap[K];
// attrs: 'class', 'dataset' (objeto), chaves 'on<Evento>' (função), o resto vira setAttribute.
// textos entram como nó de texto. As chaves 'innerHTML' e 'outerHTML' lançam erro.

// theme.ts
export const BG = '#0d0a14';
export const DEFAULT_ACCENT = '#8b7cf6';
export function contrastRatio(hexA: string, hexB: string): number;          // fórmula WCAG
export function uiAccent(hex: string, bg?: string): string;                 // clareia em passos de 10% até contraste >= 4.5
export function onAccent(hex: string): '#000000' | '#ffffff';               // cor do texto sobre a cor de destaque
export function applyTheme(root: HTMLElement, company: Pick<Company, 'primaryColor' | 'secondaryColor'> | null): void;
// define --accent, --on-accent, --brand-primary, --brand-secondary

// format.ts
export function formatMoney(cents: number, opts?: { cents?: boolean }): string;
export function formatClock(clockMinutes: number): string;
export function formatPeople(n: number): string;        // 361000 -> '361 mil habitantes'
export function errorMessage(e: ActionError): string;

// startScreen.ts
export interface StartProps { savedName: string | null; notice: string | null; onStart(): void; onContinue(): void; onImport(file: File): void; }
export function renderStartScreen(p: StartProps): HTMLElement;

// app.ts
export type Screen = 'start' | 'create' | 'game';
export interface AppDeps { catalog: Catalog; storage: SaveStorage; }
export function mountApp(root: HTMLElement, deps: AppDeps): { go(screen: Screen): void };
```

**Valores fixos de `tokens.css`:**

| Variável | Valor | Uso |
| --- | --- | --- |
| `--bg` | `#0d0a14` | fundo geral |
| `--surface` | `#18141f` | cartões e painéis |
| `--surface-2` | `#221d2b` | campos, itens dentro de cartões |
| `--border` | `#2e2838` | bordas de 1 px |
| `--text` | `#f2eff7` | texto principal |
| `--text-dim` | `#a39db0` | texto secundário |
| `--money-up` | `#10B981` | lucro, saldo positivo |
| `--money-down` | `#EF4444` | custo, saldo negativo |
| `--radius` | `16px` | cantos de cartões e botões |

Fonte: Inter Variable (`@fontsource-variable/inter`), números com `font-variant-numeric: tabular-nums`. Largura mínima do `body`: 360 px.

**Textos fixos:** título `Minha Viação`; frase `Monte sua viação e conquiste as estradas, começando por Santa Catarina.`; botões `Começar uma viação`, `Continuar: <nome>` e `Importar jogo salvo`.

**Mensagens de `errorMessage`:**

| Erro | Mensagem |
| --- | --- |
| `saldo_insuficiente` | Caixa insuficiente. |
| `ultimo_onibus` | Sua viação precisa de pelo menos um ônibus. |
| `fora_da_rede` | A linha precisa sair de uma cidade que você já atende. |
| `linha_existente` | Você já opera essa linha. |
| `onibus_ocupado` | Esse ônibus já está em uma linha. |
| `nome_invalido` | O nome precisa ter de 1 a 30 letras. |
| qualquer outro | Não foi possível concluir a ação. |

- [ ] **Passo 1: Escrever os testes (falham)**

```ts
// dom.test.ts
test('texto do jogador nunca vira HTML', () => {
  const el = h('p', null, '<img src=x onerror=alert(1)>');
  expect(el.querySelector('img')).toBeNull();
  expect(el.textContent).toBe('<img src=x onerror=alert(1)>');
});
test('innerHTML é proibido', () => { expect(() => h('p', { innerHTML: '<b>x</b>' })).toThrow(); });
test('atributos, classe, dataset e eventos', () => {
  let clicks = 0;
  const b = h('button', { class: 'btn', dataset: { live: 'cash' }, 'aria-pressed': 'true', onClick: () => clicks++ }, 'Ok', 3);
  b.click();
  expect([b.className, b.dataset.live, b.getAttribute('aria-pressed'), b.textContent, clicks]).toEqual(['btn', 'cash', 'true', 'Ok3', 1]);
});

// theme.test.ts
test('contraste', () => { expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1); });
test('cor clara fica como está', () => { expect(uiAccent('#ff7a00')).toBe('#ff7a00'); });
test('cor escura é clareada até dar leitura no fundo escuro', () => {
  for (const dark of ['#0a1a3a', '#000000', '#3b0000']) {
    const out = uiAccent(dark);
    expect(out).not.toBe(dark);
    expect(contrastRatio(out, BG)).toBeGreaterThanOrEqual(4.5);
  }
});
test('texto sobre a cor de destaque', () => {
  expect(onAccent('#ffee00')).toBe('#000000');
  expect(onAccent('#1a237e')).toBe('#ffffff');
});
test('applyTheme escreve as variáveis; sem empresa usa o padrão', () => {
  const root = document.createElement('div');
  applyTheme(root, { primaryColor: '#ff7a00', secondaryColor: '#ffffff' });
  expect(root.style.getPropertyValue('--accent')).toBe('#ff7a00');
  expect(root.style.getPropertyValue('--brand-secondary')).toBe('#ffffff');
  applyTheme(root, null);
  expect(root.style.getPropertyValue('--accent')).toBe(DEFAULT_ACCENT);
});

// format.test.ts
test('dinheiro', () => {
  expect(formatMoney(1_248_000)).toBe('R$ 12.480');
  expect(formatMoney(0)).toBe('R$ 0');
  expect(formatMoney(-120_000)).toBe('-R$ 1.200');
  expect(formatMoney(2655, { cents: true })).toBe('R$ 26,55');
});
test('relógio', () => {
  expect(formatClock(0)).toBe('Dia 1 · 00:00');
  expect(formatClock(3740)).toBe('Dia 3 · 14:20');
});
test('população', () => { expect(formatPeople(361_000)).toBe('361 mil habitantes'); expect(formatPeople(19_400)).toBe('19 mil habitantes'); });

// startScreen.test.ts
const props = (over: Partial<StartProps> = {}): StartProps => ({ savedName: null, notice: null, onStart() {}, onContinue() {}, onImport() {}, ...over });
const labels = (el: HTMLElement) => [...el.querySelectorAll('button')].map(b => b.textContent);
test('sem jogo salvo não existe Continuar', () => {
  expect(labels(renderStartScreen(props()))).toEqual(['Começar uma viação', 'Importar jogo salvo']);
});
test('com jogo salvo, Continuar vem primeiro e mostra o nome como texto', () => {
  const el = renderStartScreen(props({ savedName: '<b>Expresso</b>' }));
  expect(labels(el)[0]).toBe('Continuar: <b>Expresso</b>');
  expect(el.querySelector('b')).toBeNull();
});
test('aviso aparece quando existe', () => {
  expect(renderStartScreen(props({ notice: 'Seu jogo salvo não pôde ser lido.' })).textContent).toContain('não pôde ser lido');
});
test('botões chamam as funções', () => {
  let started = 0; const el = renderStartScreen(props({ onStart: () => started++ }));
  [...el.querySelectorAll('button')].find(b => b.textContent === 'Começar uma viação')!.click();
  expect(started).toBe(1);
});
```

Rodar: `npm test -- ui`. Esperado: FALHA.

- [ ] **Passo 2: Implementar** `tokens.css`, `dom.ts`, `theme.ts`, `format.ts`, `startScreen.ts`. O botão de importar abre um `<input type="file" accept="application/json,.json">` escondido.
- [ ] **Passo 3: Implementar `app.ts` e ligar em `main.ts`.** `mountApp` mostra a tela inicial. As telas `create` e `game` são, por enquanto, um cartão com o nome da tela e um botão `Voltar`; as tarefas 12 a 16 as substituem. `main.ts` monta o armazenamento com `createStorage(localStorage)` dentro de `try/catch` (se o acesso lançar erro, usa `createStorage(null)`).
- [ ] **Passo 4: Rodar e conferir no navegador**

Rodar: `npm test`. Esperado: todos passam. Rodar: `npm run dev`. Esperado: tela inicial escura, centralizada, com título, frase e os dois botões; `Começar uma viação` leva ao cartão provisório.

- [ ] **Passo 5: Ponto de aprovação visual.** Tirar uma captura da tela inicial e mostrar ao Kaique antes de seguir. É aqui que cores de fundo, fonte e espaçamento são aprovados para o resto do jogo.
- [ ] **Passo 6: Commit**

```bash
git add -A
git commit -m "feat: base visual, tema pela cor da empresa e tela inicial"
```

### Tarefa 11: Ônibus e logo desenhados

**Arquivos:**

- Criar: `src/data/logos.ts`, `src/ui/busSvg.ts`, `src/ui/logoView.ts`, `src/ui/logoUpload.ts`
- Criar: `src/ui/busSvg.test.ts`, `src/ui/logoView.test.ts`, `src/ui/logoUpload.test.ts`
- Modificar: `src/ui/app.ts` (galeria de conferência)

**Interfaces:**

- Consome: `LiveryStyle`, `LogoRef`, `LogoIconId`, `ModelId`, `h`.
- Produz:

```ts
// logos.ts
export const LOGO_ICONS: Record<LogoIconId, { label: string; path: string }>; // path = atributo d de um SVG 24x24

// busSvg.ts
export interface BusArt { shape: BusShape; primary: string; secondary: string; livery: LiveryStyle; logo?: LogoRef; }
export function busSvg(art: BusArt): SVGSVGElement; // viewBox '0 0 320 120'; o tamanho na tela vem do CSS
export function liveryThumb(style: LiveryStyle, primary: string, secondary: string): SVGSVGElement; // miniatura 64x40

// logoView.ts
export function logoView(logo: LogoRef, colors: { primary: string; secondary: string }, sizePx: number): HTMLElement;

// logoUpload.ts
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export type UploadError = 'tipo' | 'tamanho' | 'leitura';
export function fileToLogoDataUrl(file: File): Promise<{ ok: true; dataUrl: string } | { ok: false; error: UploadError }>;
```

**Como o ônibus é montado.** Todo elemento é criado com `document.createElementNS`, nunca com texto HTML. Cada região tem `data-region`:

| Região | Preenchimento | Observação |
| --- | --- | --- |
| `body` | cor primária | a silhueta muda por modelo |
| `stripe` | cor secundária | recortada pela silhueta com `clipPath`; não existe em `plain` |
| `skirt` | cor primária escurecida em 25% | faixa inferior |
| `windows` | `#14121a` |  |
| `wheels` | `#0b0a0f` com aro `#8a8794` |  |
| `logo` | a logo da empresa | no meio da lateral; só quando `logo` é passado |

Silhuetas: `micro` curta (corpo de 200 de largura, 2 eixos), `conv` média (280, 2 eixos), `rodo` longa e mais alta (300, 3 eixos). Estilos de faixa: `stripe` é uma faixa horizontal à meia altura; `diagonal` são duas faixas inclinadas a 60° na metade traseira; `wave` é uma faixa curva que sobe da traseira para a dianteira.

Os 6 ícones de logo são desenhos próprios e simples (roda com asas, estrada, ônibus de frente, pinheiro, montanha, onda), cada um em um único `path`.

**Como a imagem enviada é tratada.** Tipos aceitos: `image/png`, `image/jpeg`, `image/webp` (conferir `file.type`). Limite de 5 MB antes de ler. A imagem é desenhada em um `canvas` de 128 × 128, centralizada e inteira (sem cortar), com fundo transparente, e exportada com `toDataURL('image/webp', 0.9)`; se o navegador devolver PNG, aceitar. Falha ao decodificar é `leitura`.

- [ ] **Passo 1: Escrever os testes (falham)**

```ts
// busSvg.test.ts
const art = (over: Partial<BusArt> = {}): BusArt => ({ shape: 'micro', primary: '#ff7a00', secondary: '#ffffff', livery: 'diagonal', ...over });
const region = (svg: SVGSVGElement, name: string) => svg.querySelector(`[data-region="${name}"]`);
test('os 3 modelos e os 4 estilos geram um desenho com as cores da empresa', () => {
  for (const shape of ['micro', 'conv', 'rodo'] as const) for (const livery of ['plain', 'stripe', 'diagonal', 'wave'] as const) {
    const svg = busSvg(art({ shape, livery }));
    expect(svg.getAttribute('viewBox')).toBe('0 0 320 120');
    expect(region(svg, 'body')!.getAttribute('fill')).toBe('#ff7a00');
    expect(region(svg, 'windows')).not.toBeNull();
    expect(region(svg, 'wheels')).not.toBeNull();
    expect(region(svg, 'stripe') === null).toBe(livery === 'plain');
    if (livery !== 'plain') expect(region(svg, 'stripe')!.getAttribute('fill')).toBe('#ffffff');
  }
});
test('o rodoviário tem 3 rodas e os outros 2', () => {
  const wheels = (m: BusShape) => busSvg(art({ shape: m })).querySelectorAll('[data-region="wheels"] circle.tire').length;
  expect([wheels('micro'), wheels('conv'), wheels('rodo')]).toEqual([2, 2, 3]);
});
test('modelo desconhecido lança erro', () => { expect(() => busSvg(art({ shape: 'jato' as BusShape }))).toThrow(); });
test('a logo só aparece quando é passada', () => {
  expect(region(busSvg(art()), 'logo')).toBeNull();
  expect(region(busSvg(art({ logo: { kind: 'icon', iconId: 'pine' } })), 'logo')).not.toBeNull();
});

// logoView.test.ts
test('ícone vira SVG; imagem vira <img> com o dataUrl', () => {
  const colors = { primary: '#ff7a00', secondary: '#ffffff' };
  expect(logoView({ kind: 'icon', iconId: 'wave' }, colors, 40).querySelector('svg')).not.toBeNull();
  const img = logoView({ kind: 'image', dataUrl: 'data:image/png;base64,AAAA' }, colors, 40).querySelector('img')!;
  expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  expect(img.getAttribute('alt')).toBe('');
});
test('existem exatamente os 6 ícones', () => {
  expect(Object.keys(LOGO_ICONS).sort()).toEqual(['bus', 'mountain', 'pine', 'road', 'wave', 'wheel']);
});

// logoUpload.test.ts
const file = (type: string, bytes: number) => new File([new Uint8Array(bytes)], 'logo', { type });
test('foco de revisão: arquivo que não é imagem é recusado', async () => {
  expect(await fileToLogoDataUrl(file('application/pdf', 10))).toEqual({ ok: false, error: 'tipo' });
  expect(await fileToLogoDataUrl(file('image/svg+xml', 10))).toEqual({ ok: false, error: 'tipo' });
});
test('foco de revisão: imagem acima de 5 MB é recusada antes de ser lida', async () => {
  expect(await fileToLogoDataUrl(file('image/jpeg', MAX_UPLOAD_BYTES + 1))).toEqual({ ok: false, error: 'tamanho' });
});
test('bytes que não formam uma imagem dão erro de leitura', async () => {
  expect(await fileToLogoDataUrl(file('image/png', 10))).toEqual({ ok: false, error: 'leitura' });
});
```

Rodar: `npm test -- busSvg logoView logoUpload`. Esperado: FALHA. O jsdom não decodifica imagens; no teste de `leitura`, a implementação deve tratar tanto o evento de erro quanto a ausência de `canvas` como `leitura`, com limite de 5 segundos.

- [ ] **Passo 2: Implementar** `logos.ts`, `busSvg.ts`, `logoView.ts`, `logoUpload.ts`.
- [ ] **Passo 3: Galeria de conferência.** Em `app.ts`, quando o endereço termina em `?galeria`, mostrar uma página com os 12 ônibus (3 modelos × 4 estilos) em laranja e branco, os mesmos 12 em azul-marinho e amarelo, e os 6 ícones. A galeria existe só em desenvolvimento (`import.meta.env.DEV`).
- [ ] **Passo 4: Rodar e conferir**

Rodar: `npm test`. Esperado: todos passam. Abrir `http://localhost:5173/?galeria`. Esperado: os três modelos são distinguíveis de relance, as faixas não vazam para fora da carroceria, janelas e rodas ficam legíveis nas duas combinações de cor.

- [ ] **Passo 5: Ponto de aprovação visual.** Mostrar a galeria ao Kaique. O desenho dos ônibus é o coração do jogo; ajustar aqui até ele aprovar.
- [ ] **Passo 6: Commit**

```bash
git add -A
git commit -m "feat: desenho dos ônibus com pintura, ícones de logo e envio de imagem"
```

### Tarefa 12: Criação da empresa

**Arquivos:**

- Criar: `src/ui/createCompany.ts`, `src/ui/createCompany.test.ts`
- Modificar: `src/ui/app.ts`

**Interfaces:**

- Consome: `validateCompanyInput`, `createGame`, `busSvg`, `liveryThumb`, `logoView`, `fileToLogoDataUrl`, `applyTheme`, `nearestCity`, `formatPeople`.
- Produz:

```ts
export interface CreateProps { catalog: Catalog; mode: 'create' | 'edit'; initial?: Company; onSubmit(input: CompanyInput): void; onCancel(): void; }
export function renderCreateCompany(p: CreateProps): HTMLElement;
```

**Layout,** como na imagem de referência: formulário à esquerda, prévia grande à direita, botão principal embaixo à direita.

**Campos, na ordem:**

1. `Nome da viação`: campo de texto com `maxlength="30"`.
2. `Cidade-sede`: um cartão por cidade com nome, população, dificuldade (`Começo fácil`, `Começo médio`, `Começo difícil`) e `Linha inicial: <sede> ⇄ <cidade mais próxima>`. No modo `edit` este campo não aparece.
3. `Cor primária` e `Cor secundária`: `<input type="color">`.
4. `Logo`: os 6 ícones e o botão `Enviar minha logo`.
5. `Pintura padrão`: as 4 miniaturas.

**Valores iniciais no modo `create`:** nome vazio, nenhuma sede escolhida, cores `#ff7a00` e `#ffffff`, ícone `bus`, pintura `diagonal`.

**Prévia:** o ônibus `conv` com a pintura atual e a logo, a logo ao lado do nome, e a cor de destaque da própria tela mudando junto (`applyTheme`). Atualiza a cada alteração, sem recarregar o formulário.

**Botões:** `Começar` no modo `create`, `Salvar` no modo `edit`, e `Voltar`.

**Mensagens de erro,** mostradas ao lado do campo ao tentar enviar:

| Erro | Mensagem |
| --- | --- |
| `nome` | Dê um nome à sua viação (até 30 letras). |
| `sede` | Escolha a cidade-sede. |
| `cor` | Escolha as duas cores. |
| `logo` | Escolha um ícone ou envie uma imagem. |
| envio `tipo` | Use uma imagem PNG, JPG ou WebP. |
| envio `tamanho` | A imagem precisa ter até 5 MB. |
| envio `leitura` | Não foi possível ler essa imagem. |

- [ ] **Passo 1: Escrever os testes (falham)**

```ts
const mount = (over: Partial<CreateProps> = {}) => {
  const submitted: CompanyInput[] = [];
  const el = renderCreateCompany({ catalog: testCatalog, mode: 'create', onSubmit: i => submitted.push(i), onCancel() {}, ...over });
  document.body.replaceChildren(el);
  const type = (sel: string, value: string) => { const i = el.querySelector<HTMLInputElement>(sel)!; i.value = value; i.dispatchEvent(new Event('input', { bubbles: true })); };
  const click = (sel: string) => el.querySelector<HTMLElement>(sel)!.click();
  return { el, submitted, type, click };
};
test('enviar vazio mostra os erros e não cria nada', () => {
  const { el, submitted, click } = mount();
  click('[data-action="submit"]');
  expect(submitted).toHaveLength(0);
  expect(el.textContent).toContain('Dê um nome à sua viação');
  expect(el.textContent).toContain('Escolha a cidade-sede.');
});
test('preenchido, envia a empresa completa', () => {
  const { submitted, type, click } = mount();
  type('[name="name"]', '  Expresso Catarina ');
  click('[data-city="gama"]');
  type('[name="primary"]', '#0055aa');
  click('[data-icon="pine"]');
  click('[data-livery="wave"]');
  click('[data-action="submit"]');
  expect(submitted).toEqual([{ name: '  Expresso Catarina ', hqCityId: 'gama', primaryColor: '#0055aa', secondaryColor: '#ffffff', logo: { kind: 'icon', iconId: 'pine' }, defaultLivery: 'wave' }]);
});
test('a prévia acompanha a cor e a pintura', () => {
  const { el, type, click } = mount();
  type('[name="primary"]', '#0055aa'); click('[data-livery="plain"]');
  const preview = el.querySelector('[data-preview] svg')!;
  expect(preview.querySelector('[data-region="body"]')!.getAttribute('fill')).toBe('#0055aa');
  expect(preview.querySelector('[data-region="stripe"]')).toBeNull();
});
test('cada cidade mostra dificuldade e linha inicial', () => {
  const card = mount().el.querySelector('[data-city="gama"]')!;
  expect(card.textContent).toContain('gama ⇄ beta'.replace('gama', testCatalog.cities.find(c => c.id === 'gama')!.name).replace('beta', testCatalog.cities.find(c => c.id === 'beta')!.name));
});
test('no modo edição a sede não aparece e os valores vêm preenchidos', () => {
  const { el, submitted, click } = mount({ mode: 'edit', initial: testCompany });
  expect(el.querySelector('[data-city]')).toBeNull();
  click('[data-action="submit"]');
  expect(submitted[0]).toEqual(testCompany);
});
```

O nome é enviado como digitado; quem corta os espaços é `createGame`. Rodar: `npm test -- createCompany`. Esperado: FALHA.

- [ ] **Passo 2: Implementar `createCompany.ts`.**
- [ ] **Passo 3: Ligar em `app.ts`.** `Começar uma viação` abre a tela `create`. Ao enviar: `createGame`, `storage.save`, `applyTheme` com a empresa, e ir para a tela `game` (ainda provisória, mostrando o nome da empresa e o caixa). Se já existe jogo salvo, `Começar uma viação` pede confirmação antes com o texto `Isso apaga a viação <nome>. Continuar?` (por enquanto com `window.confirm`; a tarefa 14 troca pela janela própria).
- [ ] **Passo 4: Rodar e conferir**

Rodar: `npm test`. Esperado: todos passam. No navegador: criar uma viação com cor azul-marinho e conferir que os botões usam um azul mais claro e legível, enquanto o ônibus da prévia mantém o azul-marinho exato. Enviar uma foto grande do celular como logo e conferir que aparece reduzida. Recarregar a página: a tela inicial mostra `Continuar: <nome>`.

- [ ] **Passo 5: Commit**

```bash
git add -A
git commit -m "feat: criação da viação com sede, cores, logo e pintura"
```

## Fase 5 — Jogo na tela

Convenções desta fase:

- Todo componente tem a forma `mountX(el, store, opts?): () => void`; a função devolvida desmonta e cancela as inscrições.
- Número que muda com o tempo fica em um elemento com `data-live="<chave>"` e é atualizado no evento `tick`, sem reconstruir nada.
- No evento `change`, um componente só reconstrói um cartão se a lista de itens mudou (linha ou ônibus criado, removido ou realocado). Caso contrário, atualiza os valores no lugar. Isso impede que um controle deslizante seja destruído enquanto o jogador arrasta.
- Em `testkit.ts`, as cidades se chamam `Alfa`, `Beta` e `Gama`, e existe `memoryKv()`, o armazenamento em memória usado nos testes da tarefa 8 (mover para lá).
- Os testes desta fase usam este início comum:

```ts
// @vitest-environment jsdom
const setup = (cashCents = 1_500_000) => {
  const store = createStore(testCatalog, { ...createGame(testCatalog, testCompany), cashCents }, 0); // pausado
  const el = document.createElement('div'); document.body.replaceChildren(el);
  return { store, el };
};
const flush = () => new Promise(r => setTimeout(r, 0));
const click = (sel: string, root: ParentNode = document) => root.querySelector<HTMLElement>(sel)!.click();
```

### Tarefa 13: Mapa

**Arquivos:**

- Criar: `src/sim/geo.ts`, `src/sim/geo.test.ts`, `src/map/mapView.ts`
- Modificar: `src/ui/app.ts`

**Interfaces:**

- Consome: `Store`, `Road`, `Bus`, `Line`, `busesOnLine`, `servedCities`, `travelMinutes`, `h`, `formatPeople`.
- Produz:

```ts
// geo.ts
export interface RoadIndex { road: Road; cumulativeKm: number[]; totalKm: number; }
export function buildRoadIndex(road: Road): RoadIndex;
export function pointAt(index: RoadIndex, t: number): [number, number];   // t de 0 (road.a) a 1 (road.b), preso ao intervalo
export function lineT(bus: Bus, line: Line, road: Road): number | null;   // posição do ônibus no sentido road.a -> road.b; null se parado na garagem
export function etaMinutes(bus: Bus, road: Road): number | null;          // minutos até chegar; null se não está em viagem

// mapView.ts
export function mountMap(el: HTMLElement, store: Store): () => void;
```

`lineT` precisa de cuidado com o sentido: a linha guarda `a` e `b` na ordem escolhida pelo jogador, e a rodovia guarda em ordem alfabética. Um ônibus esperando na ponta `a` da linha está em `t = 0` se `line.a === road.a`, e em `t = 1` caso contrário.

- [ ] **Passo 1: Escrever os testes de `geo` (falham)**

```ts
const road: Road = { id: 'beta-gama', a: 'beta', b: 'gama', distanceKm: 30, coords: [[0, 0], [0, 1], [0, 3]] };
const line = (a: string, b: string) => ({ ...newLine(testCatalog, a, b, 1550) });
const bus = (trip: Trip): Bus => ({ id: 'bus-1', modelId: 'mini', name: 'x', livery: 'plain', lineId: 'beta-gama', trip });

test('ponto ao longo do traçado é proporcional à distância, não ao número de pontos', () => {
  const index = buildRoadIndex(road);
  expect(pointAt(index, 0)).toEqual([0, 0]);
  expect(pointAt(index, 1)).toEqual([0, 3]);
  expect(pointAt(index, 0.5)[1]).toBeCloseTo(1.5, 3);
  expect(pointAt(index, -1)).toEqual([0, 0]);
  expect(pointAt(index, 7)).toEqual([0, 3]);
});
test('posição respeita o sentido em que o jogador criou a linha', () => {
  const forward = line('beta', 'gama'); const backward = line('gama', 'beta');
  expect(lineT(bus({ phase: 'waiting', at: 'a', minutesLeft: 0 }), forward, road)).toBe(0);
  expect(lineT(bus({ phase: 'waiting', at: 'a', minutesLeft: 0 }), backward, road)).toBe(1);
  expect(lineT(bus({ phase: 'moving', from: 'a', progress: 0.25, passengers: 0, fareCents: 0 }), forward, road)).toBe(0.25);
  expect(lineT(bus({ phase: 'moving', from: 'a', progress: 0.25, passengers: 0, fareCents: 0 }), backward, road)).toBe(0.75);
  expect(lineT(bus({ phase: 'moving', from: 'b', progress: 0.25, passengers: 0, fareCents: 0 }), forward, road)).toBe(0.75);
  expect(lineT(bus({ phase: 'idle' }), forward, road)).toBeNull();
});
test('minutos até a chegada', () => {
  expect(etaMinutes(bus({ phase: 'moving', from: 'a', progress: 0.5, passengers: 0, fareCents: 0 }), road)).toBe(15);
  expect(etaMinutes(bus({ phase: 'waiting', at: 'a', minutesLeft: 3 }), road)).toBeNull();
});
```

Rodar: `npm test -- geo`. Esperado: FALHA.

- [ ] **Passo 2: Implementar `geo.ts`** com distância de Haversine entre pontos consecutivos.
- [ ] **Passo 3: Implementar `mapView.ts`.** O Leaflet não é testado em jsdom; a conferência é no navegador, no passo 5.

| Elemento | Como é |
| --- | --- |
| Fundo | `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`, atribuição `© OpenStreetMap contributors © CARTO` |
| Enquadramento | `fitBounds` nas cidades com folga de 30%; zoom de 7 a 12; `maxBounds` com folga de 100% |
| Rodovias sem linha | traço de 2 px, cor `--border`, opacidade 0,6 |
| Linhas da empresa | traço de 4 px na cor primária da empresa; tracejado quando pausada |
| Cidades | círculo de raio 7 com o nome sempre visível; preenchido com `--accent` quando atendida; a sede tem um anel a mais |
| Ônibus | `L.divIcon` de 28 × 12 px, cantos arredondados, cor primária com uma faixa na secundária; um por ônibus em linha |

No `tick`: mover cada marcador com `setLatLng(pointAt(...))` e atualizar o balão aberto. No `change`: reconciliar traços, cidades e marcadores com o estado. Ônibus parado na garagem não tem marcador.

Balões, montados com `h()` e passados ao Leaflet como elemento (nunca como texto HTML):

- **Ônibus:** nome; `Linha: Ibirama ⇄ Blumenau`; `Passageiros: 18 de 24`; e `Chega em 12 min` ou `Em Blumenau · sai em 4 min`.
- **Cidade:** nome; população; `Sede da viação` quando for; e, para cada linha da empresa que passa ali, `Esperando para Blumenau: 12`.

* [ ] **Passo 4: Ligar em `app.ts`.** A tela `game` vira uma grade: barra superior (provisória, só nome e caixa), mapa à esquerda e uma coluna vazia de 380 px à direita. Entrar na tela cria o `store` e inicia o `createLoop`; sair para o loop e desmonta o mapa. `Continuar` na tela inicial carrega o save e entra aqui.
* [ ] **Passo 5: Rodar e conferir no navegador**

Rodar: `npm test`. Esperado: todos passam. No navegador, com uma viação sediada em Ibirama:

1. O mapa mostra SC em tema escuro com as 4 cidades nomeadas.
2. A linha Ibirama ⇄ Blumenau aparece na cor da empresa, seguindo a BR-470.
3. O ônibus sai de Ibirama e desliza sobre a rodovia, sem cortar caminho.
4. Clicar no ônibus abre o balão, e o tempo de chegada diminui com o balão aberto.
5. Trocar de aba por um minuto e voltar: o ônibus continua de onde estava, sem salto.

- [ ] **Passo 6: Commit**

```bash
git add -A
git commit -m "feat: mapa com rodovias, cidades e ônibus em movimento"
```

### Tarefa 14: Barra superior e aba Linhas

**Arquivos:**

- Criar: `src/ui/topBar.ts`, `src/ui/panel.ts`, `src/ui/linesTab.ts`, `src/ui/newLineDialog.ts`, `src/ui/dialog.ts`, `src/ui/toast.ts`
- Criar: `src/ui/topBar.test.ts`, `src/ui/linesTab.test.ts`, `src/ui/dialog.test.ts`
- Modificar: `src/ui/app.ts`, `src/ui/createCompany.ts` (trocar `window.confirm` por `confirmDialog`)

**Interfaces:**

- Consome: `Store`, as ações e os seletores da tarefa 6, `priceBoundsCents`, `formatMoney`, `formatClock`, `errorMessage`, `logoView`.
- Produz:

```ts
// dialog.ts: janela própria (div com role="dialog" e aria-modal), porque <dialog> não funciona em jsdom
export function confirmDialog(message: string, confirmLabel?: string): Promise<boolean>; // Esc ou 'Cancelar' = false
export function promptDialog(o: { title: string; label: string; initial?: string; maxLength: number; confirmLabel: string }): Promise<string | null>;
// os botões têm data-action="confirm" e data-action="cancel"

// toast.ts
export function toast(message: string, kind?: 'info' | 'ok' | 'erro'): void; // canto superior direito, some em 4 s

export function mountTopBar(el: HTMLElement, store: Store, opts: { onMenu(): void }): () => void;
export function mountPanel(el: HTMLElement, store: Store): () => void;      // abas Linhas, Garagem, Loja
export function mountLinesTab(el: HTMLElement, store: Store): () => void;
export function openNewLineDialog(store: Store): Promise<void>;
```

**Barra superior:** botão de menu (`data-action="menu"`), logo, nome da empresa, caixa (`data-live="cash"`, com a classe `money-down` quando negativo), relógio (`data-live="clock"`) e os botões `data-speed="0"` (pausa), `"1"`, `"2"` e `"4"`, com `aria-pressed` no ativo. A barra de espaço alterna entre pausa e a última velocidade, exceto quando o foco está em um campo de texto.

**Cartão de linha** (`data-line="<id>"`):

- Título `Ibirama ⇄ Blumenau` e distância.
- Controle deslizante de preço: `min` e `max` de `priceBoundsCents`, `step="10"`; ao lado, o valor (`data-live="price"`, com centavos) e `Referência: R$ 29,50`.
- `Lotação: 68%` (`data-live="occupancy"`; mostra `sem viagens ainda` quando nulo).
- `Lucro hoje: R$ 1.240` (`data-live="profit"`; verde ou vermelho).
- Os ônibus da linha, cada um com um botão para retirar, e um seletor `Adicionar ônibus` com os parados.
- Botões `data-action="pause"` (`Pausar` ou `Retomar`) e `data-action="close"` (`Excluir`, com confirmação `Excluir a linha <nome>? A taxa de abertura não é devolvida.`).

Acima dos cartões, o botão `Nova linha` (`data-action="new-line"`).

**Janela de nova linha:** um cartão por rota de `openableRoutes` (`data-route="<id>"`), com `Blumenau ⇄ Itajaí`, a distância, `Demanda estimada: 741 passageiros por dia em cada sentido` e `Taxa de abertura: R$ 37.050`. Rota com taxa acima do caixa fica com `aria-disabled="true"` e o texto `Faltam R$ <diferença>`. Abaixo, o seletor opcional de ônibus parado. Sem nenhuma rota disponível, mostra `Você já opera todas as linhas que saem da sua rede.` Toda ação que falha mostra `toast(errorMessage(erro), 'erro')`.

- [ ] **Passo 1: Escrever os testes (falham)**

```ts
// topBar.test.ts
test('mostra empresa, caixa e relógio, e atualiza no tick', () => {
  const { store, el } = setup(); mountTopBar(el, store, { onMenu() {} });
  const live = (k: string) => el.querySelector(`[data-live="${k}"]`)!;
  expect(el.textContent).toContain(testCompany.name);
  expect(live('cash').textContent).toBe('R$ 15.000');
  expect(live('clock').textContent).toBe('Dia 1 · 00:00');
  store.advance(61);
  expect(live('cash').textContent).toBe('R$ 15.088');
  expect(live('clock').textContent).toBe('Dia 1 · 01:01');
});
test('caixa negativo fica vermelho', () => {
  const { store, el } = setup(-5_000); mountTopBar(el, store, { onMenu() {} });
  expect(el.querySelector('[data-live="cash"]')!.classList.contains('money-down')).toBe(true);
});
test('botões de velocidade', () => {
  const { store, el } = setup(); mountTopBar(el, store, { onMenu() {} });
  click('[data-speed="4"]', el);
  expect(store.getSpeed()).toBe(4);
  expect(el.querySelector('[data-speed="4"]')!.getAttribute('aria-pressed')).toBe('true');
  expect(el.querySelector('[data-speed="0"]')!.getAttribute('aria-pressed')).toBe('false');
});
test('desmontar para de atualizar', () => {
  const { store, el } = setup(); const off = mountTopBar(el, store, { onMenu() {} });
  off(); store.advance(61);
  expect(el.querySelector('[data-live="cash"]')?.textContent ?? 'R$ 15.000').toBe('R$ 15.000');
});

// linesTab.test.ts
test('um cartão por linha, com o nome das cidades', () => {
  const { store, el } = setup(); mountLinesTab(el, store);
  expect(el.querySelectorAll('[data-line]')).toHaveLength(1);
  expect(el.querySelector('[data-line="alfa-beta"]')!.textContent).toContain('Alfa ⇄ Beta');
});
test('arrastar o preço muda a linha sem recriar o controle', () => {
  const { store, el } = setup(); mountLinesTab(el, store);
  const slider = el.querySelector<HTMLInputElement>('[data-line="alfa-beta"] input[type="range"]')!;
  expect([slider.min, slider.max, slider.value]).toEqual(['780', '7800', '2600']);
  slider.value = '3000'; slider.dispatchEvent(new Event('input', { bubbles: true }));
  expect(store.getState().lines[0]!.priceCents).toBe(3000);
  expect(el.querySelector('[data-line="alfa-beta"] input[type="range"]')).toBe(slider);
  expect(el.querySelector('[data-line="alfa-beta"] [data-live="price"]')!.textContent).toBe('R$ 30,00');
});
test('pausar e retomar', () => {
  const { store, el } = setup(); mountLinesTab(el, store);
  click('[data-action="pause"]', el);
  expect(store.getState().lines[0]!.paused).toBe(true);
  expect(el.querySelector('[data-action="pause"]')!.textContent).toBe('Retomar');
});
test('excluir pede confirmação', async () => {
  const { store, el } = setup(); mountLinesTab(el, store);
  click('[data-action="close"]', el); await flush(); click('[data-action="cancel"]'); await flush();
  expect(store.getState().lines).toHaveLength(1);
  click('[data-action="close"]', el); await flush(); click('[data-action="confirm"]'); await flush();
  expect(store.getState().lines).toHaveLength(0);
  expect(el.querySelectorAll('[data-line]')).toHaveLength(0);
});
test('nova linha: só rotas que tocam a rede, e abrir cobra a taxa', async () => {
  const { store } = setup(); void openNewLineDialog(store); await flush();
  expect([...document.querySelectorAll('[data-route]')].map(n => n.getAttribute('data-route')).sort()).toEqual(['alfa-gama', 'beta-gama']);
  expect(document.querySelector('[data-route="beta-gama"]')!.textContent).toContain('Taxa de abertura: R$ 10.000');
  click('[data-route="beta-gama"]'); click('[data-action="confirm"]'); await flush();
  expect(store.getState().lines.map(l => l.id)).toEqual(['alfa-beta', 'beta-gama']);
  expect(store.getState().cashCents).toBe(500_000);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
test('nova linha: rota cara demais fica indisponível e diz quanto falta', async () => {
  const { store } = setup(500_000); void openNewLineDialog(store); await flush();
  const card = document.querySelector('[data-route="beta-gama"]')!;
  expect(card.getAttribute('aria-disabled')).toBe('true');
  expect(card.textContent).toContain('Faltam R$ 5.000');
});

// dialog.test.ts
test('confirmar, cancelar e Esc', async () => {
  let p = confirmDialog('Tem certeza?', 'Excluir'); await flush();
  expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Tem certeza?');
  click('[data-action="confirm"]'); expect(await p).toBe(true);
  p = confirmDialog('De novo?'); await flush();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); expect(await p).toBe(false);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
test('campo de texto respeita o limite e devolve o que foi digitado', async () => {
  const p = promptDialog({ title: 'Nome do ônibus', label: 'Nome', maxLength: 30, confirmLabel: 'Salvar' }); await flush();
  const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!;
  expect(input.maxLength).toBe(30);
  input.value = 'Guerreiro da BR-470'; click('[data-action="confirm"]');
  expect(await p).toBe('Guerreiro da BR-470');
});
```

Rodar: `npm test -- topBar linesTab dialog`. Esperado: FALHA.

- [ ] **Passo 2: Implementar** `dialog.ts`, `toast.ts`, `topBar.ts`, `linesTab.ts`, `newLineDialog.ts` e `panel.ts` (as abas Garagem e Loja mostram `Em breve` até a tarefa 15).
- [ ] **Passo 3: Ligar em `app.ts`:** a barra provisória dá lugar a `mountTopBar`, e a coluna direita a `mountPanel`.
- [ ] **Passo 4: Rodar e conferir**

Rodar: `npm test`. Esperado: todos passam. No navegador: arrastar o preço até o máximo e ver a lotação cair nas viagens seguintes; pausar o jogo com a barra de espaço; abrir uma segunda linha e vê-la aparecer no mapa na cor da empresa; conferir que o cartão não pisca nem perde o foco enquanto o tempo corre.

- [ ] **Passo 5: Commit**

```bash
git add -A
git commit -m "feat: barra superior, aba de linhas e criação de linha"
```

### Tarefa 15: Garagem e Loja

**Arquivos:**

- Criar: `src/ui/garageTab.ts`, `src/ui/shopTab.ts`, `src/ui/garageTab.test.ts`, `src/ui/shopTab.test.ts`, `src/ui/panel.test.ts`
- Modificar: `src/ui/panel.ts`

**Interfaces:**

- Consome: `busSvg`, `liveryThumb`, `sellValueCents`, `buyBus`, `sellBus`, `renameBus`, `setBusLivery`, `unassignBus`, `promptDialog`, `confirmDialog`, `toast`.
- Produz: `mountGarageTab(el, store): () => void` e `mountShopTab(el, store): () => void`.

**Painel expandido.** Ao escolher Garagem ou Loja, o painel recebe `data-expanded="true"` e cobre a área do mapa, mostrando os cartões em grade de 3 colunas, como na imagem de referência. O jogo continua rodando. O botão `Voltar ao mapa` (`data-action="back"`) volta para a aba Linhas.

**Cartão da garagem** (`data-bus="<id>"`): nome do ônibus com um botão `data-action="rename"`; o desenho com a pintura daquele ônibus e a logo; nome do modelo e lugares; um selo com `Parado` ou o nome da linha; as 4 miniaturas de pintura (`data-livery`), com a atual marcada; e `data-action="sell"` com o texto `Vender por R$ <valor>`. No último ônibus, o botão de vender fica `disabled` com `title="Sua viação precisa de pelo menos um ônibus."`. Vender pede confirmação: `Vender <nome> por R$ <valor>?`.

**Cartão da loja** (`data-model="<id>"`): o desenho do modelo na pintura padrão da empresa; nome; `<n> lugares`; `Conforto 1,2`; `<x> km por litro`; preço; e `data-action="buy"`. Sem caixa, o botão fica `disabled` e mostra `Faltam R$ <diferença>`. Comprar abre `promptDialog` pedindo o nome (pode ficar vazio); cancelar a janela cancela a compra.

- [ ] **Passo 1: Escrever os testes (falham)**

```ts
// garageTab.test.ts
const withTwo = () => { const s = setup(5_000_000); s.store.dispatch((st, c) => buyBus(st, c, { modelId: 'mini', name: 'Reserva' })); return s; };
test('um cartão por ônibus, com desenho, selo e valor de venda', () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(2);
  expect(el.querySelector('[data-bus="bus-1"]')!.textContent).toContain('Alfa ⇄ Beta');
  expect(el.querySelector('[data-bus="bus-2"]')!.textContent).toContain('Parado');
  expect(el.querySelector('[data-bus="bus-2"] svg [data-region="body"]')!.getAttribute('fill')).toBe(testCompany.primaryColor);
  expect(el.querySelector('[data-bus="bus-2"] [data-action="sell"]')!.textContent).toBe('Vender por R$ 10.000');
});
test('o último ônibus não pode ser vendido', () => {
  const { store, el } = setup(); mountGarageTab(el, store);
  const sell = el.querySelector<HTMLButtonElement>('[data-action="sell"]')!;
  expect(sell.disabled).toBe(true);
  expect(sell.title).toBe('Sua viação precisa de pelo menos um ônibus.');
});
test('trocar a pintura de um ônibus não muda os outros', () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  click('[data-bus="bus-2"] [data-livery="plain"]', el);
  expect(store.getState().buses.map(b => b.livery)).toEqual(['diagonal', 'plain']);
  expect(el.querySelector('[data-bus="bus-2"] svg [data-region="stripe"]')).toBeNull();
  expect(el.querySelector('[data-bus="bus-1"] svg [data-region="stripe"]')).not.toBeNull();
});
test('renomear e vender passam pelas janelas', async () => {
  const { store, el } = withTwo(); mountGarageTab(el, store);
  click('[data-bus="bus-2"] [data-action="rename"]', el); await flush();
  document.querySelector<HTMLInputElement>('[role="dialog"] input')!.value = '<b>Trovão</b>'; click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses[1]!.name).toBe('<b>Trovão</b>');
  expect(el.querySelector('[data-bus="bus-2"] b')).toBeNull();                 // aparece como texto
  click('[data-bus="bus-2"] [data-action="sell"]', el); await flush(); click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses).toHaveLength(1);
  expect(store.getState().cashCents).toBe(3_000_000 + 1_000_000);
});

// shopTab.test.ts
test('sem caixa, o botão diz quanto falta', () => {
  const { store, el } = setup(); mountShopTab(el, store);
  const buy = el.querySelector<HTMLButtonElement>('[data-model="mini"] [data-action="buy"]')!;
  expect(buy.disabled).toBe(true);
  expect(buy.textContent).toBe('Faltam R$ 5.000');
});
test('o botão libera quando o caixa alcança o preço', () => {
  const { store, el } = setup(1_990_000); mountShopTab(el, store);
  store.advance(61); // a primeira viagem rende R$ 88
  expect(el.querySelector<HTMLButtonElement>('[data-action="buy"]')!.disabled).toBe(true);
  store.replace({ ...store.getState(), cashCents: 2_000_000 });
  expect(el.querySelector<HTMLButtonElement>('[data-action="buy"]')!.disabled).toBe(false);
});
test('comprar pede o nome; cancelar não compra', async () => {
  const { store, el } = setup(5_000_000); mountShopTab(el, store);
  click('[data-action="buy"]', el); await flush(); click('[data-action="cancel"]'); await flush();
  expect(store.getState().buses).toHaveLength(1);
  click('[data-action="buy"]', el); await flush(); click('[data-action="confirm"]'); await flush();
  expect(store.getState().buses).toHaveLength(2);
  expect(store.getState().buses[1]!.name).toMatch(/#2$/);
});

// panel.test.ts
test('Garagem e Loja expandem o painel; Voltar ao mapa recolhe', () => {
  const { store, el } = setup(); mountPanel(el, store);
  expect(el.querySelector('[data-expanded="true"]')).toBeNull();
  click('[data-tab="garage"]', el);
  expect(el.querySelector('[data-expanded="true"]')).not.toBeNull();
  expect(el.querySelectorAll('[data-bus]')).toHaveLength(1);
  click('[data-action="back"]', el);
  expect(el.querySelector('[data-expanded="true"]')).toBeNull();
  expect(el.querySelectorAll('[data-line]')).toHaveLength(1);
});
```

O estado de “falta caixa” da loja depende do caixa, que muda com o tempo; por isso o botão de comprar também é atualizado no `tick`. Rodar: `npm test -- garageTab shopTab panel`. Esperado: FALHA.

- [ ] **Passo 2: Implementar** `garageTab.ts`, `shopTab.ts` e o modo expandido em `panel.ts`.
- [ ] **Passo 3: Rodar e conferir**

Rodar: `npm test`. Esperado: todos passam. No navegador: juntar dinheiro em 4x, comprar o segundo ônibus com um nome, trocar a pintura só dele, voltar ao mapa, alocá-lo na linha e ver dois marcadores espaçados na rodovia.

- [ ] **Passo 4: Commit**

```bash
git add -A
git commit -m "feat: garagem com pintura por ônibus e loja"
```

### Tarefa 16: Menu, salvamento automático e avisos

**Arquivos:**

- Criar: `src/ui/companyMenu.ts`, `src/ui/companyMenu.test.ts`, `src/ui/app.test.ts`
- Modificar: `src/game/store.ts` (acrescentar `attachAutosave`), `src/game/store.test.ts`, `src/ui/app.ts`, `src/main.ts`

**Interfaces:**

- Consome: `SaveStorage`, `createStorage`, `importText`, `exportBlob`, `exportFileName`, `acquireTabLock`, `updateCompany`, `renderCreateCompany`, `applyTheme`, `confirmDialog`, `toast`.
- Produz:

```ts
// store.ts
export function attachAutosave(store: Store, storage: SaveStorage, onFail: () => void, doc?: Document): () => void;
// grava em 'hour', em 'change' e quando doc fica escondido (visibilitychange) ou a página sai (pagehide).
// onFail é chamado no máximo uma vez.

// app.ts
export interface BootDeps { catalog: Catalog; kv: KeyValue | null; locks?: Pick<LockManager, 'request'>; }
export function boot(root: HTMLElement, deps: BootDeps): Promise<void>; // main.ts passa a chamar só isto

// companyMenu.ts
export interface MenuDeps { store: Store; storage: SaveStorage; onEditIdentity(): void; onExit(): void; onNewGame(): void; }
export function openCompanyMenu(deps: MenuDeps): void;
export function importIntoGame(store: Store, storage: SaveStorage, text: string): boolean; // true se trocou o jogo
```

**Sequência de `boot`:**

1. `acquireTabLock`. Se falhar, mostrar só `O jogo já está aberto em outra aba. Feche a outra aba e recarregue esta.` e parar, sem botões.
2. `storage.load`. Conforme o resultado, a tela inicial recebe: o nome para `Continuar`; ou o aviso `Seu jogo salvo não pôde ser lido. Ele continua guardado neste navegador até você começar uma viação nova.` quando `damaged`; ou nada.
3. Ao continuar a partir do backup, `toast('Recuperamos seu jogo da cópia de segurança.', 'info')`.
4. Ao entrar no jogo, `attachAutosave`. Na primeira falha: `toast('Não foi possível salvar neste navegador. Exporte seu jogo pelo menu para não perder o progresso.', 'erro')`.

**Itens do menu** (`data-menu="<chave>"`):

| Chave | Texto | O que faz |
| --- | --- | --- |
| `edit` | Editar identidade | Abre a tela de criação no modo `edit`; ao salvar, `updateCompany` e `applyTheme` |
| `export` | Exportar jogo salvo | Baixa o arquivo de `exportBlob` com o nome de `exportFileName` |
| `import` | Importar jogo salvo | Confirma `Isso substitui a viação atual. Continuar?` e chama `importIntoGame` |
| `new` | Novo jogo | Confirma `Isso apaga a viação <nome> e todo o progresso. Não dá para desfazer.`, depois `storage.clear()` e tela inicial |
| `exit` | Sair para a tela inicial | Grava e volta à tela inicial |

`importIntoGame` com arquivo inválido não toca no jogo e avisa: `Esse arquivo não é um jogo salvo válido.`, ou `Esse jogo salvo é de uma versão mais nova do jogo.` para `versao_futura`. O mesmo vale para `Importar jogo salvo` na tela inicial.

- [ ] **Passo 1: Escrever os testes (falham)**

```ts
// store.test.ts (acrescentar)
test('salva a cada hora de jogo e a cada ação', () => {
  const kv = memoryKv(); const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  attachAutosave(store, createStorage(kv), () => {});
  store.advance(59); expect(kv.data.has(SAVE_KEY)).toBe(false);
  store.advance(1);  expect(JSON.parse(kv.data.get(SAVE_KEY)!).clockMinutes).toBe(60);
  store.dispatch((s, c) => setLinePrice(s, c, 'alfa-beta', 3000));
  expect(JSON.parse(kv.data.get(SAVE_KEY)!).lines[0].priceCents).toBe(3000);
});
test('foco de revisão: armazenamento cheio avisa uma vez e o jogo segue', () => {
  const kv = { ...memoryKv(), setItem: () => { throw new Error('cheio'); } }; let fails = 0;
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  attachAutosave(store, createStorage(kv), () => fails++);
  store.advance(60); store.advance(60); store.advance(60);
  expect(fails).toBe(1);
  expect(store.getState().clockMinutes).toBe(180);
});
test('depois de desligar, não salva mais', () => {
  const kv = memoryKv(); const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  attachAutosave(store, createStorage(kv), () => {})();
  store.advance(60); expect(kv.data.has(SAVE_KEY)).toBe(false);
});

// app.test.ts  (jsdom)
const root = () => { const r = document.createElement('div'); document.body.replaceChildren(r); return r; };
const busy = { request: async (_n: string, _o: object, cb: (l: object | null) => unknown) => cb(null) } as unknown as Pick<LockManager, 'request'>;
const free = { request: async (_n: string, _o: object, cb: (l: object | null) => unknown) => cb({}) } as unknown as Pick<LockManager, 'request'>;

test('foco de revisão: save ilegível abre a tela inicial com aviso e não apaga nada', async () => {
  const kv = memoryKv(); kv.data.set(SAVE_KEY, '{"version":1,"cashCents":"hack"}'); const r = root();
  await boot(r, { catalog: testCatalog, kv, locks: free });
  expect(r.textContent).toContain('Seu jogo salvo não pôde ser lido');
  expect(r.textContent).toContain('Começar uma viação');
  expect(r.textContent).not.toContain('Continuar');
  expect(kv.data.get(SAVE_KEY)).toBe('{"version":1,"cashCents":"hack"}');
});
test('foco de revisão: sem armazenamento, o jogo abre normalmente', async () => {
  const r = root(); await boot(r, { catalog: testCatalog, kv: null, locks: free });
  expect(r.textContent).toContain('Começar uma viação');
});
test('jogo salvo válido oferece Continuar com o nome da viação', async () => {
  const kv = memoryKv(); createStorage(kv).save(createGame(testCatalog, testCompany)); const r = root();
  await boot(r, { catalog: testCatalog, kv, locks: free });
  expect(r.textContent).toContain(`Continuar: ${testCompany.name}`);
});
test('segunda aba não joga', async () => {
  const r = root(); await boot(r, { catalog: testCatalog, kv: memoryKv(), locks: busy });
  expect(r.textContent).toContain('O jogo já está aberto em outra aba');
  expect(r.querySelector('button')).toBeNull();
});

// companyMenu.test.ts  (jsdom)
test('importar arquivo inválido não mexe no jogo atual', () => {
  const kv = memoryKv(); const storage = createStorage(kv);
  const store = createStore(testCatalog, createGame(testCatalog, testCompany)); const before = store.getState();
  expect(importIntoGame(store, storage, 'isto não é um save')).toBe(false);
  expect(importIntoGame(store, storage, JSON.stringify({ version: 99 }))).toBe(false);
  expect(store.getState()).toBe(before);
  expect(kv.data.size).toBe(0);
});
test('importar arquivo válido troca o jogo e grava', () => {
  const kv = memoryKv(); const storage = createStorage(kv);
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  const other = advance(createGame(testCatalog, { ...testCompany, name: 'Outra' }), testCatalog, 500);
  expect(importIntoGame(store, storage, serialize(other))).toBe(true);
  expect(store.getState()).toEqual(other);
  expect(JSON.parse(kv.data.get(SAVE_KEY)!).company.name).toBe('Outra');
});
test('o menu tem os cinco itens', () => {
  const store = createStore(testCatalog, createGame(testCatalog, testCompany));
  openCompanyMenu({ store, storage: createStorage(memoryKv()), onEditIdentity() {}, onExit() {}, onNewGame() {} });
  expect([...document.querySelectorAll('[data-menu]')].map(n => n.getAttribute('data-menu'))).toEqual(['edit', 'export', 'import', 'new', 'exit']);
});
```

Rodar: `npm test -- store app companyMenu`. Esperado: FALHA.

- [ ] **Passo 2: Implementar** `attachAutosave`, `boot`, `companyMenu.ts`, e reduzir `main.ts` a montar `kv` com `try/catch` e chamar `boot`.
- [ ] **Passo 3: Rodar e conferir**

Rodar: `npm test`. Esperado: todos passam. No navegador:

1. Jogar 2 minutos, fechar a aba, abrir de novo e continuar: relógio, caixa e posição dos ônibus estão como ficaram.
2. Abrir o jogo em uma segunda aba: aparece só o aviso de outra aba.
3. Exportar, começar um novo jogo, importar o arquivo: a viação antiga volta.
4. Em uma janela anônima com armazenamento bloqueado: o jogo abre, joga e mostra o aviso de salvamento uma vez.
5. Editar a identidade: mudar a cor primária muda botões, linhas no mapa e todos os ônibus.

- [ ] **Passo 4: Commit**

```bash
git add -A
git commit -m "feat: menu da viação, salvamento automático, importação e avisos"
```

## Fase 6 — Entrega

### Tarefa 17: Teste de ponta a ponta e publicação

**Arquivos:**

- Criar: `e2e/smoke.spec.ts`, `playwright.config.ts`
- Modificar: `README.md`, `.github/workflows/deploy.yml`, `docs/superpowers/specs/2026-11-12-minha-viacao-mvp-design.md`

**Interfaces:**

- Consome: o jogo inteiro, pelo navegador.
- Produz: o comando `npm run e2e` e o jogo publicado.

* [ ] **Passo 1: Instalar o Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`: `testDir: 'e2e'`, navegador Chromium, janela de 1440 × 900, e `webServer` com o comando `npm run build && npx vite preview --port 4173 --strictPort`, `url: 'http://localhost:4173'`.

- [ ] **Passo 2: Escrever o teste de ponta a ponta (falha se algo estiver solto)**

```ts
import { expect, test } from '@playwright/test';

test('criar uma viação, ganhar dinheiro e continuar depois de recarregar', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('http://localhost:4173');
  await expect(page.getByRole('button', { name: 'Continuar' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Começar uma viação' }).click();

  await page.locator('[name="name"]').fill('Expresso Teste');
  await page.locator('[data-city="ibirama"]').click();
  await page.locator('[data-livery="wave"]').click();
  await page.locator('[data-action="submit"]').click();

  const cash = page.locator('[data-live="cash"]');
  await expect(page.getByText('Expresso Teste')).toBeVisible();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await expect(page.locator('[data-line]')).toHaveCount(1);
  const startCash = await cash.textContent();

  await page.locator('[data-speed="4"]').click();
  await expect(cash).not.toHaveText(startCash!, { timeout: 90_000 }); // a primeira viagem chega

  await page.locator('[data-tab="garage"]').click();
  await expect(page.locator('[data-bus] svg')).toHaveCount(1);

  await page.reload();
  await page.getByRole('button', { name: 'Continuar: Expresso Teste' }).click();
  await expect(page.locator('[data-live="clock"]')).not.toHaveText('Dia 1 · 00:00');
  expect(errors).toEqual([]);
});
```

Rodar: `npm run e2e`. Esperado: `1 passed`.

- [ ] **Passo 3: Rodar o teste de ponta a ponta na publicação.** Em `deploy.yml`, depois de `npm test`: `npx playwright install --with-deps chromium` e `npm run e2e`. Uma falha impede a publicação.
- [ ] **Passo 4: Conferir o mapa-base.** Ler os termos de uso atuais do provedor das imagens do mapa e confirmar que um jogo gratuito e público pode usá-las com a atribuição. Se não puder, trocar por um provedor que permita e anotar a decisão no `README.md`. A atribuição precisa estar visível no canto do mapa.
- [ ] **Passo 5: Roteiro manual completo,** em uma janela nova do navegador, do zero:

1. Tela inicial sem `Continuar`. Criar uma viação em Ibirama com uma logo enviada.
2. Em 1x, cronometrar até poder comprar o segundo ônibus. Esperado: entre 20 e 30 minutos reais.
3. Comprar, nomear, trocar a pintura só dele e alocar na linha. Os dois ônibus andam espaçados.
4. Abrir Ibirama ⇄ Itajaí ou Blumenau ⇄ Itajaí. Tentar abrir uma linha que não toca a rede não é possível: ela nem aparece na lista.
5. Levar o preço ao máximo e ao mínimo; o caixa nunca mostra `NaN`.
6. Deixar o caixa negativo vendendo e comprando: o caixa fica vermelho e as compras bloqueiam.
7. Fechar e reabrir a aba; exportar; novo jogo; importar.
8. Começar outro jogo com sede em Blumenau e confirmar que o começo é visivelmente mais fácil.
9. Conferir em 1280 × 720 que nada fica cortado.

- [ ] **Passo 6: Completar o `README.md`:** o que é o jogo; como rodar (`npm install`, `npm run dev`, `npm test`, `npm run e2e`); como regerar as rodovias e recalibrar; fontes dos dados (IBGE Censo 2022, OpenStreetMap, OSRM, provedor do mapa-base, Leaflet) com as atribuições exigidas; e o aviso de que o jogo salvo fica só no navegador.
- [ ] **Passo 7: Atualizar o design.** Na seção “Em aberto” do documento de design, marcar o que foi resolvido e registrar o que mudou durante a implementação.
- [ ] **Passo 8: Publicar**

```bash
git add -A
git commit -m "test: teste de ponta a ponta e documentação do MVP"
git push
```

Esperado: fluxo verde na aba Actions e o jogo jogável em `https://<usuario>.github.io/minha-viacao/`. Abrir o endereço publicado e repetir os itens 1 e 7 do roteiro manual lá.

## Depois do MVP

Cada item abaixo ganha o próprio design curto e o próprio plano, na ordem do documento de design: motoristas; manutenção e depreciação; fretamento e reputação; conquistas; mais cidades; upgrades visuais e vista de frente; clima e eventos; compra de empresas. A base já está preparada para isso em três pontos: o save tem versão e migração (tarefa 8), cidades e modelos são dados (tarefa 2), e todo número de equilíbrio vive em um arquivo só (tarefa 7).
