# Minha Viação

Jogo de navegador, para um jogador, em que você cria uma empresa de ônibus em Santa Catarina — nome, logo e pintura — e a faz crescer operando linhas entre cidades reais em um mapa real.

- Crie a viação: nome, cidade-sede (que define a dificuldade), duas cores, logo (ícone pronto ou imagem sua) e estilo de pintura.
- O jogo começa sem ônibus e com R$ 35.000 em caixa: um tutorial curto guia a compra do primeiro ônibus, a pintura dele e a abertura da primeira linha, que não paga taxa.
- Ajuste o preço da passagem, compre ônibus, abra novas linhas a partir da sua rede e pinte cada ônibus do seu jeito.
- Funciona no celular (a partir de 360 px) e no computador, e pode ser instalado na tela inicial do celular.

> **O jogo salvo fica só neste navegador.** Limpar os dados do navegador apaga o jogo. Use **Menu → Exportar jogo salvo** para guardar uma cópia e **Importar jogo salvo** para trazê-la de volta. No iPhone, o aplicativo instalado guarda o jogo separado do Safari: exporte antes e importe no aplicativo.

## Rodar localmente

Requer Node 22 ou mais novo.

```bash
npm install
npm run dev        # servidor de desenvolvimento em http://localhost:5173
npm test           # testes (Vitest)
npm run build      # verificação de tipos e compilação para dist/
npm run e2e        # teste de ponta a ponta (Playwright, desktop e iPhone 13)
```

O `npm run e2e` usa o Chromium do Playwright (`npx playwright install chromium` na primeira vez). Para usar um navegador já instalado, defina `PW_CHANNEL`, por exemplo `PW_CHANNEL=msedge npm run e2e`.

Em desenvolvimento, `http://localhost:5173/?galeria` mostra a galeria de conferência dos desenhos (3 modelos × 4 pinturas em duas combinações de cor, e os 6 ícones de logo).

### Regerar rodovias e recalibrar

- `npm run roads`: consulta o OSRM uma vez para cada par de cidades de `src/data/cities.json` e grava `src/data/roads.json` (rodar só quando mudar ou acrescentar cidades).
- `npm run calibrate`: roda a simulação sem tela com as regras reais e imprime a tabela de equilíbrio e os seis critérios (`OK`/`FORA`). Todo número de equilíbrio fica em `src/data/balance.ts` e nos preços de `src/data/models.json`.

## Publicação

Cada envio para a branch `main` roda os testes, o teste de ponta a ponta e a compilação no GitHub Actions.
A publicação no GitHub Pages só acontece quando a variável de repositório `DEPLOY_PAGES` vale `true`
(Settings → Secrets and variables → Actions → Variables) e o Pages está com Source: **GitHub Actions**.
O site usa caminhos relativos (`base: './'`), então funciona em `https://<usuario>.github.io/MinhaViacao/` sem configuração extra.

## Documentos

- Design: [docs/superpowers/specs/2026-11-12-minha-viacao-mvp-design.md](docs/superpowers/specs/2026-11-12-minha-viacao-mvp-design.md)
- Plano: [docs/superpowers/plans/2026-11-13-minha-viacao-mvp.md](docs/superpowers/plans/2026-11-13-minha-viacao-mvp.md)

## Fontes dos dados e atribuições

**População:** Censo 2022, IBGE (agregado 4714, variável 93), consultado em 17/11/2026.

| Cidade | Código IBGE | População |
| --- | --- | --- |
| Ibirama | 4206900 | 19.862 |
| Blumenau | 4202404 | 361.261 |
| Itajaí | 4208203 | 264.054 |
| Florianópolis | 4205407 | 537.211 |

**Pontos das cidades:** terminais rodoviários intermunicipais no OpenStreetMap (`amenity=bus_station`), dados © colaboradores do OpenStreetMap (ODbL).

| Cidade | Terminal | Elemento OSM |
| --- | --- | --- |
| Ibirama | Rodoviária de Ibirama | node/6983054653 |
| Blumenau | Terminal Rodoviário Prefeito Hercílio Deeke | way/99012920 |
| Itajaí | Rodoviária Internacional de Itajaí | way/196969046 |
| Florianópolis | Terminal Rodoviário Rita Maria | way/35165963 |

**Rodovias:** traçados gerados com o serviço público do [OSRM](https://project-osrm.org/) (`npm run roads`), sobre dados © colaboradores do OpenStreetMap.

**Mapa:** desenhado pelo próprio jogo, em vetor, sem tiles de terceiros. Os arquivos ficam em `public/map/` e são gerados por `npm run map` (o jogo nunca consulta esses serviços):

- `sc-municipios.json` e `vizinhos.json` (Paraná e Rio Grande do Sul): malhas municipais e estaduais (API de malhas v3) e nomes dos municípios (API de localidades) do [IBGE](https://www.ibge.gov.br/). O ponto de cada município fica no centro do polígono, não no endereço exato da sede. Cada município traz também a população do Censo 2022 (IBGE, [agregado 4714](https://sidra.ibge.gov.br/tabela/4714), variável 93, API de agregados v3), que decide quais nomes aparecem em cada zoom (as maiores primeiro).
- `vizinhos.json` (Argentina): [Natural Earth](https://www.naturalearthdata.com/) 1:50m, domínio público.
- `rodovias.json`: rodovias BR e SC do [OpenStreetMap](https://www.openstreetmap.org/copyright), consultadas pela Overpass API. © colaboradores do OpenStreetMap; este arquivo é um banco de dados derivado e fica sob a [ODbL](https://opendatacommons.org/licenses/odbl/).

A atribuição aparece no canto do mapa. `npm run measure:map` mede o mapa num celular simulado (CPU 4× mais lenta, 390×844) e imprime quadros por segundo, quadros lentos e bytes baixados; requer `npm run build` antes e aceita `PW_CHANNEL`.

**Nomes de viações reais:** aparecem só como metas bloqueadas na tela "Viações rivais", sem logotipos, e ficam todos em `src/data/rivals.ts`. Se o jogo for divulgado, os nomes podem trazer risco de marca registrada: troque-os por nomes fictícios nesse arquivo.

**Mapa interativo:** [Leaflet](https://leafletjs.com/) (BSD-2). **Fontes:** Inter e Barlow Condensed (SIL Open Font License), via Fontsource.

Os modelos de ônibus têm nomes inventados; o jogo não usa marcas reais de fabricantes (viações reais só como metas bloqueadas, veja acima).

**Desenhos dos ônibus:** o convencional e o rodoviário seguem as proporções de desenhos de referência (comprimento × altura, posição dos eixos, faixa de janelas, para-brisa e portas), medidas na imagem e redesenhadas no traço do jogo, sem copiar traço, pintura, textos ou marcas. O micro e a van aguardam referência.

Referências de proporção: RJF Desenhos de ônibus (Ramon França)
