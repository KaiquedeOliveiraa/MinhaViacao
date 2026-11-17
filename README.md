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

## Documentos

- Design: [docs/superpowers/specs/2026-11-12-minha-viacao-mvp-design.md](docs/superpowers/specs/2026-11-12-minha-viacao-mvp-design.md)
- Plano: [docs/superpowers/plans/2026-11-13-minha-viacao-mvp.md](docs/superpowers/plans/2026-11-13-minha-viacao-mvp.md)
