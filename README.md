# Minha Viação

Jogo de navegador, para um jogador, em que você cria uma empresa de ônibus em Santa Catarina — nome, logo e pintura — e a faz crescer operando linhas entre cidades reais em um mapa real.

## Rodar localmente

Requer Node 22 ou mais novo.

```bash
npm install
npm run dev        # servidor de desenvolvimento em http://localhost:5173
npm test           # testes (Vitest)
npm run build      # compila para dist/
npm run roads      # gera src/data/roads.json (rodar só quando mudar cidades)
npm run calibrate  # simulação sem tela com a tabela de equilíbrio
npm run e2e        # teste de ponta a ponta (Playwright)
```

## Publicação

Cada envio para a branch `main` roda os testes, compila e publica no GitHub Pages
(Settings → Pages → Source: **GitHub Actions**).
A publicação só roda quando a variável de repositório `DEPLOY_PAGES` vale `true`
(Settings → Secrets and variables → Actions → Variables). Sem ela, cada envio só roda os testes e a compilação.

## Documentos

- Design: [docs/superpowers/specs/2026-11-12-minha-viacao-mvp-design.md](docs/superpowers/specs/2026-11-12-minha-viacao-mvp-design.md)
- Plano: [docs/superpowers/plans/2026-11-13-minha-viacao-mvp.md](docs/superpowers/plans/2026-11-13-minha-viacao-mvp.md)

## Fontes dos dados

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

**Rodovias:** traçados gerados com o serviço público do OSRM (`npm run roads`), sobre dados do OpenStreetMap.
